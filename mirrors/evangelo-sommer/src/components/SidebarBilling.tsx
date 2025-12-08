"use client";

import { useState, useMemo, useEffect } from 'react';
import { Receipt, DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle, Plus, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Conversation, Client, Message } from '../types/client';
import { BillingSuggestion } from '../types/billing';
// Removed billingManager import - use API endpoints instead
import { Button } from './ui/button';
import AutoDraftPrompt from './AutoDraftPrompt';
import EnhancedReceiptModal from './EnhancedReceiptModal';

interface SidebarBillingProps {
  conversation: Conversation;
  client: Client;
  onAutoDetails?: (message: Message, suggestion: BillingSuggestion) => void;
}

interface BillingSummary {
  totalOpportunities: number;
  estimatedValue: number;
  highConfidenceItems: number;
  pendingDrafts: number;
  opportunities: Array<{
    message: Message;
    suggestion: BillingSuggestion;
  }>;
}

export default function SidebarBilling({ conversation, client, onAutoDetails }: SidebarBillingProps) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<{message: Message, suggestion: BillingSuggestion} | null>(null);
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [expandedOpportunity, setExpandedOpportunity] = useState<string | null>(null);
  const [manualEntryData, setManualEntryData] = useState({
    documentType: 'receipt' as 'receipt' | 'invoice' | 'quote' | 'estimate',
    serviceType: '',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10)
  });

  const billingSummary = useMemo((): BillingSummary => {
    const messages = conversation.messages || [];
    const opportunities: Array<{message: Message, suggestion: BillingSuggestion}> = [];
    let estimatedValue = 0;
    let highConfidenceItems = 0;

    messages.forEach(message => {
      if (message.role === 'client') {
        // TODO: Move to API endpoint
        const suggestion: BillingSuggestion = {
          type: 'none',
          confidence: 'low',
          serviceType: undefined,
          suggestedAmount: undefined,
          reason: 'Billing analysis temporarily disabled'
        };

        if (suggestion && suggestion.type !== 'none') {
          opportunities.push({ message, suggestion });
          
          if (suggestion.suggestedAmount) {
            estimatedValue += suggestion.suggestedAmount;
          }
          
          if (suggestion.confidence === 'high') {
            highConfidenceItems++;
          }
        }
      }
    });

    return {
      totalOpportunities: opportunities.length,
      estimatedValue,
      highConfidenceItems,
      pendingDrafts: 0, // This would come from a drafts store/API
      opportunities: opportunities.sort((a, b) => {
        const confidenceOrder = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.suggestion.confidence] - confidenceOrder[a.suggestion.confidence];
      })
    };
  }, [conversation, client]);

  const handleViewOpportunity = (message: Message, suggestion: BillingSuggestion) => {
    setSelectedOpportunity({ message, suggestion });
    setExpandedOpportunity(message.id);
  };

  const handleAutoDraft = (message: Message, suggestion: BillingSuggestion) => {
    setSelectedOpportunity({ message, suggestion });
    setShowAutoPrompt(true);
  };

  const handleAcceptAutoDraft = () => {
    setShowAutoPrompt(false);
    setShowReceiptModal(true);
  };

  const handleDeclineAutoDraft = () => {
    setShowAutoPrompt(false);
    setSelectedOpportunity(null);
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedOpportunity(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getServiceTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      consultation: '🤝',
      advice: '💡',
      review: '📋',
      analysis: '📊',
      meeting: '🤝',
      call: '📞',
      research: '🔍',
      planning: '📋',
      support: '🛠️'
    };
    
    return icons[type.toLowerCase()] || '💼';
  };

  const getConfidenceColor = (confidence: BillingSuggestion['confidence']) => {
    switch (confidence) {
      case 'high':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800'
        };
      case 'medium':
        return {
          bg: 'bg-tactical-gold-light',
          border: 'border-hud-border-accent',
          text: 'text-hud-text-primary',
          badge: 'bg-tactical-gold text-hud-text-primary'
        };
      case 'low':
        return {
          bg: 'bg-tactical-grey-100',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-grey-600',
          badge: 'bg-tactical-grey-200 text-tactical-grey-500'
        };
      default:
        return {
          bg: 'bg-tactical-grey-100',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-grey-600',
          badge: 'bg-tactical-grey-200 text-tactical-grey-500'
        };
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header & Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
            Billing Opportunities
          </h3>
          <Button
            size="sm"
            className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
            onClick={() => setShowManualEntry(!showManualEntry)}
          >
            <Plus className="w-3 h-3 mr-1" />
            {showManualEntry ? 'Close' : 'Manual Entry'}
          </Button>
        </div>

        {/* Manual Entry Form */}
        {showManualEntry && (
          <div className="p-4 bg-tactical-gold-muted border-2 border-tactical-gold space-y-3">
            <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
              Create Manual Entry
            </h4>

            <div>
              <label className="block text-xs font-semibold text-hud-text-primary mb-1 font-primary uppercase">
                Document Type
              </label>
              <select
                value={manualEntryData.documentType}
                onChange={(e) => setManualEntryData({ ...manualEntryData, documentType: e.target.value as any })}
                className="w-full px-2 py-1.5 text-sm border-2 border-hud-border focus:border-tactical-gold outline-none"
              >
                <option value="receipt">Receipt</option>
                <option value="invoice">Invoice</option>
                <option value="quote">Quote</option>
                <option value="estimate">Estimate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-hud-text-primary mb-1 font-primary uppercase">
                Service Type
              </label>
              <input
                type="text"
                value={manualEntryData.serviceType}
                onChange={(e) => setManualEntryData({ ...manualEntryData, serviceType: e.target.value })}
                placeholder="e.g., Consultation, Review, Analysis"
                className="w-full px-2 py-1.5 text-sm border-2 border-hud-border focus:border-tactical-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-hud-text-primary mb-1 font-primary uppercase">
                Amount (USD)
              </label>
              <input
                type="number"
                value={manualEntryData.amount}
                onChange={(e) => setManualEntryData({ ...manualEntryData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-2 py-1.5 text-sm border-2 border-hud-border focus:border-tactical-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-hud-text-primary mb-1 font-primary uppercase">
                Date
              </label>
              <input
                type="date"
                value={manualEntryData.date}
                onChange={(e) => setManualEntryData({ ...manualEntryData, date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border-2 border-hud-border focus:border-tactical-gold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-hud-text-primary mb-1 font-primary uppercase">
                Description
              </label>
              <textarea
                value={manualEntryData.description}
                onChange={(e) => setManualEntryData({ ...manualEntryData, description: e.target.value })}
                placeholder="Brief description of the service..."
                rows={3}
                className="w-full px-2 py-1.5 text-sm border-2 border-hud-border focus:border-tactical-gold outline-none resize-none"
              />
            </div>

            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowManualEntry(false);
                  setManualEntryData({
                    documentType: 'receipt',
                    serviceType: '',
                    amount: '',
                    description: '',
                    date: new Date().toISOString().slice(0, 10)
                  });
                }}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary text-xs"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/billing/receipts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        clientId: client.id,
                        conversationId: conversation.id,
                        documentType: manualEntryData.documentType,
                        serviceType: manualEntryData.serviceType,
                        amount: parseFloat(manualEntryData.amount),
                        description: manualEntryData.description,
                        date: manualEntryData.date,
                        status: 'DRAFT'
                      })
                    });

                    if (response.ok) {
                      setShowManualEntry(false);
                      setManualEntryData({
                        documentType: 'receipt',
                        serviceType: '',
                        amount: '',
                        description: '',
                        date: new Date().toISOString().slice(0, 10)
                      });
                      alert(`${manualEntryData.documentType.charAt(0).toUpperCase() + manualEntryData.documentType.slice(1)} created successfully!`);
                    } else {
                      alert(`Failed to create ${manualEntryData.documentType}`);
                    }
                  } catch (err) {
                    console.error(`Error creating ${manualEntryData.documentType}:`, err);
                    alert(`Error creating ${manualEntryData.documentType}`);
                  }
                }}
              >
                Create {manualEntryData.documentType.charAt(0).toUpperCase() + manualEntryData.documentType.slice(1)}
              </Button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-hud-background-secondary border border-hud-border">
            <div className="flex items-center justify-between mb-1">
              <Receipt className="w-4 h-4 text-gold" />
              <span className="text-lg font-bold text-hud-text-primary font-primary">
                {billingSummary.totalOpportunities}
              </span>
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wide">
              Opportunities
            </div>
          </div>

          <div className="p-3 bg-hud-background-secondary border border-hud-border">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-lg font-bold text-green-600 font-primary">
                {formatCurrency(billingSummary.estimatedValue)}
              </span>
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wide">
              Potential Value
            </div>
          </div>

          <div className="p-3 bg-hud-background-secondary border border-hud-border">
            <div className="flex items-center justify-between mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-lg font-bold text-green-600 font-primary">
                {billingSummary.highConfidenceItems}
              </span>
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wide">
              High Confidence
            </div>
          </div>

          <div className="p-3 bg-hud-background-secondary border border-hud-border">
            <div className="flex items-center justify-between mb-1">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-lg font-bold text-orange-600 font-primary">
                {billingSummary.pendingDrafts}
              </span>
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wide">
              Pending Drafts
            </div>
          </div>
        </div>
      </div>

      {/* Billing Opportunities */}
      <div className="space-y-3">
        <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Detected Opportunities
        </h4>

        {billingSummary.opportunities.length === 0 ? (
          <div className="text-center py-6">
            <Receipt className="w-12 h-12 text-medium-grey mx-auto mb-3" />
            <p className="text-sm text-medium-grey font-primary">
              No billing opportunities detected yet.
            </p>
            <p className="text-xs text-medium-grey mt-1">
              Continue the conversation to identify billable services.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {billingSummary.opportunities.map(({ message, suggestion }, index) => {
              const colors = getConfidenceColor(suggestion.confidence);
              const isExpanded = expandedOpportunity === message.id;
              
              return (
                <div
                  key={message.id}
                  className={`border-2 ${colors.border} ${colors.bg} transition-all duration-200 hover:shadow-sm`}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getServiceTypeIcon(suggestion.serviceType || 'service')}
                        </span>
                        <div>
                          <h5 className={`font-primary font-bold text-sm ${colors.text} capitalize`}>
                            {(suggestion.serviceType || 'Service').replace(/([A-Z])/g, ' $1').trim()}
                          </h5>
                          <div className="text-xs text-medium-grey">
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {suggestion.suggestedAmount && (
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(suggestion.suggestedAmount)}
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-primary font-bold uppercase ${colors.badge}`}>
                          {suggestion.confidence}
                        </span>
                      </div>
                    </div>
                    
                    <div className={`text-sm ${colors.text} mb-3 line-clamp-2`}>
                      {message.content}
                    </div>
                    
                    {suggestion.reason && (
                      <div className="text-xs text-medium-grey mb-3 italic">
                        AI Analysis: {suggestion.reason}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewOpportunity(message, suggestion)}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {isExpanded ? 'Hide' : 'View'} Details
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAutoDraft(message, suggestion)}
                        className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary text-xs"
                      >
                        <Receipt className="w-3 h-3 mr-1" />
                        Auto-Draft
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-current border-opacity-20 p-3 bg-white bg-opacity-50">
                      <div className="space-y-3">
                        <div>
                          <h6 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-2">
                            Message Context
                          </h6>
                          <div className="text-sm text-hud-text-primary bg-white p-2 border border-hud-border">
                            {message.content}
                          </div>
                        </div>
                        
                        {suggestion.serviceType && (
                          <div>
                            <h6 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-1">
                              Detected Service
                            </h6>
                            <div className="text-sm text-medium-grey capitalize">
                              {suggestion.serviceType.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        )}
                        
                        {suggestion.suggestedAmount && (
                          <div>
                            <h6 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-1">
                              Suggested Amount
                            </h6>
                            <div className="text-sm text-green-600 font-bold">
                              {formatCurrency(suggestion.suggestedAmount)}
                            </div>
                          </div>
                        )}
                        
                        {suggestion.reason && (
                          <div>
                            <h6 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary mb-1">
                              AI Analysis
                            </h6>
                            <div className="text-sm text-medium-grey italic">
                              {suggestion.reason}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Quick Actions
        </h4>
        
        <div className="grid grid-cols-1 gap-2">
          <Link href="/services-billing">
            <Button size="sm" variant="outline" className="w-full justify-start text-xs">
              <ExternalLink className="w-3 h-3 mr-2" />
              View Full Billing Page
            </Button>
          </Link>
          
          <Button size="sm" variant="outline" className="justify-start text-xs">
            <TrendingUp className="w-3 h-3 mr-2" />
            View All Billing History
          </Button>
          
          <Button size="sm" variant="outline" className="justify-start text-xs">
            <Receipt className="w-3 h-3 mr-2" />
            Create Custom Invoice
          </Button>
          
          <Button size="sm" variant="outline" className="justify-start text-xs">
            <Clock className="w-3 h-3 mr-2" />
            Time Tracking Summary
          </Button>
        </div>
      </div>

      {/* Auto-Draft Prompt */}
      {showAutoPrompt && selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md w-full m-4">
            <AutoDraftPrompt
              confidence={selectedOpportunity.suggestion.confidence}
              serviceType={selectedOpportunity.suggestion.serviceType || 'Service'}
              suggestedAmount={selectedOpportunity.suggestion.suggestedAmount || 0}
              reason={selectedOpportunity.suggestion.reason || 'Service detected in conversation'}
              onAccept={handleAcceptAutoDraft}
              onDecline={handleDeclineAutoDraft}
              onDismiss={handleDeclineAutoDraft}
            />
          </div>
        </div>
      )}

      {/* Enhanced Receipt Modal */}
      {showReceiptModal && selectedOpportunity && (
        <EnhancedReceiptModal
          isOpen={showReceiptModal}
          onClose={handleCloseReceiptModal}
          client={client}
          conversation={conversation}
          autoFillData={{
            serviceType: selectedOpportunity.suggestion.serviceType || 'consultation',
            suggestedAmount: selectedOpportunity.suggestion.suggestedAmount || 0,
            confidence: selectedOpportunity.suggestion.confidence,
            reason: selectedOpportunity.suggestion.reason || ''
          }}
        />
      )}
    </div>
  );
}