import { Decimal } from "decimal.js";
import { InstalmentStatus, LoanPosition, PaymentAllocationResult } from "./types";

export interface ScheduleRecord {
  id: string;
  loanId?: string;
  instalmentNumber: number;
  dueDate: Date;
  principalComponent: Decimal | number | string;
  interestComponent: Decimal | number | string;
  totalDue: Decimal | number | string;
  principalPaid: Decimal | number | string;
  interestPaid: Decimal | number | string;
  amountPaid: Decimal | number | string;
  status: string;
}

/**
 * Updates instalment statuses based on current date and payment status.
 */
export function evaluateInstalmentStatus(
  dueDate: Date,
  totalDue: Decimal,
  amountPaid: Decimal,
  asOfDate: Date = new Date()
): InstalmentStatus {
  if (amountPaid.gte(totalDue)) {
    return "PAID";
  }

  const isPastDue = new Date(dueDate).getTime() < asOfDate.getTime();

  if (amountPaid.gt(0)) {
    return "PARTIALLY_PAID";
  }

  if (isPastDue) {
    return "OVERDUE";
  }

  return "PENDING";
}

/**
 * Calculates the current position of a loan as of a given date.
 */
export function calculateLoanPosition(
  principal: Decimal | number | string,
  schedule: ScheduleRecord[],
  asOfDate: Date = new Date()
): LoanPosition {
  const P = new Decimal(principal);
  let totalPrincipalPaid = new Decimal(0);
  let totalInterestPaid = new Decimal(0);
  let overdueAmount = new Decimal(0);

  let nextDueDate: string | null = null;
  let nextDueAmount = new Decimal(0);
  let hasFoundNextDue = false;

  // Sort schedule by instalment number
  const sorted = [...schedule].sort((a, b) => a.instalmentNumber - b.instalmentNumber);

  for (const item of sorted) {
    const pPaid = new Decimal(item.principalPaid);
    const iPaid = new Decimal(item.interestPaid);
    const totalDue = new Decimal(item.totalDue);
    const amountPaid = new Decimal(item.amountPaid);
    const dueDate = new Date(item.dueDate);

    totalPrincipalPaid = totalPrincipalPaid.plus(pPaid);
    totalInterestPaid = totalInterestPaid.plus(iPaid);

    const remainingDue = Decimal.max(0, totalDue.minus(amountPaid));

    if (remainingDue.gt(0)) {
      // If overdue as of asOfDate
      if (dueDate.getTime() < asOfDate.getTime()) {
        overdueAmount = overdueAmount.plus(remainingDue);
      }

      // First pending or partially paid instalment is the next due
      if (!hasFoundNextDue) {
        nextDueDate = dueDate.toISOString();
        nextDueAmount = remainingDue;
        hasFoundNextDue = true;
      }
    }
  }

  const outstandingPrincipal = Decimal.max(0, P.minus(totalPrincipalPaid));
  const isFullyPaid = outstandingPrincipal.isZero() && !hasFoundNextDue;

  return {
    outstandingPrincipal: outstandingPrincipal.toDecimalPlaces(2).toNumber(),
    totalPrincipalPaid: totalPrincipalPaid.toDecimalPlaces(2).toNumber(),
    totalInterestPaid: totalInterestPaid.toDecimalPlaces(2).toNumber(),
    nextDueDate,
    nextDueAmount: nextDueAmount.toDecimalPlaces(2).toNumber(),
    overdueAmount: overdueAmount.toDecimalPlaces(2).toNumber(),
    status: isFullyPaid ? "CLOSED" : "ACTIVE",
  };
}

/**
 * Allocates a payment amount across the loan schedule according to the business rules:
 * 1. Chronological order: Oldest unpaid or partially paid instalment first.
 * 2. Within each instalment: Interest component is settled first, then Principal component.
 * 3. Overpayments: Excess amount rolls over to future scheduled instalments.
 */
