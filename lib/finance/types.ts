import { Decimal } from "decimal.js";

export type InstalmentStatus = "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
export type LoanStatus = "ACTIVE" | "CLOSED";

export interface ScheduleItemInput {
  instalmentNumber: number;
  dueDate: Date;
  principalComponent: Decimal;
  interestComponent: Decimal;
  totalDue: Decimal;
  principalPaid: Decimal;
  interestPaid: Decimal;
  amountPaid: Decimal;
  status: InstalmentStatus;
}

export interface ScheduleItemResponse {
  id?: string;
  instalmentNumber: number;
  dueDate: string; // ISO string
  principalComponent: number;
  interestComponent: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  amountPaid: number;
  status: InstalmentStatus;
}

export interface LoanPosition {
  outstandingPrincipal: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  overdueAmount: number;
  status: LoanStatus;
}

export interface CreateLoanInput {
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  disbursementDate: string | Date;
}

export interface RecordPaymentInput {
  amount: number;
  paymentDate: string | Date;
  idempotencyKey?: string;
  notes?: string;
}

export interface PaymentAllocationResult {
  scheduleId?: string;
  instalmentNumber: number;
  principalAllocated: number;
  interestAllocated: number;
  totalAllocated: number;
}
