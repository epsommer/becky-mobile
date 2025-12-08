"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Directly read from the form to ensure autofill values are captured
    const form = e.currentTarget as HTMLFormElement;
    const newPassword = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmedPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    // Validation
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmedPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password-reset/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);

    } catch (error) {
      console.error("Reset password error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hud-background-secondary py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-tactical-gold flex items-center justify-center mb-6">
              <span className="text-2xl font-bold text-hud-text-primary font-space-grotesk">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-hud-text-primary font-space-grotesk uppercase">
              Password Reset Successful
            </h2>
            <p className="mt-4 text-medium-grey font-space-grotesk">
              Your password has been reset successfully.
            </p>
            <p className="mt-2 text-medium-grey font-space-grotesk">
              Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-hud-background-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-tactical-gold flex items-center justify-center">
            <span className="text-2xl font-bold text-hud-text-primary font-space-grotesk">ES</span>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-hud-text-primary font-space-grotesk uppercase tracking-wide">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-medium-grey font-space-grotesk">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="space-y-4">
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-hud-text-primary font-space-grotesk mb-2">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full px-4 py-3 pr-12 border-2 border-hud-border text-hud-text-primary font-space-grotesk focus:outline-none focus:border-hud-border-accent transition-colors duration-200 bg-hud-background-secondary"
                placeholder="Enter new password (min 8 characters)"
                disabled={!token || isLoading}
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[42px] text-medium-grey hover:text-hud-text-primary transition-colors duration-200 font-space-grotesk text-xs uppercase tracking-wide"
              >
                {showPassword ? "HIDE" : "SHOW"}
              </button>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-hud-text-primary font-space-grotesk mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="relative block w-full px-4 py-3 border-2 border-hud-border text-hud-text-primary font-space-grotesk focus:outline-none focus:border-hud-border-accent transition-colors duration-200 bg-hud-background-secondary"
                placeholder="Confirm new password"
                disabled={!token || isLoading}
                suppressHydrationWarning
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !token || !password.trim() || !confirmPassword.trim()}
              className="group relative w-full flex justify-center py-3 px-4 border-2 border-transparent text-sm font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary bg-tactical-gold hover:bg-tactical-gold-dark focus:outline-none transition-colors duration-200 disabled:bg-light-grey disabled:cursor-not-allowed disabled:text-medium-grey"
            >
              {isLoading ? (
                <div className="animate-spin h-4 w-4 border-b-2 border-dark-grey"></div>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 text-red-700">
              <p className="text-sm font-space-grotesk">{error}</p>
            </div>
          )}
        </form>

        <div className="text-center">
          <Link href="/auth/signin" className="text-sm text-gold hover:text-gold-dark font-space-grotesk uppercase tracking-wide">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-hud-background-secondary">
        <div className="animate-spin h-8 w-8 border-b-2 border-tactical-gold"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