export function allocatePaymentToSchedule(
  schedule: ScheduleRecord[],
  paymentAmount: number | string | Decimal,
  paymentDate: Date = new Date()
): {
  updatedSchedule: Array<{
    id: string;
    instalmentNumber: number;
    principalPaid: Decimal;
    interestPaid: Decimal;
    amountPaid: Decimal;
    status: InstalmentStatus;
  }>;
  allocations: PaymentAllocationResult[];
  unallocatedExcess: Decimal;
} {
  let unallocated = new Decimal(paymentAmount);
  if (unallocated.lte(0)) {
    throw new Error("Payment amount must be greater than zero");
  }

  const sorted = [...schedule].sort((a, b) => a.instalmentNumber - b.instalmentNumber);
  const updatedSchedule: Array<{
    id: string;
    instalmentNumber: number;
    principalPaid: Decimal;
    interestPaid: Decimal;
    amountPaid: Decimal;
    status: InstalmentStatus;
  }> = [];
  const allocations: PaymentAllocationResult[] = [];

  for (const item of sorted) {
    const principalComponent = new Decimal(item.principalComponent);
    const interestComponent = new Decimal(item.interestComponent);
    const totalDue = new Decimal(item.totalDue);

    let principalPaid = new Decimal(item.principalPaid);
    let interestPaid = new Decimal(item.interestPaid);
    let amountPaid = new Decimal(item.amountPaid);

    let principalAllocatedThisInstalment = new Decimal(0);
    let interestAllocatedThisInstalment = new Decimal(0);

    if (unallocated.gt(0) && amountPaid.lt(totalDue)) {
      // 1. Settle unpaid interest component first
      const unpaidInterest = Decimal.max(0, interestComponent.minus(interestPaid));
      if (unpaidInterest.gt(0)) {
        const payInterest = Decimal.min(unallocated, unpaidInterest);
        interestPaid = interestPaid.plus(payInterest);
        unallocated = unallocated.minus(payInterest);
        interestAllocatedThisInstalment = interestAllocatedThisInstalment.plus(payInterest);
      }

      // 2. Settle unpaid principal component next
      if (unallocated.gt(0)) {
        const unpaidPrincipal = Decimal.max(0, principalComponent.minus(principalPaid));
        if (unpaidPrincipal.gt(0)) {
          const payPrincipal = Decimal.min(unallocated, unpaidPrincipal);
          principalPaid = principalPaid.plus(payPrincipal);
          unallocated = unallocated.minus(payPrincipal);
          principalAllocatedThisInstalment = principalAllocatedThisInstalment.plus(payPrincipal);
        }
      }

      amountPaid = principalPaid.plus(interestPaid);

      const totalAllocatedThisInstalment = principalAllocatedThisInstalment.plus(
        interestAllocatedThisInstalment
      );

      if (totalAllocatedThisInstalment.gt(0)) {
        allocations.push({
          scheduleId: item.id,
          instalmentNumber: item.instalmentNumber,
          principalAllocated: principalAllocatedThisInstalment.toDecimalPlaces(2).toNumber(),
          interestAllocated: interestAllocatedThisInstalment.toDecimalPlaces(2).toNumber(),
          totalAllocated: totalAllocatedThisInstalment.toDecimalPlaces(2).toNumber(),
        });
      }
    }

    const status = evaluateInstalmentStatus(
      new Date(item.dueDate),
      totalDue,
      amountPaid,
      paymentDate
    );

    updatedSchedule.push({
      id: item.id,
      instalmentNumber: item.instalmentNumber,
      principalPaid: principalPaid.toDecimalPlaces(2),
      interestPaid: interestPaid.toDecimalPlaces(2),
      amountPaid: amountPaid.toDecimalPlaces(2),
      status,
    });
  }

  return {
    updatedSchedule,
    allocations,
    unallocatedExcess: unallocated.toDecimalPlaces(2),
  };
}
