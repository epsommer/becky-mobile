"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MousePointer2, Move, RotateCw, Scale, Menu, X, FilePlus, Save, Sun, Moon, LogOut } from "lucide-react";
import Toolbar from "./components/Toolbar";
import PropertiesPanel from "./components/PropertiesPanel";
import { useStudioStore } from "./hooks/useStudioStore";
import "@/app/neomorphic.css";
import AppPageLayout from "@/components/AppPageLayout";

// Dynamically import ThreeScene with SSR disabled (Three.js doesn't work on server)
const ThreeScene = dynamic(() => import("./components/ThreeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: '#D4AF37' }}></div>
    </div>
  ),
});

export default function StudioPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNewSceneDialog, setShowNewSceneDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const transformMode = useStudioStore((state) => state.transformMode);
  const setTransformMode = useStudioStore((state) => state.setTransformMode);
  const saveScene = useStudioStore((state) => state.saveScene);
  const loadScene = useStudioStore((state) => state.loadScene);
  const newScene = useStudioStore((state) => state.newScene);
  const isModified = useStudioStore((state) => state.isModified);
  const currentProjectName = useStudioStore((state) => state.currentProjectName);

  // Load theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
  }, []);

  // Handle load query parameter
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const projectId = searchParams.get("load");

      if (projectId) {
        console.log(`[Studio] Loading project from URL: ${projectId}`);
        loadScene(projectId);
        // Clean up URL
        window.history.replaceState({}, "", "/studio");
      }
    }
  }, [loadScene]);

  // Protect route - redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showMenu && !target.closest('.relative')) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Save theme preference
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Handle new scene
  const handleNewScene = () => {
    if (isModified) {
      setShowNewSceneDialog(true);
    } else {
      newScene();
    }
  };

  const handleNewSceneConfirm = async (action: 'save' | 'discard' | 'cancel') => {
    if (action === 'cancel') {
      setShowNewSceneDialog(false);
      return;
    }

    if (action === 'save') {
      // Save current scene first
      if (currentProjectName) {
        setIsSaving(true);
        const result = await saveScene(currentProjectName, saveDescription);
        setIsSaving(false);
        if (!result.success) {
          setSaveErrorMessage(result.error || "Failed to save scene");
          setTimeout(() => setSaveErrorMessage(null), 5000);
          return;
        }
      } else {
        // Need to show save dialog
        setShowNewSceneDialog(false);
        setShowSaveDialog(true);
        return;
      }
    }

    // Create new scene
    newScene();
    setShowNewSceneDialog(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!saveName.trim()) return;

    setIsSaving(true);
    const result = await saveScene(saveName, saveDescription);
    setIsSaving(false);

    if (result.success) {
      setShowSaveDialog(false);
      setSaveSuccessMessage(`Scene "${saveName}" saved successfully!`);
      setSaveName("");
      setSaveDescription("");
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } else {
      setSaveErrorMessage(result.error || "Failed to save scene");
      // Auto-hide error message after 5 seconds
      setTimeout(() => setSaveErrorMessage(null), 5000);
    }
  };

  // Initialize save name from current project
  useEffect(() => {
    if (currentProjectName && !saveName) {
      setSaveName(currentProjectName);
    }
  }, [currentProjectName, saveName]);

  if (status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out"
        }}
      >
        <div className="animate-spin h-8 w-8 border-b-2" style={{ borderColor: '#D4AF37' }}></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <AppPageLayout
      style={{
        backgroundColor: isDark ? "#1c1917" : "#EBECF0",
        transition: "background-color 300ms ease-in-out"
      }}
      contentClassName=""
    >
      <div
        className={`min-h-screen ${isDark ? 'dark-mode' : ''}`}
        style={{
          backgroundColor: isDark ? "#1c1917" : "#EBECF0",
          transition: "background-color 300ms ease-in-out"
        }}
      >
      {/* Secondary Controls */}
      <div className="flex items-center justify-between px-6 pb-4">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-space-grotesk"
            style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
          >
            Mode:
          </span>
          {[
            { mode: 'select', icon: MousePointer2, label: 'Select' },
            { mode: 'translate', icon: Move, label: 'Move' },
            { mode: 'rotate', icon: RotateCw, label: 'Rotate' },
            { mode: 'scale', icon: Scale, label: 'Scale' }
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode as 'select' | 'translate' | 'rotate' | 'scale')}
              className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
              style={{
                height: '36px',
                width: '36px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: transformMode === mode
                  ? (isDark ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.15)')
                  : undefined,
              }}
              title={label}
            >
              <Icon
                className="w-4 h-4"
                style={{
                  color: transformMode === mode
                    ? '#D4AF37'
                    : (isDark ? '#d1d5db' : '#6C7587')
                }}
              />
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              height: '40px',
              width: '40px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showMenu ? (
              <X className="w-5 h-5" style={{ color: isDark ? '#d1d5db' : '#6C7587' }} />
            ) : (
              <Menu className="w-5 h-5" style={{ color: isDark ? '#d1d5db' : '#6C7587' }} />
            )}
          </button>

          {/* Hamburger Menu Dropdown */}
          {showMenu && (
            <div
              className={`absolute right-0 top-12 neomorphic-card ${isDark ? 'dark-mode' : ''}`}
              style={{
                width: '250px',
                padding: '1rem',
                zIndex: 50,
              }}
            >
              <div className="space-y-2">
                {/* New Scene */}
                <button
                  onClick={() => {
                    handleNewScene();
                    setShowMenu(false);
                  }}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full flex items-center gap-3`}
                  style={{ height: '44px', padding: '0 16px', justifyContent: 'flex-start' }}
                >
                  <FilePlus className="w-4 h-4" style={{ color: isDark ? '#d1d5db' : '#6C7587' }} />
                  <span style={{ color: isDark ? '#d1d5db' : '#6C7587' }}>New Scene</span>
                </button>

                {/* Save */}
                <button
                  onClick={() => {
                    setShowSaveDialog(true);
                    setShowMenu(false);
                  }}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full flex items-center gap-3`}
                  style={{ height: '44px', padding: '0 16px', justifyContent: 'flex-start' }}
                >
                  <Save className="w-4 h-4" style={{ color: isDark ? '#d1d5db' : '#6C7587' }} />
                  <span style={{ color: isDark ? '#d1d5db' : '#6C7587' }}>
                    {currentProjectName ? 'Save' : 'Save As...'}
                  </span>
                </button>

                {/* Theme Toggle */}
                <button
                  onClick={() => {
                    toggleTheme();
                  }}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full flex items-center gap-3`}
                  style={{ height: '44px', padding: '0 16px', justifyContent: 'flex-start' }}
                >
                  {isDark ? (
                    <Sun className="w-4 h-4" style={{ color: '#FFA500' }} />
                  ) : (
                    <Moon className="w-4 h-4" style={{ color: '#8992A5' }} />
                  )}
                  <span style={{ color: isDark ? '#d1d5db' : '#6C7587' }}>
                    {isDark ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </button>

                {/* Divider */}
                <div
                  style={{
                    height: '1px',
                    backgroundColor: isDark ? '#3f3f46' : '#d1d9e6',
                    margin: '8px 0',
                  }}
                />

                {/* Exit Studio */}
                <button
                  onClick={() => {
                    router.push("/select");
                    setShowMenu(false);
                  }}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full flex items-center gap-3`}
                  style={{ height: '44px', padding: '0 16px', justifyContent: 'flex-start' }}
                >
                  <LogOut className="w-4 h-4" style={{ color: isDark ? '#d1d5db' : '#6C7587' }} />
                  <span style={{ color: isDark ? '#d1d5db' : '#6C7587' }}>Exit Studio</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-5rem)]">
        {/* Left Toolbar */}
        <aside className="w-16 p-2">
          <Toolbar isDark={isDark} />
        </aside>

        {/* 3D Canvas */}
        <main className="flex-1">
          <ThreeScene isDark={isDark} />
        </main>

        {/* Right Properties Panel */}
        <aside className="w-80 p-4">
          <PropertiesPanel isDark={isDark} />
        </aside>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-2xl font-bold font-space-grotesk uppercase mb-6"
              style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
            >
              Save Scene
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-space-grotesk mb-2"
                  style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                >
                  Scene Name *
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
                  placeholder="My Awesome Scene"
                />
              </div>

              <div>
                <label
                  className="block text-sm font-space-grotesk mb-2"
                  style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
                >
                  Description (optional)
                </label>
                <textarea
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
                  placeholder="Brief description of your scene..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim() || isSaving}
                  className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
                  style={{ flex: 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  disabled={isSaving}
                  className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                  style={{ flex: 1, height: '54px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Scene Confirmation Dialog */}
      {showNewSceneDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={() => setShowNewSceneDialog(false)}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-2xl font-bold font-space-grotesk uppercase mb-4"
              style={{ color: isDark ? '#d1d5db' : '#6C7587' }}
            >
              Unsaved Changes
            </h2>

            <p
              className="text-base font-space-grotesk mb-6"
              style={{ color: isDark ? '#9ca3af' : '#8992A5' }}
            >
              You have unsaved changes in your current scene. What would you like to do?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleNewSceneConfirm('save')}
                disabled={isSaving}
                className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%' }}
              >
                {isSaving ? 'Saving...' : 'Save and Create New Scene'}
              </button>

              <button
                onClick={() => handleNewSceneConfirm('discard')}
                disabled={isSaving}
                className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%', height: '54px' }}
              >
                Discard Changes and Create New Scene
              </button>

              <button
                onClick={() => handleNewSceneConfirm('cancel')}
                disabled={isSaving}
                className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
                style={{ width: '100%', height: '54px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {saveSuccessMessage && (
        <div
          className="fixed top-6 right-6 z-50"
          style={{
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '1.25rem 1.5rem',
              maxWidth: '400px',
              backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(220, 252, 231, 1)',
              borderLeft: '4px solid #22C55E',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#22C55E' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="font-space-grotesk font-medium"
                  style={{ color: isDark ? '#86EFAC' : '#166534' }}
                >
                  {saveSuccessMessage}
                </p>
              </div>
              <button
                onClick={() => setSaveSuccessMessage(null)}
                className="flex-shrink-0"
                style={{ color: isDark ? '#86EFAC' : '#166534' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {saveErrorMessage && (
        <div
          className="fixed top-6 right-6 z-50"
          style={{
            animation: 'slideInRight 0.3s ease-out',
          }}
        >
          <div
            className={`neomorphic-card ${isDark ? 'dark-mode' : ''}`}
            style={{
              padding: '1.25rem 1.5rem',
              maxWidth: '400px',
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(254, 226, 226, 1)',
              borderLeft: '4px solid #EF4444',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#EF4444' }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1">
                <p
                  className="font-space-grotesk font-medium"
                  style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}
                >
                  {saveErrorMessage}
                </p>
              </div>
              <button
                onClick={() => setSaveErrorMessage(null)}
                className="flex-shrink-0"
                style={{ color: isDark ? '#FCA5A5' : '#991B1B' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AppPageLayout>
  );
}
