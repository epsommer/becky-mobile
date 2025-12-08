"use client";

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ConversationSidebar from './ConversationSidebar';
import { Conversation, Client } from '../types/client';

type TabType = "timeline" | "analytics" | "insights" | "schedule" | "billing";

interface ConversationLayoutProps {
  conversation: Conversation;
  client: Client | null;
  children: React.ReactNode;
}

export default function ConversationLayout({
  conversation,
  client,
  children
}: ConversationLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>("timeline");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      
      if (mobile) {
        setIsSidebarCollapsed(true);
        setIsMobileSidebarOpen(false);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (isMobile) {
      setIsMobileSidebarOpen(true);
    }
  };

  const sidebarWidth = isSidebarCollapsed ? 16 : 64; // 4rem or 16rem
  const panelWidth = isSidebarCollapsed ? 80 : 96; // 20rem or 24rem

  return (
    <div className="min-h-screen bg-hud-background-secondary relative">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ConversationSidebar
          conversation={conversation}
          client={client}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          className="hidden lg:block"
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-80 bg-white flex">
            <ConversationSidebar
              conversation={conversation}
              client={client}
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
            />
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
          >
            <X className="w-6 h-6 text-hud-text-primary" />
          </button>
        </div>
      )}

      {/* Mobile Tab Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-dark-grey border-t-2 border-hud-border-accent z-40 lg:hidden">
          <div className="flex">
            {[
              { id: "timeline", icon: "💬", label: "Timeline" },
              { id: "analytics", icon: "📊", label: "Analytics" },
              { id: "insights", icon: "🎯", label: "Insights" },
              { id: "schedule", icon: "📅", label: "Schedule" },
              { id: "billing", icon: "💰", label: "Billing" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`
                  flex-1 flex flex-col items-center justify-center py-2 px-1 transition-colors
                  ${activeTab === tab.id 
                    ? 'bg-tactical-gold text-hud-text-primary' 
                    : 'text-medium-grey hover:text-gold'
                  }
                `}
              >
                <span className="text-lg mb-1">{tab.icon}</span>
                <span className="text-xs font-primary font-bold uppercase tracking-wide">
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div 
        className={`
          transition-all duration-300 ease-in-out
          ${!isMobile ? `ml-${sidebarWidth + panelWidth}` : ''}
          ${isMobile ? 'pb-20' : ''}
        `}
        style={!isMobile ? {
          marginLeft: `${sidebarWidth * 0.25 + panelWidth * 0.25}rem`
        } : undefined}
      >
        {children}
      </div>

      {/* Mobile Sidebar Toggle Button */}
      {isMobile && !isMobileSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-40 bg-tactical-gold text-hud-text-primary w-12 h-12 rounded-full flex items-center justify-center shadow-lg lg:hidden"
        >
          <span className="text-xl">💬</span>
        </button>
      )}
    </div>
  );
}