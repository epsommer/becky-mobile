"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, 
  BarChart3, 
  Lightbulb, 
  Calendar, 
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { Conversation, Client, Message, ConversationAnalytics, ConversationHealth, ConversationInsight } from '../types/client';
import ConversationAnalyticsEngine, { analyzeMessage } from '../lib/conversation-analytics';
// Removed billingManager import - use API endpoints instead
import AutoDraftPrompt from './AutoDraftPrompt';
import EnhancedReceiptModal from './EnhancedReceiptModal';

type SidebarTab = "timeline" | "analytics" | "insights" | "schedule" | "billing";

interface ConversationSidebarProps {
  conversation: Conversation;
  client: Client | null;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

interface AutoDraftState {
  messageId: string;
  data: any;
  isVisible: boolean;
}

export default function ConversationSidebar({
  conversation,
  client,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  className = ""
}: ConversationSidebarProps) {
  const [autoDraftState, setAutoDraftState] = useState<AutoDraftState | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptAutoFillData, setReceiptAutoFillData] = useState<any>(null);
  const [messageAutoDraftAnalysis, setMessageAutoDraftAnalysis] = useState<Record<string, any>>({});

  // Analytics calculations
  const analyticsEngine = useMemo(() => {
    const conversations = conversation ? [conversation] : [];
    return new ConversationAnalyticsEngine(conversations);
  }, [conversation]);

  const analytics = useMemo(() => {
    return conversation ? analyticsEngine.calculateAnalytics(conversation.clientId) : null;
  }, [analyticsEngine, conversation]);

  const conversationHealth = useMemo(() => {
    return conversation && conversation.clientId 
      ? analyticsEngine.calculateConversationHealth(conversation.clientId)
      : null;
  }, [analyticsEngine, conversation]);

  const insights = useMemo(() => {
    return conversation && conversation.clientId
      ? analyticsEngine.generateInsights(conversation.clientId) 
      : [];
  }, [analyticsEngine, conversation]);

  // Analyze messages for auto-draft when conversation changes
  useEffect(() => {
    if (conversation && conversation.messages && client) {
      const analyses: Record<string, any> = {};
      
      conversation.messages.forEach((message) => {
        // TODO: Move to API endpoint
        const autoDraftAnalysis = { shouldTrigger: false, confidence: 'low', serviceType: null, suggestedAmount: null, reason: 'Auto-draft analysis temporarily disabled' };
        analyses[message.id] = autoDraftAnalysis;
      });
      
      setMessageAutoDraftAnalysis(analyses);
    }
  }, [conversation, client]);

  const tabs = [
    { 
      id: "timeline" as SidebarTab, 
      label: "Timeline", 
      icon: MessageSquare,
      badge: conversation?.messages?.length || 0
    },
    { 
      id: "analytics" as SidebarTab, 
      label: "Analytics", 
      icon: BarChart3,
      badge: null
    },
    { 
      id: "insights" as SidebarTab, 
      label: "Insights", 
      icon: Lightbulb,
      badge: insights.length
    },
    { 
      id: "schedule" as SidebarTab, 
      label: "Schedule", 
      icon: Calendar,
      badge: null
    },
    { 
      id: "billing" as SidebarTab, 
      label: "Billing", 
      icon: DollarSign,
      badge: Object.values(messageAutoDraftAnalysis).filter(analysis => 
        analysis && (analysis.shouldTrigger || (analysis.serviceType && analysis.confidence !== 'low'))
      ).length || null
    }
  ];

  const handleAutoDraftTrigger = (messageId: string, data: any) => {
    setAutoDraftState({
      messageId,
      data,
      isVisible: true
    });
  };

  const handleAutoDraftAccept = () => {
    if (autoDraftState) {
      setReceiptAutoFillData({
        serviceType: autoDraftState.data.serviceType,
        suggestedAmount: autoDraftState.data.suggestedAmount,
        confidence: autoDraftState.data.confidence,
        reason: autoDraftState.data.reason
      });
      setShowReceiptModal(true);
      setAutoDraftState(null);
    }
  };

  const handleAutoDraftDecline = () => {
    setAutoDraftState(null);
  };

