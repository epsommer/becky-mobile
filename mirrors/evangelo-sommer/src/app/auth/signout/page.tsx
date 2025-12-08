"use client";

import { signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import "@/app/neomorphic.css";

export default function SignOutPage() {
  const [isDark, setIsDark] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load theme preference
  useEffect(() => {
    const updateTheme = () => {
      let theme = localStorage.getItem('color-theme') || 'light';
      // Convert mocha to true-night
      if (theme === 'mocha') {
        theme = 'true-night';
        localStorage.setItem('color-theme', 'true-night');
      }
      const isDarkTheme = theme === 'true-night';
      setIsDark(isDarkTheme);

      // Apply theme classes
      document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');
      if (theme === 'mocha') {
        document.documentElement.classList.add('mocha-mode');
      } else if (theme === 'overkast') {
        document.documentElement.classList.add('overkast-mode');
      } else if (theme === 'true-night') {
        document.documentElement.classList.add('true-night-mode');
      }
    };

    // Initialize theme on mount
    const theme = localStorage.getItem('color-theme') || 'light';
    document.documentElement.setAttribute('data-color-theme', theme);
    updateTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] });
    window.addEventListener('storage', updateTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', updateTheme);
    };
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative bg-background text-foreground transition-colors duration-300">

      <div className={`max-w-md w-full space-y-6 sm:space-y-8 text-center ${isDark ? 'dark-mode' : ''}`}>
        {/* Logo with neomorphic border */}
        <div className="flex justify-center">
          <div className={`neomorphic-logo ${isDark ? 'dark-mode' : ''}`} style={{ width: '100px', height: '100px' }}>
            <div className="relative w-14 h-14">
              <Image
                src="/EvangeloSommer-ES-Monogram.svg"
                alt="ES Monogram"
                fill
                className="object-contain"
                style={{
                  filter: isDark
                    ? "invert(0.7) saturate(2) hue-rotate(-10deg) brightness(1)"
                    : "invert(0.6) saturate(2) hue-rotate(-10deg) brightness(0.95)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold font-display uppercase tracking-wide text-foreground">
            Sign Out
          </h1>
          <p className="text-base sm:text-lg font-body text-muted-foreground">
            Are you sure you want to sign out?
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
          >
            {isSigningOut ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin h-4 w-4 border-b-2 border-foreground"></div>
                <span>Signing Out...</span>
              </div>
            ) : (
              'Yes, Sign Out'
            )}
          </button>

          <Link href="/select">
            <button
              disabled={isSigningOut}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{ width: '100%', height: '54px' }}
            >
              Cancel
            </button>
          </Link>
        </div>

        {/* Divider */}
        <div className="w-16 sm:w-24 h-0.5 mx-auto bg-primary opacity-70"></div>

        {/* Footer text */}
        <p className="text-xs sm:text-sm font-body text-muted-foreground">
          Thank you for using Evangelo Sommer Portfolio
        </p>
      </div>
    </div>
  );
}
