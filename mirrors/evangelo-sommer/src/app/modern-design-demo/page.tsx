"use client"

import React, { useState } from 'react'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import DailyPlanner from '@/components/DailyPlanner'
import DailyPlannerWidget from '@/components/DailyPlannerWidget'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Users, MessageSquare, DollarSign, Calendar, Clock } from 'lucide-react'

const ModernDesignDemo = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const renderContent = () => {
    switch (activeTab) {
      case 'planner':
        return <DailyPlanner />
      case 'overview':
        return <OverviewContent />
      case 'clients':
        return <ClientsContent />
      case 'conversations':
        return <ConversationsContent />
      default:
        return <OverviewContent />
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          conversationCount={3}
        />
        
        <main className="flex-1 bg-white">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

const OverviewContent = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
          DASHBOARD OVERVIEW
        </h1>
        <p className="text-medium-grey font-space-grotesk uppercase tracking-wider text-sm">
          Sharp Modern ServicePro CRM System
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="TOTAL REVENUE"
          value="$24,580"
          change="+12.5%"
          icon={DollarSign}
          trend="up"
        />
        <StatsCard
          title="ACTIVE CLIENTS"
          value="156"
          change="+8.2%"
          icon={Users}
          trend="up"
        />
        <StatsCard
          title="CONVERSATIONS"
          value="23"
          change="+3"
          icon={MessageSquare}
          trend="up"
        />
        <StatsCard
          title="TASKS TODAY"
          value="8"
          change="4 completed"
          icon={Calendar}
          trend="neutral"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Planner Widget */}
        <div className="lg:col-span-1">
          <DailyPlannerWidget onViewAll={() => console.log('View all tasks')} />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-2 border-hud-border">
            <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
              <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
                RECENT ACTIVITY
              </h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <ActivityItem
                  title="New client consultation scheduled"
                  description="Sarah Johnson - Hair cutting service"
                  time="2 hours ago"
                  type="appointment"
                />
                <ActivityItem
                  title="Invoice sent to Miller Landscaping"
                  description="Monthly maintenance service - $450.00"
                  time="4 hours ago"
                  type="billing"
                />
                <ActivityItem
                  title="Snow removal task completed"
                  description="Downtown Plaza - 2 hours duration"
                  time="6 hours ago"
                  type="task"
                />
                <ActivityItem
                  title="New conversation started"
                  description="Creative development project inquiry"
                  time="1 day ago"
                  type="conversation"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Service Performance */}
      <Card className="bg-white border-2 border-hud-border">
        <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
          <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
            SERVICE LINE PERFORMANCE
          </h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServicePerformanceCard
              service="Landscaping"
              revenue="$12,450"
              clients={45}
              color="service-landscaping"
            />
            <ServicePerformanceCard
              service="Snow Removal"
              revenue="$8,200"
              clients={28}
              color="service-snow-removal"
            />
            <ServicePerformanceCard
              service="Hair Cutting"
              revenue="$2,890"
              clients={67}
              color="service-hair-cutting"
            />
            <ServicePerformanceCard
              service="Creative Development"
              revenue="$1,040"
              clients={16}
              color="service-creative-development"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const ClientsContent = () => {
  return (
    <div className="space-y-6">
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
          CLIENT MANAGEMENT
        </h1>
        <p className="text-medium-grey font-space-grotesk uppercase tracking-wider text-sm">
          Manage your client relationships
        </p>
      </div>
      
      <Card className="bg-white border-2 border-hud-border">
        <CardContent className="p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
          <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase">
            CLIENT MANAGEMENT
          </h3>
          <p className="text-medium-grey font-space-grotesk">
            Client management functionality would be implemented here with the new sharp modern design.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

const ConversationsContent = () => {
  return (
    <div className="space-y-6">
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
          CONVERSATIONS
        </h1>
        <p className="text-medium-grey font-space-grotesk uppercase tracking-wider text-sm">
          Manage client communications
        </p>
      </div>
      
      <Card className="bg-white border-2 border-hud-border">
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
          <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase">
            CONVERSATIONS
          </h3>
          <p className="text-medium-grey font-space-grotesk">
            Conversation management functionality would be implemented here with the new sharp modern design.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  change: string
  icon: React.ComponentType<any>
  trend: 'up' | 'down' | 'neutral'
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon: Icon, trend }) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      default: return 'text-medium-grey'
    }
  }

  return (
    <Card className="bg-white border-2 border-hud-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-medium-grey font-space-grotesk mb-2">
              {title}
            </p>
            <p className="text-2xl font-bold text-hud-text-primary font-space-grotesk">
              {value}
            </p>
            <p className={`text-sm font-medium font-space-grotesk ${getTrendColor()}`}>
              {change}
            </p>
          </div>
          <div className="bg-tactical-gold p-3">
            <Icon className="h-6 w-6 text-hud-text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ActivityItemProps {
  title: string
  description: string
  time: string
  type: 'appointment' | 'billing' | 'task' | 'conversation'
}

const ActivityItem: React.FC<ActivityItemProps> = ({ title, description, time, type }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'appointment': return 'bg-tactical-gold'
      case 'billing': return 'bg-green-600'
      case 'task': return 'bg-dark-grey'
      case 'conversation': return 'bg-tactical-gold'
      default: return 'bg-medium-grey'
    }
  }

  return (
    <div className="flex items-start space-x-4 p-3 hover:bg-hud-background-secondary transition-colors">
      <div className={`w-2 h-2 mt-2 ${getTypeColor()}`}></div>
      <div className="flex-1">
        <h4 className="font-medium text-hud-text-primary font-space-grotesk">{title}</h4>
        <p className="text-sm text-medium-grey font-space-grotesk">{description}</p>
        <p className="text-xs text-medium-grey font-space-grotesk mt-1">{time}</p>
      </div>
    </div>
  )
}

interface ServicePerformanceCardProps {
  service: string
  revenue: string
  clients: number
  color: string
}

const ServicePerformanceCard: React.FC<ServicePerformanceCardProps> = ({ 
  service, 
  revenue, 
  clients, 
  color 
}) => {
  return (
    <div className="text-center">
      <div className={`w-4 h-4 ${color} mx-auto mb-3`}></div>
      <h4 className="font-bold text-hud-text-primary font-space-grotesk uppercase text-sm mb-2">
        {service}
      </h4>
      <div className="space-y-1">
        <p className="text-lg font-bold text-gold font-space-grotesk">{revenue}</p>
        <p className="text-sm text-medium-grey font-space-grotesk">{clients} clients</p>
      </div>
    </div>
  )
}

export default ModernDesignDemo
