"use client";

import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

interface AutoDraftPromptProps {
  confidence: 'high' | 'medium' | 'low';
  serviceType: string;
  suggestedAmount: number;
  reason: string;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
  className?: string;
}

export default function AutoDraftPrompt({
  confidence,
  serviceType,
  suggestedAmount,
  reason,
  onAccept,
  onDecline,
  onDismiss,
  className = ""
}: AutoDraftPromptProps) {
  const [isAnimating, setIsAnimating] = useState(false);

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

  return (
    <div className={`
      relative p-4 border-2 transition-all duration-200
      ${getConfidenceColor()}
      ${isAnimating ? 'scale-95 opacity-75' : 'scale-100 opacity-100'}
      ${className}
    `}>
      {/* Dismiss button */}
      <button
        onClick={() => handleAction(onDismiss)}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center hover:bg-medium-grey transition-colors duration-150"
        aria-label="Dismiss auto-draft prompt"
      >
        <X className="w-4 h-4 text-medium-grey" />
      </button>

      {/* Main content */}
      <div className="pr-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{getConfidenceIcon()}</span>
          <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
            Auto-Draft Receipt?
          </h4>
          <span className={`
            px-2 py-1 text-xs font-primary font-bold uppercase tracking-wide
            ${confidence === 'high' ? 'bg-green-200 text-green-800' : 
              confidence === 'medium' ? 'bg-tactical-gold text-hud-text-primary' : 'bg-medium-grey text-hud-text-primary'}
          `}>
            {confidence} confidence
          </span>
        </div>

        {/* Details */}
        <div className="mb-4">
          <div className="text-sm text-hud-text-primary font-primary mb-1">
            <strong>Service:</strong> {serviceType.replace(/([A-Z])/g, ' $1').trim()}
          </div>
          <div className="text-sm text-hud-text-primary font-primary mb-1">
            <strong>Suggested Amount:</strong> ${suggestedAmount}
          </div>
          <div className="text-xs text-medium-grey font-primary italic">
            {reason}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleAction(onAccept)}
            size="sm"
            className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide px-4"
          >
            <Check className="w-4 h-4 mr-2" />
            Yes, Auto-Draft
          </Button>
          
          <Button
            onClick={() => handleAction(onDecline)}
            variant="outline"
            size="sm"
            className="border-medium-grey text-medium-grey hover:bg-light-grey font-primary font-bold uppercase tracking-wide px-4"
          >
            No Thanks
          </Button>
        </div>
      </div>

      {/* Progress indicator for high confidence */}
      {confidence === 'high' && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-green-200">
          <div className="h-full bg-green-500 w-4/5"></div>
        </div>
      )}
    </div>
  );
}