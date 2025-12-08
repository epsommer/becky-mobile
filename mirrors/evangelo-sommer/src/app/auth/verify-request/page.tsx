// src/app/auth/verify-request/page.tsx
import Link from "next/link";

export default function VerifyRequest() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-tactical-grey-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 7.89a1 1 0 001.42 0L21 7M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-tactical-grey-800">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-tactical-grey-500">
            A sign-in link has been sent to your email address.
          </p>
          <div className="mt-6 bg-tactical-gold-muted border border-tactical-grey-300 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-tactical-gold-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-tactical-brown-dark">
                  Tips for finding your email:
                </h3>
                <div className="mt-2 text-sm text-tactical-brown-dark">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your spam/junk folder</li>
                    <li>Look for an email from admin@evangelosommer.com</li>
                    <li>The link expires in 24 hours</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-tactical-gold hover:bg-tactical-gold-dark"
            >
              Send Another Link
            </Link>
            <div>
              <Link
                href="/"
                className="text-sm text-tactical-grey-500 hover:text-tactical-grey-600"
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
