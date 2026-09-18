import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/verify-token";
import { calculateLoanPosition } from "@/lib/finance";
import { successResponse, errorResponse } from "@/lib/api-response";
import { findStoreLoan } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAuthToken(req);

    const { id } = params;
    if (!id) {
      return errorResponse("Loan ID is required", "INVALID_INPUT", 400);
    }

    try {
      const loan = await prisma.loan.findUnique({
        where: { id },
        include: {
          schedule: {
            orderBy: { instalmentNumber: "asc" },
          },
          payments: {
            orderBy: { paymentDate: "desc" },
          },
        },
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

        return successResponse({
          loan: {
            id: loan.id,
            principal: Number(loan.principal),
            annualInterestRate: Number(loan.annualInterestRate),
            tenureMonths: loan.tenureMonths,
            disbursementDate: loan.disbursementDate.toISOString(),
            monthlyEmi: Number(loan.monthlyEmi),
            status: position.status,
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
          payments: loan.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            paymentDate: p.paymentDate.toISOString(),
            idempotencyKey: p.idempotencyKey,
            notes: p.notes,
            createdAt: p.createdAt.toISOString(),
          })),
        });
      }
    } catch {
      // fallback to in-memory store
    }

    const storedLoan = findStoreLoan(id);
    if (!storedLoan) {
      return errorResponse(`Loan with ID '${id}' not found`, "LOAN_NOT_FOUND", 404);
    }

    const position = calculateLoanPosition(
      storedLoan.principal,
      storedLoan.schedule.map((s) => ({
        ...s,
        loanId: storedLoan.id,
        dueDate: new Date(s.dueDate),
      })),
      new Date()
    );

    return successResponse({
      loan: {
        id: storedLoan.id,
        principal: storedLoan.principal,
        annualInterestRate: storedLoan.annualInterestRate,
        tenureMonths: storedLoan.tenureMonths,
        disbursementDate: storedLoan.disbursementDate,
        monthlyEmi: storedLoan.monthlyEmi,
        status: position.status,
        createdAt: storedLoan.createdAt,
      },
      position,
      schedule: storedLoan.schedule,
      payments: storedLoan.payments,
    });
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      return errorResponse(error.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(error.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}
