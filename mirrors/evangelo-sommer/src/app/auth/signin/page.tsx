// src/app/auth/signin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import "@/app/neomorphic.css";
import { SlidingThemeToggle } from "@/components/SlidingThemeToggle";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  // Track theme changes for styling and reset admin themes
  useEffect(() => {
    // Reset admin-only themes on signin page
    const adminOnlyThemes = ['mocha', 'overkast', 'gilded-meadow'];
    const currentTheme = localStorage.getItem('color-theme');

    if (currentTheme && adminOnlyThemes.includes(currentTheme)) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'true-night' : 'light';

      // Reset to default theme
      localStorage.setItem('color-theme', defaultTheme);
      document.documentElement.classList.remove('mocha-mode', 'overkast-mode', 'gilded-meadow-mode', 'true-night-mode');

      if (defaultTheme === 'true-night') {
        document.documentElement.classList.add('true-night-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }

      document.documentElement.setAttribute('data-color-theme', defaultTheme);
    }

    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light';
      setIsDark(theme === 'true-night');
    };

    updateTheme();
    window.addEventListener('storage', updateTheme);

    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`[Sign-In] Attempting to sign in user: ${email}`);
    setIsLoading(true);
    setError("");
    setResetMessage("");

    try {
      const result = await signIn("admin-login", {
        email: email,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        console.error("NextAuth Sign-in error:", result.error);
        setError("Access denied. Invalid email or password.");
      } else if (result?.ok) {
        const session = await getSession();
        console.log("[Sign-In] Sign-in successful. Session object:", session);
        if (session) {
          router.push("/select");
        } else {
          console.warn("[Sign-In] Sign-in was OK, but getSession() returned nullish.");
          setError("Sign-in failed. Please try again.");
        }
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email || !email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    console.log(`[Forgot Password] Requesting password reset for email: ${email}`);
    setIsSendingReset(true);
    setError("");
    setResetMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        console.log("[Forgot Password] API call successful:", data.message);
        setResetMessage(data.message || "Password reset link has been sent to your email.");
      } else {
        console.error("[Forgot Password] API call failed:", data.error);
        setError(data.error || "Failed to send reset email");
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative bg-background text-foreground transition-colors duration-300"
    >
      {/* Grainy texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: isDark ? 0.2 : 0.15,
          background: '#000000',
          mixBlendMode: 'multiply',
          filter: 'url(#noiseFilter)',
        }}
      />

      {/* SVG Filter for grain texture */}
      <svg className="absolute w-0 h-0">
        <filter id="noiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
          />
        </filter>
      </svg>

      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 flex items-center z-10">
        <SlidingThemeToggle dayNightOnly={true} />
      </div>

      <div className={`max-w-md w-full space-y-8 relative z-10 ${isDark ? 'dark-mode' : ''}`}>
        <div>
          <div className={`mx-auto neomorphic-logo ${isDark ? 'dark-mode' : ''}`}>
            <div className="relative w-12 h-12">
              <Image src="/EvangeloSommer-ES-Monogram.svg" alt="ES Monogram" fill className="object-contain neomorphic-logo-image" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold font-display uppercase tracking-wide text-foreground transition-colors duration-300">
            Sign In
          </h2>
          <p className="mt-2 text-center text-sm font-body text-muted-foreground transition-colors duration-300">
            Access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} suppressHydrationWarning>
          <div className="neomorphic-input-wrapper" suppressHydrationWarning>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              placeholder="Email address"
              suppressHydrationWarning
            />
          </div>

          <div className="neomorphic-input-wrapper relative" suppressHydrationWarning>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
              placeholder="Password"
              style={{ paddingRight: '60px' }}
              suppressHydrationWarning
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`password-toggle-btn absolute right-5 top-1/2 -translate-y-1/2 transition-colors duration-200 bg-transparent border-none z-10 ${
                isDark
                  ? 'text-muted-foreground hover:text-neutral-300'
                  : 'text-muted-foreground hover:text-neutral-600'
              }`}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              )}
            </button>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            >{isLoading ? (<div className="animate-spin h-4 w-4 border-b-2 border-neomorphic-text-primary"></div>) : (
                "Sign In"
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border-2 border-destructive text-destructive transition-all duration-300">
              <p className="text-sm font-body">{error}</p>
            </div>
          )}

          {resetMessage && (
            <div className="mt-4 p-4 rounded-lg bg-green-500/10 border-2 border-green-500 text-green-700 dark:text-green-400 transition-all duration-300">
              <p className="text-sm font-body">{resetMessage}</p>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isSendingReset || !email.trim()}
              className={`forgot-password-btn text-sm font-primary uppercase tracking-wide underline disabled:cursor-not-allowed transition-colors duration-200 bg-transparent border-none ${
                isDark
                  ? 'text-muted-foreground hover:text-neutral-300 disabled:text-muted-foreground/50'
                  : 'text-muted-foreground hover:text-neutral-600 disabled:text-muted-foreground/50'
              }`}
            >
              {isSendingReset ? "Sending..." : "Forgot Password?"}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/"
            className={`text-sm font-primary uppercase tracking-wide transition-colors duration-200 ${
              isDark
                ? 'text-muted-foreground hover:text-neutral-300'
                : 'text-muted-foreground hover:text-neutral-600'
            }`}
          >
            ← Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
