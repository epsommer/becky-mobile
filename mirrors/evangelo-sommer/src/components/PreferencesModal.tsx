"use client"

import React, { useState, useEffect } from 'react'
import { X, Settings, Bell, Eye, Globe, Clock, Save, Monitor, Calendar, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CalendarIntegrationManager from './CalendarIntegrationManager'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (preferences: SystemPreferences) => void
}

export interface SystemPreferences {
  // display: {
  //   colorTheme: 'light' | 'mocha' | 'overkast' | 'true-night' | 'auto'
  //   windowTheme: 'neomorphic' | 'tactical'
  //   compactMode: boolean
  //   showSidebar: boolean
  //   defaultView: 'grid' | 'list' | 'table'
  // }
  notifications: {
    enableAll: boolean
    clientUpdates: boolean
    scheduleReminders: boolean
    systemAlerts: boolean
    soundEnabled: boolean
    quietHours: {
      enabled: boolean
      start: string
      end: string
    }
  }
  workflow: {
    autoSave: boolean
    confirmDeletions: boolean
    defaultClientStatus: 'prospect' | 'active'
    showAdvancedFeatures: boolean
    keyboardShortcuts: boolean
  }
  performance: {
    animationsEnabled: boolean
    cacheData: boolean
    preloadNextPage: boolean
    backgroundSync: boolean
  }
  conversations: {
    parsingLanguage: 'en' | 'es' | 'fr' | 'auto'
    enableKeywordDetection: boolean
    enableAutoDraft: boolean
    autoDraftConfidenceThreshold: 'low' | 'medium' | 'high'
    keywordTriggers: ConversationKeywordTrigger[]
    autoDraftSettings: {
      generateReceipts: boolean
      generateInvoices: boolean
      generateReplies: boolean
      requireApproval: boolean
    }
  }
}

export interface ConversationKeywordTrigger {
  id: string
  name: string
  keywords: string[]
  action: 'auto-draft-receipt' | 'auto-draft-invoice' | 'auto-draft-reply' | 'flag-for-review'
  confidence: number
  enabled: boolean
  serviceType?: string
  amount?: number
}

