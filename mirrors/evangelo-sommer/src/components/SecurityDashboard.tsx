"use client"

import React, { useState, useEffect } from 'react'
import { Shield, Users, AlertTriangle, Activity, Lock, Eye, UserCheck, UserX, Clock, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSecurityStats } from '@/lib/security'
import { SecurityEvent, LoginAttempt, UserRole } from '@/types/security'

interface SecurityDashboardProps {
  userRole: UserRole
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ userRole }) => {
  const [securityStats, setSecurityStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedEventType, setSelectedEventType] = useState<string>('all')

  useEffect(() => {
    const loadSecurityStats = async () => {
      try {
        const stats = getSecurityStats()
        setSecurityStats(stats)
      } catch (error) {
        console.error('Failed to load security stats:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSecurityStats()
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadSecurityStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-medium-grey font-primary uppercase tracking-wide">LOADING SECURITY DATA...</p>
        </div>
      </div>
    )
  }

  const canViewSecurity = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  if (!canViewSecurity) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
        <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-primary uppercase">
          ACCESS RESTRICTED
        </h3>
        <p className="text-medium-grey font-primary">
          Security dashboard requires administrator privileges.
        </p>
      </div>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-600 text-white'
      case 'HIGH': return 'bg-red-500 text-white'
      case 'MEDIUM': return 'bg-yellow-500 text-white'
      case 'LOW': return 'bg-green-500 text-white'
      default: return 'bg-tactical-grey-1000 text-white'
    }
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'LOGIN_SUCCESS': return <UserCheck className="h-4 w-4" />
      case 'LOGIN_FAILURE': return <UserX className="h-4 w-4" />
      case 'ACCOUNT_LOCKED': return <Lock className="h-4 w-4" />
      case 'SUSPICIOUS_ACTIVITY': return <AlertTriangle className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const filteredEvents = selectedEventType === 'all' 
    ? securityStats?.recentEvents || []
    : securityStats?.recentEvents?.filter((event: SecurityEvent) => event.type === selectedEventType) || []

  return (
    <div className="space-y-6">
      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-2 border-hud-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-primary">
                TOTAL EVENTS
              </span>
              <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                <Activity className="h-4 w-4 text-hud-text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-hud-text-primary mb-1 font-primary">
              {securityStats?.totalEvents || 0}
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wider font-primary">
              LAST 24 HOURS
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-hud-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-primary">
                LOGIN ATTEMPTS
              </span>
              <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                <Users className="h-4 w-4 text-hud-text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-hud-text-primary mb-1 font-primary">
              {Object.values(securityStats?.loginAttemptsByEmail || {}).reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)}
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wider font-primary">
              UNIQUE ATTEMPTS
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-hud-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-primary">
                BLOCKED IPs
              </span>
              <div className="w-6 h-6 bg-tactical-gold flex items-center justify-center">
                <Shield className="h-4 w-4 text-hud-text-primary" />
              </div>
            </div>
            <div className="text-3xl font-bold text-hud-text-primary mb-1 font-primary">
              {securityStats?.rateLimitedIPs?.length || 0}
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wider font-primary">
              RATE LIMITED
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-hud-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold uppercase text-medium-grey tracking-wider font-primary">
                HIGH ALERTS
              </span>
              <div className="w-6 h-6 bg-red-500 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600 mb-1 font-primary">
              {securityStats?.recentEvents?.filter((e: SecurityEvent) => ['HIGH', 'CRITICAL'].includes(e.severity))?.length || 0}
            </div>
            <div className="text-xs text-medium-grey uppercase tracking-wider font-primary">
              REQUIRE ATTENTION
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card className="bg-white border-2 border-hud-border">
        <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
              RECENT SECURITY EVENTS
            </h3>
            <div className="flex space-x-2">
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="px-3 py-1 border-2 border-hud-border bg-white text-hud-text-primary font-primary text-sm"
              >
                <option value="all">ALL EVENTS</option>
                <option value="LOGIN_SUCCESS">LOGIN SUCCESS</option>
                <option value="LOGIN_FAILURE">LOGIN FAILURE</option>
                <option value="ACCOUNT_LOCKED">ACCOUNT LOCKED</option>
                <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS ACTIVITY</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gold opacity-50" />
              <h4 className="text-lg font-bold text-hud-text-primary mb-2 font-primary uppercase">
                NO EVENTS FOUND
              </h4>
              <p className="text-medium-grey font-primary">
                No security events match the selected filter.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {filteredEvents.map((event: SecurityEvent) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-4 border-b border-hud-border hover:bg-hud-background-secondary transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getEventTypeIcon(event.type)}
                    </div>
                    <div>
                      <div className="font-bold text-hud-text-primary font-primary text-sm uppercase">
                        {event.type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-medium-grey font-primary">
                        {event.email || 'Unknown'} • {event.ip} • {new Date(event.timestamp).toLocaleString()}
                      </div>
                      {event.details && (
                        <div className="text-xs text-medium-grey font-primary mt-1">
                          {JSON.stringify(event.details).substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`text-xs font-bold ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </Badge>
                    {!event.resolved && event.severity === 'CRITICAL' && (
                      <Button size="sm" variant="outline" className="text-xs">
                        INVESTIGATE
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Login Attempts by Email */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-2 border-hud-border">
          <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
              LOGIN ATTEMPTS BY EMAIL
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            {Object.keys(securityStats?.loginAttemptsByEmail || {}).length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gold opacity-50" />
                <p className="text-medium-grey font-primary">No login attempts recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(securityStats?.loginAttemptsByEmail || {}).map(([email, count]: [string, any]) => (
                  <div key={email} className="flex items-center justify-between">
                    <span className="text-hud-text-primary font-primary">{email}</span>
                    <Badge className="bg-tactical-gold text-hud-text-primary font-bold">
                      {count} attempts
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border-2 border-hud-border">
          <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-primary">
              BLOCKED IP ADDRESSES
            </h3>
          </CardHeader>
          <CardContent className="p-6">
            {(securityStats?.rateLimitedIPs || []).length === 0 ? (
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p className="text-medium-grey font-primary">No blocked IP addresses</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(securityStats?.rateLimitedIPs || []).map((ip: string) => (
                  <div key={ip} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-medium-grey" />
                      <span className="text-hud-text-primary font-primary font-mono">{ip}</span>
                    </div>
                    <Badge className="bg-red-500 text-white font-bold">
                      BLOCKED
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SecurityDashboard