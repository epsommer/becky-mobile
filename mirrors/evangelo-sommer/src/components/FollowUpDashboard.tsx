'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Bell, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Search,
  MoreVertical
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FollowUpWithRelations,
  FollowUpMetrics,
  FollowUpFilters,
  ClientFollowUpHistory
} from '@/types/follow-up';

interface FollowUpDashboardProps {
  initialFollowUps?: FollowUpWithRelations[];
  clientFilter?: string;
}

export function FollowUpDashboard({ initialFollowUps, clientFilter }: FollowUpDashboardProps) {
  const [followUps, setFollowUps] = useState<FollowUpWithRelations[]>(initialFollowUps || []);
  const [metrics, setMetrics] = useState<FollowUpMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FollowUpFilters>({
    clientId: clientFilter
  });
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpWithRelations | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch follow-ups based on filters
  useEffect(() => {
    fetchFollowUps();
  }, [filters]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.clientId) queryParams.set('clientId', filters.clientId);
      if (filters.status?.length) queryParams.set('status', filters.status.join(','));
      if (filters.category?.length) queryParams.set('category', filters.category.join(','));
      if (filters.priority?.length) queryParams.set('priority', filters.priority.join(','));
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);
      if (filters.overdueOnly) queryParams.set('overdueOnly', 'true');
      if (filters.upcomingOnly) queryParams.set('upcomingOnly', 'true');

      const response = await fetch(`/api/follow-ups/schedule?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setFollowUps(data.data);
      } else {
        console.error('Failed to fetch follow-ups:', data.error);
      }
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.clientId) queryParams.set('clientId', filters.clientId);

      const response = await fetch(`/api/follow-ups/metrics?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [filters.clientId]);

  // Calculate quick stats from current follow-ups
  const quickStats = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      total: followUps.length,
      today: followUps.filter(fu => {
        const date = new Date(fu.scheduledDate);
        return date >= today && date < tomorrow && ['SCHEDULED', 'CONFIRMED'].includes(fu.status);
      }).length,
      upcoming: followUps.filter(fu => 
        new Date(fu.scheduledDate) > now && ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      ).length,
      overdue: followUps.filter(fu => 
        new Date(fu.scheduledDate) < now && ['SCHEDULED', 'CONFIRMED'].includes(fu.status)
      ).length,
      completed: followUps.filter(fu => fu.status === 'COMPLETED').length
    };
  }, [followUps]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-grey-300';
      case 'LOW': return 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300';
      default: return 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-tactical-gold-muted text-tactical-brown-dark';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-tactical-grey-200 text-tactical-grey-700';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'MISSED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-tactical-grey-200 text-tactical-grey-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SERVICE_CHECK': return <CheckCircle className="w-4 h-4" />;
      case 'MAINTENANCE_REMINDER': return <Clock className="w-4 h-4" />;
      case 'COMPLAINT_RESOLUTION': return <AlertTriangle className="w-4 h-4" />;
      case 'CONTRACT_RENEWAL': return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const handleUpdateFollowUp = async (id: string, updates: any) => {
    try {
      const response = await fetch(`/api/follow-ups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        setFollowUps(prev => 
          prev.map(fu => fu.id === id ? data.data : fu)
        );
      } else {
        console.error('Failed to update follow-up:', data.error);
      }
    } catch (error) {
      console.error('Error updating follow-up:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Follow-up Dashboard</h2>
          <p className="text-tactical-grey-500">
            Manage and track client follow-ups
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Follow-up
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-tactical-gold" />
              <div>
                <p className="text-2xl font-bold">{quickStats.total}</p>
                <p className="text-sm text-tactical-grey-500">Total Follow-ups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{quickStats.today}</p>
                <p className="text-sm text-tactical-grey-500">Due Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5 text-tactical-gold" />
              <div>
                <p className="text-2xl font-bold">{quickStats.upcoming}</p>
                <p className="text-sm text-tactical-grey-500">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{quickStats.overdue}</p>
                <p className="text-sm text-tactical-grey-500">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-tactical-grey-500" />
              <div>
                <p className="text-2xl font-bold">{quickStats.completed}</p>
                <p className="text-sm text-tactical-grey-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                className="w-full p-2 border rounded-md"
                value={filters.status?.[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  status: e.target.value ? [e.target.value as any] : undefined
                }))}
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="MISSED">Missed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                className="w-full p-2 border rounded-md"
                value={filters.category?.[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  category: e.target.value ? [e.target.value as any] : undefined
                }))}
              >
                <option value="">All Categories</option>
                <option value="SERVICE_CHECK">Service Check</option>
                <option value="MAINTENANCE_REMINDER">Maintenance</option>
                <option value="CONTRACT_RENEWAL">Contract Renewal</option>
                <option value="COMPLAINT_RESOLUTION">Complaint Resolution</option>
                <option value="SEASONAL_PLANNING">Seasonal Planning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                className="w-full p-2 border rounded-md"
                value={filters.priority?.[0] || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  priority: e.target.value ? [e.target.value as any] : undefined
                }))}
              >
                <option value="">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.overdueOnly || false}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    overdueOnly: e.target.checked || undefined
                  }))}
                />
                <span className="text-sm">Overdue only</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.upcomingOnly || false}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    upcomingOnly: e.target.checked || undefined
                  }))}
                />
                <span className="text-sm">Upcoming only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Follow-ups List */}
      <Card>
        <CardHeader>
          <CardTitle>Follow-ups</CardTitle>
          <CardDescription>
            {loading ? 'Loading...' : `${followUps.length} follow-up${followUps.length !== 1 ? 's' : ''} found`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {followUps.map((followUp) => (
              <div
                key={followUp.id}
                className="border rounded-lg p-4 hover:bg-tactical-grey-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getCategoryIcon(followUp.category)}
                      <h3 className="font-semibold text-lg">
                        {followUp.title}
                      </h3>
                      <Badge className={getPriorityColor(followUp.priority)}>
                        {followUp.priority}
                      </Badge>
                      <Badge className={getStatusColor(followUp.status)}>
                        {followUp.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-tactical-grey-500">Client</p>
                        <p className="font-medium">{followUp.client.name}</p>
                        {followUp.client.company && (
                          <p className="text-sm text-tactical-grey-500">{followUp.client.company}</p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm text-tactical-grey-500">Scheduled</p>
                        <p className="font-medium">
                          {new Date(followUp.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-tactical-grey-500">
                          {new Date(followUp.scheduledDate).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })} ({followUp.duration} min)
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-tactical-grey-500">Category</p>
                        <p className="font-medium">
                          {followUp.category.replace(/_/g, ' ').toLowerCase()
                            .split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </p>
                      </div>
                    </div>

                    {followUp.notes && (
                      <div className="mb-3">
                        <p className="text-sm text-tactical-grey-500">Notes</p>
                        <p className="text-sm">{followUp.notes}</p>
                      </div>
                    )}

                    {followUp.outcome && (
                      <div className="mb-3">
                        <p className="text-sm text-tactical-grey-500">Outcome</p>
                        <p className="text-sm">{followUp.outcome}</p>
                      </div>
                    )}

                    {followUp.actionItems && Array.isArray(followUp.actionItems) && followUp.actionItems.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-tactical-grey-500">Action Items</p>
                        <ul className="text-sm list-disc list-inside">
                          {(followUp.actionItems as string[]).map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-tactical-grey-500">
                      <span>Created: {new Date(followUp.createdAt).toLocaleDateString()}</span>
                      {followUp.notifications.length > 0 && (
                        <span>
                          Notifications: {followUp.notifications.filter(n => n.status === 'SENT').length}/{followUp.notifications.length}
                        </span>
                      )}
                      {followUp.childFollowUps && followUp.childFollowUps.length > 0 && (
                        <span>
                          Recurring: {followUp.childFollowUps.length} upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {followUp.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateFollowUp(followUp.id, { status: 'CONFIRMED' })}
                      >
                        Confirm
                      </Button>
                    )}
                    
                    {['SCHEDULED', 'CONFIRMED'].includes(followUp.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateFollowUp(followUp.id, { status: 'COMPLETED' })}
                      >
                        Complete
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFollowUp(followUp)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {followUps.length === 0 && !loading && (
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-tactical-grey-500">No follow-ups found</p>
                <p className="text-sm text-gray-400">Try adjusting your filters or create a new follow-up</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}