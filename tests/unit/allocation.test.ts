import { describe, it, expect } from "vitest";
import { generateRepaymentSchedule } from "@/lib/finance/schedule";
import {
  allocatePaymentToSchedule,
  calculateLoanPosition,
  ScheduleRecord,
} from "@/lib/finance/allocation";
import { Decimal } from "decimal.js";

function createMockSchedule(
  principal = 200000,
  rate = 18,
  tenure = 24,
  disbDate = "2026-01-15"
): ScheduleRecord[] {
  const { schedule } = generateRepaymentSchedule(principal, rate, tenure, disbDate);
  return schedule.map((item, idx) => ({
    id: `inst-${idx + 1}`,
    loanId: "test-loan-1",
    instalmentNumber: item.instalmentNumber,
    dueDate: item.dueDate,
    principalComponent: item.principalComponent,
    interestComponent: item.interestComponent,
    totalDue: item.totalDue,
    principalPaid: item.principalPaid,
    interestPaid: item.interestPaid,
    amountPaid: item.amountPaid,
    status: item.status,
  }));
}

describe("Payment Allocation & Loan Position Engine", () => {
  it("Case 1: Underpayment - ₹5,000 received on ₹9,984.82 instalment (Interest settled first)", () => {
    const schedule = createMockSchedule();
    const inst1 = schedule[0]; // Total due 9984.82, Interest 3000.00, Principal 6984.82
    const interestDue = new Decimal(inst1.interestComponent).toNumber(); // 3000

    const { updatedSchedule, allocations } = allocatePaymentToSchedule(schedule, 5000);

    const updatedInst1 = updatedSchedule[0];
    expect(updatedInst1.status).toBe("PARTIALLY_PAID");
    expect(updatedInst1.interestPaid.toNumber()).toBe(interestDue); // Interest fully settled first
    expect(updatedInst1.principalPaid.toNumber()).toBe(5000 - interestDue); // 2000 towards principal
    expect(updatedInst1.amountPaid.toNumber()).toBe(5000);

    expect(allocations.length).toBe(1);
    expect(allocations[0].interestAllocated).toBe(interestDue);
    expect(allocations[0].principalAllocated).toBe(5000 - interestDue);
  });

  it("Case 2: Overpayment - Twice the instalment received rolls over to next instalment", () => {
    const schedule = createMockSchedule();
    const inst1Total = new Decimal(schedule[0].totalDue).toNumber(); // 9984.82
    const twiceInstalment = Number((inst1Total * 2).toFixed(2)); // ~19969.64

    const { updatedSchedule, allocations } = allocatePaymentToSchedule(schedule, twiceInstalment);

    // First instalment must be fully PAID
    const inst1 = updatedSchedule[0];
    expect(inst1.status).toBe("PAID");
    expect(inst1.amountPaid.toNumber()).toBe(inst1Total);

    // Second instalment must also be fully PAID
    const inst2 = updatedSchedule[1];
    expect(inst2.status).toBe("PAID");
    expect(inst2.amountPaid.toNumber()).toBe(new Decimal(schedule[1].totalDue).toNumber());

    expect(allocations.length).toBe(2); // Exactly 2 instalments settled
    expect(allocations[0].totalAllocated + allocations[1].totalAllocated).toBeCloseTo(
      twiceInstalment,
      2
    );
  });

  it("Case 3: Late payment - Payment received 11 days after due date reflects overdue position prior to payment", () => {
    const schedule = createMockSchedule(200000, 18, 24, "2026-01-01");
    // Due date for instalment 1 is 2026-02-01
    // As of 2026-02-12 (11 days late):
    const checkDate = new Date("2026-02-12T00:00:00.000Z");
    const positionBeforePayment = calculateLoanPosition(200000, schedule, checkDate);

    expect(positionBeforePayment.overdueAmount).toBeGreaterThan(0);
    expect(positionBeforePayment.overdueAmount).toBeCloseTo(
      new Decimal(schedule[0].totalDue).toNumber(),
      2
    );

    // When payment is received on 2026-02-12:
    const { updatedSchedule } = allocatePaymentToSchedule(
      schedule,
      schedule[0].totalDue,
      checkDate
    );
    const mockUpdatedRecords: ScheduleRecord[] = updatedSchedule.map((u, i) => ({
      ...schedule[i],
      ...u,
    }));

    const positionAfterPayment = calculateLoanPosition(200000, mockUpdatedRecords, checkDate);
    expect(positionAfterPayment.overdueAmount).toBe(0); // Overdue cleared
  });

  it("should accurately track outstanding principal and next due amount across position reports", () => {
    const schedule = createMockSchedule();
    const positionInitial = calculateLoanPosition(200000, schedule, new Date("2026-01-16"));

    expect(positionInitial.outstandingPrincipal).toBe(200000);
    expect(positionInitial.totalPrincipalPaid).toBe(0);
    expect(positionInitial.totalInterestPaid).toBe(0);
    expect(positionInitial.status).toBe("ACTIVE");
    expect(positionInitial.nextDueAmount).toBeCloseTo(new Decimal(schedule[0].totalDue).toNumber(), 2);
  });

  it("should throw error when payment amount is non-positive", () => {
    const schedule = createMockSchedule();
    expect(() => allocatePaymentToSchedule(schedule, 0)).toThrow(
      "Payment amount must be greater than zero"
    );
    expect(() => allocatePaymentToSchedule(schedule, -100)).toThrow(
      "Payment amount must be greater than zero"
    );
  });
});