const PreferencesModal: React.FC<PreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'notifications' | 'workflow' | 'performance' | 'conversations' | 'integrations'>('notifications')
  const [preferences, setPreferences] = useState<SystemPreferences>({
    // display: {
    //   colorTheme: 'auto',
    //   windowTheme: 'neomorphic',
    //   compactMode: false,
    //   showSidebar: true,
    //   defaultView: 'grid'
    // },
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
      keyboardShortcuts: true
    },
    performance: {
      animationsEnabled: true,
      cacheData: true,
      preloadNextPage: false,
      backgroundSync: true
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
    }
  })

  useEffect(() => {
    // Load saved preferences from localStorage
    try {
      const saved = localStorage.getItem('system-preferences')
      if (saved) {
        const savedPrefs = JSON.parse(saved)
        setPreferences(prev => ({ ...prev, ...savedPrefs }))
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }, [isOpen])

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleSave = () => {
    // Save to localStorage
    try {
      localStorage.setItem('system-preferences', JSON.stringify(preferences))
      onSave(preferences)
      onClose()
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  // const updateDisplay = (key: string, value: any) => {
  //   setPreferences(prev => ({
  //     ...prev,
  //     display: { ...prev.display, [key]: value }
  //   }))
  // }

  const updateNotifications = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }))
  }

  const updateWorkflow = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      workflow: { ...prev.workflow, [key]: value }
    }))
  }

  const updatePerformance = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      performance: { ...prev.performance, [key]: value }
    }))
  }

  const updateConversations = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      conversations: { ...prev.conversations, [key]: value }
    }))
  }

  const addKeywordTrigger = () => {
    const newTrigger: ConversationKeywordTrigger = {
      id: Date.now().toString(),
      name: 'New Trigger',
      keywords: [],
      action: 'flag-for-review',
      confidence: 0.5,
      enabled: true
    }
    updateConversations('keywordTriggers', [...preferences.conversations.keywordTriggers, newTrigger])
  }

  const updateKeywordTrigger = (id: string, updates: Partial<ConversationKeywordTrigger>) => {
    const updatedTriggers = preferences.conversations.keywordTriggers.map(trigger =>
      trigger.id === id ? { ...trigger, ...updates } : trigger
    )
    updateConversations('keywordTriggers', updatedTriggers)
  }

  const removeKeywordTrigger = (id: string) => {
    const filteredTriggers = preferences.conversations.keywordTriggers.filter(trigger => trigger.id !== id)
    updateConversations('keywordTriggers', filteredTriggers)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="neo-container w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="neo-container-inner p-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-bold font-primary uppercase tracking-wide text-foreground">
              System Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-button-circle w-10 h-10 flex items-center justify-center transition-all duration-300 hover:scale-110"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-background border-r border-border">
            <div className="p-4">
              <div className="space-y-2">
                {[
                  { id: 'notifications', label: 'Notifications', icon: Bell },
                  { id: 'workflow', label: 'Workflow', icon: Settings },
                  { id: 'performance', label: 'Performance', icon: Monitor },
                  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
                  { id: 'integrations', label: 'Integrations', icon: Calendar }
                ].map(tab => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm font-primary uppercase tracking-wide transition-all duration-300 rounded-xl ${
                        activeTab === tab.id
                          ? 'neo-button-active text-foreground'
                          : 'neo-button text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Notification Settings
                </h3>

                <div className="neo-container p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide">
                      Master Control
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={preferences.notifications.enableAll ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                        {preferences.notifications.enableAll ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.enableAll}
                          onChange={(e) => updateNotifications('enableAll', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'clientUpdates', label: 'Client Updates', desc: 'When clients are added, updated, or status changes' },
                      { key: 'scheduleReminders', label: 'Schedule Reminders', desc: 'Upcoming appointments and service schedules' },
                      { key: 'systemAlerts', label: 'System Alerts', desc: 'Important system notifications and errors' },
                      { key: 'soundEnabled', label: 'Sound Notifications', desc: 'Play sound for incoming notifications' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">{item.label}</div>
                          <div className="text-sm text-medium-grey font-primary">{item.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.notifications[item.key as keyof typeof preferences.notifications] as boolean}
                            onChange={(e) => updateNotifications(item.key, e.target.checked)}
                            disabled={!preferences.notifications.enableAll}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold peer-disabled:opacity-50"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiet Hours */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Quiet Hours
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Enable Quiet Hours</div>
                        <div className="text-sm text-medium-grey font-primary">Disable notifications during specified hours</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.quietHours.enabled}
                          onChange={(e) => updateNotifications('quietHours', {
                            ...preferences.notifications.quietHours,
                            enabled: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>

                    {preferences.notifications.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={preferences.notifications.quietHours.start}
                            onChange={(e) => updateNotifications('quietHours', {
                              ...preferences.notifications.quietHours,
                              start: e.target.value
                            })}
                            className="neomorphic-input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={preferences.notifications.quietHours.end}
                            onChange={(e) => updateNotifications('quietHours', {
                              ...preferences.notifications.quietHours,
                              end: e.target.value
                            })}
                            className="neomorphic-input w-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'workflow' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Workflow Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="neo-container p-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                      General Workflow
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">Auto-Save</div>
                          <div className="text-sm text-medium-grey font-primary">Automatically save changes</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.autoSave}
                            onChange={(e) => updateWorkflow('autoSave', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">Confirm Deletions</div>
                          <div className="text-sm text-medium-grey font-primary">Show confirmation before deleting</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.confirmDeletions}
                            onChange={(e) => updateWorkflow('confirmDeletions', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">Keyboard Shortcuts</div>
                          <div className="text-sm text-medium-grey font-primary">Enable keyboard shortcuts</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.keyboardShortcuts}
                            onChange={(e) => updateWorkflow('keyboardShortcuts', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="neo-container p-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                      Defaults
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                          Default Client Status
                        </label>
                        <select
                          value={preferences.workflow.defaultClientStatus}
                          onChange={(e) => updateWorkflow('defaultClientStatus', e.target.value)}
                          className="neomorphic-input w-full"
                        >
                          <option value="prospect">Prospect</option>
                          <option value="active">Active</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">Advanced Features</div>
                          <div className="text-sm text-medium-grey font-primary">Show advanced functionality</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.workflow.showAdvancedFeatures}
                            onChange={(e) => updateWorkflow('showAdvancedFeatures', e.target.checked)}
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

            {activeTab === 'performance' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Performance Settings
                </h3>

                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Performance Options
                  </h4>
                  
                  <div className="space-y-4">
                    {[
                      { key: 'animationsEnabled', label: 'Animations', desc: 'Enable smooth transitions and animations' },
                      { key: 'cacheData', label: 'Cache Data', desc: 'Cache frequently accessed data for faster loading' },
                      { key: 'preloadNextPage', label: 'Preload Pages', desc: 'Preload next pages in background (uses more data)' },
                      { key: 'backgroundSync', label: 'Background Sync', desc: 'Sync data in background for real-time updates' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">{item.label}</div>
                          <div className="text-sm text-medium-grey font-primary">{item.desc}</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.performance[item.key as keyof typeof preferences.performance] as boolean}
                            onChange={(e) => updatePerformance(item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-light-grey p-4 border border-medium-grey">
                  <div className="text-sm text-medium-grey font-primary">
                    <strong>Performance Tips:</strong><br/>
                    • Disable animations on slower devices for better performance<br/>
                    • Enable caching for faster load times<br/>
                    • Disable preloading to save data usage<br/>
                    • Background sync keeps data up-to-date automatically
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'conversations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Conversation Settings
                </h3>

                {/* Language & Parsing Settings */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Language & Parsing
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                        Parsing Language
                      </label>
                      <select
                        value={preferences.conversations.parsingLanguage}
                        onChange={(e) => updateConversations('parsingLanguage', e.target.value)}
                        className="neomorphic-input w-full"
                      >
                        <option value="auto">Auto-Detect</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
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
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Auto-Draft Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
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
                        className="neomorphic-input w-full disabled:opacity-50"
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
                        <div key={item.key} className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary text-sm">{item.label}</div>
                            <div className="text-xs text-medium-grey font-primary">{item.desc}</div>
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
                <div className="neo-container p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide">
                      Keyword Triggers
                    </h4>
                    <Button
                      onClick={addKeywordTrigger}
                      size="sm"
                      className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary font-primary font-bold uppercase tracking-wide text-xs px-3 py-1"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Trigger
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {preferences.conversations.keywordTriggers.map(trigger => (
                      <div key={trigger.id} className="bg-white p-3 border border-medium-grey">
                        <div className="flex items-center justify-between mb-2">
                          <input
                            type="text"
                            value={trigger.name}
                            onChange={(e) => updateKeywordTrigger(trigger.id, { name: e.target.value })}
                            className="font-medium text-hud-text-primary font-primary bg-transparent border-none outline-none flex-1"
                            placeholder="Trigger name"
                          />
                          <div className="flex items-center space-x-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={trigger.enabled}
                                onChange={(e) => updateKeywordTrigger(trigger.id, { enabled: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-5 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-tactical-gold"></div>
                            </label>
                            <button
                              onClick={() => removeKeywordTrigger(trigger.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-xs text-medium-grey font-primary mb-1">Action</label>
                            <select
                              value={trigger.action}
                              onChange={(e) => updateKeywordTrigger(trigger.id, { action: e.target.value as any })}
                              className="w-full px-2 py-1 text-xs border border-medium-grey bg-white text-hud-text-primary font-primary"
                            >
                              <option value="auto-draft-receipt">Draft Receipt</option>
                              <option value="auto-draft-invoice">Draft Invoice</option>
                              <option value="auto-draft-reply">Draft Reply</option>
                              <option value="flag-for-review">Flag for Review</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-medium-grey font-primary mb-1">Confidence</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={trigger.confidence}
                              onChange={(e) => updateKeywordTrigger(trigger.id, { confidence: parseFloat(e.target.value) })}
                              className="w-full"
                            />
                            <span className="text-xs text-medium-grey">{Math.round(trigger.confidence * 100)}%</span>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs text-medium-grey font-primary mb-1">Keywords (comma-separated)</label>
                          <input
                            type="text"
                            value={trigger.keywords.join(', ')}
                            onChange={(e) => updateKeywordTrigger(trigger.id, { 
                              keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0) 
                            })}
                            className="w-full px-2 py-1 text-xs border border-medium-grey bg-white text-hud-text-primary font-primary"
                            placeholder="keyword1, keyword2, phrase example"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Calendar & Service Integrations
                </h3>
                
                <CalendarIntegrationManager
                  onEventsSync={(events) => {
                    console.log('Events synced:', events)
                  }}
                  onIntegrationChange={(integrations) => {
                    console.log('Integrations updated:', integrations)
                  }}
                  clientId="system-preferences"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="neo-container-inner border-t border-border p-6 flex items-center justify-between">
          <div className="text-sm text-foreground/60 font-primary">
            Preferences are saved locally and will persist across sessions.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="neo-button px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="neo-button-active px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreferencesModal