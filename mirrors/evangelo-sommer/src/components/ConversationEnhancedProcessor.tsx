"use client";

import { useState, useEffect } from 'react';
import { MessageSquare, Zap, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import AutoDraftPrompt from './AutoDraftPrompt';
import AutoDraftPopup from './AutoDraftPopup';
import { ConversationKeywordDetector, ConversationAnalysisResult } from '../lib/conversation-keyword-detector';
import { AutoDraftService, AutoDraftResult } from '../lib/auto-draft-service';
import { BillingSuggestion } from '../types/billing';

interface ConversationEnhancedProcessorProps {
  messages: { id: string; content: string; sender: string }[];
  onAutoDraftGenerated?: (result: AutoDraftResult) => void;
  onBillingSuggestion?: (suggestion: BillingSuggestion) => void;
  preferences?: {
    conversations?: {
      enableKeywordDetection?: boolean;
      enableAutoDraft?: boolean;
      keywordTriggers?: any[];
      parsingLanguage?: string;
      autoDraftConfidenceThreshold?: 'low' | 'medium' | 'high';
      autoDraftSettings?: {
        generateReceipts: boolean;
        generateInvoices: boolean;
        generateReplies: boolean;
        requireApproval: boolean;
      };
    };
  };
  className?: string;
}

export default function ConversationEnhancedProcessor({
  messages,
  onAutoDraftGenerated,
  onBillingSuggestion,
  preferences,
  className = ""
}: ConversationEnhancedProcessorProps) {
  const [analysisResults, setAnalysisResults] = useState<ConversationAnalysisResult[]>([]);
  const [autoDrafts, setAutoDrafts] = useState<AutoDraftResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAutoDraftPrompt, setShowAutoDraftPrompt] = useState(false);
  const [currentPromptData, setCurrentPromptData] = useState<any>(null);
  const [detector, setDetector] = useState<ConversationKeywordDetector | null>(null);
  const [autoDraftService, setAutoDraftService] = useState<AutoDraftService | null>(null);

  // Initialize services with preferences
  useEffect(() => {
    if (preferences?.conversations) {
      const keywordDetector = new ConversationKeywordDetector(
        preferences.conversations.keywordTriggers || [],
        preferences.conversations.parsingLanguage as any || 'auto',
        preferences.conversations.enableKeywordDetection !== false
      );
      setDetector(keywordDetector);

      const draftService = new AutoDraftService({
        generateReceipts: preferences.conversations.autoDraftSettings?.generateReceipts ?? true,
        generateInvoices: preferences.conversations.autoDraftSettings?.generateInvoices ?? true,
        generateReplies: preferences.conversations.autoDraftSettings?.generateReplies ?? false,
        requireApproval: preferences.conversations.autoDraftSettings?.requireApproval ?? true,
        confidenceThreshold: preferences.conversations.autoDraftConfidenceThreshold || 'medium'
      });
      setAutoDraftService(draftService);
    }
  }, [preferences]);

  // Process messages when they change
  useEffect(() => {
    if (detector && messages.length > 0) {
      processConversation();
    }
  }, [messages, detector]);

  const processConversation = async () => {
    if (!detector || messages.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Analyze conversation for keywords
      const results = detector.analyzeConversation(
        messages,
        preferences?.conversations?.autoDraftConfidenceThreshold || 'medium'
      );
      
      setAnalysisResults(results);

      // Generate auto-drafts if enabled
      if (autoDraftService && preferences?.conversations?.enableAutoDraft) {
        const drafts: AutoDraftResult[] = [];
        
        for (const result of results) {
          if (result.matches.length > 0) {
            const autoDraftResults = await autoDraftService.generateAutoDrafts(result);
            drafts.push(...autoDraftResults);
          }
        }
        
        setAutoDrafts(drafts);
        
        // Show prompt for high-confidence drafts
        const highConfidenceDrafts = drafts.filter(d => d.confidence > 0.7 && !d.requiresApproval);
        if (highConfidenceDrafts.length > 0 && !showAutoDraftPrompt) {
          const draft = highConfidenceDrafts[0];
          setCurrentPromptData({
            confidence: draft.confidence > 0.8 ? 'high' : 'medium',
            serviceType: draft.serviceType || 'service',
            suggestedAmount: draft.suggestedAmount || 0,
            reason: `Auto-detected from: ${draft.metadata.triggeredBy.join(', ')}`,
            draft
          });
          setShowAutoDraftPrompt(true);
        }
      }
    } catch (error) {
      console.error('Error processing conversation:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptAutoDraft = () => {
    if (currentPromptData?.draft) {
      onAutoDraftGenerated?.(currentPromptData.draft);
      
      // Also generate billing suggestion for existing components
      if (onBillingSuggestion) {
        const billingSuggestion = AutoDraftService.toBillingSuggestion(currentPromptData.draft);
        onBillingSuggestion(billingSuggestion);
      }
    }
    setShowAutoDraftPrompt(false);
    setCurrentPromptData(null);
  };

  const handleDeclineAutoDraft = () => {
    setShowAutoDraftPrompt(false);
    setCurrentPromptData(null);
  };

  const getOverallAnalysisStats = () => {
    const totalMatches = analysisResults.reduce((sum, result) => sum + result.matches.length, 0);
    const avgConfidence = analysisResults.length > 0 
      ? analysisResults.reduce((sum, result) => sum + result.overallConfidence, 0) / analysisResults.length
      : 0;
    
    return { totalMatches, avgConfidence };
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-100 text-green-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (!detector || !preferences?.conversations?.enableKeywordDetection) {
    return null;
  }

  const stats = getOverallAnalysisStats();

  return (
    <div className={`bg-hud-background-secondary p-4 border border-hud-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-tactical-gold" />
          <h4 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
            Conversation Analysis
          </h4>
          {isProcessing && (
            <div className="animate-spin">
              <Settings className="h-4 w-4 text-tactical-gold" />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className="bg-tactical-gold text-hud-text-primary">
            {stats.totalMatches} matches
          </Badge>
          <Badge className={getConfidenceBadgeColor(stats.avgConfidence)}>
            {Math.round(stats.avgConfidence * 100)}% confidence
          </Badge>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResults.length > 0 && (
        <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
          {analysisResults.map((result, index) => (
            result.matches.length > 0 && (
              <div key={result.messageId} className="bg-white p-2 border border-medium-grey text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-hud-text-primary">
                    Message {index + 1}: {result.matches.length} matches
                  </span>
                  <Badge className={getConfidenceBadgeColor(result.overallConfidence)}>
                    {Math.round(result.overallConfidence * 100)}%
                  </Badge>
                </div>
                <div className="text-medium-grey mt-1">
                  Actions: {result.suggestedActions.map(a => a.action).join(', ')}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Auto-Draft Results */}
      {autoDrafts.length > 0 && (
        <div className="space-y-2 mb-4">
          <h5 className="font-medium text-hud-text-primary font-primary uppercase tracking-wide text-sm">
            Auto-Draft Suggestions
          </h5>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {autoDrafts.map((draft, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-2 border border-medium-grey text-xs">
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-tactical-gold" />
                  <span className="font-medium text-hud-text-primary capitalize">
                    {draft.type}
                  </span>
                  {draft.suggestedAmount && (
                    <span className="text-medium-grey">${draft.suggestedAmount}</span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Badge className={getConfidenceBadgeColor(draft.confidence)}>
                    {Math.round(draft.confidence * 100)}%
                  </Badge>
                  {draft.requiresApproval && (
                    <div title="Requires approval">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Process Button */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-medium-grey font-primary">
          {messages.length} messages analyzed • Language: {detector.getConfig().language}
        </div>
        <Button
          onClick={processConversation}
          disabled={isProcessing}
          size="sm"
          className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide text-xs px-3 py-1"
        >
          {isProcessing ? 'Processing...' : 'Re-analyze'}
        </Button>
      </div>

      {/* Auto-Draft Prompt */}
      {showAutoDraftPrompt && currentPromptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="max-w-md w-full mx-4">
            <AutoDraftPrompt
              confidence={currentPromptData.confidence}
              serviceType={currentPromptData.serviceType}
              suggestedAmount={currentPromptData.suggestedAmount}
              reason={currentPromptData.reason}
              onAccept={handleAcceptAutoDraft}
              onDecline={handleDeclineAutoDraft}
              onDismiss={handleDeclineAutoDraft}
            />
          </div>
        </div>
      )}
    </div>
  );
}