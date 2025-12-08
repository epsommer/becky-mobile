"use client";

import { useState, useRef } from 'react';
import { Receipt, DollarSign, Clock } from 'lucide-react';

import { Message, Conversation } from '../types/client';
import { BillingSuggestion } from '../types/billing';

interface AutoDraftTriggerProps {
  message: Message;
  conversation: Conversation;
  billingSuggestion: BillingSuggestion;
  onTriggerAutoDraft: (message: Message, suggestion: BillingSuggestion) => void;
  className?: string;
}

export default function AutoDraftTrigger({
  message,
  conversation,
  billingSuggestion,
  onTriggerAutoDraft,
  className = ""
}: AutoDraftTriggerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get confidence-based styling
  const getConfidenceStyle = () => {
    if (!billingSuggestion) {
      return {
        bg: 'bg-tactical-grey-200 hover:bg-tactical-grey-300',
        border: 'border-tactical-grey-400',
        text: 'text-tactical-grey-500',
        icon: '💼'
      };
    }
    
    switch (billingSuggestion.confidence) {
      case 'high':
        return {
          bg: 'bg-green-100 hover:bg-green-200',
          border: 'border-green-300',
          text: 'text-green-700',
          icon: '💰'
        };
      case 'medium':
        return {
          bg: 'bg-tactical-gold hover:bg-tactical-gold-light',
          border: 'border-hud-border-accent-dark',
          text: 'text-hud-text-primary',
          icon: '📋'
        };
      case 'low':
        return {
          bg: 'bg-light-grey hover:bg-medium-grey',
          border: 'border-medium-grey',
          text: 'text-medium-grey',
          icon: '⏰'
        };
      default:
        return {
          bg: 'bg-light-grey hover:bg-medium-grey',
          border: 'border-medium-grey', 
          text: 'text-medium-grey',
          icon: '📋'
        };
    }
  };

  const style = getConfidenceStyle();

  // Don't render if no billing suggestion or for low confidence without service mention
  if (!billingSuggestion || (billingSuggestion.confidence === 'low' && !billingSuggestion.serviceType)) {
    return null;
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.preventDefault();
          console.log('AutoDraftTrigger clicked', { message, billingSuggestion });
          if (billingSuggestion) {
            onTriggerAutoDraft(message, billingSuggestion);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          inline-flex items-center justify-center
          w-6 h-6 border-2 transition-all duration-200
          ${style.bg} ${style.border} ${style.text}
          hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gold
        `}
        aria-label={`Generate ${billingSuggestion?.confidence || 'unknown'} confidence billing suggestion for ${billingSuggestion?.serviceType || 'service'}`}
        title={`Auto-draft billing for ${billingSuggestion?.serviceType || 'detected service'}`}
      >
        <span className="text-xs">{style.icon}</span>
      </button>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-dark-grey text-white px-3 py-2 text-xs font-primary whitespace-nowrap border-2 border-dark-grey">
            <div className="font-bold uppercase tracking-wide">
              {billingSuggestion?.confidence?.toUpperCase() || 'UNKNOWN'} CONFIDENCE
            </div>
            <div className="mt-1">
              {billingSuggestion?.serviceType && (
                <div>Service: {billingSuggestion.serviceType.replace(/([A-Z])/g, ' $1').trim()}</div>
              )}
              {billingSuggestion?.suggestedAmount && (
                <div>Amount: ${billingSuggestion.suggestedAmount}</div>
              )}
              <div className="text-gold mt-1">Click to auto-draft →</div>
            </div>
            
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-dark-grey"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}