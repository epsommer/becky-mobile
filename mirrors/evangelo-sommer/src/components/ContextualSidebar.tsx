"use client";

import { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  BarChart3,
  Lightbulb,
  Calendar,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  History,
  Pencil,
  ArrowLeft,
  Info,
  Star,
  StickyNote
} from 'lucide-react';
import Link from 'next/link';
import { Conversation, Client, Message } from '../types/client';
import { BillingSuggestion } from '../types/billing';
import SidebarAnalytics from './SidebarAnalytics';
import SidebarInsights from './SidebarInsights';
import SidebarSchedule from './SidebarSchedule';
import SidebarBilling from './SidebarBilling';
import SidebarDraftAI from './SidebarDraftAI';
import MasterTimelineDraftAI from './MasterTimelineDraftAI';

export type SidebarTab = 'analytics' | 'insights' | 'schedule' | 'billing' | 'draft' | 'conversation';

interface ContextualSidebarProps {
  conversation: Conversation;
  client: Client;
  conversationId: string;
  selectedMessageId?: string | null;
  onSelectMessage?: (messageId: string | null) => void;
  className?: string;
  onAutoDetails?: (message: Message, suggestion: BillingSuggestion) => void;
  onStateChange?: (isOpen: boolean, width: number) => void;
  // Master timeline specific props
  isMasterTimeline?: boolean;
  allConversations?: Conversation[];
  allMessages?: (Message & { conversationId: string; conversationTitle: string })[];
  selectedMessage?: (Message & { conversationId: string }) | null;
  onRefresh?: () => void;
  // Conversation header props
  onEditClick?: () => void;
  conversationSource?: string;
  onTestimonialClick?: () => void;
  // Quick action handlers
  onMessageClient?: () => void;
  onScheduleService?: () => void;
  onCreateReceipt?: () => void;
  onAddNote?: () => void;
}

