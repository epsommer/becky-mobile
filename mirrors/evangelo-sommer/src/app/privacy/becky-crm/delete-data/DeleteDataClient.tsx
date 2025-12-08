"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "@/app/neomorphic.css";
import { SlidingThemeToggle } from "@/components/SlidingThemeToggle";

export default function DeleteDataClient() {
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
                Delete Your Data
              </h1>
            </div>
          </div>
          <div className="neo-badge px-3 py-1 text-xs uppercase tracking-wide">
            Updated {new Date().toISOString().slice(0, 10)}
          </div>
        </div>

        <p className="text-base text-muted-foreground leading-relaxed mb-8">
          Becky CRM stores your entries locally on your device. We do not sync or share your CRM data to any server.
          Use the steps below to remove your data at any time.
        </p>

        <div className="space-y-8 text-base leading-relaxed text-foreground">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Delete data in the app</h2>
            <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
              <li>Open Becky CRM.</li>
              <li>Open the client, note, or task you want to remove.</li>
              <li>Delete the entry (look for the delete/remove option on the entry).</li>
              <li>Repeat for any other items you want to remove.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Delete all data</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Uninstall the Becky CRM app from your device to remove all locally stored data.</li>
              <li>No copy of your CRM data is kept by the developer or any third party.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">What gets deleted vs. kept</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Deleted:</span> all CRM entries you created (clients, notes, tasks, timelines) stored on your device.</li>
              <li><span className="font-medium text-foreground">Not collected/kept:</span> no cloud backups, no analytics, no tracking identifiers for your CRM content.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">Need help?</h2>
            <p className="text-muted-foreground">
              Email{" "}
              <a className="font-medium text-indigo-700 hover:text-indigo-800" href="mailto:support@evangelosommer.com">
                support@evangelosommer.com
              </a>{" "}
              with the subject “Becky CRM Data Deletion” and we’ll assist you.
            </p>
          </section>

          <section className="space-y-3 border-t border-foreground/10 pt-6">
            <p className="text-sm text-muted-foreground">Becky CRM is published by Evangelo Sommer.</p>
            <div className="text-sm">
              <Link className="text-indigo-700 hover:text-indigo-800" href="/privacy/becky-crm">
                View Privacy Policy
              </Link>
            </div>
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
