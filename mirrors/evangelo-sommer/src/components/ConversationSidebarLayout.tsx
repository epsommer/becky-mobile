"use client";

import { useState, useEffect } from 'react';
import { Conversation, Client, Message } from '../types/client';
import { BillingSuggestion } from '../types/billing';
import ContextualSidebar from './ContextualSidebar';

interface ConversationSidebarLayoutProps {
  conversation: Conversation;
  client: Client | null;
  children: React.ReactNode;
  className?: string;
}

export default function ConversationSidebarLayout({
  conversation,
  client,
  children,
  className = ""
}: ConversationSidebarLayoutProps) {
  const [autoDetailsMessage, setAutoDetailsMessage] = useState<Message | null>(null);
  const [autoDetailsSuggestion, setAutoDetailsSuggestion] = useState<BillingSuggestion | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarState, setSidebarState] = useState<{ isOpen: boolean; width: number }>({
    isOpen: false,
    width: 0
  });

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAutoDetails = (message: Message, suggestion: BillingSuggestion) => {
    setAutoDetailsMessage(message);
    setAutoDetailsSuggestion(suggestion);
  };

  const handleSidebarStateChange = (isOpen: boolean, width: number) => {
    setSidebarState({ isOpen, width });
  };

  return (
    <div className={`min-h-screen bg-hud-background-secondary relative ${className}`}>
      {/* Contextual Sidebar */}
      {client && (
        <ContextualSidebar
          conversation={conversation}
          client={client}
          conversationId={conversation.id}
          onAutoDetails={handleAutoDetails}
          onStateChange={handleSidebarStateChange}
        />
      )}

      {/* Main Content - Adjusted for Sidebar */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${isMobile && sidebarState.isOpen ? 'opacity-50 pointer-events-none' : ''}
        `}
        style={{
          paddingRight: !isMobile && sidebarState.isOpen ? `${sidebarState.width}px` : '64px'
        }}
      >
        {children}
      </div>

      {/* Auto-details context (could be used for notifications) */}
      {autoDetailsMessage && autoDetailsSuggestion && (
        <div className="hidden">
          {/* Reserved for future auto-details notifications */}
        </div>
      )}
    </div>
  );
}