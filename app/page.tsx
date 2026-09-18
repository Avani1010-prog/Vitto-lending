"use client";

import React, { useState, useEffect } from "react";
import {
  auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "@/lib/auth/firebase-client";
import {
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  LogOut,
  LogIn,
  RefreshCw,
  TrendingDown,
  ShieldCheck,
  Percent,
} from "lucide-react";

interface Loan {
  id: string;
  principal: number;
  annualInterestRate: number;
  tenureMonths: number;
  disbursementDate: string;
  monthlyEmi: number;
  status: string;
  createdAt: string;
}

interface Instalment {
  id: string;
  instalmentNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  totalDue: number;
  principalPaid: number;
  interestPaid: number;
  amountPaid: number;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID" | "OVERDUE";
}

interface LoanPosition {
  outstandingPrincipal: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  overdueAmount: number;
  status: string;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  paymentDate: string;
  idempotencyKey?: string;
  notes?: string;
  createdAt: string;
}

export default function Dashboard() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("admin@vitto.money");
  const [password, setPassword] = useState<string>("password123");
  const [authError, setAuthError] = useState<string>("");

  // Data state
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [currentLoan, setCurrentLoan] = useState<Loan | null>(null);
  const [position, setPosition] = useState<LoanPosition | null>(null);
  const [schedule, setSchedule] = useState<Instalment[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loadingLoan, setLoadingLoan] = useState<boolean>(false);

  // Form states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createPrincipal, setCreatePrincipal] = useState<number>(200000);
  const [createRate, setCreateRate] = useState<number>(18);
  const [createTenure, setCreateTenure] = useState<number>(24);
  const [createDate, setCreateDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [createError, setCreateError] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);

  // Payment Form states
  const [payAmount, setPayAmount] = useState<string>("");
  const [payDate, setPayDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [payIdempotency, setPayIdempotency] = useState<string>("");
  const [paying, setPaying] = useState<boolean>(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Track Auth state
  useEffect(() => {
    // Check if test token is in localStorage
    const savedToken = localStorage.getItem("vitto_auth_token");
    if (savedToken) {
      setToken(savedToken);
      setUser({ email: "demo.operator@vitto.money", uid: "demo-user-1" } as any);
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
        } catch {
          setToken("test-token-operator");
        }
      } else {
        setUser(null);
        setToken("");
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch loans list when authenticated
  useEffect(() => {
    if (token) {
      fetchLoans();
    }
  }, [token]);

  // Fetch specific loan details when selected
  useEffect(() => {
    if (selectedLoanId && token) {
      fetchLoanDetails(selectedLoanId);
    }
  }, [selectedLoanId, token]);

  const handleDemoSignIn = () => {
    const demoToken = "test-token-msme-officer";
    localStorage.setItem("vitto_auth_token", demoToken);
    setToken(demoToken);
    setUser({ email: "officer@vitto.money", uid: "msme-officer-1" } as any);
    setAuthError("");
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCred.user.getIdToken();
      setToken(idToken);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in. You can also use Quick Demo Sign In.");
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const idToken = await userCred.user.getIdToken();
      setToken(idToken);
    } catch (err: any) {
      setAuthError(err.message || "Failed with Google Auth. You can use Quick Demo Sign In.");
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem("vitto_auth_token");
    try {
      await signOut(auth);
    } catch {}
    setUser(null);
    setToken("");
    setLoans([]);
    setCurrentLoan(null);
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setLoans(json.data);
        if (json.data.length > 0 && !selectedLoanId) {
          setSelectedLoanId(json.data[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching loans:", e);
    }
  };

  const fetchLoanDetails = async (loanId: string) => {
    setLoadingLoan(true);
    setPaymentFeedback(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentLoan(json.data.loan);
        setPosition(json.data.position);
        setSchedule(json.data.schedule);
        setPayments(json.data.payments || []);
        if (json.data.loan.monthlyEmi && !payAmount) {
          setPayAmount(json.data.loan.monthlyEmi.toString());
        }
      }
    } catch (e) {
      console.error("Error fetching loan details:", e);
    } finally {
      setLoadingLoan(false);
    }
  };

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          principal: Number(createPrincipal),
          annualInterestRate: Number(createRate),
          tenureMonths: Number(createTenure),
          disbursementDate: new Date(createDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        await fetchLoans();
        setSelectedLoanId(json.data.loan.id);
      } else {
        setCreateError(json.error?.message || "Failed to create loan");
      }
    } catch (err: any) {
      setCreateError(err.message || "Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;
    setPaying(true);
    setPaymentFeedback(null);

    try {
      const res = await fetch(`/api/loans/${selectedLoanId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentDate: new Date(payDate).toISOString(),
          idempotencyKey: payIdempotency ? payIdempotency.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Reflect result without manual page refresh
        setPosition(json.data.position);
        setSchedule(json.data.schedule);
        const allocSummary = json.data.allocations
          ?.map(
            (a: any) =>
              `Instalment #${a.instalmentNumber}: ₹${a.interestAllocated} Interest + ₹${a.principalAllocated} Principal`
          )
          .join(" | ");

        setPaymentFeedback({
          type: "success",
          message: `Payment of ₹${Number(payAmount).toLocaleString("en-IN")} applied successfully! (${allocSummary || "Settled"})`,
        });

        // Generate fresh idempotency key for next transaction
        setPayIdempotency("");
        fetchLoans();
      } else {
        setPaymentFeedback({
          type: "error",
          message: json.error?.message || "Failed to record payment",
        });
      }
    } catch (err: any) {
      setPaymentFeedback({
        type: "error",
        message: err.message || "Network error recording payment",
      });
    } finally {
      setPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // Unauthenticated Sign-in View
  if (!user && !token) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4">
            <Building2 className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Vitto Lending
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            MSME Loan Repayment Service & Portfolio Accounting
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 shadow-2xl border border-slate-800 sm:rounded-2xl sm:px-10">
            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleEmailSignIn}>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Sign In with Firebase
              </button>
            </form>

            <div className="mt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-900 px-2 text-slate-500">Or authenticate instantly</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-700 rounded-lg text-sm text-slate-300 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4 text-indigo-400" />
                  Sign In with Google
                </button>

                <button
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-emerald-500/30 rounded-lg text-sm font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/60 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Quick Demo Operator Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
                Vitto MSME Lending
                <span className="text-[10px] uppercase font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Repayment Service
                </span>
              </h1>
              <p className="text-xs text-slate-400">Amortization & Payment Allocation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              New Loan
            </button>

            <div className="h-4 w-px bg-slate-800" />

            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-slate-300">{user?.email || "MSME Officer"}</div>
              <div className="text-[10px] text-emerald-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Authenticated
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Loan Selector Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Loan Account:
            </span>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-sm font-semibold rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {loans.map((l) => (
                <option key={l.id} value={l.id}>
                  Loan #{l.id.slice(0, 8)} — ₹{l.principal.toLocaleString("en-IN")} ({l.tenureMonths}m @ {l.annualInterestRate}%)
                </option>
              ))}
            </select>
          </div>

          {currentLoan && (
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div>
                Disbursed: <span className="text-slate-200 font-medium">{new Date(currentLoan.disbursementDate).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                Monthly EMI: <span className="text-indigo-400 font-bold">₹{currentLoan.monthlyEmi.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div>
                Status:{" "}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  currentLoan.status === "CLOSED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                }`}>
                  {position?.status || currentLoan.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Loan Position KPI Cards */}
        {position && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Outstanding Principal */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Outstanding Principal
                </span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                ₹{position.outstandingPrincipal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>₹{position.totalPrincipalPaid.toLocaleString("en-IN")} principal collected</span>
              </div>
            </div>

            {/* Next Due Amount & Date */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Next Due Amount
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-300 tracking-tight">
                ₹{position.nextDueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Due:{" "}
                <span className="text-slate-200 font-medium">
                  {position.nextDueDate ? new Date(position.nextDueDate).toLocaleDateString("en-IN") : "All Dues Cleared"}
                </span>
              </div>
            </div>

            {/* Overdue Amount */}
            <div className={`rounded-xl p-5 border relative overflow-hidden ${
              position.overdueAmount > 0
                ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Overdue Amount
                </span>
                <AlertCircle className={`w-4 h-4 ${position.overdueAmount > 0 ? "text-rose-400" : "text-slate-500"}`} />
              </div>
              <div className={`mt-2 text-2xl font-bold tracking-tight ${position.overdueAmount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                ₹{position.overdueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs">
                {position.overdueAmount > 0 ? (
                  <span className="text-rose-400 font-medium">Action Required: Immediate recovery</span>
                ) : (
                  <span className="text-emerald-400 font-medium">No overdue instalments</span>
                )}
              </div>
            </div>

            {/* Total Interest Collected */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Interest Collected
                </span>
                <Percent className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-400 tracking-tight">
                ₹{position.totalInterestPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Loan Rate: <span className="text-slate-200 font-medium">{currentLoan?.annualInterestRate}% p.a.</span>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Form & Actions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <h2 className="text-base font-semibold text-white">Record Loan Payment</h2>
            </div>
            {currentLoan && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(currentLoan.monthlyEmi.toString())}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
                >
                  Regular EMI (₹{currentLoan.monthlyEmi})
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount("5000")}
                  className="px-2.5 py-1 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 transition"
                >
                  Underpay (₹5,000)
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount((currentLoan.monthlyEmi * 2).toFixed(2))}
                  className="px-2.5 py-1 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30 transition"
                >
                  Overpay (2x EMI)
                </button>
              </div>
            )}
          </div>

          {paymentFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                paymentFeedback.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}
            >
              {paymentFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              )}
              <span>{paymentFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="9986.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Idempotency / Ref Key (Optional)
              </label>
              <input
                type="text"
                value={payIdempotency}
                onChange={(e) => setPayIdempotency(e.target.value)}
                placeholder="TXN-98471-A"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={paying || !selectedLoanId}
                className="w-full h-10 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
              >
                {paying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Apply Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Repayment Schedule Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Full Repayment Schedule</h3>
              <p className="text-xs text-slate-400">
                Amortized monthly instalments with exact principal/interest settlement breakdown
              </p>
            </div>
            <button
              onClick={() => selectedLoanId && fetchLoanDetails(selectedLoanId)}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-800"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLoan ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Principal Due</th>
                  <th className="py-3 px-4 text-right">Interest Due</th>
                  <th className="py-3 px-4 text-right">Total Due</th>
                  <th className="py-3 px-4 text-right">Principal Paid</th>
                  <th className="py-3 px-4 text-right">Interest Paid</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {schedule.map((item) => {
                  const isPaid = item.status === "PAID";
                  const isPartial = item.status === "PARTIALLY_PAID";
                  const isOverdue = item.status === "OVERDUE";

                  return (
                    <tr
                      key={item.id || item.instalmentNumber}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isPaid ? "bg-slate-900/40 opacity-70" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        {item.instalmentNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {new Date(item.dueDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        ₹{item.principalComponent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        ₹{item.interestComponent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                        ₹{item.totalDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        ₹{item.principalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        ₹{item.interestPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-300">
                        ₹{item.amountPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isPartial
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : isOverdue
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Loan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Originate New MSME Loan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Principal Amount (₹50,000 to ₹10,00,000)
                </label>
                <input
                  type="number"
                  min="50000"
                  max="1000000"
                  step="1000"
                  required
                  value={createPrincipal}
                  onChange={(e) => setCreatePrincipal(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="60"
                    required
                    value={createRate}
                    onChange={(e) => setCreateRate(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tenure (Months: 3-36)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="36"
                    required
                    value={createTenure}
                    onChange={(e) => setCreateTenure(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Disbursement Date
                </label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  {creating ? "Generating..." : "Generate Loan & Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
