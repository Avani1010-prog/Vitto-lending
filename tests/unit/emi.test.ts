import { describe, it, expect } from "vitest";
import { calculateEMI } from "@/lib/finance/emi";

describe("EMI Calculation Engine (Reference Formula Verification)", () => {
  it("should calculate ~₹9,985-₹9,986 monthly EMI for ₹2,00,000 @ 18% p.a. over 24 months (Assessment Reference Case)", () => {
    const emi = calculateEMI(200000, 18, 24);
    // Formula: 200000 * 0.015 * (1.015)^24 / ((1.015)^24 - 1) = 9984.82
    expect(emi.toNumber()).toBeCloseTo(9984.82, 2);
    // Verified to be within the 1-2 rupee rounding variance of ₹9,986
    expect(Math.abs(emi.toNumber() - 9986)).toBeLessThanOrEqual(2);
  });

  it("should calculate correct EMI for ₹50,000 @ 12% over 6 months", () => {
    const emi = calculateEMI(50000, 12, 6);
    // 50000 * 0.01 * (1.01)^6 / ((1.01)^6 - 1) = 8627.42
    expect(emi.toNumber()).toBeCloseTo(8627.42, 2);
  });

  it("should calculate simple division for 0% interest rate", () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi.toNumber()).toBe(10000.0);
  });

  it("should throw error for non-positive principal", () => {
    expect(() => calculateEMI(0, 18, 24)).toThrow("Principal must be strictly positive");
    expect(() => calculateEMI(-50000, 18, 24)).toThrow("Principal must be strictly positive");
  });

  it("should throw error for non-positive or non-integer tenure", () => {
    expect(() => calculateEMI(200000, 18, 0)).toThrow("Tenure must be a positive integer");
    expect(() => calculateEMI(200000, 18, -12)).toThrow("Tenure must be a positive integer");
    expect(() => calculateEMI(200000, 18, 12.5)).toThrow("Tenure must be a positive integer");
  });

  it("should throw error for negative interest rate", () => {
    expect(() => calculateEMI(200000, -5, 24)).toThrow("Annual interest rate cannot be negative");
  });
});
