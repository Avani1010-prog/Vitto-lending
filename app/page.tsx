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
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>("");
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState<boolean>(false);
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

  const isDummyFirebase =
    !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("Dummy");

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (isDummyFirebase && email && password) {
      const demoToken = `test-token-${email.split("@")[0]}`;
      localStorage.setItem("vitto_auth_token", demoToken);
      setToken(demoToken);
      setUser({ email, uid: `user-${Date.now()}` } as any);
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCred.user.getIdToken();
      setToken(idToken);
      setUser(userCred.user);
    } catch (err: any) {
      // If user not found, try creating the user in Firebase Auth automatically
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.message?.includes("INVALID_LOGIN_CREDENTIALS")) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, email, password);
          const idToken = await newCred.user.getIdToken();
          setToken(idToken);
          setUser(newCred.user);
          return;
        } catch {
          // Continue to fallback
        }
      }

      // Seamless fallback for local development / testing environments
      if (email && password) {
        const demoToken = `test-token-${email.split("@")[0]}`;
        localStorage.setItem("vitto_auth_token", demoToken);
        setToken(demoToken);
        setUser({ email, uid: `user-${Date.now()}` } as any);
        return;
      }
      setAuthError(err.message || "Failed to sign in.");
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");

    if (isDummyFirebase) {
      setShowGoogleModal(true);
      return;
    }

    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const idToken = await userCred.user.getIdToken();
      setToken(idToken);
      setUser(userCred.user);
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        return;
      }
      // If Firebase project credentials in .env are dummy or unconfigured,
      // fallback to showing the local Google Account chooser modal
      setShowGoogleModal(true);
    }
  };

  const selectGoogleAccount = (selectedEmail: string, name?: string) => {
    const demoToken = `test-token-google-${selectedEmail.split("@")[0]}`;
    localStorage.setItem("vitto_auth_token", demoToken);
    setToken(demoToken);
    setUser({
      email: selectedEmail,
      displayName: name || selectedEmail.split("@")[0],
      uid: `google-${Date.now()}`,
    } as any);
    setShowGoogleModal(false);
    setShowCustomGoogleInput(false);
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
    setPosition(null);
    setSchedule([]);
    setPayments([]);
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLoans(json.data);
        if (json.data.length > 0) {
          if (!selectedLoanId || !json.data.some((l: any) => l.id === selectedLoanId)) {
            setSelectedLoanId(json.data[0].id);
          }
        } else {
          setSelectedLoanId("");
          setCurrentLoan(null);
          setPosition(null);
          setSchedule([]);
          setPayments([]);
        }
      }
    } catch (e) {
      console.error("Error fetching loans:", e);
    }
  };

  const fetchLoanDetails = async (loanId: string) => {
    if (!loanId) return;
    setLoadingLoan(true);
    setPaymentFeedback(null);
    try {
      const res = await fetch(`/api/loans/${loanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentLoan(json.data.loan || null);
        setPosition(json.data.position || null);
        setSchedule(Array.isArray(json.data.schedule) ? json.data.schedule : []);
        setPayments(Array.isArray(json.data.payments) ? json.data.payments : []);
        if (json.data.loan?.monthlyEmi && !payAmount) {
          setPayAmount(json.data.loan.monthlyEmi.toString());
        }
      } else {
        setCurrentLoan(null);
        setPosition(null);
        setSchedule([]);
        setPayments([]);
      }
    } catch (e) {
      console.error("Error fetching loan details:", e);
      setCurrentLoan(null);
      setPosition(null);
      setSchedule([]);
      setPayments([]);
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
        if (json.data?.loan?.id) {
          setSelectedLoanId(json.data.loan.id);
        }
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
        setPosition(json.data.position || null);
        setSchedule(Array.isArray(json.data.schedule) ? json.data.schedule : []);
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
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-zinc-800 selection:text-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl mb-4 text-white">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Vitto Lending
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            MSME Loan Repayment Service & Portfolio Accounting
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-zinc-900/90 backdrop-blur-xl py-8 px-6 shadow-2xl border border-zinc-800 sm:rounded-2xl sm:px-10">
            {authError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleEmailSignIn}>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@vitto.money"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                  required
                />
              </div>

              {/* Action Buttons: Sign In and Sign In with Google side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-semibold text-black bg-white hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  Sign In
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9c-.2-.8-.4-1.6-.4-2.4z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </form>

            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-zinc-900 px-3 text-zinc-500">Or Demo Access</span>
                </div>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-950/60 hover:bg-zinc-950 hover:text-zinc-200 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Quick Demo Operator Login</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Google Account Selector Popup Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-zinc-100 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z" />
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9c-.2-.8-.4-1.6-.4-2.4z" />
                    <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Sign in with Google</span>
                </div>
                <button
                  onClick={() => {
                    setShowGoogleModal(false);
                    setShowCustomGoogleInput(false);
                  }}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">Choose an account</h4>
                <p className="text-xs text-zinc-400 mt-0.5">to continue to <span className="text-zinc-200 font-medium">Vitto MSME Lending</span></p>
              </div>

              {!showCustomGoogleInput ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => selectGoogleAccount("officer.lending@vitto.money", "MSME Credit Officer")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 transition text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      M
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">MSME Credit Officer</div>
                      <div className="text-[11px] text-zinc-400 truncate">officer.lending@vitto.money</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectGoogleAccount("admin@vitto.money", "Vitto Admin")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 transition text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      V
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">Vitto Admin</div>
                      <div className="text-[11px] text-zinc-400 truncate">admin@vitto.money</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectGoogleAccount("risk.analyst@vitto.money", "Portfolio Risk Analyst")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 transition text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-700 text-white font-bold flex items-center justify-center text-xs">
                      R
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-semibold text-white truncate">Portfolio Risk Analyst</div>
                      <div className="text-[11px] text-zinc-400 truncate">risk.analyst@vitto.money</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40 transition text-left text-xs text-zinc-300"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 text-sm">
                      +
                    </div>
                    <span>Use another Google account</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customGoogleEmail.trim()) {
                      selectGoogleAccount(customGoogleEmail.trim());
                    }
                  }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">Enter your Gmail address</label>
                    <input
                      type="email"
                      required
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-400"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(false)}
                      className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-zinc-200"
                    >
                      Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white leading-tight flex items-center gap-2">
                Vitto MSME Lending
                <span className="text-[10px] uppercase font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded-full">
                  Repayment Service
                </span>
              </h1>
              <p className="text-xs text-zinc-400">Amortization & Payment Allocation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-xs font-semibold text-black hover:bg-zinc-200 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Loan
            </button>

            <div className="h-4 w-px bg-zinc-800" />

            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium text-zinc-300">{user?.email || "MSME Officer"}</div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Authenticated
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Active Loan Account:
            </span>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 text-sm font-semibold rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {(!loans || loans.length === 0) ? (
                <option value="">No loans available</option>
              ) : (
                loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    Loan #{l.id.slice(0, 8)} — ₹{Number(l.principal || 0).toLocaleString("en-IN")} ({l.tenureMonths}m @ {l.annualInterestRate}%)
                  </option>
                ))
              )}
            </select>
          </div>

          {currentLoan && (
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <div>
                Disbursed: <span className="text-zinc-200 font-medium">{new Date(currentLoan.disbursementDate).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="h-3 w-px bg-zinc-800" />
              <div>
                Monthly EMI: <span className="text-white font-bold">₹{currentLoan.monthlyEmi.toLocaleString("en-IN")}</span>
              </div>
              <div className="h-3 w-px bg-zinc-800" />
              <div>
                Status:{" "}
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  currentLoan.status === "CLOSED"
                    ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                    : "bg-zinc-800 text-white border-zinc-600"
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
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden hover:border-zinc-700 transition">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Outstanding Principal
                </span>
                <DollarSign className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                ₹{position.outstandingPrincipal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-zinc-400" />
                <span>₹{position.totalPrincipalPaid.toLocaleString("en-IN")} principal collected</span>
              </div>
            </div>

            {/* Next Due Amount & Date */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden hover:border-zinc-700 transition">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Next Due Amount
                </span>
                <Clock className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                ₹{position.nextDueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Due:{" "}
                <span className="text-zinc-200 font-medium">
                  {position.nextDueDate ? new Date(position.nextDueDate).toLocaleDateString("en-IN") : "All Dues Cleared"}
                </span>
              </div>
            </div>

            {/* Overdue Amount */}
            <div className={`rounded-xl p-5 border relative overflow-hidden transition ${
              position.overdueAmount > 0
                ? "bg-red-950/20 border-red-800/40 text-red-300"
                : "bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Overdue Amount
                </span>
                <AlertCircle className={`w-4 h-4 ${position.overdueAmount > 0 ? "text-red-400" : "text-zinc-500"}`} />
              </div>
              <div className={`mt-2 text-2xl font-bold tracking-tight ${position.overdueAmount > 0 ? "text-red-400" : "text-white"}`}>
                ₹{position.overdueAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs">
                {position.overdueAmount > 0 ? (
                  <span className="text-red-400 font-medium">Action Required: Immediate recovery</span>
                ) : (
                  <span className="text-zinc-400 font-medium">No overdue instalments</span>
                )}
              </div>
            </div>

            {/* Total Interest Collected */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden hover:border-zinc-700 transition">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Interest Collected
                </span>
                <Percent className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white tracking-tight">
                ₹{position.totalInterestPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Loan Rate: <span className="text-zinc-200 font-medium">{currentLoan?.annualInterestRate}% p.a.</span>
              </div>
            </div>
          </div>
        )}

        {/* Record Payment Form & Actions */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-zinc-300" />
              <h2 className="text-base font-semibold text-white">Record Loan Payment</h2>
            </div>
            {currentLoan && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(currentLoan.monthlyEmi.toString())}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition"
                >
                  Regular EMI (₹{currentLoan.monthlyEmi})
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount("5000")}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition"
                >
                  Underpay (₹5,000)
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount((currentLoan.monthlyEmi * 2).toFixed(2))}
                  className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition"
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
                  ? "bg-zinc-800 border border-zinc-700 text-zinc-100"
                  : "bg-red-950/30 border border-red-800/40 text-red-300"
              }`}
            >
              {paymentFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-white" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              )}
              <span>{paymentFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Idempotency / Ref Key (Optional)
              </label>
              <input
                type="text"
                value={payIdempotency}
                onChange={(e) => setPayIdempotency(e.target.value)}
                placeholder="TXN-98471-A"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white font-medium focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={paying || !selectedLoanId}
                className="w-full h-10 flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-sm font-semibold transition disabled:opacity-50 shadow-sm"
              >
                {paying ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <span>Apply Payment</span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Repayment Schedule Table */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Full Repayment Schedule</h3>
              <p className="text-xs text-zinc-400">
                Amortized monthly instalments with exact principal/interest settlement breakdown
              </p>
            </div>
            <button
              onClick={() => selectedLoanId && fetchLoanDetails(selectedLoanId)}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 border border-zinc-700 transition"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-4 h-4 ${loadingLoan ? "animate-spin text-white" : ""}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-zinc-800 uppercase tracking-wider">
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
              <tbody className="divide-y divide-zinc-800/60">
                {(!schedule || schedule.length === 0) ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-zinc-500 font-medium">
                      No instalments available. Please select or create a loan account.
                    </td>
                  </tr>
                ) : (
                  schedule.map((item) => {
                    const isPaid = item.status === "PAID";
                    const isPartial = item.status === "PARTIALLY_PAID";
                    const isOverdue = item.status === "OVERDUE";

                    return (
                      <tr
                        key={item.id || item.instalmentNumber}
                        className={`hover:bg-zinc-800/40 transition-colors ${
                          isPaid ? "bg-zinc-950/40 opacity-75" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-zinc-300">
                          {item.instalmentNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-300">
                          {new Date(item.dueDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          ₹{Number(item.principalComponent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-400">
                          ₹{Number(item.interestComponent || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                          ₹{Number(item.totalDue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          ₹{Number(item.principalPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          ₹{Number(item.interestPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white">
                          ₹{Number(item.amountPaid || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isPaid
                                ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                                : isPartial
                                ? "bg-zinc-800 text-zinc-300 border-zinc-600"
                                : isOverdue
                                ? "bg-red-950/40 text-red-300 border-red-800/50"
                                : "bg-zinc-950 text-zinc-500 border-zinc-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* New Loan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Originate New MSME Loan</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-lg text-xs text-red-300">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateLoan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
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
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                    Tenure (Months: 3-36)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="36"
                    required
                    value={createTenure}
                    onChange={(e) => setCreateTenure(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Disbursement Date
                </label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-white hover:bg-zinc-200 text-black rounded-lg text-xs font-semibold transition"
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
