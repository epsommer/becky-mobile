// src/app/auth/error/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import "@/app/neomorphic.css";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const errorMessages: {
    [key: string]: { title: string; description: string };
  } = {
    Configuration: {
      title: "Server Configuration Error",
      description:
        "There is a problem with the server configuration. Please contact the administrator.",
    },
    AccessDenied: {
      title: "Access Denied",
      description:
        "You are not authorized to access this application. Only admin@evangelosommer.com is allowed.",
    },
    Verification: {
      title: "Verification Failed",
      description:
        "The verification token has expired or has already been used. Please request a new sign-in link.",
    },
    Default: {
      title: "Authentication Error",
      description:
        "An unexpected error occurred during authentication. Please try again.",
    },
  };

  const errorInfo = errorMessages[error || "Default"] || errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-destructive/10 neomorphic-rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold font-display uppercase tracking-wide text-foreground">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-center text-sm font-body text-muted-foreground">
            {errorInfo.description}
          </p>

          {error === "AccessDenied" && (
            <div className="mt-4 bg-yellow-500/10 border-2 border-yellow-500 neomorphic-rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-body text-yellow-700 dark:text-yellow-400">
                    Only <strong>admin@evangelosommer.com</strong> is authorized
                    to access this system.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 text-sm font-primary font-medium uppercase tracking-wide neomorphic-rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Try Again
            </Link>
            <div>
              <Link
                href="/"
                className="text-sm font-primary uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-spin neomorphic-rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
