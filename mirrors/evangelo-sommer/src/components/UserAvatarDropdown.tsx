"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import UserStatusIndicator, { StatusSelector } from "@/components/UserStatusIndicator";

interface UserAvatarDropdownProps {
  isDark?: boolean;
  className?: string;
}

export default function UserAvatarDropdown({ isDark = false, className = "" }: UserAvatarDropdownProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Get user initials - hardcoded to match CRM
  const getUserInitials = () => {
    return "ES";
  };

  // Get user display name - hardcoded to match CRM
  const getUserDisplayName = () => {
    return "Evangelo Sommer";
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="neo-button-circle w-11 h-11 font-bold text-sm relative"
      >
        <span className="relative z-10">{getUserInitials()}</span>
        <UserStatusIndicator />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop - high z-index to appear above everything including cards */}
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Menu - styled to match CRM Header with very high z-index */}
          <div
            ref={dropdownRef}
            className="neo-dropdown absolute right-0 top-full mt-2 w-72 z-[101] rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - matches CRM styling */}
            <div className="p-4 bg-background border-b border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Account Menu
              </h3>
              <div className="text-xs text-muted-foreground">
                {getUserDisplayName()}
              </div>
            </div>

            {/* Menu Items - matches CRM styling */}
            <div className="p-2 space-y-1 bg-background">
              {/* Account Settings */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/account');
                  setIsDropdownOpen(false);
                }}
                className="neo-button-menu w-full flex items-center space-x-3 p-3 rounded-lg"
              >
                <User className="h-4 w-4" />
                <span className="font-medium">Account Settings</span>
              </button>

              {/* System Preferences - Hidden on select page (not included) */}

              {/* Divider */}
              <div className="h-px bg-border my-2"></div>

              {/* Status with Side Dropdown */}
              <StatusSelector />

              {/* Divider */}
              <div className="h-px bg-border my-2"></div>

              {/* Sign Out */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/auth/signout');
                  setIsDropdownOpen(false);
                }}
                className="neo-button-menu w-full flex items-center space-x-3 p-3 rounded-lg text-red-600 dark:text-red-400"
              >
                <LogOut className="h-4 w-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
