"use client";

import { useState, useMemo } from 'react';
import { Calendar, Clock, Plus, Video, Phone, Coffee, Users, MapPin, Bell } from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';
import { Button } from './ui/button';

interface SidebarScheduleProps {
  conversation?: Conversation;
  client: Client;
}

interface SchedulingSuggestion {
  type: 'followup' | 'meeting' | 'deadline' | 'reminder';
  title: string;
  description: string;
  suggestedDate: Date;
  duration?: number;
  meetingType?: 'video' | 'phone' | 'in-person';
  priority: 'high' | 'medium' | 'low';
  confidence: 'high' | 'medium' | 'low';
}

export default function SidebarSchedule({ conversation, client }: SidebarScheduleProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<SchedulingSuggestion | null>(null);
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);

  const schedulingSuggestions = useMemo((): SchedulingSuggestion[] => {
    const messages = conversation?.messages || [];
    const suggestions: SchedulingSuggestion[] = [];
    const now = new Date();

    // Analyze last message for follow-up timing
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'client') {
      const daysSinceLastMessage = (now.getTime() - new Date(lastMessage.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceLastMessage > 3) {
        suggestions.push({
          type: 'followup',
          title: 'Follow-up Check-in',
          description: `It's been ${Math.floor(daysSinceLastMessage)} days since last client message. Consider a follow-up.`,
          suggestedDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          duration: 30,
          meetingType: 'phone',
          priority: 'medium',
          confidence: 'high'
        });
      }
    }

    // Look for meeting requests or scheduling mentions
    const schedulingKeywords = ['meet', 'call', 'schedule', 'appointment', 'available', 'free', 'when'];
    const schedulingMessages = messages.filter(m => 
      schedulingKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
    );

    if (schedulingMessages.length > 0) {
      const latestSchedulingMessage = schedulingMessages[schedulingMessages.length - 1];
      suggestions.push({
        type: 'meeting',
        title: 'Client Meeting Request',
        description: 'Client has mentioned scheduling or availability. Propose meeting times.',
        suggestedDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        duration: 60,
        meetingType: 'video',
        priority: 'high',
        confidence: 'high'
      });
    }

    // Analyze urgency for quick response
    const urgentMessages = messages.filter(m => m.metadata?.urgency === 'urgent');
    if (urgentMessages.length > 0) {
      const recentUrgent = urgentMessages.filter(m => {
        const hoursSince = (now.getTime() - new Date(m.timestamp).getTime()) / (1000 * 60 * 60);
        return hoursSince < 4;
      });

      if (recentUrgent.length > 0) {
        suggestions.push({
          type: 'reminder',
          title: 'Urgent Response Reminder',
          description: 'Urgent messages require immediate attention. Schedule response time.',
          suggestedDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
          duration: 15,
          priority: 'high',
          confidence: 'high'
        });
      }
    }

    // Project deadline suggestions based on conversation content
    const deadlineKeywords = ['deadline', 'due', 'deliver', 'complete', 'finish', 'ready'];
    const deadlineMessages = messages.filter(m => 
      deadlineKeywords.some(keyword => m.content.toLowerCase().includes(keyword))
    );

    if (deadlineMessages.length > 0) {
      suggestions.push({
        type: 'deadline',
        title: 'Project Deadline Planning',
        description: 'Conversation mentions deadlines. Schedule planning session to align on timelines.',
        suggestedDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        duration: 45,
        meetingType: 'video',
        priority: 'medium',
        confidence: 'medium'
      });
    }

    // Regular client relationship maintenance
    const messageAge = messages.length > 0 
      ? (now.getTime() - new Date(messages[0].timestamp).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    if (messageAge > 30 && !suggestions.some(s => s.type === 'followup')) {
      suggestions.push({
        type: 'followup',
        title: 'Relationship Check-in',
        description: 'Monthly relationship maintenance call to ensure ongoing satisfaction.',
        suggestedDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        duration: 30,
        meetingType: 'video',
        priority: 'low',
        confidence: 'medium'
      });
    }

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [conversation, client]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSuggestionIcon = (type: SchedulingSuggestion['type']) => {
    switch (type) {
      case 'meeting':
        return <Users className="w-4 h-4" />;
      case 'followup':
        return <Phone className="w-4 h-4" />;
      case 'deadline':
        return <Clock className="w-4 h-4" />;
      case 'reminder':
        return <Bell className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getMeetingTypeIcon = (type?: SchedulingSuggestion['meetingType']) => {
    switch (type) {
      case 'video':
        return <Video className="w-3 h-3" />;
      case 'phone':
        return <Phone className="w-3 h-3" />;
      case 'in-person':
        return <MapPin className="w-3 h-3" />;
      default:
        return <Calendar className="w-3 h-3" />;
    }
  };

  const getSuggestionColors = (type: SchedulingSuggestion['type']) => {
    switch (type) {
      case 'meeting':
        return {
          bg: 'bg-tactical-gold-muted',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-brown-dark'
        };
      case 'followup':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700'
        };
      case 'deadline':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-700'
        };
      case 'reminder':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700'
        };
      default:
        return {
          bg: 'bg-tactical-grey-100',
          border: 'border-tactical-grey-300',
          text: 'text-tactical-grey-600'
        };
    }
  };

  const getPriorityBadge = (priority: SchedulingSuggestion['priority']) => {
    const configs = {
      high: { bg: 'bg-red-100', text: 'text-red-800', label: 'HIGH' },
      medium: { bg: 'bg-tactical-gold-light', text: 'text-hud-text-primary', label: 'MED' },
      low: { bg: 'bg-tactical-grey-200', text: 'text-tactical-grey-500', label: 'LOW' }
    };
    
    const config = configs[priority];
    return (
      <span className={`px-2 py-1 text-xs font-bold font-primary uppercase tracking-wide ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide">
          Schedule
        </h3>
        <Button 
          size="sm" 
          onClick={() => setShowQuickSchedule(!showQuickSchedule)}
          className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary"
        >
          <Plus className="w-3 h-3 mr-1" />
          Quick Schedule
        </Button>
      </div>

      {/* Quick Schedule Form */}
      {showQuickSchedule && (
        <div className="p-3 bg-hud-background-secondary border-2 border-hud-border-accent">
          <h4 className="font-primary font-bold text-sm text-hud-text-primary mb-3 uppercase tracking-wide">
            Quick Schedule
          </h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" className="text-xs">
                <Video className="w-3 h-3 mr-1" />
                Video Call
              </Button>
              <Button size="sm" variant="outline" className="text-xs">
                <Phone className="w-3 h-3 mr-1" />
                Phone Call
              </Button>
              <Button size="sm" variant="outline" className="text-xs">
                <Coffee className="w-3 h-3 mr-1" />
                Coffee
              </Button>
            </div>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Meeting title"
                className="w-full p-2 text-sm border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className="p-2 text-sm border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold"
                />
                <input
                  type="time"
                  className="p-2 text-sm border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold"
                />
              </div>
              
              <select className="w-full p-2 text-sm border border-hud-border focus:border-hud-border-accent focus:ring-1 focus:ring-gold">
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
              </select>
            </div>
            
            <div className="flex space-x-2">
              <Button size="sm" className="bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary">
                Schedule
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowQuickSchedule(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Scheduling Suggestions */}
      <div className="space-y-3">
        <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          AI Scheduling Suggestions
        </h4>
        
        {schedulingSuggestions.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 text-medium-grey mx-auto mb-3" />
            <p className="text-sm text-medium-grey font-primary">
              No scheduling suggestions at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedulingSuggestions.map((suggestion, index) => {
              const colors = getSuggestionColors(suggestion.type);
              const isSelected = selectedSuggestion === suggestion;
              
              return (
                <div
                  key={index}
                  className={`border-2 ${colors.border} ${colors.bg} cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    isSelected ? 'ring-2 ring-gold' : ''
                  }`}
                  onClick={() => setSelectedSuggestion(isSelected ? null : suggestion)}
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={colors.text}>
                          {getSuggestionIcon(suggestion.type)}
                        </div>
                        <h5 className={`font-primary font-bold text-sm ${colors.text}`}>
                          {suggestion.title}
                        </h5>
                      </div>
                      {getPriorityBadge(suggestion.priority)}
                    </div>
                    
                    <p className={`text-sm ${colors.text} mb-3 leading-relaxed`}>
                      {suggestion.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-medium-grey" />
                          <span className="font-primary">
                            {formatDate(suggestion.suggestedDate)}
                          </span>
                        </div>
                        
                        {suggestion.duration && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-medium-grey" />
                            <span className="font-primary">
                              {suggestion.duration}m
                            </span>
                          </div>
                        )}
                        
                        {suggestion.meetingType && (
                          <div className="flex items-center space-x-1">
                            {getMeetingTypeIcon(suggestion.meetingType)}
                            <span className="font-primary capitalize">
                              {suggestion.meetingType.replace('-', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <span className={`text-xs px-2 py-1 font-primary ${
                        suggestion.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        suggestion.confidence === 'medium' ? 'bg-tactical-gold-light text-hud-text-primary' :
                        'bg-tactical-grey-200 text-tactical-grey-500'
                      }`}>
                        {suggestion.confidence} confidence
                      </span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="border-t border-current border-opacity-20 p-3 bg-white bg-opacity-50">
                      <div className="space-y-2">
                        <h6 className="text-xs font-primary font-bold uppercase tracking-wide text-hud-text-primary">
                          Quick Actions
                        </h6>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Add to Calendar
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs">
                            <Bell className="w-3 h-3 mr-1" />
                            Set Reminder
                          </Button>
                        </div>
                        
                        <Button size="sm" className="w-full bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary text-xs">
                          Send Meeting Request
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Items */}
      <div className="space-y-3">
        <h4 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Upcoming
        </h4>
        
        <div className="p-3 bg-light-grey border border-medium-grey text-center">
          <Clock className="w-8 h-8 text-medium-grey mx-auto mb-2" />
          <p className="text-sm text-medium-grey font-primary">
            No upcoming scheduled items
          </p>
          <p className="text-xs text-medium-grey mt-1">
            Schedule meetings to see them here
          </p>
        </div>
      </div>
    </div>
  );
}