export default function ContextualSidebar({
  conversation,
  client,
  conversationId,
  selectedMessageId,
  onSelectMessage,
  className = "",
  onAutoDetails,
  onStateChange,
  isMasterTimeline = false,
  allConversations = [],
  allMessages = [],
  selectedMessage,
  onRefresh,
  onEditClick,
  conversationSource,
  onTestimonialClick,
  onMessageClient,
  onScheduleService,
  onCreateReceipt,
  onAddNote
}: ContextualSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(56); // Default to mobile not-scrolled height
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Editable conversation state
  const [isEditingConversation, setIsEditingConversation] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedPriority, setEditedPriority] = useState('');
  const [editedClientId, setEditedClientId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Helper function for priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return 'bg-red-500/20 text-red-700 border-red-300';
      case 'MEDIUM':
        return 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-grey-300';
      case 'LOW':
        return 'bg-green-500/20 text-green-700 border-green-300';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300';
    }
  };

  // Helper function for conversation source icon
  const getSourceIcon = (source?: string) => {
    if (!source) return '💬';
    switch (source.toLowerCase()) {
      case 'email': return '📧';
      case 'phone': return '📱';
      case 'sms': return '💬';
      case 'whatsapp': return '💚';
      default: return '💬';
    }
  };

  // Track header height based on scroll position and screen size
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const isSmallScreen = window.innerWidth < 640; // sm breakpoint

      if (isSmallScreen) {
        // Mobile: h-14 (56px) initially, h-12 (48px) when scrolled
        setHeaderHeight(scrollY > 100 ? 48 : 56);
      } else {
        // Desktop: h-20 (80px) initially, h-14 (56px) when scrolled
        setHeaderHeight(scrollY > 100 ? 56 : 80);
      }
    };

    handleScroll(); // Set initial value
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActiveTab(null);
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  // Initialize edit state when conversation changes
  useEffect(() => {
    if (conversation) {
      setEditedTitle(conversation.title || '');
      setEditedPriority(conversation.priority || 'MEDIUM');
      setEditedClientId(conversation.clientId || '');
      setHasChanges(false);
    }
  }, [conversation]);

  // Track if changes have been made
  useEffect(() => {
    if (!conversation) return;

    const titleChanged = editedTitle !== (conversation.title || '');
    const priorityChanged = editedPriority !== (conversation.priority || 'MEDIUM');
    const clientChanged = editedClientId !== (conversation.clientId || '');

    setHasChanges(titleChanged || priorityChanged || clientChanged);
  }, [editedTitle, editedPriority, editedClientId, conversation]);

  // Fetch all clients when entering edit mode
  useEffect(() => {
    const fetchClients = async () => {
      if (!isEditingConversation) return;

      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setAllClients(result.data);
          }
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, [isEditingConversation]);

  // Handle saving conversation changes
  const handleSaveConversation = async () => {
    if (!conversation?.id) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle,
          priority: editedPriority.toUpperCase(),
          clientId: editedClientId,
        }),
      });

      if (!response.ok) throw new Error('Failed to save conversation');

      // Refresh the page or call onRefresh if available
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }

      setIsEditingConversation(false);
    } catch (error) {
      console.error('Error saving conversation:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    {
      id: 'analytics' as SidebarTab,
      icon: BarChart3,
      label: 'Analytics',
      color: 'text-tactical-gold',
      bgColor: 'bg-tactical-gold-muted',
      count: null
    },
    {
      id: 'insights' as SidebarTab,
      icon: Lightbulb,
      label: 'Insights',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      count: conversation.nextActions?.length || 0
    },
    {
      id: 'schedule' as SidebarTab,
      icon: Calendar,
      label: 'Schedule',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      count: null
    },
    {
      id: 'billing' as SidebarTab,
      icon: Receipt,
      label: 'Billing',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      count: null
    }
  ];

  const handleTabClick = (tabId: SidebarTab) => {
    if (activeTab === tabId) {
      setActiveTab(null);
      setIsExpanded(false);
      onStateChange?.(false, 0);
    } else {
      setActiveTab(tabId);
      setIsExpanded(true);
      const width = isMobile ? 384 : 448; // 96 (w-96) or 112 (w-112) in pixels
      onStateChange?.(true, width);
    }
  };

  const renderTabContent = () => {
    if (!activeTab) return null;

    switch (activeTab) {
      case 'conversation':
        return (
          <div className="p-6 space-y-6">
            {/* Conversation Title & Source */}
            <div className="neo-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">
                  {getSourceIcon(conversationSource)}
                </div>
                <div className="min-w-0 flex-1">
                  {/* Editable Title */}
                  {isEditingConversation ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="neo-input w-full text-sm font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide mb-2"
                      placeholder="Conversation Title"
                    />
                  ) : (
                    <h3
                      className="text-lg font-bold text-[var(--neomorphic-text)] font-primary uppercase tracking-wide break-words mb-2 cursor-pointer hover:opacity-70 transition-opacity"
                      onClick={() => setIsEditingConversation(true)}
                      title="Click to edit"
                    >
                      {(conversation?.title || conversationSource || 'Conversation').toUpperCase()}
                    </h3>
                  )}

                  {/* Client Selector/Link */}
                  {isEditingConversation ? (
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide">
                        Assigned Client
                      </label>
                      <select
                        value={editedClientId}
                        onChange={(e) => setEditedClientId(e.target.value)}
                        className="neo-input w-full text-xs font-primary uppercase"
                      >
                        <option value="">-- Select Client --</option>
                        {allClients.map((clientOption) => (
                          <option key={clientOption.id} value={clientOption.id}>
                            {clientOption.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : client ? (
                    <div
                      className="text-sm text-[var(--neomorphic-accent)] hover:opacity-80 transition-opacity uppercase inline-flex items-center gap-1 cursor-pointer"
                      onClick={() => setIsEditingConversation(true)}
                      title="Click to change client"
                    >
                      <span>Client:</span>
                      <span className="font-bold">{client.name}</span>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-[var(--neomorphic-icon)] hover:opacity-80 transition-opacity uppercase inline-flex items-center gap-1 cursor-pointer"
                      onClick={() => setIsEditingConversation(true)}
                      title="Click to assign client"
                    >
                      <span>No Client Assigned</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-[var(--neomorphic-icon)] font-primary uppercase pt-3 border-t border-[var(--neomorphic-dark-shadow)]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>{conversation?.messages?.length || 0} Messages</span>
                </div>
                <span>•</span>
                <span>
                  {conversation?.updatedAt
                    ? new Date(conversation.updatedAt).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Master Timeline Button */}
              {client && !isMasterTimeline && (
                <Link
                  href={`/clients/${client.id}/master`}
                  className="neo-button-active w-full px-4 py-3 text-sm font-primary uppercase tracking-wide flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                  title="View Master Timeline"
                >
                  <History className="w-4 h-4" />
                  <span>View Master Timeline</span>
                </Link>
              )}

              {/* Editable Priority */}
              <div className="neo-card p-4">
                <div className="text-xs text-[var(--neomorphic-icon)] font-primary uppercase tracking-wide mb-2">
                  Priority Level
                </div>
                {isEditingConversation ? (
                  <select
                    value={editedPriority}
                    onChange={(e) => setEditedPriority(e.target.value)}
                    className="neo-input w-full text-sm font-bold font-primary uppercase tracking-wide"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <div
                    className={`neo-badge px-4 py-2 text-sm font-bold font-primary uppercase tracking-wide text-center cursor-pointer hover:opacity-80 transition-opacity ${getPriorityColor(conversation?.priority || 'MEDIUM')}`}
                    onClick={() => setIsEditingConversation(true)}
                    title="Click to edit"
                  >
                    {(conversation?.priority || 'MEDIUM').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Edit Button */}
              {!isEditingConversation && (
                <button
                  onClick={() => setIsEditingConversation(true)}
                  className="neo-button w-full px-4 py-3 text-sm font-primary uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Edit Conversation</span>
                </button>
              )}

              {/* Save Button (only when editing and has changes) */}
              {isEditingConversation && (
                <button
                  onClick={handleSaveConversation}
                  disabled={!hasChanges || isSaving}
                  className={`neo-button w-full px-4 py-3 text-sm font-primary uppercase tracking-wide flex items-center justify-center gap-2 ${
                    !hasChanges || isSaving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Pencil className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              )}

              {/* Cancel Button (only when editing) */}
              {isEditingConversation && (
                <button
                  onClick={() => {
                    setIsEditingConversation(false);
                    setEditedTitle(conversation?.title || '');
                    setEditedPriority(conversation?.priority || 'MEDIUM');
                    setEditedClientId(conversation?.clientId || '');
                    setSelectedMessageIds(new Set());
                  }}
                  className="neo-button-sm w-full px-4 py-2 text-xs font-primary uppercase tracking-wide"
                >
                  Cancel
                </button>
              )}

              {/* Message Selection (only when editing) */}
              {isEditingConversation && conversation?.messages && conversation.messages.length > 0 && (
                <div className="neo-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs text-[var(--neomorphic-text)] font-primary uppercase tracking-wide font-bold">
                      Select Messages
                    </h4>
                    <button
                      onClick={() => {
                        if (selectedMessageIds.size === conversation.messages.length) {
                          setSelectedMessageIds(new Set());
                        } else {
                          setSelectedMessageIds(new Set(conversation.messages.map(m => m.id)));
                        }
                      }}
                      className="text-xs text-[var(--neomorphic-accent)] hover:opacity-80 transition-opacity"
                    >
                      {selectedMessageIds.size === conversation.messages.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {conversation.messages.map((message) => (
                      <label
                        key={message.id}
                        className="flex items-start gap-2 p-2 neo-inset rounded cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMessageIds.has(message.id)}
                          onChange={(e) => {
                            const newSet = new Set(selectedMessageIds);
                            if (e.target.checked) {
                              newSet.add(message.id);
                            } else {
                              newSet.delete(message.id);
                            }
                            setSelectedMessageIds(newSet);
                          }}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-[var(--neomorphic-text)] font-bold">
                            {message.role === 'CLIENT' ? client?.name || 'Client' : 'You'}
                          </div>
                          <div className="text-xs text-[var(--neomorphic-icon)] truncate">
                            {message.content.substring(0, 60)}{message.content.length > 60 ? '...' : ''}
                          </div>
                          <div className="text-[10px] text-[var(--neomorphic-icon)] opacity-70">
                            {new Date(message.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedMessageIds.size > 0 && (
                    <div className="text-xs text-[var(--neomorphic-accent)] font-primary uppercase">
                      {selectedMessageIds.size} message{selectedMessageIds.size !== 1 ? 's' : ''} selected
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      case 'draft':
        // Use MasterTimelineDraftAI for master timeline, otherwise use regular SidebarDraftAI
        if (isMasterTimeline) {
          return (
            <MasterTimelineDraftAI
              conversations={allConversations}
              allMessages={allMessages}
              client={client}
              selectedMessage={selectedMessage}
              onMessageSent={() => {
                onRefresh?.();
              }}
            />
          );
        }
        return (
          <SidebarDraftAI
            conversation={conversation}
            client={client}
            conversationId={conversationId}
            selectedMessageId={selectedMessageId}
            onSelectMessage={onSelectMessage}
          />
        );
      case 'analytics':
        return (
          <SidebarAnalytics
            conversation={conversation}
            client={client}
          />
        );
      case 'insights':
        return (
          <SidebarInsights
            conversation={conversation}
            client={client}
            onRequestTestimonial={onTestimonialClick}
          />
        );
      case 'schedule':
        return (
          <SidebarSchedule
            conversation={conversation}
            client={client}
          />
        );
      case 'billing':
        return (
          <SidebarBilling
            conversation={conversation}
            client={client}
            onAutoDetails={onAutoDetails}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Primary Navigation Sidebar - Fixed on right */}
      <div
        className={`
          fixed right-0 z-40
          neo-sidebar
          w-16
          ${isMobile && activeTab ? 'shadow-2xl' : ''}
          transition-all duration-300 ease-in-out
          flex flex-col
          ${className}
        `}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`
        }}
      >
        {/* Collapse Toggle - Always at Top */}
        <div className="p-2 border-b border-b-[var(--neomorphic-dark-shadow)] flex justify-center">
          <button
            onClick={() => {
              if (isExpanded) {
                setIsExpanded(false);
                setActiveTab(null);
                onStateChange?.(false, 0);
              } else {
                const tabToOpen = activeTab || 'analytics';
                setActiveTab(tabToOpen as SidebarTab);
                setIsExpanded(true);
                const width = isMobile ? 384 : 448;
                onStateChange?.(true, width);
              }
            }}
            className="neo-button-sm p-3 w-12 h-12 flex items-center justify-center transition-all duration-200"
            title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
          >
            {isExpanded ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Top Action Buttons */}
        <div className="p-2 space-y-2">
          {/* Draft AI Button */}
          <button
            onClick={() => handleTabClick('draft')}
            className={`w-full p-3 flex items-center justify-center transition-all duration-200 ${
              activeTab === 'draft' ? 'neo-nav-button-active border-l-4 border-[var(--neomorphic-accent)]' : 'neo-nav-button'
            }`}
            title="Draft with AI"
          >
            <MessageSquare className="w-5 h-5 text-[var(--neomorphic-text)]" />
          </button>

          {/* Conversation Info Button */}
          <button
            onClick={() => handleTabClick('conversation')}
            className={`w-full p-3 flex items-center justify-center transition-all duration-200 ${
              activeTab === 'conversation' ? 'neo-nav-button-active border-l-4 border-[var(--neomorphic-accent)]' : 'neo-nav-button'
            }`}
            title="Conversation Details"
          >
            <Info className="w-5 h-5 text-[var(--neomorphic-text)]" />
          </button>

          {/* Request Testimonial Button */}
          {onTestimonialClick && (
            <button
              onClick={onTestimonialClick}
              className="w-full p-3 flex items-center justify-center transition-all duration-200 neo-nav-button"
              title="Request Testimonial"
            >
              <Star className="w-5 h-5 text-[var(--neomorphic-text)]" />
            </button>
          )}
        </div>

        {/* Quick Actions - Divider */}
        <div className="px-2">
          <div className="border-t border-[var(--neomorphic-dark-shadow)]" />
        </div>

        {/* Quick Actions Buttons */}
        <div className="p-2 space-y-2">
          {/* Message Client */}
          {onMessageClient && (
            <button
              onClick={onMessageClient}
              className="w-full p-3 flex items-center justify-center transition-all duration-200 neo-nav-button"
              title="Add incoming message from client"
            >
              <MessageSquare className="w-5 h-5 text-[var(--neomorphic-text)]" />
            </button>
          )}

          {/* Schedule Service */}
          {onScheduleService && (
            <button
              onClick={onScheduleService}
              className="w-full p-3 flex items-center justify-center transition-all duration-200 neo-nav-button"
              title="Schedule appointment or service"
            >
              <Calendar className="w-5 h-5 text-[var(--neomorphic-text)]" />
            </button>
          )}

          {/* Create Receipt */}
          {onCreateReceipt && (
            <button
              onClick={onCreateReceipt}
              className="w-full p-3 flex items-center justify-center transition-all duration-200 neo-nav-button"
              title="Create receipt or invoice"
            >
              <Receipt className="w-5 h-5 text-[var(--neomorphic-text)]" />
            </button>
          )}

          {/* Add Note */}
          {onAddNote && (
            <button
              onClick={onAddNote}
              className="w-full p-3 flex items-center justify-center transition-all duration-200 neo-nav-button"
              title="Add note or memo"
            >
              <StickyNote className="w-5 h-5 text-[var(--neomorphic-text)]" />
            </button>
          )}
        </div>

        {/* Tab Navigation - Divider */}
        <div className="px-2">
          <div className="border-t border-[var(--neomorphic-dark-shadow)]" />
        </div>

        {/* Tab Navigation */}
        <div className="flex-1 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  w-full p-3 mb-2 flex flex-col items-center justify-center
                  group relative transition-all duration-200
                  ${isActive ?
                    'neo-nav-button-active border-l-4 border-[var(--neomorphic-accent)]' :
                    'neo-nav-button'
                  }
                `}
                title={tab.label}
              >
                <Icon className={`w-5 h-5 mb-1 ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span className="text-xs font-primary uppercase tracking-wide">
                  {tab.label.slice(0, 3)}
                </span>

                {/* Count Badge */}
                {tab.count !== null && tab.count > 0 && (
                  <div className={`
                    absolute -top-1 -right-1 w-5 h-5 rounded-full
                    flex items-center justify-center text-xs font-bold
                    ${isActive ? 'neo-badge-accent' : 'neo-badge'}
                  `}>
                    {tab.count > 99 ? '99+' : tab.count}
                  </div>
                )}

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-[var(--neomorphic-accent)] rounded-l-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contextual Content Panel - Positioned to left of action buttons */}
      <div
        className={`
          fixed z-40
          neo-container border-r border-r-[var(--neomorphic-dark-shadow)]
          bg-[var(--neomorphic-bg)]
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded && activeTab ?
            (isMobile ? 'w-96' : 'w-[28rem]') :
            'w-0'
          }
          ${isMobile ? 'shadow-2xl' : ''}
        `}
        style={{
          top: `${headerHeight}px`,
          height: `calc(100vh - ${headerHeight}px)`,
          right: '64px' // Position to left of 64px (w-16) action buttons
        }}
      >
        {activeTab && (
          <div className="h-full flex flex-col">
            {/* Panel Header */}
            <div className="p-4 border-b border-b-[var(--neomorphic-dark-shadow)] bg-[var(--neomorphic-bg)] flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {(() => {
                  const tab = tabs.find(t => t.id === activeTab);
                  if (!tab) return null;
                  const Icon = tab.icon;
                  return (
                    <>
                      <div className="neo-button-circle w-10 h-10 p-2 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-[var(--neomorphic-text)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-primary font-bold text-[var(--neomorphic-text)] uppercase tracking-wide">
                          {tab.label}
                        </h2>
                        <p className="text-xs text-[var(--neomorphic-icon)]">
                          {client.name}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto bg-[var(--neomorphic-bg)]">
              {renderTabContent()}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isMobile && activeTab && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setActiveTab(null);
            setIsExpanded(false);
            onStateChange?.(false, 0);
          }}
        />
      )}
    </>
  );
}