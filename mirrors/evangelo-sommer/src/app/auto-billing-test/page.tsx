"use client";

import { useState, useEffect } from 'react';
// Removed billingManager import - use API endpoints instead
import { clientManager } from '../../lib/client-config';
import AutoDraftTrigger from '../../components/AutoDraftTrigger';
import AutoDraftPrompt from '../../components/AutoDraftPrompt';
import EnhancedReceiptModal from '../../components/EnhancedReceiptModal';
import { Client, Conversation, Message } from '../../types/client';

// Database-backed mock client ID (Evan Sommer)
const MOCK_CLIENT_ID = 'cmfbmj9lx0002uzjt6iloabiv';

const testMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'client',
    content: 'Hi, could you please schedule a lawn service for next Tuesday?',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    type: 'text'
  },
  {
    id: 'msg-2',
    role: 'you',
    content: 'Sure! I can schedule lawn maintenance for Tuesday morning.',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    type: 'text'
  },
  {
    id: 'msg-3',
    role: 'client',
    content: 'Perfect! The lawn service is completed. I paid $50 in cash.',
    timestamp: new Date().toISOString(),
    type: 'text'
  }
];

const mockConversation: Conversation = {
  id: 'test-conv-1',
  clientId: MOCK_CLIENT_ID,
  messages: testMessages,
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  updatedAt: new Date().toISOString()
};

export default function AutoBillingTestPage() {
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [mockClient, setMockClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    
    // Fetch the mock client from database
    const fetchMockClient = async () => {
      try {
        setLoading(true);
        const client = await clientManager.getClient(MOCK_CLIENT_ID);
        if (client) {
          setMockClient(client);
          console.log('Mock client loaded from database:', client.name);
        } else {
          console.error('Mock client not found in database');
        }
      } catch (error) {
        console.error('Error fetching mock client:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMockClient();
  }, []);

  const analyzeMessage = (message: Message) => {
    if (!mockClient) return { shouldTrigger: false, confidence: 'low', serviceType: null, suggestedAmount: null, reason: 'Client not loaded' };
    
    // TODO: Move to API endpoint
    const analysis = { shouldTrigger: false, confidence: 'low', serviceType: null, suggestedAmount: null, reason: 'Auto-draft analysis temporarily disabled' };
    console.log('Analysis result:', analysis);
    return analysis;
  };

  const handleTriggerClick = (messageId: string, triggerElement: HTMLElement) => {
    const message = testMessages.find(m => m.id === messageId);
    if (message) {
      const analysis = analyzeMessage(message);
      setCurrentAnalysis(analysis);
      setSelectedMessage(messageId);
      setShowPrompt(true);
    }
  };

  const handleAccept = () => {
    setShowPrompt(false);
    setShowModal(true);
  };

  const handleDecline = () => {
    setShowPrompt(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setCurrentAnalysis(null);
    setSelectedMessage(null);
  };

  return (
    <div className="min-h-screen bg-hud-background-secondary">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary mb-4">
              Auto-Draft Billing System Test
            </h1>
            <p className="text-medium-grey font-space-grotesk">
              Test the intelligent auto-draft billing system with sample messages.
              {mockClient ? (
                <span className="block mt-2 text-sm text-green-700 font-medium">
                  ✓ Mock client loaded: {mockClient.name} ({mockClient.email})
                </span>
              ) : loading ? (
                <span className="block mt-2 text-sm text-tactical-brown-dark">
                  Loading mock client...
                </span>
              ) : (
                <span className="block mt-2 text-sm text-red-700">
                  ⚠ Mock client not found
                </span>
              )}
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white border-2 border-hud-border p-6">
              <h2 className="text-xl font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary mb-4">
                Test Messages
              </h2>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-medium-grey">
                    Loading client data...
                  </div>
                ) : !mockClient ? (
                  <div className="text-center py-8 text-red-600">
                    Mock client not found. Please check database.
                  </div>
                ) : (
                  testMessages.map((message, index) => {
                  const analysis = analyzeMessage(message);
                  const shouldShowTrigger = analysis.shouldTrigger || 
                    (analysis.serviceType && analysis.confidence !== 'low');

                  return (
                    <div key={message.id} className="border border-hud-border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-sm font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary">
                            {message.role === 'client' ? 'Client' : 'You'}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-medium-grey font-space-grotesk">
                              {isClient ? new Date(message.timestamp).toLocaleString() : 'Loading...'}
                            </span>
                            {shouldShowTrigger && (
                              <AutoDraftTrigger
                                message={message}
                                conversation={mockConversation}
                                billingSuggestion={{
                                  type: analysis.serviceType ? 'receipt' : 'none',
                                  confidence: analysis.confidence as "low" | "medium" | "high",
                                  serviceType: analysis.serviceType || undefined,
                                  suggestedAmount: analysis.suggestedAmount ?? undefined,
                                  reason: analysis.reason
                                }}
                                onTriggerAutoDraft={(msg, suggestion) => {
                                  const messageIndex = testMessages.findIndex(m => m.id === msg.id);
                                  if (messageIndex !== -1) {
                                    handleTriggerClick(msg.id, document.createElement('button'));
                                  }
                                }}
                                className="ml-2"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-hud-text-primary mb-3 font-space-grotesk">
                        {message.content}
                      </p>
                      
                      {/* Analysis Debug Info */}
                      <div className="mt-3 p-3 bg-light-grey text-xs font-space-grotesk">
                        <div><strong>Analysis:</strong></div>
                        <div>• Should Trigger: {analysis.shouldTrigger ? 'Yes' : 'No'}</div>
                        <div>• Confidence: {analysis.confidence}</div>
                        <div>• Service Type: {analysis.serviceType || 'None'}</div>
                        <div>• Suggested Amount: ${analysis.suggestedAmount || 0}</div>
                        <div>• Reason: {analysis.reason}</div>
                        <div>• Show Trigger: {shouldShowTrigger ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>

            {/* Auto-draft prompt */}
            {showPrompt && currentAnalysis && (
              <div className="bg-white border-2 border-hud-border p-6">
                <h3 className="text-lg font-bold font-space-grotesk uppercase tracking-wide text-hud-text-primary mb-4">
                  Active Prompt
                </h3>
                <AutoDraftPrompt
                  confidence={currentAnalysis.confidence}
                  serviceType={currentAnalysis.serviceType}
                  suggestedAmount={currentAnalysis.suggestedAmount}
                  reason={currentAnalysis.reason}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onDismiss={handleDismiss}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Receipt Modal */}
      {showModal && mockClient && (
        <EnhancedReceiptModal
          isOpen={showModal}
          onClose={handleModalClose}
          client={mockClient}
          conversation={mockConversation}
          autoFillData={currentAnalysis && {
            serviceType: currentAnalysis.serviceType,
            suggestedAmount: currentAnalysis.suggestedAmount,
            confidence: currentAnalysis.confidence,
            reason: currentAnalysis.reason
          }}
          onReceiptCreated={(receipt) => {
            console.log('Receipt created:', receipt);
            alert(`Receipt ${receipt.receiptNumber} created successfully!`);
            handleModalClose();
          }}
        />
      )}
    </div>
  );
}