// src/components/conversation/ConversationCreator.tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { Client, Message } from "../../types/client";
import FileImportEngine from "./FileImportEngine";
import MessageEditor from "./MessageEditor";
import ConversationPreview from "./ConversationPreview";
import ClientSelector from "./ClientSelector";
import ConversationMetadata from "./ConversationMetadata";

interface ConversationCreatorProps {
  clients: Client[];
  preSelectedClientId?: string;
  onConversationCreated: (conversationId: string, clientId: string) => void;
  onCancel: () => void;
}

type CreationStep = 'import' | 'edit' | 'preview' | 'metadata';

interface ConversationData {
  title?: string;
  description?: string;
  tags?: string[];
  clientId?: string;
  messages: Message[];
}

export default function ConversationCreator({
  clients,
  preSelectedClientId = '',
  onConversationCreated,
  onCancel
}: ConversationCreatorProps) {
  const [currentStep, setCurrentStep] = useState<CreationStep>('import');
  const [conversationData, setConversationData] = useState<ConversationData>({
    messages: [],
    clientId: preSelectedClientId,
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step navigation
  const steps: { key: CreationStep; title: string; description: string }[] = [
    { key: 'import', title: 'Import Messages', description: 'Upload and parse conversation files' },
    { key: 'edit', title: 'Edit Messages', description: 'Review and modify imported messages' },
    { key: 'preview', title: 'Preview', description: 'Review conversation before saving' },
    { key: 'metadata', title: 'Configure', description: 'Set client and conversation details' }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  // Handle file import completion
  const handleMessagesImported = useCallback((messages: Message[]) => {
    console.log(`📥 Messages imported: ${messages.length} messages`);
    setConversationData(prev => ({
      ...prev,
      messages
    }));
    setCurrentStep('edit');
  }, []);

  // Handle message editing completion
  const handleMessagesEdited = useCallback((messages: Message[]) => {
    console.log(`✏️ Messages edited: ${messages.length} messages`);
    setConversationData(prev => ({
      ...prev,
      messages
    }));
    setCurrentStep('preview');
  }, []);

  // Handle preview confirmation
  const handlePreviewConfirmed = useCallback(() => {
    setCurrentStep('metadata');
  }, []);

  // Handle metadata completion and save
  const handleMetadataComplete = useCallback(async (metadata: {
    title: string;
    description?: string;
    tags: string[];
    clientId: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const finalConversationData = {
        ...conversationData,
        ...metadata
      };

      console.log('💾 Saving conversation:', finalConversationData);

      // Helper function to map message type to database enum
      const mapMessageType = (type: string): string => {
        const typeUpper = type.toUpperCase().replace(/-/g, '_');
        // Map common types to database enum values
        const typeMap: Record<string, string> = {
          'TEXT': 'TEXT',
          'EMAIL': 'EMAIL',
          'CALL_NOTES': 'CALL_NOTES',
          'MEETING_NOTES': 'MEETING_NOTES',
          'VOICE_MEMO': 'VOICE_MEMO',
          'FILE_UPLOAD': 'FILE_UPLOAD',
        };
        return typeMap[typeUpper] || 'TEXT';
      };

      // Save conversation to database
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: finalConversationData.title,
          summary: finalConversationData.description,
          clientId: finalConversationData.clientId,
          tags: finalConversationData.tags,
          source: 'IMPORT',
          messages: finalConversationData.messages.map(msg => ({
            role: (msg.role === 'you' || msg.role === 'YOU') ? 'YOU' : 'CLIENT',
            content: msg.content,
            timestamp: msg.timestamp,
            type: mapMessageType(msg.type || 'text'),
            metadata: msg.metadata || {}
          }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create conversation');
      }

      const result = await response.json();
      console.log('✅ Conversation created:', result);
      
      // Extract the conversation ID from the response data
      const conversationId = result.data?.id || result.id;
      onConversationCreated(conversationId, finalConversationData.clientId);
    } catch (err) {
      console.error('❌ Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationData, onConversationCreated]);

  // Navigation helpers
  const canProceedToNext = useCallback(() => {
    switch (currentStep) {
      case 'import':
        return conversationData.messages.length > 0;
      case 'edit':
        return conversationData.messages.length > 0;
      case 'preview':
        return true;
      case 'metadata':
        return false; // Handled by metadata component
      default:
        return false;
    }
  }, [currentStep, conversationData.messages.length]);

  const handleNext = useCallback(() => {
    if (!canProceedToNext()) return;

    switch (currentStep) {
      case 'import':
        setCurrentStep('edit');
        break;
      case 'edit':
        setCurrentStep('preview');
        break;
      case 'preview':
        setCurrentStep('metadata');
        break;
    }
  }, [currentStep, canProceedToNext]);

  const handlePrevious = useCallback(() => {
    switch (currentStep) {
      case 'edit':
        setCurrentStep('import');
        break;
      case 'preview':
        setCurrentStep('edit');
        break;
      case 'metadata':
        setCurrentStep('preview');
        break;
    }
  }, [currentStep]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold font-primary ${
                index <= currentStepIndex
                  ? 'neo-button-active text-foreground'
                  : 'neo-button text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-20 ml-4 ${
                  index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-bold text-foreground font-primary uppercase tracking-wide">
            {steps[currentStepIndex]?.title}
          </h2>
          <p className="text-muted-foreground font-primary">
            {steps[currentStepIndex]?.description}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 neo-container rounded-lg border-2 border-destructive">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-destructive mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-primary font-bold text-destructive">Error:</span>
            <span className="ml-2 font-primary text-destructive-foreground">{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="neo-container rounded-lg p-6 mb-6">
        {currentStep === 'import' && (
          <FileImportEngine
            onMessagesImported={handleMessagesImported}
            onError={setError}
          />
        )}

        {currentStep === 'edit' && (
          <MessageEditor
            messages={conversationData.messages}
            onMessagesUpdated={(messages) => setConversationData(prev => ({ ...prev, messages }))}
            onComplete={handleMessagesEdited}
          />
        )}

        {currentStep === 'preview' && (
          <ConversationPreview
            messages={conversationData.messages}
            clientId={conversationData.clientId}
            clients={clients}
            onConfirm={handlePreviewConfirmed}
          />
        )}

        {currentStep === 'metadata' && (
          <ConversationMetadata
            initialData={{
              title: conversationData.title || '',
              description: conversationData.description || '',
              tags: conversationData.tags || [],
              clientId: conversationData.clientId || preSelectedClientId
            }}
            clients={clients}
            messageCount={conversationData.messages.length}
            onComplete={handleMetadataComplete}
            loading={loading}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={currentStep === 'import' ? onCancel : handlePrevious}
          className="neo-button"
        >
          {currentStep === 'import' ? 'Cancel' : 'Previous'}
        </button>

        <div className="text-center">
          <span className="text-sm text-muted-foreground font-primary">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>

        {currentStep !== 'metadata' && (
          <button
            onClick={handleNext}
            disabled={!canProceedToNext()}
            className={`neo-button font-primary font-bold uppercase tracking-wide ${
              !canProceedToNext() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Next
          </button>
        )}

        {currentStep === 'metadata' && (
          <div className="w-16" /> // Spacer to maintain layout
        )}
      </div>
    </div>
  );
}