'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved color theme preference or default to light mode
    const savedColorTheme = localStorage.getItem('color-theme');
    const savedWindowTheme = localStorage.getItem('window-theme') || 'neomorphic';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply color theme
    const colorTheme = savedColorTheme || (prefersDark ? 'mocha' : 'light');
    const isDark = colorTheme === 'mocha' || colorTheme === 'true-night';
    setIsDarkMode(isDark);

    // Remove all color theme classes
    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

    // Apply color theme class
    if (colorTheme === 'mocha') {
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (colorTheme === 'overkast') {
      document.documentElement.classList.add('overkast-mode');
      document.documentElement.removeAttribute('data-theme');
    } else if (colorTheme === 'true-night') {
      document.documentElement.classList.add('true-night-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Apply window theme
    document.documentElement.classList.remove('neomorphic-window', 'tactical-window');
    document.documentElement.classList.add(`${savedWindowTheme}-window`);

    document.documentElement.setAttribute('data-color-theme', colorTheme);
    document.documentElement.setAttribute('data-window-theme', savedWindowTheme);
  }, []);

  const toggleTheme = () => {
    const newColorTheme = isDarkMode ? 'light' : 'mocha';
    setIsDarkMode(!isDarkMode);

    // Remove all color theme classes
    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

    // Apply new color theme
    if (newColorTheme === 'mocha') {
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.setAttribute('data-color-theme', newColorTheme);
    localStorage.setItem('color-theme', newColorTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="neo-button relative flex items-center gap-2 px-4 py-2 text-sm transition-all duration-300 hover:scale-105"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      style={{ color: 'var(--neomorphic-text)' }}
    >
      <div className="relative flex items-center gap-2" style={{ color: 'var(--neomorphic-text)' }}>
        {isDarkMode ? (
          <>
            <Moon className="w-4 h-4" style={{ color: 'var(--neomorphic-text)' }} />
            <span className="font-medium text-xs tracking-wide">NIGHT OPS</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4" style={{ color: 'var(--neomorphic-text)' }} />
            <span className="font-medium text-xs tracking-wide">DAYLIGHT OPS</span>
          </>
        )}
      </div>
    </button>
  );
}

// Enhanced theme toggle with tactical interface elements
export function TacticalThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const savedColorTheme = localStorage.getItem('color-theme');
    const savedWindowTheme = localStorage.getItem('window-theme') || 'neomorphic';
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const colorTheme = savedColorTheme || (prefersDark ? 'mocha' : 'light');
    const isDark = colorTheme === 'mocha' || colorTheme === 'true-night';
    setIsDarkMode(isDark);

    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

    if (colorTheme === 'mocha') {
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (colorTheme === 'overkast') {
      document.documentElement.classList.add('overkast-mode');
      document.documentElement.removeAttribute('data-theme');
    } else if (colorTheme === 'true-night') {
      document.documentElement.classList.add('true-night-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.classList.remove('neomorphic-window', 'tactical-window');
    document.documentElement.classList.add(`${savedWindowTheme}-window`);

    document.documentElement.setAttribute('data-color-theme', colorTheme);
    document.documentElement.setAttribute('data-window-theme', savedWindowTheme);
  }, []);

  const toggleTheme = () => {
    const newColorTheme = isDarkMode ? 'light' : 'mocha';
    setIsDarkMode(!isDarkMode);

    // Remove all color theme classes
    document.documentElement.classList.remove('dark', 'mocha-mode', 'overkast-mode', 'true-night-mode');

    // Apply new color theme
    if (newColorTheme === 'mocha') {
      document.documentElement.classList.add('mocha-mode');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    document.documentElement.setAttribute('data-color-theme', newColorTheme);
    localStorage.setItem('color-theme', newColorTheme);
  };

  return (
    <div className="neo-container relative p-6 max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-medium text-foreground/70 tracking-wider uppercase">
          Display Mode
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => {
            if (isDarkMode) toggleTheme();
          }}
          className={`
            neo-button text-xs py-4 px-4 relative overflow-hidden transition-all duration-300
            ${!isDarkMode ? 'neo-button-active' : ''}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Sun className="w-5 h-5 mx-auto mb-2" style={{ color: !isDarkMode ? 'var(--neomorphic-bg)' : 'var(--neomorphic-text)' }} />
          <div className="font-medium text-xs tracking-wide" style={{ color: !isDarkMode ? 'var(--neomorphic-bg)' : 'var(--neomorphic-text)' }}>DAYLIGHT OPS</div>
        </button>

        <button
          onClick={() => {
            if (!isDarkMode) toggleTheme();
          }}
          className={`
            neo-button text-xs py-4 px-4 relative overflow-hidden transition-all duration-300
            ${isDarkMode ? 'neo-button-active' : ''}
          `}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <Moon className="w-5 h-5 mx-auto mb-2" style={{ color: isDarkMode ? 'var(--neomorphic-bg)' : 'var(--neomorphic-text)' }} />
          <div className="font-medium text-xs tracking-wide" style={{ color: isDarkMode ? 'var(--neomorphic-bg)' : 'var(--neomorphic-text)' }}>NIGHT OPS</div>
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2" style={{ color: 'var(--neomorphic-text)', opacity: 0.6 }}>
        <span className="text-xs font-medium tracking-wider uppercase">Status:</span>
        <span className="text-xs font-medium" style={{ color: 'var(--neomorphic-text)', opacity: 1 }}>
          {isDarkMode ? 'Night Ops Engaged' : 'Daylight Ops Active'}
        </span>
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default ThemeToggle;