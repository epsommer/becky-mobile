"use client";

import React, { useState, useEffect } from 'react';
import { X, Activity, Clock, User, FileText, MessageSquare, Receipt, GitBranch, Rocket } from 'lucide-react';
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock';

interface ActivityLogItem {
  id: string;
  activityType: string;
  action: string;
  entityType: string;
  entityId?: string;
  clientId?: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
  userName?: string;
  userRole?: string;
  deploymentInfo?: Record<string, any>;
  createdAt: string;
}

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'CLIENT_UPDATE':
      return <User className="w-4 h-4" />;
    case 'NOTE_CREATED':
      return <FileText className="w-4 h-4" />;
    case 'TESTIMONIAL_RECEIVED':
      return <MessageSquare className="w-4 h-4" />;
    case 'APPOINTMENT_SCHEDULED':
    case 'APPOINTMENT_UPDATED':
      return <Clock className="w-4 h-4" />;
    case 'RECEIPT_CREATED':
    case 'INVOICE_CREATED':
    case 'QUOTE_CREATED':
      return <Receipt className="w-4 h-4" />;
    case 'DEPLOYMENT':
      return <Rocket className="w-4 h-4" />;
    case 'GIT_PUSH':
      return <GitBranch className="w-4 h-4" />;
    case 'TIME_TRACKED':
      return <Clock className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActivityColor = (activityType: string) => {
  switch (activityType) {
    case 'CLIENT_UPDATE':
      return 'text-blue-600';
    case 'NOTE_CREATED':
      return 'text-purple-600';
    case 'TESTIMONIAL_RECEIVED':
      return 'text-green-600';
    case 'APPOINTMENT_SCHEDULED':
    case 'APPOINTMENT_UPDATED':
      return 'text-orange-600';
    case 'RECEIPT_CREATED':
    case 'INVOICE_CREATED':
    case 'QUOTE_CREATED':
      return 'text-emerald-600';
    case 'DEPLOYMENT':
      return 'text-pink-600';
    case 'GIT_PUSH':
      return 'text-indigo-600';
    case 'TIME_TRACKED':
      return 'text-teal-600';
    default:
      return 'text-gray-600';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const [activities, setActivities] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      lockScroll();
      loadActivities();
    } else {
      unlockScroll();
    }

    return () => {
      unlockScroll();
    };
  }, [isOpen]);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/activity-log?limit=50');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        console.error('Failed to fetch activities');
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayedActivities = showAll ? activities : activities.slice(0, 10);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[100] p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="neo-container max-w-3xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] my-8 sm:my-12 md:my-16 overflow-y-auto">
        {/* Header */}
        <div className="neo-inset border-b border-foreground/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-foreground" />
              <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                Activity Log
              </h2>
            </div>
            <button
              onClick={onClose}
              className="neo-icon-button transition-transform hover:scale-[1.1]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-2 font-primary">
            Recent activity across your CRM
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              <p className="text-muted-foreground mt-4 font-primary">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground font-primary">No activities yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="neo-inset p-4 transition-transform hover:scale-[1.01]"
                >
                  <div className="flex items-start gap-4">
                    <div className={`neo-container p-2 rounded-lg ${getActivityColor(activity.activityType)}`}>
                      {getActivityIcon(activity.activityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground font-primary">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-primary">
                        <span>{formatTimeAgo(activity.createdAt)}</span>
                        {activity.userName && (
                          <>
                            <span>•</span>
                            <span>by {activity.userName}</span>
                          </>
                        )}
                        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">
                              {activity.activityType === 'RECEIPT_CREATED' && activity.metadata.amount &&
                                `$${activity.metadata.amount.toFixed(2)}`}
                              {activity.activityType === 'TIME_TRACKED' && activity.metadata.hours &&
                                `${activity.metadata.hours.toFixed(2)} hrs`}
                              {activity.activityType === 'TESTIMONIAL_RECEIVED' && activity.metadata.rating &&
                                `${activity.metadata.rating} stars`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!showAll && activities.length > 10 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full neo-button px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] mt-4"
                >
                  Show All Activity ({activities.length} total)
                </button>
              )}

              {showAll && activities.length > 10 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full neo-button px-6 py-3 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02] mt-4"
                >
                  Show Less
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogModal;
