'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GrainyTexture } from '@/components/GrainyTexture';

type DefaultView = 'grid' | 'list' | 'table';
type SortOrder = 'asc' | 'desc';
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'status';

interface CRMPreferences {
  defaultView: DefaultView;
  itemsPerPage: number;
  sortField: SortField;
  sortOrder: SortOrder;
  showArchivedClients: boolean;
  enableNotifications: boolean;
  autoSaveInterval: number; // in seconds
  compactMode: boolean;
}

const DEFAULT_PREFERENCES: CRMPreferences = {
  defaultView: 'grid',
  itemsPerPage: 20,
  sortField: 'name',
  sortOrder: 'asc',
  showArchivedClients: false,
  enableNotifications: true,
  autoSaveInterval: 30,
  compactMode: false,
};

export default function SystemPreferencesPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<CRMPreferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const loadedPreferences = localStorage.getItem('crm-preferences');
    if (loadedPreferences) {
      try {
        setPreferences(JSON.parse(loadedPreferences));
      } catch (error) {
        console.error('Failed to parse CRM preferences:', error);
      }
    }
  }, []);

  const savePreferences = () => {
    localStorage.setItem('crm-preferences', JSON.stringify(preferences));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    // Dispatch custom event for other CRM components to update
    window.dispatchEvent(
      new CustomEvent('crm-preferences-changed', { detail: preferences })
    );
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem('crm-preferences', JSON.stringify(DEFAULT_PREFERENCES));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updatePreference = <K extends keyof CRMPreferences>(
    key: K,
    value: CRMPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--hud-background-primary)] text-[var(--hud-text-primary)] p-6">
      <GrainyTexture />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="neo-container p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-primary text-2xl uppercase tracking-wide text-[var(--hud-text-primary)] mb-2">
                System Preferences
              </h1>
              <p className="font-body text-sm text-[var(--hud-text-secondary)]">
                Configure CRM defaults, workflows, and display options
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetToDefaults}
                className="neo-button px-6 py-3 font-primary text-sm uppercase tracking-wide"
              >
                Reset to Defaults
              </button>
              <button
                onClick={() => router.push('/crm')}
                className="neo-button px-6 py-3 font-primary text-sm uppercase tracking-wide"
              >
                Back to CRM
              </button>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Display Preferences
          </h2>

          <div className="space-y-6">
            {/* Default View */}
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-3 block">
                Default View
              </label>
              <div className="grid grid-cols-3 gap-4">
                {(['grid', 'list', 'table'] as DefaultView[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => updatePreference('defaultView', view)}
                    className={`neo-button px-6 py-4 font-primary text-sm uppercase tracking-wide ${
                      preferences.defaultView === view ? 'neo-button-active' : ''
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>

            {/* Items Per Page */}
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-3 block">
                Items Per Page
              </label>
              <div className="grid grid-cols-4 gap-4">
                {[10, 20, 50, 100].map((count) => (
                  <button
                    key={count}
                    onClick={() => updatePreference('itemsPerPage', count)}
                    className={`neo-button px-6 py-4 font-primary text-sm uppercase tracking-wide ${
                      preferences.itemsPerPage === count ? 'neo-button-active' : ''
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Mode Toggle */}
            <div className="flex items-center justify-between py-4 border-t border-[var(--hud-border)]">
              <div>
                <div className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-primary)] mb-1">
                  Compact Mode
                </div>
                <div className="font-body text-xs text-[var(--hud-text-secondary)]">
                  Reduce spacing and padding for more content on screen
                </div>
              </div>
              <button
                onClick={() => updatePreference('compactMode', !preferences.compactMode)}
                className={`neo-button px-6 py-3 font-primary text-xs uppercase tracking-wide ${
                  preferences.compactMode ? 'neo-button-active' : ''
                }`}
              >
                {preferences.compactMode ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Sorting Preferences */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Default Sorting
          </h2>

          <div className="space-y-6">
            {/* Sort Field */}
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-3 block">
                Sort By
              </label>
              <div className="grid grid-cols-4 gap-4">
                {(['name', 'createdAt', 'updatedAt', 'status'] as SortField[]).map((field) => (
                  <button
                    key={field}
                    onClick={() => updatePreference('sortField', field)}
                    className={`neo-button px-4 py-4 font-primary text-xs uppercase tracking-wide ${
                      preferences.sortField === field ? 'neo-button-active' : ''
                    }`}
                  >
                    {field === 'createdAt' ? 'Created' : field === 'updatedAt' ? 'Updated' : field}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Order */}
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-3 block">
                Sort Order
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => updatePreference('sortOrder', 'asc')}
                  className={`neo-button px-6 py-4 font-primary text-sm uppercase tracking-wide ${
                    preferences.sortOrder === 'asc' ? 'neo-button-active' : ''
                  }`}
                >
                  Ascending (A → Z)
                </button>
                <button
                  onClick={() => updatePreference('sortOrder', 'desc')}
                  className={`neo-button px-6 py-4 font-primary text-sm uppercase tracking-wide ${
                    preferences.sortOrder === 'desc' ? 'neo-button-active' : ''
                  }`}
                >
                  Descending (Z → A)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Preferences */}
        <div className="neo-container p-6 mb-6">
          <h2 className="font-primary text-lg uppercase tracking-wide text-[var(--hud-text-primary)] mb-4">
            Workflow Settings
          </h2>

          <div className="space-y-6">
            {/* Auto-save Interval */}
            <div>
              <label className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-secondary)] mb-3 block">
                Auto-Save Interval (seconds)
              </label>
              <div className="grid grid-cols-4 gap-4">
                {[15, 30, 60, 120].map((seconds) => (
                  <button
                    key={seconds}
                    onClick={() => updatePreference('autoSaveInterval', seconds)}
                    className={`neo-button px-6 py-4 font-primary text-sm uppercase tracking-wide ${
                      preferences.autoSaveInterval === seconds ? 'neo-button-active' : ''
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            {/* Show Archived Clients */}
            <div className="flex items-center justify-between py-4 border-t border-[var(--hud-border)]">
              <div>
                <div className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-primary)] mb-1">
                  Show Archived Clients
                </div>
                <div className="font-body text-xs text-[var(--hud-text-secondary)]">
                  Include archived clients in default views
                </div>
              </div>
              <button
                onClick={() => updatePreference('showArchivedClients', !preferences.showArchivedClients)}
                className={`neo-button px-6 py-3 font-primary text-xs uppercase tracking-wide ${
                  preferences.showArchivedClients ? 'neo-button-active' : ''
                }`}
              >
                {preferences.showArchivedClients ? 'Show' : 'Hide'}
              </button>
            </div>

            {/* Enable Notifications */}
            <div className="flex items-center justify-between py-4 border-t border-[var(--hud-border)]">
              <div>
                <div className="font-primary text-sm uppercase tracking-wide text-[var(--hud-text-primary)] mb-1">
                  Enable Notifications
                </div>
                <div className="font-body text-xs text-[var(--hud-text-secondary)]">
                  Receive system notifications for updates and reminders
                </div>
              </div>
              <button
                onClick={() => updatePreference('enableNotifications', !preferences.enableNotifications)}
                className={`neo-button px-6 py-3 font-primary text-xs uppercase tracking-wide ${
                  preferences.enableNotifications ? 'neo-button-active' : ''
                }`}
              >
                {preferences.enableNotifications ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="neo-container p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-1 h-full bg-[var(--tactical-gold)]" />
              <div>
                <h3 className="font-primary text-sm uppercase tracking-wide text-[var(--tactical-gold)] mb-2">
                  Note
                </h3>
                <p className="font-body text-sm text-[var(--hud-text-secondary)]">
                  These preferences only apply to the CRM interface and are stored locally.
                  Click "Save Preferences" to apply changes.
                </p>
              </div>
            </div>
            <button
              onClick={savePreferences}
              className={`neo-button-active px-8 py-4 font-primary text-sm uppercase tracking-wide transition-all ${
                saved ? 'bg-[var(--tactical-success)]' : ''
              }`}
            >
              {saved ? 'Saved!' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
