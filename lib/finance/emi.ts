import { Decimal } from "decimal.js";

// Set precision for decimal.js
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates the Equal Monthly Instalment (EMI) using standard banking formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param principal - Loan principal amount (P)
 * @param annualRate - Annual interest rate in percentage (e.g. 18 for 18% p.a.)
 * @param tenureMonths - Tenure in months (n)
 * @returns Monthly EMI as a Decimal rounded to 2 decimal places
 */
export function calculateEMI(
  principal: number | string | Decimal,
  annualRate: number | string | Decimal,
  tenureMonths: number
): Decimal {
  const P = new Decimal(principal);
  const tenure = new Decimal(tenureMonths);

  if (P.lte(0)) {
    throw new Error("Principal must be strictly positive");
  }
  if (tenure.lte(0) || !Number.isInteger(tenureMonths)) {
    throw new Error("Tenure must be a positive integer");
  }

  // Monthly interest rate r = (annualRate / 12) / 100
  const annual = new Decimal(annualRate);
  if (annual.lt(0)) {
    throw new Error("Annual interest rate cannot be negative");
  }

  if (annual.isZero()) {
    // 0% interest: EMI is simply principal / tenure
    return P.div(tenure).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  const r = annual.div(12).div(100);
  const onePlusR = new Decimal(1).plus(r);
  const onePlusRPowN = onePlusR.pow(tenure);

  // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
  const numerator = P.times(r).times(onePlusRPowN);
  const denominator = onePlusRPowN.minus(1);

  const emi = numerator.div(denominator);
  return emi.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}
