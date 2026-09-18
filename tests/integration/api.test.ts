import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { POST as createLoanHandler } from "@/app/api/loans/route";
import { GET as getLoanByIdHandler } from "@/app/api/loans/[id]/route";
import { POST as recordPaymentHandler } from "@/app/api/loans/[id]/payments/route";

describe("API Route Handlers Integration Suite", () => {
  beforeAll(async () => {
    process.env.ENABLE_TEST_AUTH = "true";
  });

  const validAuthHeaders = {
    Authorization: "Bearer test-token-vitto-admin",
    "Content-Type": "application/json",
  };

  it("Integration 1: Unauthenticated request must be rejected with 401 Unauthorized", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        principal: 200000,
        annualInterestRate: 18,
        tenureMonths: 24,
        disbursementDate: "2026-01-15T00:00:00.000Z",
      }),
    });

    const res = await createLoanHandler(unauthReq);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("Integration 2: Validation Failure - Invalid inputs (zero tenure / negative principal) rejected with 400 Bad Request", async () => {
    const invalidReq = new NextRequest("http://localhost:3000/api/loans", {
      method: "POST",
      headers: validAuthHeaders,
      body: JSON.stringify({
        principal: -10000, // Invalid negative principal
        annualInterestRate: 18,
        tenureMonths: 0, // Invalid 0 tenure
        disbursementDate: "not-a-date",
      }),
    });

    const res = await createLoanHandler(invalidReq);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Integration 3: Unknown loan identifier returns 404 Not Found", async () => {
    const req = new NextRequest("http://localhost:3000/api/loans/non-existent-loan-id-9999", {
      method: "GET",
      headers: validAuthHeaders,
    });

    const res = await getLoanByIdHandler(req, { params: { id: "non-existent-loan-id-9999" } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("LOAN_NOT_FOUND");
  });

  it("Integration 4: Full Success Flow - Create loan (201), Get loan schedule (200), and Record payment (200)", async () => {
    // 1. Create a Loan
    const createReq = new NextRequest("http://localhost:3000/api/loans", {
      method: "POST",
      headers: validAuthHeaders,
      body: JSON.stringify({
        principal: 200000,
        annualInterestRate: 18,
        tenureMonths: 24,
        disbursementDate: "2026-01-15T00:00:00.000Z",
      }),
    });

    const createRes = await createLoanHandler(createReq);
    expect([200, 201]).toContain(createRes.status);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    const createdLoanId = createBody.data.loan.id;
    expect(createdLoanId).toBeDefined();

    // 2. Fetch the created loan details & schedule
    const getReq = new NextRequest(`http://localhost:3000/api/loans/${createdLoanId}`, {
      method: "GET",
      headers: validAuthHeaders,
    });

    const getRes = await getLoanByIdHandler(getReq, { params: { id: createdLoanId } });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.success).toBe(true);
    expect(getBody.data.loan.id).toBe(createdLoanId);
    expect(getBody.data.position.outstandingPrincipal).toBe(200000);
    expect(getBody.data.schedule.length).toBe(24);

    // 3. Record a payment of ₹5,000
    const payReq = new NextRequest(`http://localhost:3000/api/loans/${createdLoanId}/payments`, {
      method: "POST",
      headers: validAuthHeaders,
      body: JSON.stringify({
        amount: 5000,
        paymentDate: "2026-01-20T00:00:00.000Z",
        idempotencyKey: `test_pay_${Date.now()}`,
      }),
    });

    const payRes = await recordPaymentHandler(payReq, { params: { id: createdLoanId } });
    expect(payRes.status).toBe(200);
    const payBody = await payRes.json();
    expect(payBody.success).toBe(true);
    expect(payBody.data.position.totalPrincipalPaid).toBeGreaterThan(0);
  });
});
