"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface AutoDraftPopupProps {
  confidence: 'high' | 'medium' | 'low';
  serviceType: string;
  suggestedAmount: number;
  reason: string;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
  triggerElement: HTMLElement | null;
  isVisible: boolean;
}

export default function AutoDraftPopup({
  confidence,
  serviceType,
  suggestedAmount,
  reason,
  onAccept,
  onDecline,
  onDismiss,
  triggerElement,
  isVisible
}: AutoDraftPopupProps) {
  const [position, setPosition] = useState<{ x: number; y: number; placement: string } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('AutoDraftPopup useEffect', { isVisible, triggerElement, hasElement: !!triggerElement });
    
    if (isVisible && triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      console.log('Trigger element rect:', rect);
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      
      // Calculate popup dimensions (estimate)
      const popupWidth = 320;
      const popupHeight = 180;
      const offset = 12;
      
      // Try to position above first, then to the right, then below
      let x = rect.left + scrollX;
      let y = rect.top + scrollY - popupHeight - offset;
      let placement = 'top';
      
      // If not enough space above, try to the right
      if (y < scrollY) {
        x = rect.right + scrollX + offset;
        y = rect.top + scrollY;
        placement = 'right';
        
        // If not enough space to the right, position below
        if (x + popupWidth > window.innerWidth + scrollX) {
          x = rect.left + scrollX;
          y = rect.bottom + scrollY + offset;
          placement = 'bottom';
          
          // If not enough space below or to the left, force to the left
          if (y + popupHeight > window.innerHeight + scrollY) {
            x = rect.left + scrollX - popupWidth - offset;
            y = rect.top + scrollY;
            placement = 'left';
          }
        }
      }
      
      // Ensure the popup stays within viewport bounds
      x = Math.max(scrollX + 8, Math.min(x, window.innerWidth + scrollX - popupWidth - 8));
      y = Math.max(scrollY + 8, Math.min(y, window.innerHeight + scrollY - popupHeight - 8));
      
      setPosition({ x, y, placement });
    }
  }, [isVisible, triggerElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) && 
          triggerElement && !triggerElement.contains(event.target as Node)) {
        onDismiss();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onDismiss, triggerElement]);

  const handleAction = (action: () => void) => {
    setIsAnimating(true);
    setTimeout(() => action(), 150);
  };

  const getConfidenceColor = () => {
    switch (confidence) {
      case 'high':
        return 'border-green-300 bg-green-50';
      case 'medium':
        return 'border-hud-border-accent bg-tactical-gold-light';
      case 'low':
        return 'border-medium-grey bg-light-grey';
      default:
        return 'border-medium-grey bg-light-grey';
    }
  };

  const getConfidenceIcon = () => {
    switch (confidence) {
      case 'high':
        return '💰';
      case 'medium':
        return '📋';
      case 'low':
        return '⏰';
      default:
        return '📋';
    }
  };

  const getArrowClasses = (placement: string) => {
    const baseClasses = "absolute w-0 h-0 border-8";
    
    switch (placement) {
      case 'top':
        return `${baseClasses} border-t-green-300 border-l-transparent border-r-transparent border-b-transparent top-full left-1/2 transform -translate-x-1/2`;
      case 'bottom':
        return `${baseClasses} border-b-green-300 border-l-transparent border-r-transparent border-t-transparent bottom-full left-1/2 transform -translate-x-1/2`;
      case 'left':
        return `${baseClasses} border-l-green-300 border-t-transparent border-r-transparent border-b-transparent left-full top-1/2 transform -translate-y-1/2`;
      case 'right':
        return `${baseClasses} border-r-green-300 border-t-transparent border-l-transparent border-b-transparent right-full top-1/2 transform -translate-y-1/2`;
      default:
        return '';
    }
  };

  if (!isVisible || !position) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onDismiss} />
      
      {/* Popup */}
      <div
        ref={popupRef}
        className={`
          fixed z-50 p-4 border-2 shadow-lg transition-all duration-200
          ${getConfidenceColor()}
          ${isAnimating ? 'scale-95 opacity-75' : 'scale-100 opacity-100'}
          w-80 min-h-fit
        `}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        {/* Arrow indicator */}
        <div className={getArrowClasses(position.placement)} />
        
        {/* Dismiss button */}
        <button
          onClick={() => handleAction(onDismiss)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center hover:bg-medium-grey transition-colors duration-150 z-10"
          aria-label="Dismiss auto-draft prompt"
        >
          <X className="w-4 h-4 text-medium-grey" />
        </button>

        {/* Main content */}
        <div className="pr-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{getConfidenceIcon()}</span>
            <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
              Auto-Draft Receipt?
            </h4>
            <span className={`
              px-2 py-1 text-xs font-primary font-bold uppercase tracking-wide
              ${confidence === 'high' ? 'bg-green-200 text-green-800' : 
                confidence === 'medium' ? 'bg-tactical-gold text-hud-text-primary' : 'bg-medium-grey text-hud-text-primary'}
            `}>
              {confidence}
            </span>
          </div>

          {/* Details */}
          <div className="mb-4 text-xs">
            <div className="text-hud-text-primary font-primary mb-1">
              <strong>Service:</strong> {serviceType.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div className="text-hud-text-primary font-primary mb-2">
              <strong>Amount:</strong> ${suggestedAmount}
            </div>
            <div className="text-medium-grey font-primary italic text-xs">
              {reason}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleAction(onAccept)}
              size="sm"
              className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide text-xs px-3 py-1"
            >
              <Check className="w-3 h-3 mr-1" />
              Auto-Draft
            </Button>
            
            <Button
              onClick={() => handleAction(onDecline)}
              variant="outline"
              size="sm"
              className="border-medium-grey text-medium-grey hover:bg-light-grey font-primary font-bold uppercase tracking-wide text-xs px-3 py-1"
            >
              Decline
            </Button>
          </div>
        </div>

        {/* Progress indicator for high confidence */}
        {confidence === 'high' && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-green-200">
            <div className="h-full bg-green-500 w-4/5 transition-all duration-1000"></div>
          </div>
        )}
      </div>
    </>
  );
}