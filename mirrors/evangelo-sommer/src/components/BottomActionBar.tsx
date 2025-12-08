"use client";

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Sparkles, X, GripHorizontal, BarChart3, Lightbulb, Calendar, Receipt, Star, Info, MessageSquare } from 'lucide-react';

interface BottomActionBarProps {
  // Content for each panel
  messagesContent?: ReactNode;
  detailsContent?: ReactNode;
  insightsContent?: ReactNode;
  scheduleContent?: ReactNode;
  billingContent?: ReactNode;
}

type ActivePanel = 'messages' | 'details' | 'insights' | 'schedule' | 'billing' | null;

const panelConfig = {
  'messages': { title: 'Messages', icon: MessageSquare, shortLabel: 'Messages' },
  'insights': { title: 'Insights', icon: Lightbulb, shortLabel: 'Insights' },
  'schedule': { title: 'Schedule', icon: Calendar, shortLabel: 'Schedule' },
  'billing': { title: 'Billing', icon: Receipt, shortLabel: 'Billing' },
  'details': { title: 'Details', icon: Info, shortLabel: 'Details' },
};

export default function BottomActionBar({
  messagesContent,
  detailsContent,
  insightsContent,
  scheduleContent,
  billingContent,
}: BottomActionBarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [panelHeight, setPanelHeight] = useState(400); // Default height in pixels
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Handle panel open/close
  const handlePanelToggle = (panel: ActivePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartHeight.current = panelHeight;

    // Prevent text selection during drag
    e.preventDefault();
  };

  // Handle drag move
  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      const currentY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = dragStartY.current - currentY; // Positive = dragging up
      const newHeight = Math.max(200, Math.min(window.innerHeight - 100, dragStartHeight.current + deltaY));

      setPanelHeight(newHeight);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Get content for active panel
  const getPanelContent = () => {
    switch (activePanel) {
      case 'messages':
        return messagesContent;
      case 'details':
        return detailsContent;
      case 'insights':
        return insightsContent;
      case 'schedule':
        return scheduleContent;
      case 'billing':
        return billingContent;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Bottom Action Bar - Fixed at bottom, only visible on mobile/tablet */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {/* Sliding Panel */}
        {activePanel && (
          <div
            ref={panelRef}
            className="bg-background border-t-2 border-border shadow-2xl overflow-hidden transition-all duration-300"
            style={{
              height: `${panelHeight}px`,
              maxHeight: 'calc(100vh - 100px)'
            }}
          >
            {/* Drag Handle */}
            <div
              className="h-8 bg-muted/50 cursor-ns-resize flex items-center justify-center border-b border-border hover:bg-muted/70 active:bg-muted transition-colors touch-none"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <GripHorizontal className="w-8 h-5 text-muted-foreground" />
            </div>

            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
              <h3 className="font-primary font-bold text-sm uppercase tracking-wide text-foreground">
                {activePanel && panelConfig[activePanel].title}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="neo-button-sm w-8 h-8 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Content - Scrollable */}
            <div
              className="overflow-y-auto overflow-x-hidden"
              style={{
                height: `calc(${panelHeight}px - 88px)` // Subtract header + drag handle height
              }}
            >
              {getPanelContent()}
            </div>
          </div>
        )}

        {/* Action Bar Icons - Single Row */}
        <div className="border-t border-border bg-background backdrop-blur-sm shadow-lg">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {(Object.keys(panelConfig) as ActivePanel[]).map((panelKey) => {
              if (!panelKey) return null;
              const config = panelConfig[panelKey];
              const Icon = config.icon;

              return (
                <button
                  key={panelKey}
                  onClick={() => handlePanelToggle(panelKey)}
                  className={`neo-button flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all ${
                    activePanel === panelKey ? 'neo-button-active' : ''
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-primary uppercase tracking-tight leading-tight text-center">
                    {config.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind the bar */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
