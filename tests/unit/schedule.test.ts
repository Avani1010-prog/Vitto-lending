import { describe, it, expect } from "vitest";
import { generateRepaymentSchedule, calculateDueDate } from "@/lib/finance/schedule";
import { Decimal } from "decimal.js";

describe("Repayment Schedule Generator", () => {
  it("should generate exact number of instalments matching tenure", () => {
    const { schedule, monthlyEmi } = generateRepaymentSchedule(200000, 18, 24, "2026-01-15");
    expect(schedule.length).toBe(24);
    expect(monthlyEmi.toNumber()).toBeCloseTo(9984.82, 2);
  });

  it("should ensure total principal components sum up to exactly the loan principal (Residual Absorption)", () => {
    const principal = 200000;
    const { schedule } = generateRepaymentSchedule(principal, 18, 24, "2026-01-15");

    let totalPrincipal = new Decimal(0);
    for (const inst of schedule) {
      totalPrincipal = totalPrincipal.plus(inst.principalComponent);
    }

    // Residual in final instalment must ensure exact reconciliation
    expect(totalPrincipal.toNumber()).toBe(principal);
  });

  it("should generate correct monthly due dates chronologically", () => {
    const disbDate = new Date("2026-01-15T00:00:00.000Z");
    const d1 = calculateDueDate(disbDate, 1);
    const d2 = calculateDueDate(disbDate, 2);
    const d12 = calculateDueDate(disbDate, 12);

    expect(d1.getMonth()).toBe(1); // February (0-indexed 1)
    expect(d2.getMonth()).toBe(2); // March (0-indexed 2)
    expect(d12.getFullYear()).toBe(2027);
    expect(d12.getMonth()).toBe(0); // January 2027
  });

  it("should throw error for invalid disbursement date", () => {
    expect(() => generateRepaymentSchedule(200000, 18, 24, "invalid-date")).toThrow(
      "Invalid disbursement date"
    );
  });
});
