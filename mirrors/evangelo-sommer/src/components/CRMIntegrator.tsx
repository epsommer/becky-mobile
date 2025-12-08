// src/components/CRMIntegrator.tsx
"use client";

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CRMIntegrationRequest,
  CRMProcessingResult,
  ClientRecord,
  ServiceRecord,
  BusinessInsights,
} from "../types/crm-integration";
import { ImportedConversation } from "../types/excel-import";
import { Client } from "../types/client";
import ClientProfileCompletion from "./ClientProfileCompletion";
import { isClientProfileIncomplete } from "../lib/client-profile-utils";
// Remove direct import of CRM integration functions
// These will now be called via API routes

interface CRMIntegratorProps {
  onProcessingComplete?: (result: CRMProcessingResult) => void;
  importedConversation?: ImportedConversation;
  className?: string;
}

type ProcessingStep = "upload" | "processing" | "results" | "error";

export default function CRMIntegrator({
  onProcessingComplete,
  importedConversation,
  className = "",
}: CRMIntegratorProps) {
  const [step, setStep] = useState<ProcessingStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingResult, setProcessingResult] =
    useState<CRMProcessingResult | null>(null);
  const [error, setError] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    const excelFile = droppedFiles.find(
      (f) => f.name.endsWith(".xlsx") || f.name.endsWith(".xls"),
    );

    if (excelFile) {
      setFile(excelFile);
      setError("");
    } else {
      setError("Please upload an Excel file (.xlsx or .xls)");
    }
  }, []);

  // Handle file input change
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setError("");
      }
    },
    [],
  );

  // Convert ImportedConversation to SMSConversationData format (client-side helper)
  const convertImportedConversationToCRM = (conversation: ImportedConversation) => {
    const messages = conversation.messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      timestamp: msg.timestamp,
      direction: msg.role === "you" ? ("outbound" as const) : ("inbound" as const),
      sender: msg.role === "you" ? "service_provider" : conversation.metadata.participantContact,
      recipient: msg.role === "you" ? conversation.metadata.participantContact : "service_provider",
      type: "sms" as const,
      rawData: msg.metadata.originalData,
    }));

    const participants = [
      {
        id: "service_provider",
        name: conversation.metadata.userInfo.name,
        phone: conversation.metadata.userInfo.phone,
        email: conversation.metadata.userInfo.email,
        role: "service_provider" as const,
      },
      {
        id: conversation.metadata.participantContact,
        name: conversation.metadata.participantName,
        phone: conversation.metadata.participantContact,
        role: "client" as const,
      },
    ];

    return {
      messages,
      participants,
      metadata: {
        dateRange: conversation.metadata.dateRange,
        totalMessages: conversation.metadata.messageCount,
        importSource: "excel_export" as const,
        businessContext: "landscaping",
      },
    };
  };

  // Process CRM integration via API
  const processCRMIntegration = async () => {
    if (!file && !importedConversation) {
      setError("No data source provided");
      return;
    }

    setStep("processing");
    setError("");

    try {
      const request: CRMIntegrationRequest = {
        customPrompt: customPrompt || undefined,
      };

      if (importedConversation) {
        // Convert ImportedConversation to SMSConversationData
        request.conversationData = convertImportedConversationToCRM(importedConversation);
      } else if (file) {
        // For file uploads, we'll need to handle this differently since we can't send File objects in JSON
        // We'll need to read the file and send the data
        setError("File upload via API not yet implemented. Please use imported conversation data.");
        setStep("error");
        return;
      }

      // Call the API route
      const response = await fetch('/api/crm/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const result: CRMProcessingResult = await response.json();
      setProcessingResult(result);

      if (result.success) {
        setStep("results");
        onProcessingComplete?.(result);
      } else {
        setError(result.error || "Processing failed");
        setStep("error");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      setStep("error");
    }
  };

  // Reset to initial state
  const resetIntegrator = () => {
    setStep("upload");
    setFile(null);
    setProcessingResult(null);
    setError("");
    setCustomPrompt("");
  };

  // State for managing client updates
  const [updatedClients, setUpdatedClients] = useState<Record<string, Partial<Client>>>({});

  // Convert ClientRecord to Client for profile completion
  const convertClientRecordToClient = (clientRecord: ClientRecord): Client => ({
    id: clientRecord.client_id,
    name: clientRecord.personal_info.name,
    email: clientRecord.personal_info.email || "",
    phone: clientRecord.personal_info.phone || "",
    company: "",
    serviceId: "service-1", // Default service ID
    status: "active",
    tags: [],
    createdAt: clientRecord.relationship_data.client_since,
    updatedAt: new Date().toISOString(),
    serviceTypes: clientRecord.service_profile.service_types,
  });

  // Handle client profile updates
  const handleClientUpdate = (clientId: string, updatedData: Partial<Client>) => {
    setUpdatedClients(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], ...updatedData }
    }));
  };

  // Get updated client data
  const getUpdatedClient = (clientRecord: ClientRecord): Client => {
    const baseClient = convertClientRecordToClient(clientRecord);
    const updates = updatedClients[clientRecord.client_id];
    return updates ? { ...baseClient, ...updates } : baseClient;
  };

  // Render client summary
  const renderClientSummary = (client: ClientRecord) => {
    const clientForCompletion = getUpdatedClient(client);
    const isIncomplete = isClientProfileIncomplete(clientForCompletion);

    return (
      <div key={client.client_id} className="space-y-3 mb-3">
        <div className="bg-tactical-grey-100 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-tactical-grey-800">
              {client.personal_info.name}
            </h4>
            <span className="text-xs bg-tactical-gold-muted text-tactical-brown-dark px-2 py-1 rounded">
              {client.personal_info.preferred_contact}
            </span>
          </div>
          <div className="text-sm text-tactical-grey-500 space-y-1">
            <p>📞 {updatedClients[client.client_id]?.phone || client.personal_info.phone}</p>
            {(updatedClients[client.client_id]?.email || client.personal_info.email) && (
              <p>✉️ {updatedClients[client.client_id]?.email || client.personal_info.email}</p>
            )}
            <p>🏠 Services: {client.service_profile.service_types.join(", ")}</p>
            <p>
              📅 Client since:{" "}
              {new Date(client.relationship_data.client_since).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Show profile completion component if needed */}
        {isIncomplete && (
          <ClientProfileCompletion
            client={clientForCompletion}
            onClientUpdate={(updatedData) => handleClientUpdate(client.client_id, updatedData)}
          />
        )}
      </div>
    );
  };

  // Render service summary
  const renderServiceSummary = (services: ServiceRecord[]) => (
    <div className="space-y-3">
      {services.slice(0, 5).map((service) => (
        <div key={service.service_id} className="bg-green-50 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="font-medium text-green-900">
              {service.service_type}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                service.completion_status === "completed"
                  ? "bg-green-200 text-green-800"
                  : service.completion_status === "scheduled"
                    ? "bg-tactical-gold-light text-tactical-brown-dark"
                    : "bg-yellow-200 text-yellow-800"
              }`}
            >
              {service.completion_status}
            </span>
          </div>
          <p className="text-sm text-green-700">
            📅 {new Date(service.service_date).toLocaleDateString()}
          </p>
          {service.notes && (
            <p className="text-xs text-green-600 mt-1">{service.notes}</p>
          )}
        </div>
      ))}
      {services.length > 5 && (
        <p className="text-sm text-tactical-grey-500 text-center">
          +{services.length - 5} more services
        </p>
      )}
    </div>
  );

  // Render business insights
  const renderBusinessInsights = (insights: BusinessInsights) => (
    <div className="bg-purple-50 rounded-lg p-4">
      <h4 className="font-semibold text-purple-900 mb-3">
        Business Intelligence
      </h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-purple-700">Lead Quality:</span>
          <div className="flex items-center mt-1">
            <div className="w-16 bg-purple-200 rounded-full h-2 mr-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${insights.lead_quality_score * 10}%` }}
              ></div>
            </div>
            <span className="text-purple-900 font-medium">
              {insights.lead_quality_score}/10
            </span>
          </div>
        </div>
        <div>
          <span className="text-purple-700">Referral Potential:</span>
          <div className="flex items-center mt-1">
            <div className="w-16 bg-purple-200 rounded-full h-2 mr-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${insights.referral_potential * 10}%` }}
              ></div>
            </div>
            <span className="text-purple-900 font-medium">
              {insights.referral_potential}/10
            </span>
          </div>
        </div>
        <div>
          <span className="text-purple-700">Lifetime Value:</span>
          <span
            className={`ml-2 px-2 py-1 rounded text-xs ${
              insights.client_lifetime_value_indicator === "high"
                ? "bg-green-200 text-green-800"
                : insights.client_lifetime_value_indicator === "medium"
                  ? "bg-yellow-200 text-yellow-800"
                  : "bg-red-200 text-red-800"
            }`}
          >
            {insights.client_lifetime_value_indicator}
          </span>
        </div>
        <div>
          <span className="text-purple-700">Action Priority:</span>
          <span
            className={`ml-2 px-2 py-1 rounded text-xs ${
              insights.next_action_priority === "immediate"
                ? "bg-red-200 text-red-800"
                : insights.next_action_priority === "this_week"
                  ? "bg-orange-200 text-orange-800"
                  : insights.next_action_priority === "this_month"
                    ? "bg-yellow-200 text-yellow-800"
                    : "bg-tactical-grey-300 text-tactical-grey-700"
            }`}
          >
            {insights.next_action_priority}
          </span>
        </div>
      </div>
      {insights.upsell_opportunities.length > 0 && (
        <div className="mt-3">
          <span className="text-purple-700 text-sm">Upsell Opportunities:</span>
          <div className="mt-1 flex flex-wrap gap-1">
            {insights.upsell_opportunities.map((opp, idx) => (
              <span
                key={idx}
                className="bg-purple-200 text-purple-800 px-2 py-1 rounded text-xs"
              >
                {opp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-tactical-grey-300">
        <h2 className="text-xl font-semibold text-tactical-grey-800">CRM Integration</h2>
        <p className="text-tactical-grey-500 mt-1">
          Convert SMS conversations into structured CRM data with AI analysis
        </p>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {!importedConversation && (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? "border-tactical-gold-400 bg-tactical-gold-muted"
                      : "border-tactical-grey-400 hover:border-tactical-grey-400"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <div className="space-y-4">
                    <div className="text-4xl">📊</div>
                    <div>
                      <h3 className="text-lg font-medium text-tactical-grey-800">
                        Upload SMS Export
                      </h3>
                      <p className="text-tactical-grey-500">
                        Drag & drop your Excel SMS export or click to browse
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                      id="excel-upload"
                    />
                    <label
                      htmlFor="excel-upload"
                      className="inline-block px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark cursor-pointer transition-colors"
                    >
                      Choose File
                    </label>
                    {file && (
                      <p className="text-sm text-green-600">
                        ✓ Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {importedConversation && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">
                    📱 Conversation Ready for CRM Integration
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p>
                      Client: {importedConversation.metadata.participantName}
                    </p>
                    <p>
                      Messages: {importedConversation.metadata.messageCount}
                    </p>
                    <p>
                      Date Range:{" "}
                      {new Date(
                        importedConversation.metadata.dateRange.start,
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        importedConversation.metadata.dateRange.end,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-tactical-grey-600">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Add specific instructions for CRM processing..."
                  className="w-full p-3 border border-tactical-grey-400 rounded-lg focus:ring-2 focus:ring-tactical-gold-500 focus:border-tactical-gold-500"
                  rows={3}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              <button
                onClick={processCRMIntegration}
                disabled={!file && !importedConversation}
                className="w-full px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                🚀 Process with AI
              </button>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-tactical-gold-600 mb-4"></div>
              <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">
                Processing SMS Data
              </h3>
              <p className="text-tactical-grey-500">
                AI is analyzing conversations and generating CRM records...
              </p>
            </motion.div>
          )}

          {step === "results" && processingResult?.data && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">
                  ✅ CRM Integration Complete
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {processingResult.metadata.clientsIdentified}
                    </div>
                    <div className="text-green-700">Clients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-tactical-gold">
                      {processingResult.metadata.servicesDetected}
                    </div>
                    <div className="text-tactical-brown-dark">Services</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {processingResult.metadata.communicationsLogged}
                    </div>
                    <div className="text-purple-700">Communications</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {processingResult.metadata.confidence}
                    </div>
                    <div className="text-orange-700">Confidence</div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-tactical-grey-800 mb-3">
                    👥 Clients
                  </h3>
                  {processingResult.data.clients.map(renderClientSummary)}
                </div>

                <div>
                  <h3 className="font-semibold text-tactical-grey-800 mb-3">
                    🏠 Services
                  </h3>
                  {renderServiceSummary(processingResult.data.service_history)}
                </div>
              </div>

              {renderBusinessInsights(processingResult.data.insights)}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(processingResult.data, null, 2),
                    );
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-tactical-grey-700 transition-colors"
                >
                  📋 Copy JSON Data
                </button>
                <button
                  onClick={resetIntegrator}
                  className="flex-1 px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
                >
                  🔄 Process Another
                </button>
              </div>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-lg font-medium text-tactical-grey-800 mb-2">
                Processing Failed
              </h3>
              <p className="text-tactical-grey-500 mb-6">{error}</p>
              <button
                onClick={resetIntegrator}
                className="px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
