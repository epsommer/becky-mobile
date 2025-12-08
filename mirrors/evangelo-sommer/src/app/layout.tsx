// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import "./neomorphic.css";
import SessionProviderWrapper from "../components/providers/SessionProviderWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Evangelo Sommer | Portfolio",
  description: "Portfolio and professional showcase of Evangelo Sommer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="neomorphic-window" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/xmz8zog.css" />
        <meta name="color-scheme" content="light dark" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  let colorTheme = localStorage.getItem('color-theme') || 'light';
                  const windowTheme = localStorage.getItem('window-theme') || 'neomorphic';

                  // Check if on unauthorized page (auth pages, root, etc.)
                  const isUnauthorizedPage = window.location.pathname === '/' ||
                                             window.location.pathname.startsWith('/auth/') ||
                                             window.location.pathname.startsWith('/select');

                  // Define admin-only themes
                  const adminOnlyThemes = ['mocha', 'overkast', 'gilded-meadow'];

                  // Reset admin themes on unauthorized pages
                  if (isUnauthorizedPage && adminOnlyThemes.includes(colorTheme)) {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    colorTheme = prefersDark ? 'true-night' : 'light';
                    localStorage.setItem('color-theme', colorTheme);
                  }

                  // Apply color theme
                  const root = document.documentElement;
                  root.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode', 'gilded-meadow-mode');

                  if (colorTheme === 'mocha') {
                    root.classList.add('mocha-mode');
                    root.setAttribute('data-theme', 'dark');
                  } else if (colorTheme === 'overkast') {
                    root.classList.add('overkast-mode');
                    root.removeAttribute('data-theme');
                  } else if (colorTheme === 'true-night') {
                    root.classList.add('true-night-mode');
                    root.setAttribute('data-theme', 'dark');
                  } else if (colorTheme === 'gilded-meadow') {
                    root.classList.add('gilded-meadow-mode');
                    root.removeAttribute('data-theme');
                  } else {
                    root.removeAttribute('data-theme');
                  }

                  // Apply window theme
                  root.classList.remove('neomorphic-window', 'tactical-window');
                  root.classList.add(windowTheme + '-window');

                  root.setAttribute('data-color-theme', colorTheme);
                  root.setAttribute('data-window-theme', windowTheme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-hud-ui antialiased" suppressHydrationWarning>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
