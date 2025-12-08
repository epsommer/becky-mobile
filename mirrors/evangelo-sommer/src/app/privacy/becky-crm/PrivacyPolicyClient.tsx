"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "@/app/neomorphic.css";
import { SlidingThemeToggle } from "@/components/SlidingThemeToggle";

export default function PrivacyPolicyClient() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem("color-theme") || "light";
      setIsDark(theme === "true-night" || theme === "mocha");
    };
    updateTheme();
    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-color-theme"] });
    window.addEventListener("storage", updateTheme);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", updateTheme);
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16 relative transition-colors duration-300">
      {/* Grainy texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          opacity: isDark ? 0.2 : 0.15,
          background: "#000000",
          mixBlendMode: "multiply",
          filter: "url(#noiseFilter)",
        }}
      />

      {/* SVG Filter for grain texture */}
      <svg className="absolute w-0 h-0">
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" stitchTiles="stitch" />
        </filter>
      </svg>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <SlidingThemeToggle dayNightOnly={true} />
      </div>

      <div
        className={`max-w-4xl w-full relative z-10 neomorphic-card ${isDark ? "dark-mode" : ""}`}
        style={{
          padding: "2.5rem",
          background: isDark
            ? "linear-gradient(145deg, rgba(20,20,26,0.95), rgba(17,17,23,0.9))"
            : "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(245,245,250,0.92))",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className={`neomorphic-logo ${isDark ? "dark-mode" : ""}`} aria-label="Back to evangelosommer.com">
              <div className="relative w-12 h-12">
                <img
                  src="/EvangeloSommer-ES-Monogram.svg"
                  alt="ES Monogram"
                  className="object-contain w-full h-full"
                />
              </div>
            </Link>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Becky CRM</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Privacy Policy
              </h1>
            </div>
          </div>
          <div className="neo-badge px-3 py-1 text-xs uppercase tracking-wide">
            Updated {new Date().toISOString().slice(0, 10)}
          </div>
        </div>

        <p className="text-base text-muted-foreground leading-relaxed mb-8">
          This policy explains how the Becky CRM mobile app handles your data. If anything changes, we will update
          this page and, when required, the in-app notice.
        </p>

        <div className="space-y-8 text-base leading-relaxed text-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">What we collect</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">App inputs:</span> contact or CRM details you choose to
                enter (e.g., names, notes, tasks).
              </li>
              <li>
                <span className="font-medium text-foreground">Device & diagnostics:</span> limited technical data needed
                for basic operation and build distribution (e.g., device model, OS version, install ID).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">How data is stored</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Your CRM entries are stored on your device. If future cloud sync is introduced, it will be clearly disclosed.</li>
              <li>Build and delivery services (Expo / Google Play) may handle diagnostic data required to install and update the app.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Data sharing & selling</h2>
            <p className="text-muted-foreground">
              We do not sell your data. We do not share your CRM content with third parties. Platform providers (Expo, Google Play) may process
              limited technical data to enable installs, updates, and crash handling.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Permissions</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Network access:</span> used to check for app updates and deliver the latest version from Expo and Google Play.
              </li>
              <li>
                <span className="font-medium text-foreground">Device storage:</span> used to save your CRM entries locally.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Your choices</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>You can edit or delete CRM entries in the app at any time.</li>
              <li>Uninstalling the app removes locally stored data from your device.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Contact</h2>
            <p className="text-muted-foreground">
              For privacy questions or requests, email{" "}
              <a className="font-medium text-indigo-700 hover:text-indigo-800" href="mailto:support@evangelosommer.com">
                support@evangelosommer.com
              </a>.
            </p>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-6">
            <p className="text-sm text-muted-foreground">Effective date: {new Date().toISOString().slice(0, 10)}</p>
            <p className="text-sm text-muted-foreground">Becky CRM is published by Evangelo Sommer.</p>
            <div className="text-sm">
              <Link className="text-indigo-700 hover:text-indigo-800" href="/">
                Back to evangelosommer.com
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
