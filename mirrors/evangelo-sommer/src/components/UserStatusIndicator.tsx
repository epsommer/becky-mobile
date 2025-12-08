"use client";

import { useState, useEffect, useRef } from "react";
import { Circle } from "lucide-react";

export type UserStatus = "online" | "inactive" | "dnd" | "invisible";

interface UserStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const statusConfigs: Record<UserStatus, UserStatusConfig> = {
  online: {
    label: "Online",
    color: "bg-green-500",
    bgColor: "bg-green-500/10",
    description: "Available and active"
  },
  inactive: {
    label: "Inactive",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    description: "Away from keyboard"
  },
  dnd: {
    label: "Do Not Disturb",
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    description: "Focused, please don't interrupt"
  },
  invisible: {
    label: "Invisible",
    color: "bg-gray-400",
    bgColor: "bg-gray-400/10",
    description: "Appear offline to others"
  }
};

interface UserStatusIndicatorProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Visual indicator only - non-clickable
export default function UserStatusIndicator({
  size = "md",
  className = ""
}: UserStatusIndicatorProps) {
  const [status, setStatus] = useState<UserStatus>("online");

  // Load status from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem("user-status") as UserStatus;
    if (savedStatus && statusConfigs[savedStatus]) {
      setStatus(savedStatus);
    }

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-status" && e.newValue) {
        setStatus(e.newValue as UserStatus);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const currentConfig = statusConfigs[status];

  return (
    <div
      className={`absolute top-0 right-0 ${sizeClasses[size]} ${currentConfig.color} rounded-full border-2 border-background ${className}`}
      title={currentConfig.label}
    />
  );
}

// Status selector component - navigation item with side dropdown
interface StatusSelectorProps {
  onStatusChange?: (status: UserStatus) => void;
}

export function StatusSelector({ onStatusChange }: StatusSelectorProps) {
  const [status, setStatus] = useState<UserStatus>("online");
  const [showSubmenu, setShowSubmenu] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, right: 0 });
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load status from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem("user-status") as UserStatus;
    if (savedStatus && statusConfigs[savedStatus]) {
      setStatus(savedStatus);
    }

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-status" && e.newValue) {
        setStatus(e.newValue as UserStatus);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Calculate submenu position when button ref changes or submenu opens
  useEffect(() => {
    if (buttonRef && showSubmenu) {
      const rect = buttonRef.getBoundingClientRect();
      setSubmenuPosition({
        top: rect.top,
        right: window.innerWidth - rect.left + 8 // 8px gap (mr-2 = 0.5rem = 8px)
      });
    }
  }, [buttonRef, showSubmenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowSubmenu(true);
  };

  const handleMouseLeave = () => {
    // Delay closing to allow mouse to move to submenu
    closeTimeoutRef.current = setTimeout(() => {
      setShowSubmenu(false);
    }, 150); // 150ms delay
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    setStatus(newStatus);
    localStorage.setItem("user-status", newStatus);

    // Trigger storage event manually for same-window updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user-status',
      newValue: newStatus,
      oldValue: status
    }));

    onStatusChange?.(newStatus);

    // Clear timeout and close immediately
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowSubmenu(false);
  };

  const currentConfig = statusConfigs[status];

  return (
    <>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={setButtonRef}
          onClick={() => setShowSubmenu(!showSubmenu)}
          className="neo-button-menu w-full flex items-center justify-between p-3 rounded-lg group"
        >
          <div className="flex items-center space-x-3">
            <svg
              className="w-4 h-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Status</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-muted-foreground">{currentConfig.label}</span>
            <Circle className={`h-3 w-3 ${currentConfig.color} fill-current`} />
          </div>
        </button>
      </div>

      {/* Side Dropdown - fixed positioned to appear on the LEFT, outside parent overflow */}
      {showSubmenu && (
        <div
          className="fixed w-64 neo-container rounded-xl overflow-hidden z-[102]"
          style={{
            top: `${submenuPosition.top}px`,
            right: `${submenuPosition.right}px`
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="p-3 border-b border-border">
            <h4 className="font-primary text-xs uppercase tracking-wide text-foreground">
              Set Status
            </h4>
          </div>

          <div className="p-2 space-y-1">
            {(Object.keys(statusConfigs) as UserStatus[]).map((statusKey) => {
              const config = statusConfigs[statusKey];
              return (
                <button
                  key={statusKey}
                  onClick={() => handleStatusChange(statusKey)}
                  className={`w-full neo-button px-3 py-2 flex items-center gap-3 text-left transition-all ${
                    status === statusKey ? config.bgColor : ""
                  }`}
                >
                  <Circle
                    className={`w-3 h-3 ${config.color} fill-current`}
                  />
                  <div className="flex-1">
                    <div className="font-primary text-sm text-foreground">
                      {config.label}
                    </div>
                    <div className="font-body text-xs text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                  {status === statusKey && (
                    <div className="text-accent text-xs">✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// Hook to get current user status
export function useUserStatus() {
  const [status, setStatus] = useState<UserStatus>("online");

  useEffect(() => {
    const savedStatus = localStorage.getItem("user-status") as UserStatus;
    if (savedStatus && statusConfigs[savedStatus]) {
      setStatus(savedStatus);
    }

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user-status" && e.newValue) {
        setStatus(e.newValue as UserStatus);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return status;
}
