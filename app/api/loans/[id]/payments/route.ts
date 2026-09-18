import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth/verify-token";
import {
  allocatePaymentToSchedule,
  calculateLoanPosition,
  ScheduleRecord,
} from "@/lib/finance";
import { successResponse, errorResponse } from "@/lib/api-response";
import { recordStorePayment, findStoreLoan } from "@/lib/store";
import { Decimal } from "decimal.js";

const recordPaymentSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Payment amount must be a number" })
    .positive("Payment amount must be strictly greater than 0"),
  paymentDate: z
    .string({ invalid_type_error: "Payment date is required" })
    .refine((d) => !isNaN(Date.parse(d)), "Invalid payment date format"),
  idempotencyKey: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await verifyAuthToken(req);

    const { id: loanId } = params;
    if (!loanId) {
      return errorResponse("Loan ID is required", "INVALID_INPUT", 400);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("Invalid JSON payload", "INVALID_INPUT", 400);
    }

    const validation = recordPaymentSchema.safeParse(body);
    if (!validation.success) {
      const errorMsg = validation.error.errors.map((e) => e.message).join("; ");
      return errorResponse(errorMsg, "VALIDATION_ERROR", 400, validation.error.flatten());
    }

    const { amount, paymentDate, idempotencyKey, notes } = validation.data;
    const pDate = new Date(paymentDate);

    // Try PostgreSQL Prisma first
    try {
      if (idempotencyKey) {
        const existingPayment = await prisma.payment.findUnique({
          where: { idempotencyKey },
        });
        if (existingPayment) {
          return errorResponse(
            `Duplicate payment: A payment with idempotency key '${idempotencyKey}' was already recorded`,
            "DUPLICATE_PAYMENT",
            409,
            { paymentId: existingPayment.id }
          );
        }
      }

      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          schedule: {
            orderBy: { instalmentNumber: "asc" },
          },
        },
      });

      if (loan) {
        const scheduleRecords: ScheduleRecord[] = loan.schedule.map((s) => ({
          id: s.id,
          loanId: s.loanId,
          instalmentNumber: s.instalmentNumber,
          dueDate: s.dueDate,
          principalComponent: s.principalComponent.toString(),
          interestComponent: s.interestComponent.toString(),
          totalDue: s.totalDue.toString(),
          principalPaid: s.principalPaid.toString(),
          interestPaid: s.interestPaid.toString(),
          amountPaid: s.amountPaid.toString(),
          status: s.status,
        }));

        const { updatedSchedule, allocations } = allocatePaymentToSchedule(
          scheduleRecords,
          amount,
          pDate
        );

        const result = await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.create({
            data: {
              loanId: loan.id,
              amount: new Decimal(amount).toFixed(2),
              paymentDate: pDate,
              idempotencyKey: idempotencyKey || null,
              notes: notes || null,
            },
          });

          if (allocations.length > 0) {
            await tx.paymentAllocation.createMany({
              data: allocations.map((alloc) => ({
                paymentId: payment.id,
                scheduleId: alloc.scheduleId!,
                principalAllocated: alloc.principalAllocated.toFixed(2),
                interestAllocated: alloc.interestAllocated.toFixed(2),
                totalAllocated: alloc.totalAllocated.toFixed(2),
              })),
            });
          }

          for (const item of updatedSchedule) {
            await tx.repaymentSchedule.update({
              where: { id: item.id },
              data: {
                principalPaid: item.principalPaid.toFixed(2),
                interestPaid: item.interestPaid.toFixed(2),
                amountPaid: item.amountPaid.toFixed(2),
                status: item.status,
              },
            });
          }

          const freshLoan = await tx.loan.findUnique({
            where: { id: loanId },
            include: {
              schedule: {
                orderBy: { instalmentNumber: "asc" },
              },
              payments: {
                orderBy: { paymentDate: "desc" },
              },
            },
          });

          return { payment, freshLoan };
        });

        const freshLoan = result.freshLoan!;
        const position = calculateLoanPosition(
          Number(freshLoan.principal),
          freshLoan.schedule.map((s) => ({
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

        if (position.status === "CLOSED" && freshLoan.status !== "CLOSED") {
          await prisma.loan.update({
            where: { id: loanId },
            data: { status: "CLOSED" },
          });
        }

        return successResponse({
          payment: {
            id: result.payment.id,
            amount: Number(result.payment.amount),
            paymentDate: result.payment.paymentDate.toISOString(),
            idempotencyKey: result.payment.idempotencyKey,
          },
          allocations,
          position,
          schedule: freshLoan.schedule.map((s) => ({
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
        });
      }
    } catch (err: any) {
      if (err.message?.includes("Duplicate payment")) {
        return errorResponse(err.message, "DUPLICATE_PAYMENT", 409);
      }
      // fallback to store
    }

    const storedLoan = findStoreLoan(loanId);
    if (!storedLoan) {
      return errorResponse(`Loan with ID '${loanId}' not found`, "LOAN_NOT_FOUND", 404);
    }

    try {
      const storeRes = recordStorePayment(loanId, amount, pDate, idempotencyKey, notes);
      return successResponse(storeRes);
    } catch (e: any) {
      if (e.message?.includes("Duplicate payment")) {
        return errorResponse(e.message, "DUPLICATE_PAYMENT", 409);
      }
      return errorResponse(e.message, "ALLOCATION_ERROR", 400);
    }
  } catch (error: any) {
    if (error.message?.startsWith("UNAUTHORIZED")) {
      return errorResponse(error.message, "UNAUTHORIZED", 401);
    }
    return errorResponse(error.message || "Internal server error", "INTERNAL_ERROR", 500);
  }
}
