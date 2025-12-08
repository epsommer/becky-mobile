"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import "@/app/neomorphic.css";

interface SettingsPanelProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SettingsPanel({
  isVisible,
  onToggle,
}: SettingsPanelProps) {
  const router = useRouter();
  const [musicVolume, setMusicVolume] = useState(75);
  const [sfxVolume, setSfxVolume] = useState(85);
  const [musicTrack, setMusicTrack] = useState("ambient-gallery");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const isDark = true; // Always dark mode for 3D gallery

  const musicTracks = [
    { id: "ambient-gallery", name: "Ambient Gallery" },
    { id: "classical-museum", name: "Classical Museum" },
    { id: "modern-electronic", name: "Modern Electronic" },
    { id: "minimal-piano", name: "Minimal Piano" },
    { id: "nature-sounds", name: "Nature Sounds" },
    { id: "silence", name: "No Music" },
  ];

  const handleSave = () => {
    // Save settings to localStorage
    const settings = {
      musicVolume,
      sfxVolume,
      musicTrack,
      audioEnabled,
    };
    localStorage.setItem("gallery-settings", JSON.stringify(settings));
    console.log("⚙️ Settings saved:", settings);
  };

  const handleReset = () => {
    setMusicVolume(75);
    setSfxVolume(85);
    setMusicTrack("ambient-gallery");
    setAudioEnabled(true);
  };

  const handleReturnToSelect = () => {
    router.push("/select");
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/auth/signin" });
  };

  if (!isVisible) return null;

  return (
    <div
      className="gallery-ui fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onToggle}
    >
      <div
        className="dark-mode"
        style={{
          width: "480px",
          maxWidth: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: "2rem",
          backgroundColor: "rgba(28, 25, 23, 0.95)",
          border: "1px solid #9ca3af",
          borderRadius: "16px",
          backdropFilter: "blur(8px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-space-grotesk uppercase" style={{ color: "#D4AF37" }}>
            ⏸️ Paused
          </h2>
          <button
            onClick={onToggle}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              height: "36px",
              width: "36px",
              padding: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Controls Section */}
        <div className="mb-6">
          <button
            onClick={() => setShowControls(!showControls)}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''} w-full`}
            style={{
              height: "48px",
              fontSize: "14px",
              backgroundColor: showControls
                ? "rgba(212, 175, 55, 0.2)"
                : undefined,
            }}
          >
            🎮 {showControls ? "Hide" : "Show"} Controls
          </button>

          {showControls && (
            <div
              className="mt-4 p-4 space-y-3"
              style={{
                backgroundColor: "rgba(60, 56, 54, 0.3)",
                borderRadius: "8px",
              }}
            >
              <div>
                <p className="font-bold font-space-grotesk uppercase text-sm mb-2" style={{ color: "#D4AF37" }}>
                  Movement
                </p>
                <div className="text-sm space-y-1" style={{ color: "#d1d5db" }}>
                  <p>• WASD / Arrow Keys: Move</p>
                  <p>• SPACE: Jump</p>
                  <p>• Q / E: Rotate Left/Right</p>
                </div>
              </div>

              <div>
                <p className="font-bold font-space-grotesk uppercase text-sm mb-2" style={{ color: "#D4AF37" }}>
                  Camera
                </p>
                <div className="text-sm space-y-1" style={{ color: "#d1d5db" }}>
                  <p>• Mouse: Look Around</p>
                  <p>• Move cursor to screen edges for rotation</p>
                </div>
              </div>

              <div>
                <p className="font-bold font-space-grotesk uppercase text-sm mb-2" style={{ color: "#D4AF37" }}>
                  Menu
                </p>
                <div className="text-sm space-y-1" style={{ color: "#d1d5db" }}>
                  <p>• TAB: Open/Close Pause Menu</p>
                  <p>• ESC: Debug Panel</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "#3f3f46", marginBottom: "1.5rem" }} />

        {/* Audio Enable/Disable */}
        <div className="mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={audioEnabled}
              onChange={(e) => setAudioEnabled(e.target.checked)}
              className="w-5 h-5"
              style={{ accentColor: "#D4AF37" }}
            />
            <span className="text-lg font-space-grotesk" style={{ color: "#d1d5db" }}>
              🔊 Enable Audio
            </span>
          </label>
        </div>

        {/* Music Volume */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🎵 Music Volume: {musicVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full"
            style={{ accentColor: "#D4AF37" }}
          />
        </div>

        {/* SFX Volume */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🔉 Sound Effects Volume: {sfxVolume}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            disabled={!audioEnabled}
            className="w-full"
            style={{ accentColor: "#D4AF37" }}
          />
        </div>

        {/* Music Track Selection */}
        <div className="mb-6">
          <label className="block text-sm font-space-grotesk uppercase mb-2" style={{ color: "#9ca3af" }}>
            🎼 Background Music
          </label>
          <select
            value={musicTrack}
            onChange={(e) => setMusicTrack(e.target.value)}
            disabled={!audioEnabled}
            className={`neomorphic-input ${isDark ? 'dark-mode' : ''}`}
            style={{
              width: "100%",
              padding: "0.75rem",
            }}
          >
            {musicTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
        </div>

        {/* Settings Buttons */}
        <div className="flex space-x-3 mb-4">
          <button
            onClick={handleSave}
            className={`neomorphic-submit ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            💾 Save
          </button>
          <button
            onClick={handleReset}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            🔄 Reset
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", backgroundColor: "#3f3f46", marginBottom: "1rem" }} />

        {/* Navigation Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleReturnToSelect}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            🏠 Select Page
          </button>
          <button
            onClick={handleSignOut}
            className={`neomorphic-button ${isDark ? 'dark-mode' : ''}`}
            style={{
              flex: 1,
              height: "48px",
              fontSize: "14px",
            }}
          >
            🚪 Sign Out
          </button>
        </div>

        <div className="mt-4 text-xs text-center font-space-grotesk" style={{ color: "#6b7280" }}>
          Press TAB to resume • ESC for debug panel
        </div>
      </div>
    </div>
  );
}
