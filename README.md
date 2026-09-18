# Vitto — Loan Repayment Service for MSME Lending

A production-grade Next.js loan repayment service built for banks, NBFCs, and MSME microfinance institutions to operate end-to-end loan repayment management, schedule generation, payment allocation, and real-time position reporting.

---

## 1. Quick Setup & Run

### Prerequisites
- **Node.js**: v18.17+ or v20+
- **PostgreSQL**: Local PostgreSQL instance, Neon, Supabase, or Docker

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Configure Environment Variables
cp .env.example .env
# Update DATABASE_URL with your PostgreSQL connection string
# (Firebase credentials can be configured or left as demo in local/test mode)

# 3. Setup and seed database schema
npx prisma db push
npx ts-node prisma/seed.ts
# Alternatively: npm run db:setup

# 4. Start Development Server
npm run dev
# Open http://localhost:3000
```

---

## 2. Running Automated Tests

Run the complete test suite (unit + integration tests) with a single command:

```bash
npm test
```

### Test Suite Structure
- **Reference Formula Verification (`tests/unit/emi.test.ts`)**: Validates exact reference case (₹2,00,000 @ 18% over 24m ≈ ₹9,986) and mathematical boundaries.
- **Schedule Generator (`tests/unit/schedule.test.ts`)**: Validates tenure count, chronological monthly due dates, and principal sum reconciliation.
- **Payment Allocation Engine (`tests/unit/allocation.test.ts`)**:
  - **Underpayment**: ₹5,000 on ~₹9,985 instalment settles interest first, remainder to principal; updates status to `PARTIALLY_PAID`.
  - **Overpayment**: 2x instalment settles current instalment and automatically rolls over to subsequent instalments.
  - **Late Payment**: 11 days past due date correctly marks instalments `OVERDUE` and computes `overdueAmount`.
  - **Duplicate Prevention**: Idempotency key protection and duplicate detection.
- **Integration Tests (`tests/integration/api.test.ts`)**: Route handlers tested against real logic (401 unauthenticated rejection, 400 validation failure, 404 not found).

---

## 3. Database Architecture & Money Type

### Database
- **Engine**: PostgreSQL (accessed via Prisma ORM)
- **Schema Management**: Created via automated migrations / `prisma db push` and `prisma/seed.ts`.
- **Integrity Enforcement**: Strict cascading foreign keys (`onDelete: Cascade`) guarantee that payments and instalments cannot exist without an associated loan.

### Money Type Decision
- **PostgreSQL**: Stored as `Decimal(14, 2)` (`numeric(14,2)` in PostgreSQL). Floating point types (`FLOAT`, `DOUBLE PRECISION`, `REAL`) are strictly avoided.
- **Application Engine**: Handled using `decimal.js` with 30-digit internal precision and `ROUND_HALF_UP` banking standard.
- **Rationale**: Floating-point representations (IEEE 754) suffer from binary rounding errors (e.g. `0.1 + 0.2 !== 0.3`). In institutional lending, cumulative rounding drifts create regulatory and financial auditing non-compliance. `Decimal(14, 2)` ensures exact arithmetic to the paise.

---

## 4. Financial Logic, Allocation Order & Rounding Decisions

### EMI Reference Formula
$$\text{EMI} = P \times r \times \frac{(1 + r)^n}{(1 + r)^n - 1}$$
where:
- $P$ = Principal
- $n$ = Tenure in months
- $r$ = Monthly interest rate = $\frac{\text{Annual Rate}}{12 \times 100}$

**Verification Case**: ₹2,00,000 at 18% p.a. over 24 months yields monthly EMI of ₹9,984.82 (~₹9,986 with standard 1-2 rupee rounding variance).

### Residual Rounding Absorption
For each instalment $1 \dots (n-1)$, monthly interest is calculated on remaining principal balance and deducted from EMI to compute principal component. In the **final instalment ($n$)**, the principal component is set directly to the exact remaining loan balance, absorbing any 1-2 rupee rounding variance so that the sum of principal payments equals exactly $P$.

### Payment Allocation Hierarchy
When a payment arrives:
1. **Chronological Order**: Allocated strictly to the oldest unpaid or partially-paid instalment first.
2. **Component Priority**: Within an instalment, **Interest Component** is settled first, followed by **Principal Component**.
3. **Overpayments**: Any payment in excess of the current instalment automatically rolls over to reduce subsequent instalments in chronological sequence.
4. **Late Payments**: Unsettled instalments past their due date are marked `OVERDUE` and aggregated into the loan's `overdueAmount` until settled.
5. **Duplicate Submissions**: Enforces unique `idempotencyKey` per payment transaction, rejecting duplicates with `409 Conflict`.

---

## 5. API Endpoint Reference

All endpoints enforce server-side Firebase Authentication via `Authorization: Bearer <token>`.

### 1. Create Loan
`POST /api/loans`

**Request Body:**
```json
{
  "principal": 200000,
  "annualInterestRate": 18.0,
  "tenureMonths": 24,
  "disbursementDate": "2026-01-15T00:00:00.000Z"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "loan": {
      "id": "clx...",
      "principal": 200000,
      "annualInterestRate": 18,
      "tenureMonths": 24,
      "disbursementDate": "2026-01-15T00:00:00.000Z",
      "monthlyEmi": 9984.82,
      "status": "ACTIVE"
    },
    "position": {
      "outstandingPrincipal": 200000,
      "totalPrincipalPaid": 0,
      "totalInterestPaid": 0,
      "nextDueDate": "2026-02-15T00:00:00.000Z",
      "nextDueAmount": 9984.82,
      "overdueAmount": 0,
      "status": "ACTIVE"
    },
    "schedule": [...]
  }
}
```

---

### 2. Get Loan Details & Schedule
`GET /api/loans/:id`

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "loan": { ... },
    "position": {
      "outstandingPrincipal": 193015.18,
      "totalPrincipalPaid": 6984.82,
      "totalInterestPaid": 3000.00,
      "nextDueDate": "2026-03-15T00:00:00.000Z",
      "nextDueAmount": 9984.82,
      "overdueAmount": 0,
      "status": "ACTIVE"
    },
    "schedule": [
      {
        "instalmentNumber": 1,
        "dueDate": "2026-02-15T00:00:00.000Z",
        "principalComponent": 6984.82,
        "interestComponent": 3000.00,
        "totalDue": 9984.82,
        "principalPaid": 6984.82,
        "interestPaid": 3000.00,
        "amountPaid": 9984.82,
        "status": "PAID"
      }
    ],
    "payments": [...]
  }
}
```

---

### 3. Record Payment
`POST /api/loans/:id/payments`

**Request Body:**
```json
{
  "amount": 9984.82,
  "paymentDate": "2026-02-15T00:00:00.000Z",
  "idempotencyKey": "TXN-20260215-01"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_...",
      "amount": 9984.82,
      "paymentDate": "2026-02-15T00:00:00.000Z",
      "idempotencyKey": "TXN-20260215-01"
    },
    "allocations": [
      {
        "instalmentNumber": 1,
        "interestAllocated": 3000.00,
        "principalAllocated": 6984.82,
        "totalAllocated": 9984.82
      }
    ],
    "position": { ... },
    "schedule": [ ... ]
  }
}
```

---

### Standard Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | LOAN_NOT_FOUND | DUPLICATE_PAYMENT",
    "message": "Human readable error description",
    "details": {}
  }
}
```

---

## 6. Authentication

- **Client**: Firebase Web SDK with Email/Password, Google OAuth, and 1-click Quick Demo Sign-In.
- **Server**: Firebase Admin SDK verifying Bearer JWT tokens in `Authorization` header on all three route handlers.
- Unauthenticated requests are rejected with `401 Unauthorized`.
