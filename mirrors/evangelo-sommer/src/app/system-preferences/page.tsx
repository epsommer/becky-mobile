"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Palette, Bell, Settings, Monitor, MessageSquare, Calendar, Plus, Trash2, CheckCircle, AlertCircle, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CalendarIntegrationManager from '@/components/CalendarIntegrationManager';

interface ConversationKeywordTrigger {
  id: string;
  name: string;
  keywords: string[];
  action: 'auto-draft-receipt' | 'auto-draft-invoice' | 'auto-draft-reply' | 'flag-for-review';
  confidence: number;
  enabled: boolean;
  serviceType?: string;
  amount?: number;
}

interface EventCategorizationRule {
  id: string;
  name: string;
  category: 'primary' | 'secondary' | 'tertiary';
  keywords: string[];
  enabled: boolean;
  priority: number;
}

interface SystemPreferences {
  display: {
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
    showSidebar: boolean;
    defaultView: 'grid' | 'list' | 'table';
    animationsEnabled: boolean;
    highContrast: boolean;
  };
  notifications: {
    enableAll: boolean;
    clientUpdates: boolean;
    scheduleReminders: boolean;
    systemAlerts: boolean;
    soundEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  workflow: {
    autoSave: boolean;
    confirmDeletions: boolean;
    defaultClientStatus: 'prospect' | 'active';
    showAdvancedFeatures: boolean;
    keyboardShortcuts: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
  performance: {
    animationsEnabled: boolean;
    cacheData: boolean;
    preloadNextPage: boolean;
    backgroundSync: boolean;
    dataCompression: boolean;
  };
  conversations: {
    parsingLanguage: 'en' | 'es' | 'fr' | 'auto';
    enableKeywordDetection: boolean;
    enableAutoDraft: boolean;
    autoDraftConfidenceThreshold: 'low' | 'medium' | 'high';
    keywordTriggers: ConversationKeywordTrigger[];
    autoDraftSettings: {
      generateReceipts: boolean;
      generateInvoices: boolean;
      generateReplies: boolean;
      requireApproval: boolean;
    };
  };
  eventParsing: {
    enableSmartCategorization: boolean;
    categorizationRules: EventCategorizationRule[];
    defaultCategory: 'primary' | 'secondary' | 'tertiary';
    showCategoryBadges: boolean;
    prioritizeMoneyMaking: boolean;
  };
}

export default function SystemPreferencesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'display' | 'notifications' | 'workflow' | 'performance' | 'conversations' | 'integrations' | 'eventParsing'>('display');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [preferences, setPreferences] = useState<SystemPreferences>({
    display: {
      theme: 'auto',
      compactMode: false,
      showSidebar: true,
      defaultView: 'grid',
      animationsEnabled: true,
      highContrast: false
    },
    notifications: {
      enableAll: true,
      clientUpdates: true,
      scheduleReminders: true,
      systemAlerts: true,
      soundEnabled: false,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    },
    workflow: {
      autoSave: true,
      confirmDeletions: true,
      defaultClientStatus: 'prospect',
      showAdvancedFeatures: false,
      keyboardShortcuts: true,
      backupFrequency: 'weekly'
    },
    performance: {
      animationsEnabled: true,
      cacheData: true,
      preloadNextPage: false,
      backgroundSync: true,
      dataCompression: false
    },
    conversations: {
      parsingLanguage: 'auto',
      enableKeywordDetection: true,
      enableAutoDraft: true,
      autoDraftConfidenceThreshold: 'medium',
      keywordTriggers: [
        {
          id: '1',
          name: 'Service Completion',
          keywords: ['completed', 'finished', 'done', 'service complete'],
          action: 'auto-draft-receipt',
          confidence: 0.8,
          enabled: true,
          serviceType: 'landscaping'
        },
        {
          id: '2',
          name: 'Payment Request',
          keywords: ['payment', 'invoice', 'bill', 'charge'],
          action: 'auto-draft-invoice',
          confidence: 0.7,
          enabled: true
        },
        {
          id: '3',
          name: 'Question Response',
          keywords: ['thank you', 'thanks', 'question', 'help'],
          action: 'auto-draft-reply',
          confidence: 0.6,
          enabled: true
        }
      ],
      autoDraftSettings: {
        generateReceipts: true,
        generateInvoices: true,
        generateReplies: false,
        requireApproval: true
      }
    },
    eventParsing: {
      enableSmartCategorization: true,
      categorizationRules: [
        {
          id: '1',
          name: 'Money-Making Activities',
          category: 'primary',
          keywords: ['landscaping', 'client meeting', 'service call', 'consultation', 'estimate', 'proposal', 'invoice', 'payment', 'contract'],
          enabled: true,
          priority: 1
        },
        {
          id: '2',
          name: 'Business Support Tasks',
          category: 'secondary',
          keywords: ['equipment maintenance', 'supply pickup', 'planning', 'scheduling', 'follow-up', 'marketing', 'networking', 'training'],
          enabled: true,
          priority: 2
        },
        {
          id: '3',
          name: 'Personal Life Tasks',
          category: 'tertiary',
          keywords: ['groceries', 'cleaning', 'laundry', 'car wash', 'doctor appointment', 'personal', 'family', 'shopping', 'errands'],
          enabled: true,
          priority: 3
        }
      ],
      defaultCategory: 'secondary',
      showCategoryBadges: true,
      prioritizeMoneyMaking: true
    }
  });

  // Load saved preferences from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('system-preferences');
      if (saved) {
        const savedPrefs = JSON.parse(saved);
        setPreferences(prev => ({ ...prev, ...savedPrefs }));
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // Save to localStorage
      localStorage.setItem('system-preferences', JSON.stringify(preferences));
      
      // Apply theme immediately
      if (preferences.display.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (preferences.display.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // Auto theme - check system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateDisplay = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      display: { ...prev.display, [key]: value }
    }));
  };

