"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import ConversationTimeline from './ConversationTimeline';
import { Conversation, Message, Client } from '../types/client';

export function AutoBillingDemo() {
  const [selectedDemo, setSelectedDemo] = useState<'landscaping' | 'creative' | 'snow'>('landscaping');

  // Sample clients
  const sampleClients: Record<string, Client> = {
    landscaping: {
      id: 'client-1',
      name: 'Sarah Wilson',
      email: 'sarah@email.com',
      phone: '(555) 123-4567',
      serviceId: 'landscaping',
      status: 'active',
      tags: ['residential', 'weekly-service'],
      createdAt: '2024-01-15',
      updatedAt: '2024-01-15',
      serviceTypes: ['landscaping', 'lawn_care'],
      address: {
        street: '123 Maple Street',
        city: 'Toronto',
        state: 'ON',
        zip: 'M5A 1A1'
      }
    },
    creative: {
      id: 'client-2',
      name: 'TechStart Inc.',
      email: 'contact@techstart.com',
      phone: '(555) 987-6543',
      company: 'TechStart Inc.',
      serviceId: 'creative-development',
      status: 'active',
      tags: ['startup', 'app-development'],
      createdAt: '2024-02-01',
      updatedAt: '2024-02-01',
      serviceTypes: ['creative_development']
    },
    snow: {
      id: 'client-3',
      name: 'Mike Thompson',
      email: 'mike@email.com',
      phone: '(555) 456-7890',
      serviceId: 'snow-removal',
      status: 'active',
      tags: ['residential', 'seasonal'],
      createdAt: '2023-12-01',
      updatedAt: '2024-01-08',
      serviceTypes: ['snow_removal'],
      address: {
        street: '456 Oak Avenue',
        city: 'Toronto',
        state: 'ON',
        zip: 'M6B 2C2'
      }
    }
  };

  // Sample conversations with billing opportunities
  const sampleConversations: Record<string, Conversation> = {
    landscaping: {
      id: 'conv-1',
      clientId: 'client-1',
      title: 'Weekly Lawn Care - January 2024',
      messages: [
        {
          id: 'msg-1',
          role: 'client',
          content: 'Hi! Thanks for the great work on the lawn maintenance this week. The grass looks fantastic and the hedge trimming was exactly what we needed.',
          timestamp: '2024-01-15T10:30:00Z',
          type: 'text'
        },
        {
          id: 'msg-2',
          role: 'you',
          content: 'Thank you Sarah! Glad you\'re happy with the results. The weather has been perfect for lawn care this week.',
          timestamp: '2024-01-15T10:45:00Z',
          type: 'text'
        },
        {
          id: 'msg-3',
          role: 'client',
          content: 'The job is all done and it looks amazing! I paid cash to your team member - $75 total. Thanks again for the excellent service.',
          timestamp: '2024-01-15T15:20:00Z',
          type: 'text',
          metadata: {
            urgency: 'medium'
          }
        }
      ],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T15:20:00Z',
      summary: 'Completed weekly lawn maintenance including grass cutting and hedge trimming. Client paid $75 in cash and was very satisfied with the service.',
      sentiment: 'positive',
      priority: 'medium',
      status: 'resolved',
      source: 'text',
      nextActions: ['Create receipt for $75 cash payment', 'Schedule next weekly maintenance']
    },
    creative: {
      id: 'conv-2',
      clientId: 'client-2',
      title: 'Mobile App UI Design - Phase 1',
      messages: [
        {
          id: 'msg-4',
          role: 'you',
          content: 'Hi! I\'ve completed the initial UI mockups for your mobile app. The design includes the user onboarding flow, main dashboard, and settings screens as discussed.',
          timestamp: '2024-02-10T09:00:00Z',
          type: 'email',
          metadata: {
            subject: 'Mobile App UI Design - Phase 1 Complete'
          }
        },
        {
          id: 'msg-5',
          role: 'client',
          content: 'This looks incredible! The design perfectly captures our brand vision. The user flow is intuitive and the visual hierarchy is spot-on. The work is finished and ready for development. How much do we owe for this phase?',
          timestamp: '2024-02-10T14:30:00Z',
          type: 'email',
          metadata: {
            urgency: 'high'
          }
        },
        {
          id: 'msg-6',
          role: 'you',
          content: 'Thank you! Based on our agreement, Phase 1 UI design work totals $2,500. I can send you an invoice with Net 30 terms if that works for your accounting department.',
          timestamp: '2024-02-10T15:00:00Z',
          type: 'email'
        }
      ],
      createdAt: '2024-02-10T09:00:00Z',
      updatedAt: '2024-02-10T15:00:00Z',
      summary: 'Completed Phase 1 UI design for mobile app. Client is very satisfied with deliverables. Invoice needed for $2,500 with Net 30 terms.',
      sentiment: 'positive',
      priority: 'high',
      status: 'active',
      source: 'email',
      nextActions: ['Generate invoice for $2,500', 'Begin Phase 2 planning']
    },
    snow: {
      id: 'conv-3',
      clientId: 'client-3',
      title: 'Emergency Snow Removal - January 2024',
      messages: [
        {
          id: 'msg-7',
          role: 'client',
          content: 'Emergency! We have a huge snowfall and need the driveway cleared ASAP. Can you come by today? My car is completely blocked in.',
          timestamp: '2024-01-08T06:30:00Z',
          type: 'text',
          metadata: {
            urgency: 'urgent'
          }
        },
        {
          id: 'msg-8',
          role: 'you',
          content: 'On my way! I can be there in 45 minutes with the truck and snow blower. Emergency rate is $120 for same-day service.',
          timestamp: '2024-01-08T06:45:00Z',
          type: 'text'
        },
        {
          id: 'msg-9',
          role: 'client',
          content: 'Perfect! You were a lifesaver. The driveway and walkway are completely clear now. I can get to work on time thanks to you. Service completed and I sent you an e-transfer for $120.',
          timestamp: '2024-01-08T09:15:00Z',
          type: 'text',
          metadata: {
            urgency: 'high'
          }
        }
      ],
      createdAt: '2024-01-08T06:30:00Z',
      updatedAt: '2024-01-08T09:15:00Z',
      summary: 'Emergency snow removal service completed. Client sent e-transfer payment of $120. Very satisfied with quick response time.',
      sentiment: 'positive',
      priority: 'urgent',
      status: 'resolved',
      source: 'text',
      nextActions: ['Create receipt for $120 e-transfer payment', 'Add client to winter service priority list']
    }
  };

  const currentClient = sampleClients[selectedDemo];
  const currentConversation = sampleConversations[selectedDemo];

  const getServiceIcon = (demo: string) => {
    switch (demo) {
      case 'landscaping': return '🌿';
      case 'creative': return '💻';
      case 'snow': return '❄️';
      default: return '🔧';
    }
  };

  const getServiceLabel = (demo: string) => {
    switch (demo) {
      case 'landscaping': return 'Landscaping';
      case 'creative': return 'Creative Development';
      case 'snow': return 'Snow Removal';
      default: return 'Service';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 font-primary">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-hud-text-primary uppercase tracking-wide">
          Intelligent Auto-Draft Billing System
        </h1>
        <p className="text-medium-grey leading-relaxed max-w-2xl mx-auto">
          Experience seamless billing integration with conversation timelines. 
          AI detects service completion and payment opportunities in real-time, 
          offering contextual auto-draft suggestions with visual confidence indicators.
        </p>
      </div>

      {/* Demo Selector */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-hud-text-primary mb-4 uppercase tracking-wide">
          Select Demo Scenario
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.keys(sampleClients).map((demo) => (
            <button
              key={demo}
              onClick={() => setSelectedDemo(demo as any)}
              className={`
                p-4 border-2 text-left transition-all duration-200
                ${selectedDemo === demo
                  ? 'border-hud-border-accent bg-tactical-gold-light'
                  : 'border-hud-border bg-white hover:border-hud-border-accent hover:bg-tactical-gold-light'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getServiceIcon(demo)}</span>
                <div>
                  <div className="font-semibold text-hud-text-primary uppercase tracking-wide text-sm">
                    {getServiceLabel(demo)}
                  </div>
                  <div className="text-xs text-medium-grey">
                    {sampleClients[demo as keyof typeof sampleClients].name}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold text-hud-text-primary text-sm uppercase tracking-wide">
              Smart Detection
            </h3>
          </div>
          <p className="text-xs text-medium-grey">
            AI analyzes messages for service completion and payment indicators
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🤖</span>
            <h3 className="font-semibold text-hud-text-primary text-sm uppercase tracking-wide">
              Auto-Draft
            </h3>
          </div>
          <p className="text-xs text-medium-grey">
            One-click receipt/invoice creation with pre-filled data from context
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">📊</span>
            <h3 className="font-semibold text-hud-text-primary text-sm uppercase tracking-wide">
              Confidence Scoring
            </h3>
          </div>
          <p className="text-xs text-medium-grey">
            Visual indicators show AI confidence levels: High, Medium, Low
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">⚡</span>
            <h3 className="font-semibold text-hud-text-primary text-sm uppercase tracking-wide">
              Seamless Integration
            </h3>
          </div>
          <p className="text-xs text-medium-grey">
            Non-intrusive prompts that maintain current conversation experience
          </p>
        </Card>
      </div>

      {/* Live Demo */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-hud-text-primary uppercase tracking-wide">
            Live Demo: {getServiceIcon(selectedDemo)} {getServiceLabel(selectedDemo)}
          </h2>
          <div className="flex items-center space-x-3">
            <Badge className="bg-green-100 text-green-800 text-xs">
              {currentConversation.messages.filter(m => m.role === 'client').length} Client Messages
            </Badge>
            <Badge className="bg-tactical-gold-light text-hud-text-primary text-xs">
              AI Analysis Active
            </Badge>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-hud-background-secondary p-4 mb-6 border border-hud-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-hud-text-primary uppercase tracking-wide text-sm">
                {currentClient.name}
              </h3>
              <div className="text-xs text-medium-grey space-y-1">
                <div>{currentClient.email}</div>
                {currentClient.phone && <div>{currentClient.phone}</div>}
                {currentClient.company && <div>{currentClient.company}</div>}
              </div>
            </div>
            <div className="text-right">
              <Badge className={`text-xs ${
                currentConversation.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                currentConversation.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                'bg-tactical-grey-200 text-tactical-grey-500'
              }`}>
                {currentConversation.sentiment?.toUpperCase()}
              </Badge>
              <div className="text-xs text-medium-grey mt-1">
                Priority: {currentConversation.priority?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Timeline with Auto-Draft Features */}
        <ConversationTimeline
          conversation={currentConversation}
          client={currentClient}
          className="border-t border-hud-border pt-6"
        />

        {/* Usage Instructions */}
        <div className="mt-8 p-4 bg-tactical-gold-light border border-hud-border-accent">
          <h4 className="font-semibold text-hud-text-primary mb-2 uppercase tracking-wide text-sm">
            🚀 Try the Auto-Draft Features:
          </h4>
          <ul className="space-y-1 text-xs text-hud-text-primary">
            <li>• <strong>Look for billing trigger icons</strong> next to client messages with service/payment content</li>
            <li>• <strong>Click the trigger button</strong> to see the confidence-scored billing suggestion</li>
            <li>• <strong>Accept the suggestion</strong> to auto-draft a receipt/invoice with pre-filled data</li>
            <li>• <strong>Review and customize</strong> the generated billing document before sending</li>
          </ul>
        </div>
      </Card>

      {/* Technical Architecture */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-hud-text-primary mb-4 uppercase tracking-wide">
          Component Architecture
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-hud-text-primary mb-2 text-sm uppercase tracking-wide">
              UI Components
            </h3>
            <div className="space-y-2 text-xs text-medium-grey">
              <div>📋 <strong>ConversationTimeline</strong> - Main timeline component with integrated billing triggers</div>
              <div>🎯 <strong>AutoDraftTrigger</strong> - Subtle trigger icons with confidence indicators</div>
              <div>💭 <strong>AutoDraftPrompt</strong> - Contextual prompt for billing suggestions</div>
              <div>🧾 <strong>EnhancedReceiptModal</strong> - AI-enhanced receipt creation with pre-filled data</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-hud-text-primary mb-2 text-sm uppercase tracking-wide">
              Design System Integration
            </h3>
            <div className="space-y-2 text-xs text-medium-grey">
              <div>🎨 <strong>Space Grotesk</strong> font family for consistent typography</div>
              <div>🏆 <strong>Gold accent colors</strong> for high-confidence suggestions</div>
              <div>📐 <strong>Square corners</strong> maintaining sharp modern aesthetic</div>
              <div>♿ <strong>Accessibility support</strong> with proper ARIA labels and keyboard navigation</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AutoBillingDemo;