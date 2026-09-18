import { generateRepaymentSchedule } from "./finance/schedule";
import { allocatePaymentToSchedule, calculateLoanPosition, ScheduleRecord } from "./finance/allocation";
import { Decimal } from "decimal.js";

interface StoredLoan {
  id: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  disbursementDate: string;
  monthlyEmi: number;
  status: string;
  createdAt: string;
  schedule: Array<{
    id: string;
    instalmentNumber: number;
    dueDate: string;
    principalComponent: number;
    interestComponent: number;
    totalDue: number;
    principalPaid: number;
    interestPaid: number;
    amountPaid: number;
    status: string;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    idempotencyKey?: string;
    notes?: string;
    createdAt: string;
  }>;
}

// Global in-memory store singleton
const globalForStore = globalThis as unknown as {
  inMemoryLoansStore: StoredLoan[] | undefined;
};

function initializeSeedLoans(): StoredLoan[] {
  // Loan 1: Reference Loan (₹2,00,000 @ 18% over 24m)
  const disb1 = new Date("2026-01-15T00:00:00.000Z");
  const { monthlyEmi: emi1, schedule: s1 } = generateRepaymentSchedule(200000, 18, 24, disb1);
  const loan1Id = "loan_ref_200k";

  // Loan 2: Working Capital Loan (₹5,00,000 @ 14.5% over 12m)
  const disb2 = new Date("2026-02-01T00:00:00.000Z");
  const { monthlyEmi: emi2, schedule: s2 } = generateRepaymentSchedule(500000, 14.5, 12, disb2);
  const loan2Id = "loan_wc_500k";

  return [
    {
      id: loan1Id,
      principal: 200000,
      annualInterestRate: 18,
      tenureMonths: 24,
      disbursementDate: disb1.toISOString(),
      monthlyEmi: emi1.toNumber(),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      schedule: s1.map((item) => ({
        id: `${loan1Id}_inst_${item.instalmentNumber}`,
        instalmentNumber: item.instalmentNumber,
        dueDate: item.dueDate.toISOString(),
        principalComponent: item.principalComponent.toNumber(),
        interestComponent: item.interestComponent.toNumber(),
        totalDue: item.totalDue.toNumber(),
        principalPaid: 0,
        interestPaid: 0,
        amountPaid: 0,
        status: "PENDING",
      })),
      payments: [],
    },
    {
      id: loan2Id,
      principal: 500000,
      annualInterestRate: 14.5,
      tenureMonths: 12,
      disbursementDate: disb2.toISOString(),
      monthlyEmi: emi2.toNumber(),
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      schedule: s2.map((item) => ({
        id: `${loan2Id}_inst_${item.instalmentNumber}`,
        instalmentNumber: item.instalmentNumber,
        dueDate: item.dueDate.toISOString(),
        principalComponent: item.principalComponent.toNumber(),
        interestComponent: item.interestComponent.toNumber(),
        totalDue: item.totalDue.toNumber(),
        principalPaid: 0,
        interestPaid: 0,
        amountPaid: 0,
        status: "PENDING",
      })),
      payments: [],
    },
  ];
}

export function getStore(): StoredLoan[] {
  if (!globalForStore.inMemoryLoansStore) {
    globalForStore.inMemoryLoansStore = initializeSeedLoans();
  }
  return globalForStore.inMemoryLoansStore;
}

export function findStoreLoan(id: string): StoredLoan | undefined {
  const store = getStore();
  return store.find((l) => l.id === id);
}

export function createStoreLoan(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number,
  disbursementDate: Date
): StoredLoan {
  const store = getStore();
  const loanId = `loan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const { monthlyEmi, schedule } = generateRepaymentSchedule(
    principal,
    annualInterestRate,
    tenureMonths,
    disbursementDate
  );

  const newLoan: StoredLoan = {
    id: loanId,
    principal,
    annualInterestRate,
    tenureMonths,
    disbursementDate: disbursementDate.toISOString(),
    monthlyEmi: monthlyEmi.toNumber(),
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    schedule: schedule.map((item) => ({
      id: `${loanId}_inst_${item.instalmentNumber}`,
      instalmentNumber: item.instalmentNumber,
      dueDate: item.dueDate.toISOString(),
      principalComponent: item.principalComponent.toNumber(),
      interestComponent: item.interestComponent.toNumber(),
      totalDue: item.totalDue.toNumber(),
      principalPaid: 0,
      interestPaid: 0,
      amountPaid: 0,
      status: "PENDING",
    })),
    payments: [],
  };

  store.unshift(newLoan);
  return newLoan;
}

export function recordStorePayment(
  loanId: string,
  amount: number,
  paymentDate: Date,
  idempotencyKey?: string,
  notes?: string
) {
  const store = getStore();
  const loan = store.find((l) => l.id === loanId);
  if (!loan) return null;

  if (idempotencyKey && loan.payments.some((p) => p.idempotencyKey === idempotencyKey)) {
    throw new Error(`Duplicate payment: idempotencyKey '${idempotencyKey}' already used`);
  }

  const scheduleRecords: ScheduleRecord[] = loan.schedule.map((s) => ({
    id: s.id,
    loanId,
    instalmentNumber: s.instalmentNumber,
    dueDate: new Date(s.dueDate),
    principalComponent: s.principalComponent,
    interestComponent: s.interestComponent,
    totalDue: s.totalDue,
    principalPaid: s.principalPaid,
    interestPaid: s.interestPaid,
    amountPaid: s.amountPaid,
    status: s.status,
  }));

  const { updatedSchedule, allocations } = allocatePaymentToSchedule(
    scheduleRecords,
    amount,
    paymentDate
  );

  // Update schedule
  loan.schedule = updatedSchedule.map((u) => {
    const original = loan.schedule.find((s) => s.id === u.id)!;
    return {
      ...original,
      principalPaid: u.principalPaid.toNumber(),
      interestPaid: u.interestPaid.toNumber(),
      amountPaid: u.amountPaid.toNumber(),
      status: u.status,
    };
  });

  const paymentRecord = {
    id: `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    amount,
    paymentDate: paymentDate.toISOString(),
    idempotencyKey,
    notes,
    createdAt: new Date().toISOString(),
  };

  loan.payments.unshift(paymentRecord);

  const position = calculateLoanPosition(
    loan.principal,
    loan.schedule.map((s) => ({
      ...s,
      loanId: loan.id,
      dueDate: new Date(s.dueDate),
    })),
    new Date()
  );

  loan.status = position.status;

  return {
    payment: paymentRecord,
    allocations,
    position,
    loan,
  };
}