  const updateNotifications = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const updateWorkflow = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      workflow: { ...prev.workflow, [key]: value }
    }));
  };

  const updatePerformance = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value }
    }));
  };

  const updateConversations = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      conversations: { ...prev.conversations, [key]: value }
    }));
  };

  const updateEventParsing = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      eventParsing: { ...prev.eventParsing, [key]: value }
    }));
  };

  const addKeywordTrigger = () => {
    const newTrigger: ConversationKeywordTrigger = {
      id: Date.now().toString(),
      name: 'New Trigger',
      keywords: [],
      action: 'flag-for-review',
      confidence: 0.5,
      enabled: true
    };
    updateConversations('keywordTriggers', [...preferences.conversations.keywordTriggers, newTrigger]);
  };

  const updateKeywordTrigger = (id: string, updates: Partial<ConversationKeywordTrigger>) => {
    const updatedTriggers = preferences.conversations.keywordTriggers.map(trigger =>
      trigger.id === id ? { ...trigger, ...updates } : trigger
    );
    updateConversations('keywordTriggers', updatedTriggers);
  };

  const removeKeywordTrigger = (id: string) => {
    const filteredTriggers = preferences.conversations.keywordTriggers.filter(trigger => trigger.id !== id);
    updateConversations('keywordTriggers', filteredTriggers);
  };

  const addCategorizationRule = () => {
    const newRule: EventCategorizationRule = {
      id: Date.now().toString(),
      name: 'New Rule',
      category: 'secondary',
      keywords: [],
      enabled: true,
      priority: preferences.eventParsing.categorizationRules.length + 1
    };
    updateEventParsing('categorizationRules', [...preferences.eventParsing.categorizationRules, newRule]);
  };

  const updateCategorizationRule = (id: string, updates: Partial<EventCategorizationRule>) => {
    const updatedRules = preferences.eventParsing.categorizationRules.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    );
    updateEventParsing('categorizationRules', updatedRules);
  };

  const removeCategorizationRule = (id: string) => {
    const filteredRules = preferences.eventParsing.categorizationRules.filter(rule => rule.id !== id);
    updateEventParsing('categorizationRules', filteredRules);
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved!';
      case 'error': return 'Error - Retry';
      default: return 'Save Changes';
    }
  };

  const getSaveButtonIcon = () => {
    switch (saveStatus) {
      case 'saved': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Save className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-hud-background-primary">
      {/* Header */}
      <div className="bg-hud-overlay border-b-4 border-tactical-gold">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-tactical-gold hover:text-tactical-amber transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-primary uppercase tracking-wide">Back</span>
              </button>
              <div className="border-l-2 border-tactical-gold pl-4">
                <h1 className="text-3xl font-bold text-tactical-white font-primary uppercase tracking-wide">
                  System Preferences
                </h1>
                <p className="text-tactical-data text-sm font-primary uppercase tracking-wider">
                  SYSTEM_CONFIG • TACTICAL_INTERFACE_V2.1
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-2 font-bold uppercase tracking-wide font-primary ${
                saveStatus === 'saved' 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary'
              }`}
            >
              {getSaveButtonIcon()}
              <span className="ml-2">{getSaveButtonText()}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-hud-background-secondary border-2 border-hud-border">
              <div className="p-6">
                <div className="space-y-2">
                  {[
                    { id: 'display', label: 'Display & Theme', icon: Palette, desc: 'Visual appearance settings' },
                    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Alert and notification preferences' },
                    { id: 'workflow', label: 'Workflow', icon: Settings, desc: 'Automation and behavior settings' },
                    { id: 'performance', label: 'Performance', icon: Monitor, desc: 'System optimization options' },
                    { id: 'conversations', label: 'Conversations', icon: MessageSquare, desc: 'AI and keyword detection' },
                    { id: 'eventParsing', label: 'Event Parsing', icon: Target, desc: 'Smart event categorization' },
                    { id: 'integrations', label: 'Integrations', icon: Calendar, desc: 'External service connections' }
                  ].map(tab => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full text-left p-4 border-2 transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-tactical-gold text-hud-text-primary border-tactical-gold'
                            : 'bg-transparent text-medium-grey border-transparent hover:border-hud-border hover:text-hud-text-primary'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`h-5 w-5 mt-0.5 ${
                            activeTab === tab.id ? 'text-hud-text-primary' : 'text-tactical-gold'
                          }`} />
                          <div>
                            <div className={`font-medium font-primary uppercase tracking-wide text-sm ${
                              activeTab === tab.id ? 'text-hud-text-primary' : 'text-hud-text-primary'
                            }`}>
                              {tab.label}
                            </div>
                            <div className={`text-xs mt-1 ${
                              activeTab === tab.id ? 'text-hud-text-primary/80' : 'text-medium-grey'
                            }`}>
                              {tab.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-hud-background-secondary border-2 border-hud-border">
              {/* Display Tab */}
              {activeTab === 'display' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Display & Theme
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Appearance
                      </h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                            Theme
                          </label>
                          <select
                            value={preferences.display.theme}
                            onChange={(e) => updateDisplay('theme', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          >
                            <option value="light">Light Theme</option>
                            <option value="dark">Dark Theme</option>
                            <option value="auto">Auto (System)</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Compact Mode</div>
                            <div className="text-sm text-medium-grey font-primary">Reduce spacing for more content</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.display.compactMode}
                              onChange={(e) => updateDisplay('compactMode', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">High Contrast</div>
                            <div className="text-sm text-medium-grey font-primary">Improve visibility and readability</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.display.highContrast}
                              onChange={(e) => updateDisplay('highContrast', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Layout
                      </h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                            Default View
                          </label>
                          <select
                            value={preferences.display.defaultView}
                            onChange={(e) => updateDisplay('defaultView', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          >
                            <option value="grid">Grid View</option>
                            <option value="list">List View</option>
                            <option value="table">Table View</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Show Sidebar</div>
                            <div className="text-sm text-medium-grey font-primary">Always show navigation sidebar</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.display.showSidebar}
                              onChange={(e) => updateDisplay('showSidebar', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversations Tab */}
              {activeTab === 'conversations' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Conversation Settings
                  </h2>

                  <div className="space-y-8">
                    {/* Language & Parsing Settings */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Language & Parsing
                      </h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                            Parsing Language
                          </label>
                          <select
                            value={preferences.conversations.parsingLanguage}
                            onChange={(e) => updateConversations('parsingLanguage', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          >
                            <option value="auto">Auto-Detect</option>
                            <option value="en">English</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Enable Keyword Detection</div>
                            <div className="text-sm text-medium-grey font-primary">Automatically detect keywords and phrases</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.conversations.enableKeywordDetection}
                              onChange={(e) => updateConversations('enableKeywordDetection', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Draft Settings */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Auto-Draft Settings
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Enable Auto-Draft</div>
                            <div className="text-sm text-medium-grey font-primary">Automatically generate drafts from conversations</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.conversations.enableAutoDraft}
                              onChange={(e) => updateConversations('enableAutoDraft', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                            Confidence Threshold
                          </label>
                          <select
                            value={preferences.conversations.autoDraftConfidenceThreshold}
                            onChange={(e) => updateConversations('autoDraftConfidenceThreshold', e.target.value)}
                            disabled={!preferences.conversations.enableAutoDraft}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary disabled:opacity-50 focus:border-tactical-gold focus:outline-none"
                          >
                            <option value="low">Low - More suggestions</option>
                            <option value="medium">Medium - Balanced</option>
                            <option value="high">High - Only confident matches</option>
                          </select>
                        </div>

                        {/* Auto-Draft Types */}
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: 'generateReceipts', label: 'Auto-Draft Receipts', desc: 'Generate receipts automatically' },
                            { key: 'generateInvoices', label: 'Auto-Draft Invoices', desc: 'Generate invoices automatically' },
                            { key: 'generateReplies', label: 'Auto-Draft Replies', desc: 'Generate reply suggestions' },
                            { key: 'requireApproval', label: 'Require Approval', desc: 'Always ask before auto-drafting' }
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-4 border border-hud-border">
                              <div>
                                <div className="font-medium text-hud-text-primary font-primary text-sm">{item.label}</div>
                                <div className="text-xs text-medium-grey font-primary mt-1">{item.desc}</div>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={preferences.conversations.autoDraftSettings[item.key as keyof typeof preferences.conversations.autoDraftSettings] as boolean}
                                  onChange={(e) => updateConversations('autoDraftSettings', {
                                    ...preferences.conversations.autoDraftSettings,
                                    [item.key]: e.target.checked
                                  })}
                                  disabled={!preferences.conversations.enableAutoDraft}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold peer-disabled:opacity-50"></div>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Keyword Triggers */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                          Keyword Triggers
                        </h3>
                        <Button
                          onClick={addKeywordTrigger}
                          size="sm"
                          className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide text-xs px-4 py-2"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Trigger
                        </Button>
                      </div>
                      
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {preferences.conversations.keywordTriggers.map(trigger => (
                          <div key={trigger.id} className="bg-white p-4 border border-medium-grey">
                            <div className="flex items-center justify-between mb-3">
                              <input
                                type="text"
                                value={trigger.name}
                                onChange={(e) => updateKeywordTrigger(trigger.id, { name: e.target.value })}
                                className="font-medium text-hud-text-primary font-primary bg-transparent border-none outline-none flex-1 text-lg"
                                placeholder="Trigger name"
                              />
                              <div className="flex items-center space-x-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={trigger.enabled}
                                    onChange={(e) => updateKeywordTrigger(trigger.id, { enabled: e.target.checked })}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tactical-gold"></div>
                                </label>
                                <button
                                  onClick={() => removeKeywordTrigger(trigger.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">Action</label>
                                <select
                                  value={trigger.action}
                                  onChange={(e) => updateKeywordTrigger(trigger.id, { action: e.target.value as any })}
                                  className="w-full px-3 py-2 text-sm border border-medium-grey bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                                >
                                  <option value="auto-draft-receipt">Draft Receipt</option>
                                  <option value="auto-draft-invoice">Draft Invoice</option>
                                  <option value="auto-draft-reply">Draft Reply</option>
                                  <option value="flag-for-review">Flag for Review</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">
                                  Confidence: {Math.round(trigger.confidence * 100)}%
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={trigger.confidence}
                                  onChange={(e) => updateKeywordTrigger(trigger.id, { confidence: parseFloat(e.target.value) })}
                                  className="w-full accent-tactical-gold"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">Keywords (comma-separated)</label>
                              <input
                                type="text"
                                value={trigger.keywords.join(', ')}
                                onChange={(e) => updateKeywordTrigger(trigger.id, { 
                                  keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0) 
                                })}
                                className="w-full px-3 py-2 text-sm border border-medium-grey bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                                placeholder="keyword1, keyword2, phrase example"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Parsing Tab */}
              {activeTab === 'eventParsing' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Event Parsing Configuration
                  </h2>

                  <div className="space-y-8">
                    {/* Smart Categorization Settings */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Smart Categorization
                      </h3>
                      
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Enable Smart Categorization</div>
                            <div className="text-sm text-medium-grey font-primary">Automatically categorize events by money-making priority</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.eventParsing.enableSmartCategorization}
                              onChange={(e) => updateEventParsing('enableSmartCategorization', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Show Category Badges</div>
                            <div className="text-sm text-medium-grey font-primary">Display visual badges for Primary/Secondary/Tertiary</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.eventParsing.showCategoryBadges}
                              onChange={(e) => updateEventParsing('showCategoryBadges', e.target.checked)}
                              className="sr-only peer"
                              disabled={!preferences.eventParsing.enableSmartCategorization}
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold peer-disabled:opacity-50"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Prioritize Money-Making</div>
                            <div className="text-sm text-medium-grey font-primary">Show Primary objectives first in all views</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={preferences.eventParsing.prioritizeMoneyMaking}
                              onChange={(e) => updateEventParsing('prioritizeMoneyMaking', e.target.checked)}
                              className="sr-only peer"
                              disabled={!preferences.eventParsing.enableSmartCategorization}
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold peer-disabled:opacity-50"></div>
                          </label>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                            Default Category for Uncategorized Events
                          </label>
                          <select
                            value={preferences.eventParsing.defaultCategory}
                            onChange={(e) => updateEventParsing('defaultCategory', e.target.value)}
                            disabled={!preferences.eventParsing.enableSmartCategorization}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary disabled:opacity-50 focus:border-tactical-gold focus:outline-none"
                          >
                            <option value="primary">Primary - Money-Making</option>
                            <option value="secondary">Secondary - Business Support</option>
                            <option value="tertiary">Tertiary - Personal Life</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Categorization Rules */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                          Categorization Rules
                        </h3>
                        <Button
                          onClick={addCategorizationRule}
                          size="sm"
                          disabled={!preferences.eventParsing.enableSmartCategorization}
                          className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide text-xs px-4 py-2 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Rule
                        </Button>
                      </div>
                      
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {preferences.eventParsing.categorizationRules.map(rule => (
                          <div key={rule.id} className="bg-white p-4 border border-medium-grey">
                            <div className="flex items-center justify-between mb-3">
                              <input
                                type="text"
                                value={rule.name}
                                onChange={(e) => updateCategorizationRule(rule.id, { name: e.target.value })}
                                className="font-medium text-hud-text-primary font-primary bg-transparent border-none outline-none flex-1 text-lg"
                                placeholder="Rule name"
                                disabled={!preferences.eventParsing.enableSmartCategorization}
                              />
                              <div className="flex items-center space-x-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    onChange={(e) => updateCategorizationRule(rule.id, { enabled: e.target.checked })}
                                    disabled={!preferences.eventParsing.enableSmartCategorization}
                                    className="sr-only peer"
                                  />
                                  <div className="w-10 h-5 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tactical-gold peer-disabled:opacity-50"></div>
                                </label>
                                <button
                                  onClick={() => removeCategorizationRule(rule.id)}
                                  disabled={!preferences.eventParsing.enableSmartCategorization}
                                  className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                              <div>
                                <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">Category</label>
                                <select
                                  value={rule.category}
                                  onChange={(e) => updateCategorizationRule(rule.id, { category: e.target.value as any })}
                                  disabled={!preferences.eventParsing.enableSmartCategorization}
                                  className="w-full px-3 py-2 text-sm border border-medium-grey bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none disabled:opacity-50"
                                >
                                  <option value="primary">Primary - Money-Making</option>
                                  <option value="secondary">Secondary - Business Support</option>
                                  <option value="tertiary">Tertiary - Personal Life</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">
                                  Priority: {rule.priority}
                                </label>
                                <input
                                  type="range"
                                  min="1"
                                  max="10"
                                  step="1"
                                  value={rule.priority}
                                  onChange={(e) => updateCategorizationRule(rule.id, { priority: parseInt(e.target.value) })}
                                  disabled={!preferences.eventParsing.enableSmartCategorization}
                                  className="w-full accent-tactical-gold disabled:opacity-50"
                                />
                              </div>
                              <div className="flex items-end">
                                <div className={`px-3 py-1 text-xs font-bold uppercase rounded ${
                                  rule.category === 'primary' ? 'bg-green-100 text-green-800' :
                                  rule.category === 'secondary' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-tactical-gold-muted text-tactical-brown-dark'
                                }`}>
                                  {rule.category}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs text-medium-grey font-primary mb-2 uppercase tracking-wider">Keywords (comma-separated)</label>
                              <input
                                type="text"
                                value={rule.keywords.join(', ')}
                                onChange={(e) => updateCategorizationRule(rule.id, { 
                                  keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0) 
                                })}
                                disabled={!preferences.eventParsing.enableSmartCategorization}
                                className="w-full px-3 py-2 text-sm border border-medium-grey bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none disabled:opacity-50"
                                placeholder="landscaping, client meeting, consultation"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Calendar & Service Integrations
                  </h2>
                  
                  <CalendarIntegrationManager
                    onEventsSync={(events) => {
                      console.log('Events synced:', events);
                    }}
                    onIntegrationChange={(integrations) => {
                      console.log('Integrations updated:', integrations);
                    }}
                    clientId="system-preferences"
                  />
                </div>
              )}

              {/* Placeholder content for other tabs */}
              {['notifications', 'workflow', 'performance'].includes(activeTab) && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h2>
                  <div className="text-medium-grey font-primary">
                    This section will be implemented with detailed settings for {activeTab}...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}