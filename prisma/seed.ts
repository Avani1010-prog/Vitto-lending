import { PrismaClient } from "@prisma/client";
import { generateRepaymentSchedule } from "../lib/finance/schedule";
import { Decimal } from "decimal.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MSME Lending database...");

  // Clean existing data
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.repaymentSchedule.deleteMany();
  await prisma.loan.deleteMany();

  // Seed Reference Loan 1: ₹2,00,000 @ 18% over 24 months
  const disbDate1 = new Date("2026-01-15T00:00:00.000Z");
  const { monthlyEmi: emi1, schedule: schedule1 } = generateRepaymentSchedule(
    200000,
    18,
    24,
    disbDate1
  );

  const loan1 = await prisma.loan.create({
    data: {
      principal: "200000.00",
      annualInterestRate: "18.00",
      tenureMonths: 24,
      disbursementDate: disbDate1,
      monthlyEmi: emi1.toFixed(2),
      status: "ACTIVE",
    },
  });

  await prisma.repaymentSchedule.createMany({
    data: schedule1.map((item) => ({
      loanId: loan1.id,
      instalmentNumber: item.instalmentNumber,
      dueDate: item.dueDate,
      principalComponent: item.principalComponent.toFixed(2),
      interestComponent: item.interestComponent.toFixed(2),
      totalDue: item.totalDue.toFixed(2),
      principalPaid: "0.00",
      interestPaid: "0.00",
      amountPaid: "0.00",
      status: "PENDING",
    })),
  });

  // Seed Loan 2: ₹5,00,000 @ 14.5% over 12 months (Working Capital Loan)
  const disbDate2 = new Date("2026-02-01T00:00:00.000Z");
  const { monthlyEmi: emi2, schedule: schedule2 } = generateRepaymentSchedule(
    500000,
    14.5,
    12,
    disbDate2
  );

  const loan2 = await prisma.loan.create({
    data: {
      principal: "500000.00",
      annualInterestRate: "14.50",
      tenureMonths: 12,
      disbursementDate: disbDate2,
      monthlyEmi: emi2.toFixed(2),
      status: "ACTIVE",
    },
  });

  await prisma.repaymentSchedule.createMany({
    data: schedule2.map((item) => ({
      loanId: loan2.id,
      instalmentNumber: item.instalmentNumber,
      dueDate: item.dueDate,
      principalComponent: item.principalComponent.toFixed(2),
      interestComponent: item.interestComponent.toFixed(2),
      totalDue: item.totalDue.toFixed(2),
      principalPaid: "0.00",
      interestPaid: "0.00",
      amountPaid: "0.00",
      status: "PENDING",
    })),
  });

  console.log(`✅ Seeded 2 loans: ${loan1.id} (₹2,00,000) and ${loan2.id} (₹5,00,000)`);
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
