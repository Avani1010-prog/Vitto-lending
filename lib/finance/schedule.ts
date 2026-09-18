import { Decimal } from "decimal.js";
import { calculateEMI } from "./emi";
import { ScheduleItemInput } from "./types";

/**
 * Calculates due date for instalment k given a disbursement date.
 * Exactly k calendar months after disbursement.
 */
export function calculateDueDate(disbursementDate: Date, instalmentNumber: number): Date {
  const date = new Date(disbursementDate);
  const targetMonth = date.getMonth() + instalmentNumber;
  const originalDay = date.getDate();

  date.setMonth(targetMonth);
  // Handle edge cases like 31st Jan -> Feb 28/29
  if (date.getDate() !== originalDay) {
    date.setDate(0); // Set to last day of previous month
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Generates full repayment schedule for a loan.
 * Ensures the final instalment absorbs any minor 1-2 rupee rounding remainder so that
 * the sum of principal components is exactly equal to the loan principal.
 */
export function generateRepaymentSchedule(
  principal: number | string | Decimal,
  annualInterestRate: number | string | Decimal,
  tenureMonths: number,
  disbursementDate: Date | string
): {
  monthlyEmi: Decimal;
  schedule: ScheduleItemInput[];
} {
  const P = new Decimal(principal);
  const rate = new Decimal(annualInterestRate);
  const tenure = tenureMonths;
  const disbDate = new Date(disbursementDate);

  if (isNaN(disbDate.getTime())) {
    throw new Error("Invalid disbursement date");
  }

  const emi = calculateEMI(P, rate, tenure);
  const monthlyRate = rate.div(12).div(100);

  let remainingPrincipal = new Decimal(P);
  const schedule: ScheduleItemInput[] = [];

  for (let k = 1; k <= tenure; k++) {
    const dueDate = calculateDueDate(disbDate, k);

    // Interest component for this month = remainingPrincipal * monthlyRate
    const interestComponent = remainingPrincipal
      .times(monthlyRate)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    let principalComponent: Decimal;
    let totalDue: Decimal;

    if (k < tenure) {
      // Standard monthly instalment
      principalComponent = emi.minus(interestComponent).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalDue = principalComponent.plus(interestComponent);
      remainingPrincipal = remainingPrincipal.minus(principalComponent);
    } else {
      // Final instalment absorbs remaining principal so balance is exactly 0.00
      principalComponent = remainingPrincipal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalDue = principalComponent.plus(interestComponent);
      remainingPrincipal = new Decimal(0);
    }

    schedule.push({
      instalmentNumber: k,
      dueDate,
      principalComponent,
      interestComponent,
      totalDue,
      principalPaid: new Decimal(0),
      interestPaid: new Decimal(0),
      amountPaid: new Decimal(0),
      status: "PENDING",
    });
  }

  return {
    monthlyEmi: emi,
    schedule,
  };
}
