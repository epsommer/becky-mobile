'use client';

import { useEffect, useState } from 'react';

/**
 * GrainyTexture Component
 *
 * Adds a subtle grainy film texture overlay to the page using SVG filters.
 * The texture intensity is configurable via localStorage ('grain-intensity').
 *
 * Intensity Levels:
 * - 'off': No texture (opacity 0)
 * - 'low': Subtle texture (0.1 light / 0.05 dark)
 * - 'medium': Default texture (0.3 light / 0.15 dark)
 * - 'high': Strong texture (0.5 light / 0.2 dark)
 *
 * Usage:
 * ```tsx
 * import { GrainyTexture } from '@/components/GrainyTexture';
 *
 * export default function MyPage() {
 *   return (
 *     <>
 *       <GrainyTexture />
 *       {... rest of your page ...}
 *     </>
 *   );
 * }
 * ```
 */

type GrainIntensity = 'off' | 'low' | 'medium' | 'high';

interface GrainOpacityMap {
  off: { light: number; dark: number };
  low: { light: number; dark: number };
  medium: { light: number; dark: number };
  high: { light: number; dark: number };
}

const GRAIN_OPACITY_MAP: GrainOpacityMap = {
  off: { light: 0, dark: 0 },
  low: { light: 0.1, dark: 0.05 },
  medium: { light: 0.3, dark: 0.15 },
  high: { light: 0.5, dark: 0.2 },
};

interface GrainyTextureProps {
  /** Optional custom filter ID. If not provided, a unique ID will be generated. */
  filterId?: string;
  /** Force a specific intensity level instead of reading from localStorage */
  forceIntensity?: GrainIntensity;
}

export function GrainyTexture({ filterId, forceIntensity }: GrainyTextureProps = {}) {
  const [intensity, setIntensity] = useState<GrainIntensity>('medium');
  const [isDark, setIsDark] = useState(false);
  const uniqueFilterId = filterId || `grainFilter-${Math.random().toString(36).substring(2, 9)}`;

  // Detect theme and intensity from localStorage
  useEffect(() => {
    // Get initial intensity from localStorage or use forced intensity
    const storedIntensity = forceIntensity || (localStorage.getItem('grain-intensity') as GrainIntensity) || 'medium';
    setIntensity(storedIntensity);

    // Get initial theme
    const checkTheme = () => {
      const theme = localStorage.getItem('color-theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isCurrentlyDark = theme === 'true-night' || theme === 'mocha' || (!theme && systemDark);
      setIsDark(isCurrentlyDark);
    };

    checkTheme();

    // Listen for storage changes (intensity updates from settings page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'grain-intensity' && e.newValue) {
        setIntensity(e.newValue as GrainIntensity);
      }
      if (e.key === 'color-theme') {
        checkTheme();
      }
    };

    // Listen for custom theme change events
    const handleThemeChange = () => {
      checkTheme();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themechange', handleThemeChange);

    // Poll for theme changes (in case theme is changed without triggering events)
    const interval = setInterval(checkTheme, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themechange', handleThemeChange);
      clearInterval(interval);
    };
  }, [forceIntensity]);

  // Get opacity based on intensity and theme
  const opacity = isDark
    ? GRAIN_OPACITY_MAP[intensity].dark
    : GRAIN_OPACITY_MAP[intensity].light;

  // Don't render if intensity is 'off' or opacity is 0
  if (intensity === 'off' || opacity === 0) {
    return null;
  }

  return (
    <>
      {/* Grainy texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999]"
        style={{
          opacity,
          background: '#000000',
          mixBlendMode: 'multiply',
          filter: `url(#${uniqueFilterId})`,
          transition: 'opacity 0.3s ease',
        }}
        aria-hidden="true"
      />

      {/* SVG Filter for grain texture */}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id={uniqueFilterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
          />
        </filter>
      </svg>
    </>
  );
}

/**
 * Utility function to set grain intensity
 * Can be used from settings pages or other components
 */
export function setGrainIntensity(intensity: GrainIntensity): void {
  localStorage.setItem('grain-intensity', intensity);
  // Dispatch storage event for same-window updates
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'grain-intensity',
      newValue: intensity,
      storageArea: localStorage,
    })
  );
}

/**
 * Utility function to get current grain intensity
 */
export function getGrainIntensity(): GrainIntensity {
  return (localStorage.getItem('grain-intensity') as GrainIntensity) || 'medium';
}
