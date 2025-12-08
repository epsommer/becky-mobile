"use client";

import { useMemo } from 'react';
import { Clock, MessageCircle, TrendingUp, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Conversation, Client, Message } from '../types/client';

interface SidebarAnalyticsProps {
  conversation: Conversation;
  client: Client;
}

export default function SidebarAnalytics({ conversation, client }: SidebarAnalyticsProps) {
  const analytics = useMemo(() => {
    const messages = conversation.messages || [];

    // Debug logging
    console.log('SidebarAnalytics - Total messages:', messages.length);
    console.log('SidebarAnalytics - Message roles:', messages.map(m => ({ role: m.role, timestamp: m.timestamp })));

    // Response time analysis - Enhanced to handle bidirectional communication
    const yourResponseTimes: number[] = [];
    const clientResponseTimes: number[] = [];
    let lastClientMessage: Message | null = null;
    let lastYourMessage: Message | null = null;

    // Sort messages by timestamp to ensure proper order
    const sortedMessages = [...messages].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log('SidebarAnalytics - Sorted messages:', sortedMessages.length);

    sortedMessages.forEach((message, index) => {
      const timestamp = new Date(message.timestamp).getTime();
      const role = message.role?.toLowerCase(); // Handle case-insensitive roles

      console.log(`Message ${index}: role="${message.role}" (normalized: "${role}"), timestamp=${message.timestamp}`);

      if (role === 'client') {
        // Calculate how long client took to respond to you
        if (lastYourMessage) {
          const responseTime = timestamp - new Date(lastYourMessage.timestamp).getTime();
          const responseMinutes = responseTime / (1000 * 60);
          clientResponseTimes.push(responseMinutes);
          console.log(`  -> Client responded in ${responseMinutes.toFixed(2)} minutes`);
        }
        lastClientMessage = message;
      } else if (role === 'you') {
        // Calculate how long you took to respond to client
        if (lastClientMessage) {
          const responseTime = timestamp - new Date(lastClientMessage.timestamp).getTime();
          const responseMinutes = responseTime / (1000 * 60);
          yourResponseTimes.push(responseMinutes);
          console.log(`  -> You responded in ${responseMinutes.toFixed(2)} minutes`);
        }
        lastYourMessage = message;
      }
    });

    console.log('SidebarAnalytics - Your response times:', yourResponseTimes);
    console.log('SidebarAnalytics - Client response times:', clientResponseTimes);

    // Calculate average response times
    const avgYourResponseTime = yourResponseTimes.length > 0
      ? yourResponseTimes.reduce((a, b) => a + b, 0) / yourResponseTimes.length
      : 0;

    const avgClientResponseTime = clientResponseTimes.length > 0
      ? clientResponseTimes.reduce((a, b) => a + b, 0) / clientResponseTimes.length
      : 0;

    // Get fastest and slowest response times
    const fastestYourResponse = yourResponseTimes.length > 0 ? Math.min(...yourResponseTimes) : null;
    const slowestYourResponse = yourResponseTimes.length > 0 ? Math.max(...yourResponseTimes) : null;
    const fastestClientResponse = clientResponseTimes.length > 0 ? Math.min(...clientResponseTimes) : null;
    const slowestClientResponse = clientResponseTimes.length > 0 ? Math.max(...clientResponseTimes) : null;

    // Message analysis - case-insensitive
    const clientMessages = messages.filter(m => m.role?.toLowerCase() === 'client');
    const yourMessages = messages.filter(m => m.role?.toLowerCase() === 'you');

    // Urgency analysis
    const urgentMessages = messages.filter(m => m.metadata?.urgency === 'urgent').length;
    const highPriorityMessages = messages.filter(m => m.metadata?.urgency === 'high').length;

    // Time analysis
    const firstMessage = sortedMessages[0];
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const conversationDuration = firstMessage && lastMessage
      ? new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()
      : 0;

    const conversationDays = conversationDuration > 0
      ? Math.max(1, Math.ceil(conversationDuration / (1000 * 60 * 60 * 24)))
      : 0;

    // Activity patterns
    const messagesByHour = messages.reduce((acc, message) => {
      const hour = new Date(message.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(messagesByHour)
      .reduce((max, [hour, count]) => count > max.count ? { hour: parseInt(hour), count } : max, { hour: 0, count: 0 });

    // Calculate response rate (percentage of client messages that got a response)
    const responseRate = clientMessages.length > 0
      ? (yourResponseTimes.length / clientMessages.length) * 100
      : 0;

    return {
      totalMessages: messages.length,
      clientMessages: clientMessages.length,
      yourMessages: yourMessages.length,
      avgYourResponseTime,
      avgClientResponseTime,
      fastestYourResponse,
      slowestYourResponse,
      fastestClientResponse,
      slowestClientResponse,
      yourResponseCount: yourResponseTimes.length,
      clientResponseCount: clientResponseTimes.length,
      responseRate,
      urgentMessages,
      highPriorityMessages,
      conversationDays,
      peakHour: peakHour.hour,
      messagesByHour,
      yourResponseTimes,
      clientResponseTimes
    };
  }, [conversation]);

  const formatResponseTime = (minutes: number | null) => {
    if (minutes === null) return 'N/A';

    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) { // Less than 24 hours
      const hours = Math.round(minutes / 60);
      return `${hours}h`;
    } else {
      const days = Math.round(minutes / 1440);
      return `${days}d`;
    }
  };

  const getResponseTimeColor = (minutes: number | null) => {
    if (minutes === null) return 'text-medium-grey';
    if (minutes < 60) return 'text-green-600'; // Under 1 hour
    if (minutes < 1440) return 'text-gold'; // Under 24 hours
    return 'text-red-600'; // Over 24 hours
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour < 12) return `${hour}am`;
    if (hour === 12) return '12pm';
    return `${hour - 12}pm`;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-hud-background-secondary border border-hud-border">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-5 h-5 text-gold" />
            <span className="text-xs font-primary uppercase tracking-wide text-medium-grey">
              Total
            </span>
          </div>
          <div className="text-2xl font-bold text-hud-text-primary font-primary">
            {analytics.totalMessages}
          </div>
          <div className="text-xs text-medium-grey">Messages</div>
        </div>

        <div className="p-3 bg-hud-background-secondary border border-hud-border">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-tactical-gold" />
            <span className="text-xs font-primary uppercase tracking-wide text-medium-grey">
              Your Response
            </span>
          </div>
          <div className={`text-2xl font-bold font-primary ${getResponseTimeColor(analytics.avgYourResponseTime)}`}>
            {formatResponseTime(analytics.avgYourResponseTime)}
          </div>
          <div className="text-xs text-medium-grey">Average Time</div>
        </div>

        <div className="p-3 bg-hud-background-secondary border border-hud-border">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span className="text-xs font-primary uppercase tracking-wide text-medium-grey">
              Engagement
            </span>
          </div>
          <div className="text-2xl font-bold text-hud-text-primary font-primary">
            {Math.round((analytics.clientMessages / analytics.totalMessages) * 100)}%
          </div>
          <div className="text-xs text-medium-grey">Client Messages</div>
        </div>

        <div className="p-3 bg-hud-background-secondary border border-hud-border">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-xs font-primary uppercase tracking-wide text-medium-grey">
              Duration
            </span>
          </div>
          <div className="text-2xl font-bold text-hud-text-primary font-primary">
            {analytics.conversationDays}
          </div>
          <div className="text-xs text-medium-grey">Days Active</div>
        </div>
      </div>

      {/* Response Time Details */}
      <div className="space-y-3">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Response Time Analysis
        </h3>

        {/* Your Response Times */}
        <div className="space-y-2">
          <div className="text-xs font-primary uppercase tracking-wide text-medium-grey mb-1">
            Your Responses ({analytics.yourResponseCount})
          </div>

          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-primary">Fastest</span>
            </div>
            <span className="text-sm font-bold text-green-600">
              {formatResponseTime(analytics.fastestYourResponse)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-tactical-gold-muted border border-tactical-gold">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-tactical-gold" />
              <span className="text-sm font-primary">Average</span>
            </div>
            <span className={`text-sm font-bold ${getResponseTimeColor(analytics.avgYourResponseTime)}`}>
              {formatResponseTime(analytics.avgYourResponseTime)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-primary">Slowest</span>
            </div>
            <span className="text-sm font-bold text-red-600">
              {formatResponseTime(analytics.slowestYourResponse)}
            </span>
          </div>
        </div>

        {/* Client Response Times */}
        {analytics.clientResponseCount > 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-xs font-primary uppercase tracking-wide text-medium-grey mb-1">
              Client Responses ({analytics.clientResponseCount})
            </div>

            <div className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-primary">Average</span>
              </div>
              <span className={`text-sm font-bold ${getResponseTimeColor(analytics.avgClientResponseTime)}`}>
                {formatResponseTime(analytics.avgClientResponseTime)}
              </span>
            </div>
          </div>
        )}

        {/* Response Rate */}
        <div className="p-2 bg-blue-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-primary text-blue-800">Response Rate</span>
            <span className="text-sm font-bold text-blue-800">
              {Math.round(analytics.responseRate)}%
            </span>
          </div>
        </div>
      </div>

      {/* Message Breakdown */}
      <div className="space-y-3">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Message Breakdown
        </h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-medium-grey">You</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-light-grey rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tactical-gold"
                  style={{ 
                    width: `${(analytics.yourMessages / analytics.totalMessages) * 100}%` 
                  }}
                />
              </div>
              <span className="text-sm font-bold text-hud-text-primary min-w-[2rem]">
                {analytics.yourMessages}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-medium-grey">{client.name}</span>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-light-grey rounded-full overflow-hidden">
                <div 
                  className="h-full bg-tactical-gold-muted0"
                  style={{ 
                    width: `${(analytics.clientMessages / analytics.totalMessages) * 100}%` 
                  }}
                />
              </div>
              <span className="text-sm font-bold text-hud-text-primary min-w-[2rem]">
                {analytics.clientMessages}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Messages */}
      {(analytics.urgentMessages > 0 || analytics.highPriorityMessages > 0) && (
        <div className="space-y-3">
          <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
            Priority Messages
          </h3>
          
          <div className="space-y-2">
            {analytics.urgentMessages > 0 && (
              <div className="flex items-center justify-between p-2 bg-red-50 border border-red-200">
                <span className="text-sm font-primary text-red-800">Urgent</span>
                <span className="text-sm font-bold text-red-800">
                  {analytics.urgentMessages}
                </span>
              </div>
            )}
            
            {analytics.highPriorityMessages > 0 && (
              <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200">
                <span className="text-sm font-primary text-orange-800">High Priority</span>
                <span className="text-sm font-bold text-orange-800">
                  {analytics.highPriorityMessages}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Pattern */}
      <div className="space-y-3">
        <h3 className="font-primary font-bold text-hud-text-primary uppercase tracking-wide text-sm">
          Activity Pattern
        </h3>
        
        <div className="p-3 bg-hud-background-secondary border border-hud-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-medium-grey">Peak Activity</span>
            <span className="text-sm font-bold text-hud-text-primary">
              {formatHour(analytics.peakHour)}
            </span>
          </div>
          
          {/* Simple activity visualization */}
          <div className="grid grid-cols-12 gap-1 mt-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const count = analytics.messagesByHour[hour] || 0;
              const maxCount = Math.max(...Object.values(analytics.messagesByHour));
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div
                  key={hour}
                  className="bg-light-grey rounded-sm relative"
                  style={{ height: '20px' }}
                  title={`${formatHour(hour)}: ${count} messages`}
                >
                  <div
                    className="bg-tactical-gold absolute bottom-0 w-full rounded-sm"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            }).slice(0, 12)}
          </div>
          <div className="text-xs text-medium-grey mt-1 text-center">
            24-hour activity pattern
          </div>
        </div>
      </div>
    </div>
  );
}