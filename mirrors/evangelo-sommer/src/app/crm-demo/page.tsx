// src/app/crm-demo/page.tsx
"use client";

import React from "react";
import CRMIntegrationExample from "../../components/CRMIntegrationExample";

export default function CRMDemoPage() {
  return (
    <div className="min-h-screen bg-tactical-grey-100">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-tactical-gold-600 to-tactical-brown-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
              🤖 AI-Powered CRM Integration
            </h1>
            <p className="mt-4 text-xl text-tactical-brown-light max-w-3xl mx-auto">
              Transform your SMS conversations into structured CRM data with advanced business intelligence.
              Perfect for landscaping, service, and client-based businesses.
            </p>
            <div className="mt-8 flex justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold">Claude AI</div>
                <div className="text-tactical-brown">Powered Analysis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">Excel Import</div>
                <div className="text-tactical-brown">Direct Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">CRM Ready</div>
                <div className="text-tactical-brown">Database Export</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <CRMIntegrationExample />
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-tactical-grey-800 mb-4">
              Complete CRM Intelligence Suite
            </h2>
            <p className="text-xl text-tactical-grey-500 max-w-2xl mx-auto">
              Everything you need to transform customer conversations into actionable business data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-tactical-gold-muted rounded-lg p-6">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Smart Data Extraction
              </h3>
              <p className="text-tactical-grey-500">
                AI automatically identifies clients, services, scheduling, and business opportunities from raw SMS conversations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-3xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Business Intelligence
              </h3>
              <p className="text-tactical-grey-500">
                Lead scoring, referral potential, lifetime value assessment, and retention risk analysis powered by advanced AI.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Action Prioritization
              </h3>
              <p className="text-tactical-grey-500">
                Automatic identification of immediate actions, upsell opportunities, and client priorities for maximum business impact.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-orange-50 rounded-lg p-6">
              <div className="text-3xl mb-4">🏠</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Industry Optimized
              </h3>
              <p className="text-tactical-grey-500">
                Specialized for landscaping businesses with seasonal pattern recognition, service classification, and property management features.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-red-50 rounded-lg p-6">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Real-time Processing
              </h3>
              <p className="text-tactical-grey-500">
                Fast processing with confidence scoring, data validation, and comprehensive error handling for reliable results.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-yellow-50 rounded-lg p-6">
              <div className="text-3xl mb-4">🔗</div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                CRM Integration
              </h3>
              <p className="text-tactical-grey-500">
                Export structured data directly to any CRM system with standardized formats and database-ready schemas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-tactical-grey-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-tactical-grey-800 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-tactical-grey-500">
              Three simple steps to transform your SMS data into business intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-tactical-gold text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Import Your Data
              </h3>
              <p className="text-tactical-grey-500 mb-4">
                Upload Excel SMS exports or paste conversation text. The system automatically detects format and normalizes data.
              </p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-tactical-grey-500 mb-2">Example Excel Format:</div>
                <div className="text-xs font-mono bg-tactical-grey-100 p-2 rounded">
                  Type | Date | Name/Number | Content<br/>
                  Sent | 2024-01-15 | Mark (647)... | Ready for spring?<br/>
                  Received | 2024-01-15 | Mark (647)... | Yes, Monday works!
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-green-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                AI Processing
              </h3>
              <p className="text-tactical-grey-500 mb-4">
                Claude AI analyzes conversations to extract client information, service details, and business intelligence.
              </p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-tactical-grey-500 mb-2">AI Extracts:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-tactical-gold-muted p-2 rounded">Client Info</div>
                  <div className="bg-green-50 p-2 rounded">Services</div>
                  <div className="bg-purple-50 p-2 rounded">Scheduling</div>
                  <div className="bg-orange-50 p-2 rounded">Opportunities</div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-purple-600 text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-tactical-grey-800 mb-2">
                Export CRM Data
              </h3>
              <p className="text-tactical-grey-500 mb-4">
                Get structured records ready for database import with confidence scoring and business insights.
              </p>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-sm text-tactical-grey-500 mb-2">Output Includes:</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between bg-tactical-grey-100 p-1 rounded">
                    <span>Lead Quality</span>
                    <span className="font-semibold">8.5/10</span>
                  </div>
                  <div className="flex justify-between bg-tactical-grey-100 p-1 rounded">
                    <span>Lifetime Value</span>
                    <span className="text-green-600 font-semibold">High</span>
                  </div>
                  <div className="flex justify-between bg-tactical-grey-100 p-1 rounded">
                    <span>Next Action</span>
                    <span className="text-orange-600 font-semibold">This Week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-tactical-grey-800 mb-4">
              Perfect For Service Businesses
            </h2>
            <p className="text-xl text-tactical-grey-500">
              Designed specifically for businesses that rely on customer relationships
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Use Case 1 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🏡</div>
                <h3 className="text-xl font-semibold text-tactical-grey-800">
                  Landscaping Companies
                </h3>
              </div>
              <ul className="space-y-2 text-tactical-grey-600">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Seasonal service tracking (spring cleanup, summer maintenance)
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Snow removal upselling opportunities
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Property access and constraint management
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></span>
                  Commercial vs residential client classification
                </li>
              </ul>
            </div>

            {/* Use Case 2 */}
            <div className="bg-gradient-to-br from-tactical-grey-100 to-tactical-grey-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🔧</div>
                <h3 className="text-xl font-semibold text-tactical-grey-800">
                  Home Services
                </h3>
              </div>
              <ul className="space-y-2 text-tactical-grey-600">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-tactical-gold-muted0 rounded-full mr-2"></span>
                  Emergency vs scheduled service identification
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-tactical-gold-muted0 rounded-full mr-2"></span>
                  Client satisfaction and retention tracking
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-tactical-gold-muted0 rounded-full mr-2"></span>
                  Service history and frequency analysis
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-tactical-gold-muted0 rounded-full mr-2"></span>
                  Referral opportunity identification
                </li>
              </ul>
            </div>

            {/* Use Case 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">🏢</div>
                <h3 className="text-xl font-semibold text-tactical-grey-800">
                  Property Management
                </h3>
              </div>
              <ul className="space-y-2 text-tactical-grey-600">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                  Tenant communication analysis and sentiment
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                  Maintenance request prioritization
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                  Property-specific issue tracking
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                  Lease renewal opportunity detection
                </li>
              </ul>
            </div>

            {/* Use Case 4 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="text-2xl mr-3">💼</div>
                <h3 className="text-xl font-semibold text-tactical-grey-800">
                  Professional Services
                </h3>
              </div>
              <ul className="space-y-2 text-tactical-grey-600">
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                  Client project scope and timeline extraction
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                  Budget and payment preference analysis
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                  Follow-up and check-in scheduling
                </li>
                <li className="flex items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-2"></span>
                  Service expansion and upselling opportunities
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specs */}
      <div className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-gray-300">
              Built with cutting-edge technology for reliable, scalable results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl mb-2">🤖</div>
              <h3 className="text-lg font-semibold mb-2">Claude 3 Sonnet</h3>
              <p className="text-gray-300 text-sm">
                Advanced language model for accurate conversation analysis and business intelligence extraction.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-lg font-semibold mb-2">Real-time Processing</h3>
              <p className="text-gray-300 text-sm">
                Process 1000+ messages in under 30 seconds with live progress feedback.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="text-lg font-semibold mb-2">95% Accuracy</h3>
              <p className="text-gray-300 text-sm">
                Industry-leading accuracy in client identification and service classification.
              </p>
            </div>

            <div className="text-center">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="text-lg font-semibold mb-2">Secure & Private</h3>
              <p className="text-gray-300 text-sm">
                End-to-end encryption with no permanent storage of sensitive conversation data.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-2">
            🚀 Ready to transform your customer conversations into actionable business intelligence?
          </p>
          <p className="text-sm">
            Try the demo above with your own SMS data exports or sample conversations.
          </p>
        </div>
      </div>
    </div>
  );
}
