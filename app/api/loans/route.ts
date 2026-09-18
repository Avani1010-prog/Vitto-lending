import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/verify-token";
import { generateRepaymentSchedule, calculateLoanPosition } from "@/lib/finance";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getStore, createStoreLoan } from "@/lib/store";
import { Decimal } from "decimal.js";

const createLoanSchema = z.object({
  principal: z
    .number({ invalid_type_error: "Principal must be a number" })
    .min(50000, "Principal must be at least ₹50,000")
    .max(1000000, "Principal cannot exceed ₹10,000,000"),
  annualInterestRate: z
    .number({ invalid_type_error: "Annual interest rate must be a number" })
    .positive("Annual interest rate must be greater than 0"),
  tenureMonths: z
    .number({ invalid_type_error: "Tenure must be a number" })
    .int("Tenure must be an integer number of months")
    .min(3, "Tenure must be at least 3 months")
    .max(36, "Tenure cannot exceed 36 months"),
  disbursementDate: z
    .string({ invalid_type_error: "Disbursement date is required" })
    .refine((d) => !isNaN(Date.parse(d)), "Invalid disbursement date format"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate request
    await verifyAuthToken(req);

    // 2. Parse and validate body
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("Invalid JSON payload", "INVALID_INPUT", 400);
    }

    const validation = createLoanSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map((e) => e.message).join("; ");
      return errorResponse(errorMsg, "VALIDATION_ERROR", 400, validation.error.flatten());
    }

    const { principal, annualInterestRate, tenureMonths, disbursementDate } = validation.data;
    const disbDate = new Date(disbursementDate);

    // Try PostgreSQL Prisma first
    try {
      const { monthlyEmi, schedule } = generateRepaymentSchedule(
        principal,
        annualInterestRate,
        tenureMonths,
        disbDate
      );

      const loan = await prisma.$transaction(async (tx) => {
        const createdLoan = await tx.loan.create({
          data: {
            principal: new Decimal(principal).toFixed(2),
            annualInterestRate: new Decimal(annualInterestRate).toFixed(2),
            tenureMonths,
            disbursementDate: disbDate,
            monthlyEmi: monthlyEmi.toFixed(2),
            status: "ACTIVE",
          },
        });

        await tx.repaymentSchedule.createMany({
          data: schedule.map((item) => ({
            loanId: createdLoan.id,
            instalmentNumber: item.instalmentNumber,
            dueDate: item.dueDate,
            principalComponent: item.principalComponent.toFixed(2),
            interestComponent: item.interestComponent.toFixed(2),
            totalDue: item.totalDue.toFixed(2),
            principalPaid: "0.00",
            interestPaid: "0.00",
            amountPaid: "0.00",
            status: "PENDING",
          })),
        });

        return tx.loan.findUnique({
          where: { id: createdLoan.id },
          include: {
            schedule: {
              orderBy: { instalmentNumber: "asc" },
            },
          },
        });
      });

      if (loan) {
        const position = calculateLoanPosition(
          Number(loan.principal),
          loan.schedule.map((s) => ({
            ...s,
            principalComponent: s.principalComponent.toString(),
            interestComponent: s.interestComponent.toString(),
            totalDue: s.totalDue.toString(),
            principalPaid: s.principalPaid.toString(),
            interestPaid: s.interestPaid.toString(),
            amountPaid: s.amountPaid.toString(),
          })),
          new Date()
        );

        return successResponse(
          {
            loan: {
              id: loan.id,
              principal: Number(loan.principal),
              annualInterestRate: Number(loan.annualInterestRate),
              tenureMonths: loan.tenureMonths,
              disbursementDate: loan.disbursementDate.toISOString(),
              monthlyEmi: Number(loan.monthlyEmi),
              status: loan.status,
              createdAt: loan.createdAt.toISOString(),
            },
            position,
            schedule: loan.schedule.map((s) => ({
              id: s.id,
              instalmentNumber: s.instalmentNumber,
              dueDate: s.dueDate.toISOString(),
              principalComponent: Number(s.principalComponent),
              interestComponent: Number(s.interestComponent),
              totalDue: Number(s.totalDue),
              principalPaid: Number(s.principalPaid),
              interestPaid: Number(s.interestPaid),
              amountPaid: Number(s.amountPaid),
              status: s.status,
            })),
          },
          201
        );
      }
    } catch (dbErr) {
      // Fallback to in-memory store
      const stored = createStoreLoan(principal, annualInterestRate, tenureMonths, disbDate);
      const position = calculateLoanPosition(
        stored.principal,
        stored.schedule.map((s) => ({
          ...s,
          loanId: stored.id,
          dueDate: new Date(s.dueDate),
        })),
        new Date()
      );

      return successResponse(
        {
          loan: {
            id: stored.id,
            principal: stored.principal,
            annualInterestRate: stored.annualInterestRate,
            tenureMonths: stored.tenureMonths,
            disbursementDate: stored.disbursementDate,
            monthlyEmi: stored.monthlyEmi,
            status: stored.status,
            createdAt: stored.createdAt,
          },
          position,
          schedule: stored.schedule,
        },
        201
      );
    }
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      return errorResponse(error.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(error.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    await verifyAuthToken(req);

    try {
      const loans = await prisma.loan.findMany({
        orderBy: { createdAt: "desc" },
      });

      if (loans && loans.length > 0) {
        return successResponse(
          loans.map((loan) => ({
            id: loan.id,
            principal: Number(loan.principal),
            annualInterestRate: Number(loan.annualInterestRate),
            tenureMonths: loan.tenureMonths,
            disbursementDate: loan.disbursementDate.toISOString(),
            monthlyEmi: Number(loan.monthlyEmi),
            status: loan.status,
            createdAt: loan.createdAt.toISOString(),
          }))
        );
      }
    } catch {
      // fallback to store
    }

    const storeLoans = getStore();
    return successResponse(
      storeLoans.map((l) => ({
        id: l.id,
        principal: l.principal,
        annualInterestRate: l.annualInterestRate,
        tenureMonths: l.tenureMonths,
        disbursementDate: l.disbursementDate,
        monthlyEmi: l.monthlyEmi,
        status: l.status,
        createdAt: l.createdAt,
      }))
    );
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      return errorResponse(error.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(error.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}
