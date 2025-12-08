'use client';

import React, { useState, useEffect } from 'react';

interface SlidingThemeToggleProps {
  /** If true, only toggles between light and dark. If false, includes all themes. */
  dayNightOnly?: boolean;
}

export function SlidingThemeToggle({ dayNightOnly = false }: SlidingThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    console.log('[SlidingThemeToggle] Component mounted, dayNightOnly:', dayNightOnly);

    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light';
      const willBeDark = theme === 'mocha' || theme === 'true-night' || theme === 'dark';
      console.log('[SlidingThemeToggle] updateTheme - current theme:', theme, 'isDark:', willBeDark);
      setIsDark(willBeDark);
    };

    // Initial theme setup - force correct theme for dayNightOnly mode
    let theme = localStorage.getItem('color-theme') || 'light';
    console.log('[SlidingThemeToggle] Initial theme from localStorage:', theme);

    // If dayNightOnly is true and theme is mocha, convert to true-night
    if (dayNightOnly && theme === 'mocha') {
      console.log('[SlidingThemeToggle] Converting mocha to true-night (dayNightOnly mode)');
      theme = 'true-night';
      localStorage.setItem('color-theme', theme);
    }

    // Apply theme classes
    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');
    console.log('[SlidingThemeToggle] Cleared all theme classes');

    if (theme === 'mocha') {
      console.log('[SlidingThemeToggle] Applying mocha theme');
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'true-night') {
      console.log('[SlidingThemeToggle] Applying true-night theme');
      document.documentElement.classList.add('true-night-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'overkast') {
      console.log('[SlidingThemeToggle] Applying overkast theme');
      document.documentElement.classList.add('overkast-mode');
      document.documentElement.removeAttribute('data-theme');
    } else {
      console.log('[SlidingThemeToggle] Applying light theme');
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.setAttribute('data-color-theme', theme);

    // Get background color and CSS variables
    const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
    const computedStyle = window.getComputedStyle(document.documentElement);
    const neomorphicBg = computedStyle.getPropertyValue('--neomorphic-bg').trim();
    const cssBackground = computedStyle.getPropertyValue('--background').trim();

    console.log('[SlidingThemeToggle] Background color:', bgColor);
    console.log('[SlidingThemeToggle] CSS --neomorphic-bg:', neomorphicBg);
    console.log('[SlidingThemeToggle] CSS --background:', cssBackground);
    console.log('[SlidingThemeToggle] HTML classes:', document.documentElement.className);

    updateTheme();

    // Observe changes to the 'data-color-theme' attribute on the html element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-color-theme') {
          console.log('[SlidingThemeToggle] MutationObserver detected theme change');
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
  }, [dayNightOnly]);

  const toggleTheme = () => {
    console.log('[SlidingThemeToggle] ========== TOGGLE CLICKED ==========');
    const currentTheme = localStorage.getItem('color-theme') || 'light';
    console.log('[SlidingThemeToggle] Current theme:', currentTheme);
    console.log('[SlidingThemeToggle] Current isDark state:', isDark);
    console.log('[SlidingThemeToggle] dayNightOnly mode:', dayNightOnly);

    let newTheme: string;

    if (dayNightOnly) {
      // For auth pages: only toggle between light and true-night
      newTheme = (currentTheme === 'light' || currentTheme === 'overkast') ? 'true-night' : 'light';
      console.log('[SlidingThemeToggle] dayNightOnly: Toggling from', currentTheme, 'to', newTheme);
    } else {
      // For development pages: toggle between light and true-night
      newTheme = (currentTheme === 'light' || currentTheme === 'overkast') ? 'true-night' : 'light';
      console.log('[SlidingThemeToggle] Normal mode: Toggling from', currentTheme, 'to', newTheme);
    }

    // Update classes
    console.log('[SlidingThemeToggle] Removing all theme classes');
    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

    if (newTheme === 'mocha') {
      console.log('[SlidingThemeToggle] Setting mocha theme');
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'true-night') {
      console.log('[SlidingThemeToggle] Setting true-night theme');
      document.documentElement.classList.add('true-night-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'overkast') {
      console.log('[SlidingThemeToggle] Setting overkast theme');
      document.documentElement.classList.add('overkast-mode');
      document.documentElement.removeAttribute('data-theme');
    } else {
      console.log('[SlidingThemeToggle] Setting light theme');
      document.documentElement.removeAttribute('data-theme');
    }

    // Update the data-color-theme attribute on the html element
    document.documentElement.setAttribute('data-color-theme', newTheme);
    localStorage.setItem('color-theme', newTheme);
    console.log('[SlidingThemeToggle] Saved to localStorage:', newTheme);

    // Get new background color and CSS variables
    const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;
    const computedStyle = window.getComputedStyle(document.documentElement);
    const neomorphicBg = computedStyle.getPropertyValue('--neomorphic-bg').trim();
    const cssBackground = computedStyle.getPropertyValue('--background').trim();

    console.log('[SlidingThemeToggle] New background color:', bgColor);
    console.log('[SlidingThemeToggle] New CSS --neomorphic-bg:', neomorphicBg);
    console.log('[SlidingThemeToggle] New CSS --background:', cssBackground);
    console.log('[SlidingThemeToggle] New HTML classes:', document.documentElement.className);
    console.log('[SlidingThemeToggle] New isDark will be:', (newTheme === 'mocha' || newTheme === 'true-night' || newTheme === 'dark'));

    // Trigger storage event for other components
    window.dispatchEvent(new Event('storage'));
    console.log('[SlidingThemeToggle] ========== TOGGLE COMPLETE ==========');
  };

  // Log render state
  console.log('[SlidingThemeToggle] RENDER - isDark:', isDark, 'Position:', isDark ? 'RIGHT' : 'LEFT', 'Icon:', isDark ? 'MOON' : 'SUN');

  return (
    <>
      {/* SVG Filter for toggle grain texture */}
      <svg className="absolute w-0 h-0">
        <filter id="toggleNoiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
          />
        </filter>
      </svg>

      <button
        onClick={toggleTheme}
        className={`neomorphic-toggle ${isDark ? 'active' : ''}`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <div className="neomorphic-toggle__slider">
          {isDark ? (
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
            </svg>
          )}
        </div>
      </button>
    </>
  );
}

export default SlidingThemeToggle;
