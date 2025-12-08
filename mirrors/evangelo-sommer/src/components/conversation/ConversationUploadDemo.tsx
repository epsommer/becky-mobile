"use client";

import { useState } from "react";
import MessageImporter from "../MessageImporter";
import { Message } from "../../types/client";

// Extended Message type for SMS processing with ConvoClean
interface ExtendedMessage extends Message {
  metadata?: Message['metadata'] & {
    confidence?: number;
    reconstructed?: boolean;
    parseSuccess?: boolean;
  };
}

interface ConversationUploadDemoProps {
  clientId?: string;
  clientName?: string;
  userName?: string;
}

export default function ConversationUploadDemo({
  clientId = "demo-client",
  clientName = "Mark Levy",
  userName = "Evan Sommer"
}: ConversationUploadDemoProps) {
  const [uploadedMessages, setUploadedMessages] = useState<ExtendedMessage[]>([]);
  const [uploadStats, setUploadStats] = useState<{
    totalMessages: number;
    averageConfidence: number;
    recoveredRows: number;
    processingTime: number;
  } | null>(null);

  const handleMessagesDetected = (messages: ExtendedMessage[]) => {
    console.log('✅ Messages detected from upload:', messages.length);
    setUploadedMessages(messages);
    
    // Calculate basic stats
    const confidenceScores = messages
      .map(m => m.metadata?.confidence || 0)
      .filter(c => c > 0);
    
    const averageConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    setUploadStats({
      totalMessages: messages.length,
      averageConfidence,
      recoveredRows: messages.filter(m => m.metadata?.reconstructed).length,
      processingTime: Date.now() // Placeholder
    });
  };

  const handleCRMProcessingComplete = (result: any) => {
    console.log('🤖 CRM processing complete:', result);
    // Handle CRM results here
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-tactical-grey-100 to-indigo-50 border border-tactical-grey-300 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-tactical-grey-800 mb-2">
          Robust Conversation Upload Demo
        </h1>
        <p className="text-tactical-grey-500">
          Demonstration of the ConvoClean integration with advanced SMS processing capabilities.
        </p>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded border">
            <div className="font-semibold text-tactical-grey-700">🔧 Data Recovery</div>
            <div className="text-tactical-grey-500">Handles corrupted Excel exports</div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <div className="font-semibold text-tactical-grey-700">🎯 Smart Processing</div>
            <div className="text-tactical-grey-500">Identifies speakers & reconstructs timestamps</div>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <div className="font-semibold text-tactical-grey-700">✨ Text Cleaning</div>
            <div className="text-tactical-grey-500">Handles encoding issues & formatting</div>
          </div>
        </div>
      </div>

      {/* Upload Interface */}
      <div className="bg-white border border-tactical-grey-300 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-tactical-grey-800 mb-4">
          Upload Conversation File
        </h2>
        
        <MessageImporter
          clientId={clientId}
          clientName={clientName}
          userName={userName}
          onMessagesDetected={handleMessagesDetected}
          onCRMProcessingComplete={handleCRMProcessingComplete}
        />
      </div>

      {/* Results Display */}
      {uploadedMessages.length > 0 && (
        <div className="space-y-6">
          {/* Statistics */}
          {uploadStats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-4">
                Processing Results
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {uploadStats.totalMessages}
                  </div>
                  <div className="text-sm text-green-600">Messages Extracted</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.round(uploadStats.averageConfidence * 100)}%
                  </div>
                  <div className="text-sm text-green-600">Average Confidence</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {uploadStats.recoveredRows}
                  </div>
                  <div className="text-sm text-green-600">Recovered Rows</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {uploadedMessages.filter(m => m.role === 'you').length}
                  </div>
                  <div className="text-sm text-green-600">Your Messages</div>
                </div>
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div className="bg-white border border-tactical-grey-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4">
              Message Preview ({uploadedMessages.length} total)
            </h3>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {uploadedMessages.slice(0, 10).map((message, index) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.role === 'you'
                      ? 'bg-tactical-gold-muted border-l-4 border-tactical-gold-400'
                      : 'bg-tactical-grey-100 border-l-4 border-tactical-grey-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        message.role === 'you'
                          ? 'bg-tactical-gold-muted text-tactical-brown-dark'
                          : 'bg-tactical-grey-200 text-tactical-grey-700'
                      }`}>
                        {message.role === 'you' ? userName : clientName}
                      </span>
                      
                      {message.metadata?.confidence && (
                        <span className="text-xs text-tactical-grey-500">
                          {Math.round(message.metadata.confidence * 100)}% confidence
                        </span>
                      )}
                      
                      {message.metadata?.reconstructed && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Recovered
                        </span>
                      )}
                    </div>
                    
                    <span className="text-xs text-tactical-grey-500">
                      {new Date(message.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-tactical-grey-800">
                    {message.content}
                  </div>
                  
                  {message.metadata?.parseSuccess === false && (
                    <div className="mt-2 text-xs text-yellow-600">
                      ⚠️ Timestamp required reconstruction
                    </div>
                  )}
                </div>
              ))}
              
              {uploadedMessages.length > 10 && (
                <div className="text-center text-sm text-tactical-grey-500 py-2">
                  ... and {uploadedMessages.length - 10} more messages
                </div>
              )}
            </div>
          </div>

          {/* Processing Details */}
          <div className="bg-tactical-grey-100 border border-tactical-grey-300 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4">
              Processing Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Speaker Distribution */}
              <div>
                <h4 className="font-medium text-tactical-grey-700 mb-2">Speaker Distribution</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-tactical-grey-500">{userName}:</span>
                    <span className="text-sm font-medium">
                      {uploadedMessages.filter(m => m.role === 'you').length} messages
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-tactical-grey-500">{clientName}:</span>
                    <span className="text-sm font-medium">
                      {uploadedMessages.filter(m => m.role === 'client').length} messages
                    </span>
                  </div>
                </div>
              </div>

              {/* Quality Metrics */}
              <div>
                <h4 className="font-medium text-tactical-grey-700 mb-2">Quality Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-tactical-grey-500">High Confidence:</span>
                    <span className="text-sm font-medium text-green-600">
                      {uploadedMessages.filter(m => (m.metadata?.confidence || 0) > 0.8).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-tactical-grey-500">Reconstructed:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {uploadedMessages.filter(m => m.metadata?.reconstructed).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-tactical-grey-500">Parse Issues:</span>
                    <span className="text-sm font-medium text-red-600">
                      {uploadedMessages.filter(m => m.metadata?.parseSuccess === false).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Results State */}
      {uploadedMessages.length === 0 && (
        <div className="bg-tactical-grey-100 border border-tactical-grey-300 rounded-lg p-8 text-center">
          <div className="text-tactical-grey-500 mb-2">
            📂 No conversations uploaded yet
          </div>
          <div className="text-sm text-gray-400">
            Upload an SMS export file using the interface above to see the robust processing in action.
          </div>
        </div>
      )}
    </div>
  );
}