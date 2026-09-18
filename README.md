# 🏦 Vitto — Institutional MSME Loan Repayment & Portfolio Accounting Engine

<div align="center">

![Vitto Banner](https://img.shields.io/badge/Vitto-MSME%20Lending%20Engine-000000?style=for-the-badge&logo=firebase&logoColor=white)

[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon%20Serverless%20Cloud-336791?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Tests-19%2F19%20Passing%20(100%25)-success?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%203.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Auth-Firebase%20Token%20Verified-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Financial Precision](https://img.shields.io/badge/Arithmetic-Decimal(14%2C2)%20Precision-blueviolet?style=flat-square)](https://github.com/MikeMcl/decimal.js/)
[![Code Style](https://img.shields.io/badge/Code%20Style-Strict%20TypeScript-0284c7?style=flat-square)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Assessment-gray?style=flat-square)](#)

<p align="center">
  <strong>High-precision Core Banking Amortization Schedule Generation, Chronological Payment Waterfall Engine, and Real-Time Position Accounting for MSME Credit Lines.</strong>
</p>

[✨ Live Features](#-key-capabilities) • [🏗️ System Architecture](#-system-architecture--data-flow) • [📊 Diagrams & ERD](#-database-entity-relationship-diagram-erd) • [📈 Charts & Graphs](#-amortization-math--financial-charts) • [🧪 Automated Tests](#-automated-test-suite-19-tests) • [📡 API Reference](#-rest-api-documentation)

</div>

---

## 📑 Table of Contents
- [Executive Overview](#-executive-overview)
- [Key Capabilities](#-key-capabilities)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Database Entity-Relationship Diagram (ERD)](#-database-entity-relationship-diagram-erd)
- [State Machine: Loan & Installment Lifecycle](#-state-machine-loan--installment-lifecycle)
- [Payment Allocation Waterfall Engine](#-payment-allocation-waterfall-engine)
- [Amortization Math & Financial Charts](#-amortization-math--financial-charts)
- [Sequence Diagram: Payment Ingestion & Settlement](#-sequence-diagram-payment-ingestion--settlement)
- [Edge Cases & Decision Matrix](#-edge-cases--decision-matrix)
- [Quick Start & Setup Instructions](#-quick-start--setup-instructions)
- [Automated Test Suite (19 Tests)](#-automated-test-suite-19-tests)
- [REST API Documentation](#-rest-api-documentation)
- [UI / UX Design & Features](#-ui--ux-design--features)

---

## 🏛️ Executive Overview

**Vitto** provides modern digital infrastructure for MSME lending. Banks, NBFCs, and microfinance lenders rely on Vitto's core operating engine to reliably originate credit lines, generate actuarially sound amortization schedules, and enforce rigorous repayment settlement rules.

This repository implements a production-ready **MSME Loan Repayment Service** managing micro-loans (ranging from **₹50,000 to ₹10,00,000** over **3 to 36 months**).

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║                              CORE GUARANTEES                                       ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║  1. Zero Floating-Point Drift: 30-digit decimal math with half-up rounding.         ║
║  2. Chronological Waterfall: Oldest unpaid dues resolved first, interest prioritized║
║  3. Exact Balance Balancing: Remainder fractions reconciled on final installment.  ║
║  4. ACID Database Consistency: Atomic transactions via Prisma + Neon Cloud Postgres ║
║  5. Security-First Architecture: Enterprise Firebase token verification guards.    ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

---

## ✨ Key Capabilities

| Icon | Feature | Description |
| :---: | :--- | :--- |
| 🧮 | **Amortization Generator** | Generates monthly reducing-balance repayment schedules with exact principal & interest components. |
| 🌊 | **Waterfall Allocator** | Splits lump-sum payments into interest-first components across chronological installments. |
| 🔄 | **Overpayment Rollover** | Excess payments automatically cascade forward into future installments seamlessly. |
| ⏱️ | **Overdue & Position KPI** | Real-time calculation of outstanding principal, next due date/amount, and overdue arrears. |
| 🛡️ | **Idempotent Transactions** | Enforces unique `idempotencyKey` per payment to prevent duplicate balance deductions on network retries. |
| 🎨 | **Monochrome Minimal UI** | Ultra-responsive grey/black/white dark-mode single page interface with instant zero-refresh state updates. |

---

## 🏗️ System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph ClientLayer ["Client & Ingestion Layer"]
        UI["💻 Vitto Next.js 14 Single-Page Dashboard\n(Real-Time Amortization, KPIs & Form Actions)"]
        ExternalAPI["🌐 Core Banking Gateway / API Consumer\n(HTTP REST Calls with Bearer Token)"]
    end

    subgraph SecurityLayer ["Security & Authentication Guard"]
        AuthMiddleware{"🛡️ Server-Side Auth Guard\n(lib/auth/server-guard.ts)"}
        FBAdmin["🔥 Firebase Admin SDK\n(Token Cryptographic Verification)"]
    end

    subgraph AppRouter ["Next.js App Router API Routes (Node.js Server)"]
        OriginateRoute["POST /api/loans\n(Loan Origination & Schedule Gen)"]
        PositionRoute["GET /api/loans/:id\n(Position & Schedule Retrieval)"]
        PaymentRoute["POST /api/loans/:id/payments\n(Atomic Payment Allocation)"]
        
        subgraph FinanceCore ["Financial Arithmetic Core (decimal.js)"]
            EMIEngine["🧮 Amortization Engine\n(Reducing Balance Formula)"]
            AllocEngine["🌊 Waterfall Settlement Engine\n(Interest-First + Chronological Roll)"]
            PosEvaluator["📊 Portfolio Position Evaluator\n(Arrears & Next Due Aggregator)"]
        end
    end

    subgraph DataStorage ["Persistence Layer"]
        PrismaORM["⚡ Prisma Client (Decimal 14,2 Precision)"]
        NeonPostgres[("🐘 Neon Serverless PostgreSQL\n(ACID Compliant Cloud Storage)")]
        MemoryFallback[("💾 In-Memory High-Speed Cache\n(Zero-Config Offline Store)")]
    end

    UI -->|Bearer JWT Token| AuthMiddleware
    ExternalAPI -->|Bearer JWT Token| AuthMiddleware
    AuthMiddleware -->|Verify Token Signature| FBAdmin
    AuthMiddleware -->|200 Authorized| OriginateRoute & PositionRoute & PaymentRoute
    
    OriginateRoute --> EMIEngine
    PaymentRoute --> AllocEngine
    PositionRoute & PaymentRoute --> PosEvaluator

    EMIEngine & AllocEngine & PosEvaluator --> PrismaORM
    PrismaORM -->|Pooled Direct TLS| NeonPostgres
    PrismaORM -.->|Fallback Support| MemoryFallback
```

---

## 📊 Database Entity-Relationship Diagram (ERD)

Strict relational integrity with `onDelete: Cascade` ensures that child repayment schedules and payment allocations can never become orphaned.

```mermaid
erDiagram
    LOAN ||--o{ REPAYMENT_SCHEDULE : "generates (1..N)"
    LOAN ||--o{ PAYMENT : "receives (0..M)"
    PAYMENT ||--o{ PAYMENT_ALLOCATION : "splits into (1..K)"
    REPAYMENT_SCHEDULE ||--o{ PAYMENT_ALLOCATION : "settled by (0..K)"

    LOAN {
        string id PK "cuid unique identifier"
        decimal principal "Principal Amount (14, 2)"
        decimal annualInterestRate "Annual Interest Rate % (5, 2)"
        int tenureMonths "Tenure in Months (3..36)"
        datetime disbursementDate "Disbursement timestamp"
        decimal monthlyEmi "Monthly Equated Instalment (14, 2)"
        decimal totalPrincipalPaid "Cumulative Principal Sunk (14, 2)"
        decimal totalInterestPaid "Cumulative Interest Sunk (14, 2)"
        string status "ACTIVE | CLOSED"
        datetime createdAt "Timestamp"
        datetime updatedAt "Timestamp"
    }

    REPAYMENT_SCHEDULE {
        string id PK "cuid unique identifier"
        string loanId FK "References LOAN(id) [CASCADE]"
        int instalmentNumber "Instalment Index (1..N)"
        datetime dueDate "Monthly Due Date"
        decimal principalComponent "Principal Due for Month (14, 2)"
        decimal interestComponent "Interest Due for Month (14, 2)"
        decimal totalDue "Total Monthly Due (14, 2)"
        decimal principalPaid "Cumulative Principal Paid (14, 2)"
        decimal interestPaid "Cumulative Interest Paid (14, 2)"
        decimal amountPaid "Cumulative Total Paid (14, 2)"
        string status "PENDING | PARTIALLY_PAID | PAID | OVERDUE"
    }

    PAYMENT {
        string id PK "cuid unique identifier"
        string loanId FK "References LOAN(id) [CASCADE]"
        decimal amount "Gross Paid Amount (14, 2)"
        datetime paymentDate "Date of transaction"
        string idempotencyKey "Unique idempotency reference"
        string notes "Audit notes"
        datetime createdAt "Timestamp"
    }

    PAYMENT_ALLOCATION {
        string id PK "cuid unique identifier"
        string paymentId FK "References PAYMENT(id) [CASCADE]"
        string scheduleId FK "References REPAYMENT_SCHEDULE(id) [CASCADE]"
        decimal principalAllocated "Principal portion settled (14, 2)"
        decimal interestAllocated "Interest portion settled (14, 2)"
        decimal totalAllocated "Combined allocation sum (14, 2)"
    }
```

---

## 🔄 State Machine: Loan & Installment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> LOAN_ACTIVE: POST /api/loans (Disbursed)

    state LOAN_ACTIVE {
        [*] --> PENDING: Schedule Generated
        
        PENDING --> PARTIALLY_PAID: Partial Underpayment Received
        PENDING --> OVERDUE: Current Date > Due Date & Balance > 0
        PENDING --> PAID: Exact / Excess Payment Received
        
        PARTIALLY_PAID --> PAID: Remaining Balance Settled
        PARTIALLY_PAID --> OVERDUE: Current Date > Due Date & Balance > 0
        
        OVERDUE --> PARTIALLY_PAID: Partial Arrears Payment
        OVERDUE --> PAID: Full Arrears Sunk
        
        PAID --> [*]: All N Instalments Completed
    }

    LOAN_ACTIVE --> LOAN_CLOSED: Outstanding Principal == 0 & All N PAID
    LOAN_CLOSED --> [*]
```

---

## 🌊 Payment Allocation Waterfall Engine

When a payment of amount $X$ is received, it executes through the following priority rules:
1. **Chronological Sorting**: Earliest uncompleted installment index ($1, 2, \dots, N$) is processed first.
2. **Interest Priority**: Outstanding interest of that installment is settled before any principal.
3. **Principal Priority**: Remaining funds reduce the principal portion of that installment.
4. **Cascade / Rollover**: If funds remain, the engine advances to the next installment until funds reach $0$.

```mermaid
flowchart TD
    Start(["📥 Incoming Payment: ₹X (asOfDate)"]) --> Sort["Sort Schedules by instalmentNumber ASC"]
    Sort --> FindTarget["Find Oldest Schedule where status != PAID"]
    
    FindTarget --> CheckFunds{"Remaining ₹X > 0?"}
    CheckFunds -- No --> Commit["💾 Commit DB Transaction & Recalculate KPIs"]
    Commit --> Done(["✅ Return HTTP 200 with Allocation Summary"])
    
    CheckFunds -- Yes --> CalcInterest["Calculate Unpaid Interest: (interestDue - interestPaid)"]
    CalcInterest --> IntDue{"Unpaid Interest > 0?"}
    
    IntDue -- Yes --> AllocInt["Settle Interest: min(Remaining ₹X, Unpaid Interest)"]
    AllocInt --> DeductInt["Remaining ₹X = Remaining ₹X - Allocated Interest"]
    DeductInt --> CalcPrin["Calculate Unpaid Principal: (principalDue - principalPaid)"]
    
    IntDue -- No --> CalcPrin
    
    CalcPrin --> PrinDue{"Unpaid Principal > 0 and Remaining ₹X > 0?"}
    PrinDue -- Yes --> AllocPrin["Settle Principal: min(Remaining ₹X, Unpaid Principal)"]
    AllocPrin --> DeductPrin["Remaining ₹X = Remaining ₹X - Allocated Principal"]
    DeductPrin --> UpdateStatus["Update Schedule Status (PAID / PARTIALLY_PAID)"]
    
    PrinDue -- No --> UpdateStatus
    
    UpdateStatus --> NextSchedule{"More Schedules Exist?"}
    NextSchedule -- Yes --> AdvanceInstalment["Advance to Next Instalment (i = i + 1)"]
    AdvanceInstalment --> CheckFunds
    NextSchedule -- No --> ExcessToPrincipal["Apply Excess Directly to Remaining Principal Balance"]
    ExcessToPrincipal --> Commit
```

---

## 📈 Amortization Math & Financial Charts

### 1. Actuarial Equated Monthly Instalment (EMI) Formula

The monthly payment is calculated using the actuarial reducing-balance method:

$$\text{EMI} = P \times r \times \frac{(1 + r)^n}{(1 + r)^n - 1}$$

Where:
- $P$ = Loan Principal (e.g. ₹2,00,000)
- $r$ = Monthly Interest Rate $= \frac{\text{Annual Rate}}{12 \times 100} = \frac{18}{1200} = 0.015$
- $n$ = Tenure in Months (e.g. 24)

### 2. Month-by-Month Amortization Breakdown (₹2,00,000 @ 18% p.a. over 24 Months)

In reducing-balance amortization, the interest component decreases exponentially over time while the principal repayment component rises.

```mermaid
xychart-beta
    title "Instalment Component Progression (Interest vs Principal)"
    x-axis ["M1", "M3", "M6", "M9", "M12", "M15", "M18", "M21", "M24"]
    y-axis "Amount (INR)" 0 --> 10000
    bar [6985, 7195, 7525, 7871, 8232, 8610, 9005, 9418, 9837]
    line [3000, 2790, 2460, 2114, 1753, 1375, 980, 567, 148]
```
> 🟦 **Bars:** Principal Component Repaid &nbsp;|&nbsp; 🟩 **Line:** Monthly Interest Component

### 3. Total Lifetime Cash Outflow Breakdown

For a ₹2,00,000 loan over 24 months @ 18% p.a.:
- **Total Principal Repaid**: ₹2,00,000.00 (83.4%)
- **Total Interest Paid**: ₹39,635.68 (16.6%)
- **Total Repayment Sum**: ₹2,39,635.68

```mermaid
pie title Lifetime Repayment Distribution (₹2,39,635.68)
    "Principal Sunk (₹2,00,000.00)" : 83.46
    "Interest Paid (₹39,635.68)" : 16.54
```

---

## ⚡ Sequence Diagram: Payment Ingestion & Settlement

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 Lending Operator / Core Banking
    participant NextAPI as 🌐 Next.js Route Handler
    participant Guard as 🛡️ Server Auth Guard
    participant Engine as 🌊 Waterfall Allocator
    participant DB as 🐘 Neon PostgreSQL

    User->>NextAPI: POST /api/loans/:id/payments (amount, date, idempotencyKey)
    NextAPI->>Guard: verifyAuth(Authorization Header)
    alt Token Missing or Invalid
        Guard-->>NextAPI: 401 Unauthorized
        NextAPI-->>User: {"error": "Authentication required"}
    else Token Valid
        Guard-->>NextAPI: User Context (uid, email)
        NextAPI->>DB: prisma.$transaction (SERIALIZABLE / READ COMMITTED)
        DB-->>NextAPI: Existing Loan + Schedules + Past Payments
        
        opt Idempotency Key Already Exists
            NextAPI-->>User: 409 Conflict / Return Existing Receipt
        end
        
        NextAPI->>Engine: allocatePayment(loan, schedules, amount, date)
        Engine-->>NextAPI: Updated Schedules + Allocations Matrix
        
        NextAPI->>DB: Parallel DB Schedule Updates + Create Payment Record
        DB-->>NextAPI: Transaction Committed Successfully
        NextAPI-->>User: 200 OK (Payment Receipt, Allocations, New Position)
    end
```

---

## 🛡️ Edge Cases & Decision Matrix

| # | Edge Case | Concrete Scenario | System Decision & Resolution Rule |
| :-: | :--- | :--- | :--- |
| **1** | **Underpayment** | Due is ₹9,985; received ₹5,000. | **Interest-first rule:** ₹3,000 settles full monthly interest, remaining ₹2,000 reduces principal. Installment status becomes `PARTIALLY_PAID`. |
| **2** | **Overpayment (2x EMI)** | Due is ₹9,985; received ₹20,000. | Settle current month completely (marked `PAID`). Excess ₹10,015 **rolls over into Month #2**, settling Month #2 interest first and principal next. |
| **3** | **Late Payment / Arrears** | Payment arrives 15 days past due date. | Evaluates `asOfDate` against `dueDate`. Unsettled past installments are marked `OVERDUE` and tabulated in `overdueAmount` KPI. |
| **4** | **Duplicate Submission** | Network retry sends duplicate payload. | Evaluated via **`idempotencyKey`**. Rejects duplicate requests with `409 Conflict` or returns original receipt without double-charging ledger. |
| **5** | **Paise Remainder Reconciliation** | Cumulative roundings lead to ₹0.02 delta. | On the final installment ($n$-th), the exact residual principal is balanced so that $\sum (\text{principalComponent}) \equiv \text{Total Principal}$. |
| **6** | **Floating Point Precision** | JS binary IEEE-754 floating point arithmetic. | Standard JS `number` math is strictly forbidden. Computed with **`decimal.js`** using `ROUND_HALF_UP` banking precision to 2 decimal places. |

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites
- **Node.js**: v18.17+ or v20+
- **Database**: PostgreSQL (Neon Cloud, Supabase, Docker, or Local PostgreSQL)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Avani1010-prog/Vitto-lending.git
cd Vitto-lending
npm install
```

### 2. Configure Environment Variables
Create `.env` in the root directory (refer to `.env.example`):
```env
# Neon PostgreSQL Database Connection
DATABASE_URL="postgresql://neondb_owner:npg_password@ep-royal-pine.aws.neon.tech/neondb?sslmode=require"

# Test Authentication Bypass (Set to "true" for automated tests and development)
ENABLE_TEST_AUTH="true"

# Client-Side Firebase Credentials
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyYourFirebaseApiKey"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="vitto-lending.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="vitto-lending"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="vitto-lending.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789012"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789012:web:abcdef123456"
```

### 3. Initialize Prisma Database Schema
Push the schema to your PostgreSQL database:
```bash
npx prisma db push
```

### 4. Run the Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Automated Test Suite (19 Tests)

All unit math and end-to-end database integration tests run via Vitest:

```bash
npm test
```

### Complete Test Output Verification

```
 ✓ tests/unit/emi.test.ts (6 tests)
   ✓ Reference Case: ₹2,00,000 @ 18% over 24m yields ₹9,984.82 (~₹9,986)
   ✓ Zero interest rate calculation
   ✓ Boundary validations (min ₹50,000, max ₹10,000,000, 3-36 months)
   ✓ Monthly rate compounding precision
   ✓ Rounding half-up financial precision
   ✓ High tenure stress test (36 months)

 ✓ tests/unit/schedule.test.ts (4 tests)
   ✓ Exactly N monthly amortized instalments generated
   ✓ Monthly chronological due date sequencing
   ✓ Principal sum reconciliation: sum(principalComponent) == total principal
   ✓ Last instalment remainder balancing

 ✓ tests/unit/allocation.test.ts (5 tests)
   ✓ Underpayment: ₹5,000 on ₹9,986 settles interest first; status PARTIALLY_PAID
   ✓ Overpayment: 2x EMI settles current instalment and rolls over to month #2
   ✓ Late Payment: 11 days past due correctly flagged OVERDUE with overdueAmount
   ✓ Duplicate Prevention: Idempotency key conflict rejection
   ✓ Multi-instalment partial settlement reconciliation

 ✓ tests/integration/api.test.ts (4 tests)
   ✓ Integration 1: Unauthenticated request rejected with 401 Unauthorized
   ✓ Integration 2: Invalid inputs (negative principal, 0 tenure) rejected with 400 Bad Request
   ✓ Integration 3: Unknown loan identifier returns 404 Not Found
   ✓ Integration 4: Real PostgreSQL End-to-End Success Path (Create 201 -> Fetch 200 -> Pay 200)

 Test Files  4 passed (4)
      Tests  19 passed (19)
   Start at  16:15:00
   Duration  4.12s
```

---

## 📡 REST API Documentation

### 1. Originate New Loan
- **Method:** `POST /api/loans`
- **Headers:** `Authorization: Bearer <ID_TOKEN>`, `Content-Type: application/json`

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/loans \
  -H "Authorization: Bearer mock-token-admin@vitto.money" \
  -H "Content-Type: application/json" \
  -d '{
    "principal": 200000,
    "annualInterestRate": 18,
    "tenureMonths": 24,
    "disbursementDate": "2026-01-15T00:00:00.000Z"
  }'
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "loan": {
      "id": "cmu6ra5mu00011415y7ue0e8j",
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
    "schedule": [
      {
        "instalmentNumber": 1,
        "dueDate": "2026-02-15T00:00:00.000Z",
        "principalComponent": 6984.82,
        "interestComponent": 3000.00,
        "totalDue": 9984.82,
        "amountPaid": 0,
        "status": "PENDING"
      }
    ]
  }
}
```

---

### 2. Fetch Loan Details, Amortization Schedule & Position
- **Method:** `GET /api/loans/:id`
- **Headers:** `Authorization: Bearer <ID_TOKEN>`

**cURL Request:**
```bash
curl -X GET http://localhost:3000/api/loans/cmu6ra5mu00011415y7ue0e8j \
  -H "Authorization: Bearer mock-token-admin@vitto.money"
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "loan": {
      "id": "cmu6ra5mu00011415y7ue0e8j",
      "principal": 200000,
      "monthlyEmi": 9984.82,
      "status": "ACTIVE"
    },
    "position": {
      "outstandingPrincipal": 193015.18,
      "totalPrincipalPaid": 6984.82,
      "totalInterestPaid": 3000.00,
      "nextDueDate": "2026-03-15T00:00:00.000Z",
      "nextDueAmount": 9984.82,
      "overdueAmount": 0,
      "status": "ACTIVE"
    },
    "schedule": [ ... ]
  }
}
```

---

### 3. Record Loan Repayment (Waterfall Allocation)
- **Method:** `POST /api/loans/:id/payments`
- **Headers:** `Authorization: Bearer <ID_TOKEN>`, `Content-Type: application/json`

**cURL Request:**
```bash
curl -X POST http://localhost:3000/api/loans/cmu6ra5mu00011415y7ue0e8j/payments \
  -H "Authorization: Bearer mock-token-admin@vitto.money" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "paymentDate": "2026-02-10T00:00:00.000Z",
    "idempotencyKey": "TXN-98471-A",
    "notes": "UPI Repayment from Borrower"
  }'
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "pay_cmu6rabce0003...",
      "amount": 5000,
      "paymentDate": "2026-02-10T00:00:00.000Z",
      "idempotencyKey": "TXN-98471-A"
    },
    "allocations": [
      {
        "instalmentNumber": 1,
        "principalAllocated": 2000.00,
        "interestAllocated": 3000.00,
        "totalAllocated": 5000.00
      }
    ],
    "position": {
      "outstandingPrincipal": 198000.00,
      "totalPrincipalPaid": 2000.00,
      "totalInterestPaid": 3000.00,
      "nextDueDate": "2026-02-15T00:00:00.000Z",
      "nextDueAmount": 4984.82,
      "overdueAmount": 0,
      "status": "ACTIVE"
    },
    "schedule": [ ... ]
  }
}
```

---

## 🎨 UI / UX Design & Features

- **Monochrome Minimal Aesthetic**: Sleek **Grey, White, and Black** design built with Tailwind CSS.
- **Side-by-Side Dual Auth**: Fast email sign-in along with interactive Google Account Chooser.
- **Zero-Refresh Real-Time Updates**: Payments and schedule modifications immediately update state without page reloads.
- **Interactive KPI Cards**: Real-time cards displaying Outstanding Principal, Next Due Date/Amount, Overdue Sum, and Collected Interest.
- **Live Waterfall Breakdown**: Direct visual feedback on how each payment was divided into Principal and Interest components.

---

<div align="center">
  <sub>Vitto MSME Lending Platform · Technical Assessment Submission · Built with Next.js, PostgreSQL, TypeScript & Prisma</sub>
</div>
