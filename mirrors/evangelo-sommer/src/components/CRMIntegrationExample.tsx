// src/components/CRMIntegrationExample.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MessageImporter from "./MessageImporter";
import CRMIntegrator from "./CRMIntegrator";
import ScheduleFollowUpForm from "./ScheduleFollowUpForm";
import { Message } from "../types/client";
import {
  CRMProcessingResult,
  CRMIntegrationOutput,
} from "../types/crm-integration";
import { FollowUpResponse } from "../types/follow-up";

interface CRMIntegrationExampleProps {
  className?: string;
}

type WorkflowStep = "import" | "crm" | "results";

export default function CRMIntegrationExample({
  className = "",
}: CRMIntegrationExampleProps) {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("import");
  const [messages, setMessages] = useState<Message[]>([]);
  const [crmResults, setCrmResults] = useState<CRMProcessingResult | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string>("");

  // Handle messages detected from import
  const handleMessagesDetected = (detectedMessages: Message[]) => {
    setMessages(detectedMessages);
    console.log(
      `Detected ${detectedMessages.length} messages for CRM processing`,
    );
  };

  // Handle CRM processing completion
  const handleCRMProcessingComplete = (result: CRMProcessingResult) => {
    setCrmResults(result);
    setCurrentStep("results");
    setIsProcessing(false);

    if (result.success) {
      console.log("CRM Integration completed successfully:", result);
    } else {
      console.error("CRM Integration failed:", result.error);
    }
  };

  // Proceed to CRM integration step
  const proceedToCRM = () => {
    if (messages.length === 0) {
      alert("Please import some messages first");
      return;
    }
    setCurrentStep("crm");
    setIsProcessing(true);
  };

  // Reset workflow
  const resetWorkflow = () => {
    setCurrentStep("import");
    setMessages([]);
    setCrmResults(null);
    setIsProcessing(false);
  };

  // Export CRM data
  const exportCRMData = () => {
    if (!crmResults?.data) return;

    const dataStr = JSON.stringify(crmResults.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `crm-integration-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle schedule completion
  const handleScheduleComplete = (response: FollowUpResponse) => {
    if (response.success && response.data) {
      const followUpDate = new Date(response.data.scheduledDate).toLocaleDateString();
      setScheduleSuccess(`Follow-up successfully scheduled for ${followUpDate}`);
      setTimeout(() => setScheduleSuccess(""), 5000); // Clear success message after 5 seconds
    }
  };

  // Open schedule modal
  const openScheduleModal = () => {
    setIsScheduleModalOpen(true);
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1 - Import */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "import"
                ? "bg-tactical-gold text-white"
                : messages.length > 0
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-tactical-grey-500"
            }`}
          >
            {messages.length > 0 ? "✓" : "1"}
          </div>
          <span className="ml-2 text-sm font-medium text-tactical-grey-600">
            Import Messages
          </span>
        </div>

        {/* Arrow */}
        <div className="w-8 h-0.5 bg-gray-300"></div>

        {/* Step 2 - CRM Processing */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "crm"
                ? "bg-tactical-gold text-white"
                : crmResults?.success
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-tactical-grey-500"
            }`}
          >
            {isProcessing ? "⚡" : crmResults?.success ? "✓" : "2"}
          </div>
          <span className="ml-2 text-sm font-medium text-tactical-grey-600">
            CRM Integration
          </span>
        </div>

        {/* Arrow */}
        <div className="w-8 h-0.5 bg-gray-300"></div>

        {/* Step 3 - Results */}
        <div className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === "results"
                ? "bg-tactical-gold text-white"
                : crmResults?.success
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-tactical-grey-500"
            }`}
          >
            {crmResults?.success ? "✓" : "3"}
          </div>
          <span className="ml-2 text-sm font-medium text-tactical-grey-600">
            CRM Data
          </span>
        </div>
      </div>
    </div>
  );

  // Render statistics panel
  const renderStatsPanel = () => {
    if (!crmResults?.data || !crmResults.success) return null;

    const data = crmResults.data;
    const metadata = crmResults.metadata;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-tactical-gold">
            {data.clients.length}
          </div>
          <div className="text-sm text-tactical-brown-dark">Clients Identified</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.service_history.length}
          </div>
          <div className="text-sm text-green-800">Services Detected</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data.communications.length}
          </div>
          <div className="text-sm text-purple-800">Communications Logged</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {metadata.confidence}
          </div>
          <div className="text-sm text-orange-800">Confidence Score</div>
        </div>
      </div>
    );
  };

  // Render client details
  const renderClientDetails = (data: CRMIntegrationOutput) => (
    <div className="bg-white border border-tactical-grey-300 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4">
        👥 Client Information
      </h3>
      {data.clients.map((client) => (
        <div
          key={client.client_id}
          className="bg-tactical-grey-100 rounded-lg p-4 mb-4 last:mb-0"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-tactical-grey-800">
                {client.personal_info.name}
              </h4>
              <p className="text-sm text-tactical-grey-500">
                {client.personal_info.phone}
              </p>
              {client.personal_info.email && (
                <p className="text-sm text-tactical-grey-500">
                  {client.personal_info.email}
                </p>
              )}
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  client.relationship_data.satisfaction_indicators.includes(
                    "positive",
                  )
                    ? "bg-green-100 text-green-800"
                    : client.relationship_data.satisfaction_indicators.includes(
                          "negative",
                        )
                      ? "bg-red-100 text-red-800"
                      : "bg-tactical-grey-200 text-tactical-grey-700"
                }`}
              >
                {client.relationship_data.satisfaction_indicators[0] ||
                  "neutral"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-tactical-grey-600">Services:</strong>
              <div className="mt-1">
                {client.service_profile.service_types.map((service) => (
                  <span
                    key={service}
                    className="inline-block bg-tactical-gold-muted text-tactical-brown-dark px-2 py-1 rounded text-xs mr-1 mb-1"
                  >
                    {service.replace("_", " ")}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <strong className="text-tactical-grey-600">Frequency:</strong>
              <p className="text-tactical-grey-500 mt-1">
                {client.service_profile.service_frequency}
              </p>
            </div>
          </div>

          {client.service_profile.special_requirements.length > 0 && (
            <div className="mt-3">
              <strong className="text-tactical-grey-600 text-sm">
                Special Requirements:
              </strong>
              <ul className="mt-1 text-sm text-tactical-grey-500">
                {client.service_profile.special_requirements.map((req, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule Follow-up Button for Mark Levy */}
          {client.personal_info.name === "Mark Levy" && (
            <div className="mt-4 pt-3 border-t border-tactical-grey-300">
              <button
                onClick={openScheduleModal}
                className="w-full px-4 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors text-sm font-medium"
              >
                📅 Set Up Schedule
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Render business insights
  const renderBusinessInsights = (data: CRMIntegrationOutput) => (
    <div className="bg-white border border-tactical-grey-300 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-tactical-grey-800 mb-4">
        🧠 Business Intelligence
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-tactical-grey-600 mb-3">Quality Metrics</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-tactical-grey-500">Lead Quality</span>
                <span className="text-sm font-medium">
                  {data.insights.lead_quality_score}/10
                </span>
              </div>
              <div className="w-full bg-tactical-grey-300 rounded-full h-2">
                <div
                  className="bg-tactical-gold h-2 rounded-full"
                  style={{ width: `${data.insights.lead_quality_score * 10}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-tactical-grey-500">
                  Referral Potential
                </span>
                <span className="text-sm font-medium">
                  {data.insights.referral_potential}/10
                </span>
              </div>
              <div className="w-full bg-tactical-grey-300 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${data.insights.referral_potential * 10}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-tactical-grey-600 mb-3">Risk Assessment</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-tactical-grey-500">Lifetime Value:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  data.insights.client_lifetime_value_indicator === "high"
                    ? "bg-green-100 text-green-800"
                    : data.insights.client_lifetime_value_indicator === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {data.insights.client_lifetime_value_indicator}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tactical-grey-500">Retention Risk:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  data.insights.retention_risk === "low"
                    ? "bg-green-100 text-green-800"
                    : data.insights.retention_risk === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {data.insights.retention_risk}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-tactical-grey-500">Action Priority:</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  data.insights.next_action_priority === "immediate"
                    ? "bg-red-100 text-red-800"
                    : data.insights.next_action_priority === "this_week"
                      ? "bg-orange-100 text-orange-800"
                      : data.insights.next_action_priority === "this_month"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-tactical-grey-200 text-tactical-grey-700"
                }`}
              >
                {data.insights.next_action_priority.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {data.insights.upsell_opportunities.length > 0 && (
        <div className="mt-6 p-4 bg-tactical-gold-muted rounded-lg">
          <h4 className="font-medium text-tactical-brown-dark mb-2">
            💡 Upsell Opportunities
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.insights.upsell_opportunities.map((opportunity, idx) => (
              <span
                key={idx}
                className="bg-tactical-gold-muted text-tactical-brown-dark px-3 py-1 rounded-full text-sm"
              >
                {opportunity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-tactical-grey-800 mb-2">
          🤖 AI-Powered CRM Integration
        </h1>
        <p className="text-lg text-tactical-grey-500">
          Transform SMS conversations into actionable business intelligence
        </p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-lg">
        <AnimatePresence mode="wait">
          {currentStep === "import" && (
            <motion.div
              key="import"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                  Step 1: Import Your Messages
                </h2>
                <p className="text-tactical-grey-500">
                  Upload your SMS conversation data from Excel or paste text
                  conversations
                </p>
              </div>

              <MessageImporter
                onMessagesDetected={handleMessagesDetected}
                onCRMProcessingComplete={handleCRMProcessingComplete}
                clientName="Mark Levy"
                userName="Evangelo P. Sommer"
                defaultContent=""
              />

              {messages.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-green-900">
                        ✅ Messages Imported Successfully
                      </h3>
                      <p className="text-sm text-green-700">
                        {messages.length} messages ready for CRM processing
                      </p>
                    </div>
                    <button
                      onClick={proceedToCRM}
                      className="px-6 py-2 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
                    >
                      Process with AI →
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === "crm" && (
            <motion.div
              key="crm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                  Step 2: AI Processing
                </h2>
                <p className="text-tactical-grey-500">
                  Advanced AI analysis to extract business intelligence from
                  your conversations
                </p>
              </div>

              <CRMIntegrator
                onProcessingComplete={handleCRMProcessingComplete}
                className="border-0 shadow-none bg-transparent"
              />
            </motion.div>
          )}

          {currentStep === "results" && crmResults?.success && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                      Step 3: CRM Integration Results
                    </h2>
                    <p className="text-tactical-grey-500">
                      Your conversation data has been transformed into
                      structured CRM records
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={exportCRMData}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      📥 Export Data
                    </button>
                    <button
                      onClick={resetWorkflow}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-tactical-grey-700 transition-colors"
                    >
                      🔄 Start Over
                    </button>
                  </div>
                </div>
              </div>

              {/* Statistics Panel */}
              {renderStatsPanel()}

              {/* Client Details */}
              {crmResults.data && renderClientDetails(crmResults.data)}

              {/* Business Insights */}
              {crmResults.data && renderBusinessInsights(crmResults.data)}

              {/* Processing Metadata */}
              <div className="bg-tactical-grey-100 rounded-lg p-4">
                <h3 className="font-medium text-tactical-grey-600 mb-2">
                  ⚡ Processing Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-tactical-grey-500">Processing Time:</span>
                    <p className="font-medium">
                      {crmResults.metadata.processingTimeMs}ms
                    </p>
                  </div>
                  <div>
                    <span className="text-tactical-grey-500">Messages Processed:</span>
                    <p className="font-medium">
                      {crmResults.metadata.messagesProcessed}
                    </p>
                  </div>
                  <div>
                    <span className="text-tactical-grey-500">Processed At:</span>
                    <p className="font-medium">
                      {new Date(
                        crmResults.metadata.processedAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-tactical-grey-500">Data Quality:</span>
                    <p className="font-medium">
                      {crmResults.metadata.confidence}/10
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === "results" && crmResults && !crmResults.success && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 text-center"
            >
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Processing Failed
              </h2>
              <p className="text-tactical-grey-500 mb-6">{crmResults.error}</p>
              <button
                onClick={resetWorkflow}
                className="px-6 py-3 bg-tactical-gold text-white rounded-lg hover:bg-tactical-gold-dark transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Schedule Success Message */}
      {scheduleSuccess && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-600 mr-2">✅</div>
            <p className="text-green-800 font-medium">{scheduleSuccess}</p>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      <ScheduleFollowUpForm
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        clientId={crmResults?.data?.clients?.[0]?.client_id || "cmf3fx2hd0002uznpw5plbbo1"}
        clientName="Mark Levy"
        onScheduleComplete={handleScheduleComplete}
      />

      {/* Usage Instructions */}
      <div className="mt-8 bg-tactical-gold-muted border border-tactical-grey-300 rounded-lg p-6">
        <h3 className="font-medium text-tactical-brown-dark mb-2">💡 How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-tactical-brown-dark">
          <div className="flex items-start space-x-2">
            <span className="text-lg">📱</span>
            <div>
              <strong>Import Messages</strong>
              <p>Upload Excel exports or paste conversation text</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-lg">🤖</span>
            <div>
              <strong>AI Analysis</strong>
              <p>Advanced processing extracts business intelligence</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-lg">📊</span>
            <div>
              <strong>CRM Data</strong>
              <p>Get structured records ready for database import</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
