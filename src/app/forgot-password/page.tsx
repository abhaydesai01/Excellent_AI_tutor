"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, KeyRound, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

type Step = "email" | "verify" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const startCooldown = () => {
    setCooldown(60);
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send code");
      } else {
        toast.success("Reset code sent to your email");
        setStep("verify");
        startCooldown();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password");
      } else {
        toast.success("Password reset successfully!");
        setStep("reset");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-64 h-64 rounded-full border border-white/30" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border border-white/20" />
        </div>
        <div className="max-w-md text-white relative">
          <img src="/logo-white.png" alt="Excellent" className="mb-8 h-16 w-auto object-contain" />
          <h2 className="text-2xl font-bold mb-3">Reset Your Password</h2>
          <p className="text-white/80 text-sm">
            We&apos;ll send a verification code to your registered email address. Use it to set a new password.
          </p>
          <div className="mt-8 space-y-3">
            <StepIndicator num={1} text="Enter your email" active={step === "email"} done={step !== "email"} />
            <StepIndicator num={2} text="Verify code & set password" active={step === "verify"} done={step === "reset"} />
            <StepIndicator num={3} text="Done! Login with new password" active={step === "reset"} done={false} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <img src="/logo.png" alt="Excellent" className="h-11 w-auto object-contain" />
          </div>

          {step === "email" && (
            <>
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <KeyRound className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Forgot Password?</h2>
              <p className="text-muted mt-1 mb-8">Enter your email and we&apos;ll send you a reset code</p>

              <form onSubmit={handleSendCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your.email@example.com" required
                      className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 gradient-bg text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-primary/15"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send Reset Code <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Reset Password</h2>
              <p className="text-muted mt-1 mb-1">Enter the code sent to <strong className="text-foreground">{email}</strong></p>
              <button onClick={() => setStep("email")} className="text-xs text-primary mb-6 hover:underline flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Change email
              </button>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Verification Code</label>
                  <input
                    type="text" value={code} onChange={e => setCode(e.target.value)}
                    placeholder="Enter 6-digit code" required maxLength={6}
                    className="w-full text-center text-2xl font-bold tracking-[0.4em] py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  {cooldown > 0 ? (
                    <p className="text-xs text-muted mt-2">Resend code in {cooldown}s</p>
                  ) : (
                    <button type="button" onClick={handleSendCode} className="text-xs text-primary mt-2 hover:underline">
                      Resend code
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters" required minLength={6}
                      className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                    <input
                      type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password" required minLength={6}
                      className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 gradient-bg text-white rounded-xl font-medium transition-all disabled:opacity-50 shadow-lg shadow-primary/15"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {step === "reset" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-muted mb-8">Your password has been updated. Redirecting to login...</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white rounded-xl font-medium shadow-lg shadow-primary/15">
                Go to Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          <p className="text-center text-sm text-muted mt-6">
            <Link href="/login" className="text-primary font-medium hover:text-primary-dark flex items-center gap-1 justify-center">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ num, text, active, done }: { num: number; text: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${active ? "opacity-100" : "opacity-60"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
        done ? "bg-white/30 text-white" : active ? "bg-white text-primary" : "border-2 border-white/40 text-white/60"
      }`}>
        {done ? "✓" : num}
      </div>
      <span className="text-white/90 text-sm">{text}</span>
    </div>
  );
}