  const handleReceiptModalClose = () => {
    setShowReceiptModal(false);
    setReceiptAutoFillData(null);
  };

  const getTabContent = () => {
    switch (activeTab) {
      case "timeline":
        return <TimelineContent 
          conversation={conversation} 
          client={client}
          messageAutoDraftAnalysis={messageAutoDraftAnalysis}
          onAutoDraftTrigger={handleAutoDraftTrigger}
        />;
      case "analytics":
        return <AnalyticsContent analytics={analytics} conversation={conversation} />;
      case "insights":
        return <InsightsContent 
          conversationHealth={conversationHealth} 
          insights={insights} 
          conversation={conversation}
        />;
      case "schedule":
        return <ScheduleContent conversation={conversation} client={client} />;
      case "billing":
        return <BillingContent 
          conversation={conversation} 
          client={client}
          messageAutoDraftAnalysis={messageAutoDraftAnalysis}
          onAutoDraftTrigger={handleAutoDraftTrigger}
        />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Primary Sidebar - Always visible on desktop */}
      <div className={`
        fixed left-0 top-0 h-full bg-dark-grey border-r-2 border-hud-border-accent z-30
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${className}
      `}>
        {/* Header */}
        <div className="h-16 border-b border-medium-grey flex items-center justify-between px-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gold" />
              <span className="text-white font-primary font-bold uppercase tracking-wide text-sm">
                Conversation
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 text-medium-grey hover:text-gold transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  w-full flex items-center px-4 py-3 transition-all duration-200
                  ${isActive 
                    ? 'bg-tactical-gold text-hud-text-primary border-r-4 border-hud-border-accent-dark' 
                    : 'text-medium-grey hover:text-gold hover:bg-medium-grey hover:bg-opacity-20'
                  }
                  ${isCollapsed ? 'justify-center' : 'justify-start space-x-3'}
                `}
                title={isCollapsed ? tab.label : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-tactical-gold text-hud-text-primary text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="font-primary font-bold uppercase tracking-wide text-sm">
                      {tab.label}
                    </span>
                    {tab.badge && tab.badge > 0 && (
                      <span className="ml-auto bg-tactical-gold text-hud-text-primary text-xs rounded-full px-2 py-1 font-bold">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Panel - Contextual Content */}
      <div className={`
        fixed top-0 h-full bg-white border-r border-hud-border z-20
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'left-16 w-80' : 'left-64 w-96'}
        overflow-hidden flex flex-col
      `}>
        {/* Panel Header */}
        <div className="h-16 border-b border-hud-border flex items-center justify-between px-6 bg-hud-background-secondary">
          <h2 className="font-primary font-bold uppercase tracking-wide text-hud-text-primary">
            {tabs.find(t => t.id === activeTab)?.label}
          </h2>
          {activeTab === 'billing' && (
            <div className="flex items-center space-x-2">
              {Object.values(messageAutoDraftAnalysis).filter(analysis => 
                analysis && (analysis.shouldTrigger || (analysis.serviceType && analysis.confidence !== 'low'))
              ).length > 0 && (
                <span className="bg-tactical-gold text-hud-text-primary text-xs px-2 py-1 rounded-full font-bold">
                  Auto-draft available
                </span>
              )}
            </div>
          )}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto">
          {getTabContent()}
        </div>
      </div>

      {/* Auto-draft prompt overlay */}
      {autoDraftState?.isVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full">
            <AutoDraftPrompt
              confidence={autoDraftState.data.confidence}
              serviceType={autoDraftState.data.serviceType}
              suggestedAmount={autoDraftState.data.suggestedAmount}
              reason={autoDraftState.data.reason}
              onAccept={handleAutoDraftAccept}
              onDecline={handleAutoDraftDecline}
              onDismiss={handleAutoDraftDecline}
            />
          </div>
        </div>
      )}

      {/* Enhanced Receipt Modal */}
      {showReceiptModal && client && (
        <EnhancedReceiptModal
          isOpen={showReceiptModal}
          onClose={handleReceiptModalClose}
          client={client}
          conversation={conversation}
          autoFillData={receiptAutoFillData}
          onReceiptCreated={(receipt) => {
            console.log('Receipt created:', receipt);
            handleReceiptModalClose();
          }}
        />
      )}
    </>
  );
}

// Timeline Content Component
function TimelineContent({ 
  conversation, 
  client,
  messageAutoDraftAnalysis,
  onAutoDraftTrigger 
}: {
  conversation: Conversation;
  client: Client | null;
  messageAutoDraftAnalysis: Record<string, any>;
  onAutoDraftTrigger: (messageId: string, data: any) => void;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!conversation?.messages || conversation.messages.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">💬</div>
        <p className="text-medium-grey font-primary">No messages yet</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {conversation.messages.map((message: Message) => {
        const analysis = messageAutoDraftAnalysis[message.id];
        const shouldShowTrigger = analysis && (
          analysis.shouldTrigger || 
          (analysis.serviceType && analysis.confidence !== 'low')
        );

        return (
          <div
            key={message.id}
            className={`p-3 border-l-4 ${
              (message.role === "you" || message.role === "YOU")
                ? "border-hud-border-accent bg-tactical-gold-light"
                : "border-medium-grey bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-hud-text-primary font-primary uppercase">
                {(message.role === "you" || message.role === "YOU") ? "You" : (client?.name || "Client")}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-medium-grey">
                  {isClient ? new Date(message.timestamp).toLocaleString() : 'Loading...'}
                </span>
                {shouldShowTrigger && (
                  <button
                    onClick={() => onAutoDraftTrigger(message.id, analysis)}
                    className="w-5 h-5 bg-tactical-gold text-hud-text-primary rounded-full flex items-center justify-center text-xs hover:bg-tactical-gold-dark transition-colors"
                    title="Auto-draft billing"
                  >
                    💰
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-hud-text-primary whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Analytics Content Component
function AnalyticsContent({ 
  analytics, 
  conversation 
}: {
  analytics: ConversationAnalytics | null;
  conversation: Conversation;
}) {
  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-medium-grey font-primary">No analytics data available</p>
      </div>
    );
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-hud-background-secondary p-4 border border-hud-border">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
          Response Metrics
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-medium-grey uppercase tracking-wide">Avg Response</span>
            <span className="text-sm font-bold">
              {formatDuration(analytics?.responseMetrics?.averageResponseTime || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-medium-grey uppercase tracking-wide">Messages</span>
            <span className="text-sm font-bold">{conversation.messages?.length || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-hud-background-secondary p-4 border border-hud-border">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
          Engagement
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-medium-grey uppercase tracking-wide">Client Messages</span>
            <span className="text-sm font-bold">
              {analytics?.engagementData?.messagesFromClient || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-medium-grey uppercase tracking-wide">Your Messages</span>
            <span className="text-sm font-bold">
              {analytics?.engagementData?.messagesFromYou || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Insights Content Component
function InsightsContent({ 
  conversationHealth, 
  insights,
  conversation 
}: {
  conversationHealth: ConversationHealth | null;
  insights: ConversationInsight[];
  conversation: Conversation;
}) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";  
    if (score >= 40) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Poor";
  };

  if (!conversationHealth && insights.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">🎯</div>
        <p className="text-medium-grey font-primary">No insights available</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {conversationHealth && (
        <div className="bg-hud-background-secondary p-4 border border-hud-border">
          <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
            Health Score
          </h3>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getHealthColor(conversationHealth.overall)}`}>
              <span className="font-bold text-lg">{Math.round(conversationHealth.overall)}</span>
            </div>
            <div>
              <div className="font-bold text-hud-text-primary text-sm">
                {getHealthLabel(conversationHealth.overall)}
              </div>
              <div className="text-xs text-medium-grey">Overall health</div>
            </div>
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
            AI Insights
          </h3>
          {insights.slice(0, 3).map((insight, index) => (
            <div key={index} className="bg-white p-3 border border-hud-border">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm">
                  {insight.type === "opportunity" ? "🎯" :
                   insight.type === "risk" ? "⚠️" :
                   insight.type === "pattern" ? "📈" :
                   insight.type === "suggestion" ? "💡" : "🔍"}
                </span>
                <h4 className="font-bold text-hud-text-primary text-xs font-primary uppercase">
                  {insight.title}
                </h4>
              </div>
              <p className="text-xs text-medium-grey">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Schedule Content Component
function ScheduleContent({ 
  conversation, 
  client 
}: {
  conversation: Conversation;
  client: Client | null;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-hud-background-secondary p-4 border border-hud-border text-center">
        <div className="text-4xl mb-2">📅</div>
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-2 text-sm">
          Quick Scheduling
        </h3>
        <p className="text-xs text-medium-grey mb-3">
          Schedule follow-ups based on conversation context
        </p>
        <button className="w-full bg-tactical-gold text-hud-text-primary py-2 px-3 font-primary font-bold uppercase tracking-wide text-xs hover:bg-tactical-gold-dark transition-colors">
          Schedule Follow-up
        </button>
      </div>
      
      <div className="bg-white p-4 border border-hud-border">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
          Suggested Times
        </h3>
        <div className="space-y-2">
          <div className="text-xs text-medium-grey">Next week</div>
          <div className="text-xs text-medium-grey">End of month</div>
          <div className="text-xs text-medium-grey">Follow seasonal schedule</div>
        </div>
      </div>
    </div>
  );
}

// Billing Content Component
function BillingContent({ 
  conversation, 
  client,
  messageAutoDraftAnalysis,
  onAutoDraftTrigger 
}: {
  conversation: Conversation;
  client: Client | null;
  messageAutoDraftAnalysis: Record<string, any>;
  onAutoDraftTrigger: (messageId: string, data: any) => void;
}) {
  if (!client) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">💰</div>
        <p className="text-medium-grey font-primary">Client data needed for billing</p>
      </div>
    );
  }

  const autoDraftOpportunities = Object.entries(messageAutoDraftAnalysis).filter(([_, analysis]) => 
    analysis && (analysis.shouldTrigger || (analysis.serviceType && analysis.confidence !== 'low'))
  );

  return (
    <div className="p-4 space-y-4">
      {autoDraftOpportunities.length > 0 && (
        <div className="bg-tactical-gold-light p-4 border-2 border-hud-border-accent">
          <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
            Auto-Draft Opportunities
          </h3>
          <div className="space-y-2">
            {autoDraftOpportunities.slice(0, 3).map(([messageId, analysis]) => (
              <div key={messageId} className="bg-white p-3 border border-hud-border-accent">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-hud-text-primary uppercase tracking-wide">
                    {analysis.serviceType?.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`text-xs px-2 py-1 ${
                    analysis.confidence === 'high' ? 'bg-green-200 text-green-800' :
                    analysis.confidence === 'medium' ? 'bg-tactical-gold text-hud-text-primary' :
                    'bg-medium-grey text-hud-text-primary'
                  }`}>
                    {analysis.confidence}
                  </span>
                </div>
                {analysis.suggestedAmount && (
                  <div className="text-sm font-bold text-hud-text-primary mb-2">
                    ${analysis.suggestedAmount}
                  </div>
                )}
                <button
                  onClick={() => onAutoDraftTrigger(messageId, analysis)}
                  className="w-full bg-tactical-gold text-hud-text-primary py-1 px-2 text-xs font-bold uppercase tracking-wide hover:bg-tactical-gold-dark transition-colors"
                >
                  Auto-Draft Receipt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-hud-background-secondary p-4 border border-hud-border">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide mb-3 text-sm">
          Quick Actions
        </h3>
        <div className="space-y-2">
          <button className="w-full bg-white border border-medium-grey text-hud-text-primary py-2 px-3 text-xs font-bold uppercase tracking-wide hover:bg-light-grey transition-colors">
            Create Receipt
          </button>
          <button className="w-full bg-white border border-medium-grey text-hud-text-primary py-2 px-3 text-xs font-bold uppercase tracking-wide hover:bg-light-grey transition-colors">
            Generate Invoice
          </button>
          <button className="w-full bg-white border border-medium-grey text-hud-text-primary py-2 px-3 text-xs font-bold uppercase tracking-wide hover:bg-light-grey transition-colors">
            Send Quote
          </button>
        </div>
      </div>
    </div>
  );
}