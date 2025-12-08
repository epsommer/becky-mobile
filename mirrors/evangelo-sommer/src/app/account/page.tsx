'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GrainyTexture, setGrainIntensity, getGrainIntensity } from '@/components/GrainyTexture';

type ColorTheme = 'light' | 'mocha' | 'overkast' | 'true-night' | 'gilded-meadow';
type GrainIntensity = 'off' | 'low' | 'medium' | 'high';
type WindowTheme = 'neomorphic' | 'tactical';

export default function AccountSettingsPage() {
  const router = useRouter();
  const [colorTheme, setColorTheme] = useState<ColorTheme>('light');
  const [grainIntensity, setGrainIntensityState] = useState<GrainIntensity>('medium');
  const [windowTheme, setWindowTheme] = useState<WindowTheme>('neomorphic');
  const [userName, setUserName] = useState<string>('User');

  // Track original values for cancel/revert
  const [originalColorTheme, setOriginalColorTheme] = useState<ColorTheme>('light');
  const [originalGrainIntensity, setOriginalGrainIntensity] = useState<GrainIntensity>('medium');
  const [originalWindowTheme, setOriginalWindowTheme] = useState<WindowTheme>('neomorphic');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loadedTheme = (localStorage.getItem('color-theme') as ColorTheme) || 'light';
    const loadedGrain = getGrainIntensity();
    const loadedWindow = (localStorage.getItem('window-theme') as WindowTheme) || 'neomorphic';

    setColorTheme(loadedTheme);
    setGrainIntensityState(loadedGrain);
    setWindowTheme(loadedWindow);

    // Store original values
    setOriginalColorTheme(loadedTheme);
    setOriginalGrainIntensity(loadedGrain);
    setOriginalWindowTheme(loadedWindow);

    // Apply theme classes to document
    applyTheme(loadedTheme);
    applyWindowTheme(loadedWindow);

    // Get user name from session or default
    const storedUserName = localStorage.getItem('user-name') || 'User';
    setUserName(storedUserName);
  }, []);

  const applyTheme = (theme: ColorTheme) => {
    // Remove all theme classes
    document.documentElement.classList.remove('mocha-mode', 'overkast-mode', 'true-night-mode', 'gilded-meadow-mode');

    // Add the selected theme class
    if (theme === 'mocha') {
      document.documentElement.classList.add('mocha-mode');
    } else if (theme === 'overkast') {
      document.documentElement.classList.add('overkast-mode');
    } else if (theme === 'true-night') {
      document.documentElement.classList.add('true-night-mode');
    } else if (theme === 'gilded-meadow') {
      document.documentElement.classList.add('gilded-meadow-mode');
      document.documentElement.removeAttribute('data-theme');
    }

    // Dispatch custom event for theme change
    window.dispatchEvent(new Event('themechange'));
  };

  const applyWindowTheme = (theme: WindowTheme) => {
    document.documentElement.classList.remove('neomorphic-window', 'tactical-window');
    document.documentElement.classList.add(`${theme}-window`);
  };

  const handleColorThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme);
    applyTheme(theme);
    setHasUnsavedChanges(true);
  };

  const handleGrainIntensityChange = (intensity: GrainIntensity) => {
    setGrainIntensityState(intensity);
    setGrainIntensity(intensity);
    setHasUnsavedChanges(true);
  };

  const handleWindowThemeChange = (theme: WindowTheme) => {
    setWindowTheme(theme);
    applyWindowTheme(theme);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('color-theme', colorTheme);
    localStorage.setItem('window-theme', windowTheme);
    setGrainIntensity(grainIntensity);

    // Update original values
    setOriginalColorTheme(colorTheme);
    setOriginalGrainIntensity(grainIntensity);
    setOriginalWindowTheme(windowTheme);

    setHasUnsavedChanges(false);
    alert('Settings saved successfully!');
  };

  const handleCancel = () => {
    // Revert to original settings
    setColorTheme(originalColorTheme);
    setGrainIntensityState(originalGrainIntensity);
    setWindowTheme(originalWindowTheme);

    applyTheme(originalColorTheme);
    applyWindowTheme(originalWindowTheme);
    setGrainIntensity(originalGrainIntensity);

    setHasUnsavedChanges(false);
  };

  const isDark = colorTheme === 'mocha' || colorTheme === 'true-night';

  return (
    <div className="min-h-screen bg-[var(--hud-background-primary)] text-[var(--hud-text-primary)] p-6">
      <GrainyTexture />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="neo-container p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-primary text-2xl uppercase tracking-wide text-[var(--hud-text-primary)] mb-2">
                Account Settings
              </h1>
              <p className="font-body text-sm text-[var(--hud-text-secondary)]">
                Customize your theme, texture, and interface preferences
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="neo-button px-6 py-3 font-primary text-sm uppercase tracking-wide"
            >
              Back
            </button>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Profile Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-2 block">
                Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  localStorage.setItem('user-name', e.target.value);
                }}
                className="neo-button w-full px-4 py-3 font-body text-[var(--hud-text-primary)] bg-[var(--hud-background-secondary)]"
                placeholder="Enter your name"
              />
            </div>
          </div>
        </div>

        {/* Color Theme Section */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Color Theme
          </h2>
          <p className="font-body text-sm text-[var(--hud-text-secondary)] mb-4">
            Choose your preferred color palette
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Light Theme */}
            <button
              onClick={() => handleColorThemeChange('light')}
              className={`neo-button p-4 flex flex-col items-center gap-3 ${
                colorTheme === 'light' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#EBECF0] to-[#d1d9e6] border-2 border-[#d1d9e6]" />
              <span className="font-primary text-xs uppercase tracking-wide">Light</span>
            </button>

            {/* Mocha Theme */}
            <button
              onClick={() => handleColorThemeChange('mocha')}
              className={`neo-button p-4 flex flex-col items-center gap-3 ${
                colorTheme === 'mocha' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1c1917] to-[#44403c] border-2 border-[#78716c]" />
              <span className="font-primary text-xs uppercase tracking-wide">Mocha</span>
            </button>

            {/* Overkast Theme */}
            <button
              onClick={() => handleColorThemeChange('overkast')}
              className={`neo-button p-4 flex flex-col items-center gap-3 ${
                colorTheme === 'overkast' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#B8B8B8] to-[#9A9A9A] border-2 border-[#808080]" />
              <span className="font-primary text-xs uppercase tracking-wide">Overkast</span>
            </button>

            {/* True Night Theme */}
            <button
              onClick={() => handleColorThemeChange('true-night')}
              className={`neo-button p-4 flex flex-col items-center gap-3 ${
                colorTheme === 'true-night' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#242424] border-2 border-[#333333]" />
              <span className="font-primary text-xs uppercase tracking-wide">True Night</span>
            </button>

            {/* Gilded Meadow Theme */}
            <button
              onClick={() => handleColorThemeChange('gilded-meadow')}
              className={`neo-button p-4 flex flex-col items-center gap-3 ${
                colorTheme === 'gilded-meadow' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#F5F5DC] to-[#F0EAD6] border-2 border-[#D4C5A9]" />
              <span className="font-primary text-xs uppercase tracking-wide">Gilded Meadow</span>
            </button>
          </div>
        </div>

        {/* Grain Texture Section */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Grain Texture
          </h2>
          <p className="font-body text-sm text-[var(--hud-text-secondary)] mb-4">
            Adjust the film grain overlay intensity
          </p>

          <div className="space-y-4">
            {/* Grain Intensity Selector */}
            <div className="grid grid-cols-4 gap-4">
              {(['off', 'low', 'medium', 'high'] as GrainIntensity[]).map((intensity) => (
                <button
                  key={intensity}
                  onClick={() => handleGrainIntensityChange(intensity)}
                  className={`neo-button px-4 py-3 font-primary text-sm uppercase tracking-wide ${
                    grainIntensity === intensity ? 'neo-button-active' : ''
                  }`}
                >
                  {intensity}
                </button>
              ))}
            </div>

            {/* Grain Preview */}
            <div className="relative neo-card p-8 overflow-hidden">
              <div className="text-center font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)]">
                Preview
              </div>
              <GrainyTexture forceIntensity={grainIntensity} filterId="preview-grain" />
            </div>
          </div>
        </div>

        {/* Window Style Section */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Window Style
          </h2>
          <p className="font-body text-sm text-[var(--hud-text-secondary)] mb-4">
            Choose your interface style (affects both Select page and CRM)
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Neomorphic Style */}
            <button
              onClick={() => handleWindowThemeChange('neomorphic')}
              className={`neo-button p-6 flex flex-col items-center gap-4 ${
                windowTheme === 'neomorphic' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-full h-24 rounded-xl bg-[var(--hud-background-secondary)] shadow-[8px_8px_16px_var(--neomorphic-dark-shadow),-8px_-8px_16px_var(--neomorphic-light-shadow)] flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-[var(--hud-background-primary)] shadow-[4px_4px_8px_var(--neomorphic-dark-shadow),-4px_-4px_8px_var(--neomorphic-light-shadow)]" />
              </div>
              <div className="text-center">
                <div className="font-primary text-sm uppercase tracking-wide mb-1">Neomorphic</div>
                <div className="font-body text-xs text-[var(--hud-text-secondary)]">Soft, rounded corners</div>
              </div>
            </button>

            {/* Tactical Style */}
            <button
              onClick={() => handleWindowThemeChange('tactical')}
              className={`neo-button p-6 flex flex-col items-center gap-4 ${
                windowTheme === 'tactical' ? 'neo-button-active' : ''
              }`}
            >
              <div className="w-full h-24 bg-[var(--hud-background-secondary)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center">
                <div className="w-12 h-12 bg-[var(--hud-background-primary)] shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
              </div>
              <div className="text-center">
                <div className="font-primary text-sm uppercase tracking-wide mb-1">Tactical</div>
                <div className="font-body text-xs text-[var(--hud-text-secondary)]">Sharp, angular corners</div>
              </div>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="neo-container p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-1 h-full bg-[var(--tactical-gold)]" />
            <div>
              <h3 className="font-primary text-sm uppercase tracking-wide text-[var(--tactical-gold)] mb-2">
                Note
              </h3>
              <p className="font-body text-sm text-[var(--hud-text-secondary)]">
                These preferences are stored locally and will persist across sessions.
                Window style preferences apply to both the Select page and CRM interface.
              </p>
            </div>
          </div>
        </div>

        {/* Save/Cancel Footer */}
        <div className="neo-container p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--hud-text-secondary)] font-body">
              {hasUnsavedChanges ? (
                <span className="text-[var(--tactical-gold)]">You have unsaved changes</span>
              ) : (
                <span>Preview changes live. Click "Save Changes" to keep them.</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                disabled={!hasUnsavedChanges}
                className="neo-button px-6 py-3 font-primary text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                className="neo-button-active px-6 py-3 font-primary text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
