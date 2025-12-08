"use client"

import React, { useState, useEffect } from 'react'
import { X, Bell, Calendar, Star, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { lockScroll, unlockScroll } from '@/lib/modal-scroll-lock'
import { useRouter } from 'next/navigation'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Notification {
  id: string
  type: 'TESTIMONIAL_RECEIVED' | 'appointment' | 'testimonial' | 'form_submission' | 'client_message'
  title: string
  message?: string
  description?: string
  timestamp: string | Date | null
  read?: boolean
  isRead?: boolean
  clientId?: string
  clientName?: string
  actionUrl?: string
  link?: string
  rating?: number
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isDark, setIsDark] = useState(false)

  // Sync theme and disable body scroll when modal is open
  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('color-theme') || 'light'
      setIsDark(theme === 'true-night' || theme === 'mocha')
    }

    updateTheme()
    const observer = new MutationObserver(() => updateTheme())
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-theme'] })
    window.addEventListener('storage', updateTheme)

    if (isOpen) {
      lockScroll()
      loadNotifications()
    } else {
      unlockScroll()
    }

    return () => {
      unlockScroll()
      observer.disconnect()
      window.removeEventListener('storage', updateTheme)
    }
  }, [isOpen])

  const loadNotifications = async () => {
    try {
      // Fetch from API
      const response = await fetch('/api/notifications?limit=20')
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      if (data.success && data.notifications) {
        // Transform API notifications to match component interface
        const transformedNotifications = data.notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          description: n.message || n.description || '',
          timestamp: n.timestamp,
          isRead: n.read || false,
          clientId: n.clientId,
          clientName: n.clientName,
          actionUrl: n.link,
        }))
        setNotifications(transformedNotifications)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('crm-notifications')
        if (stored) {
          const parsed = JSON.parse(stored)
          setNotifications(parsed)
        }
      } catch (fallbackError) {
        console.error('Failed to load from localStorage:', fallbackError)
        setNotifications([])
      }
    }
  }

  const markAsRead = (notificationId: string) => {
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    )
    setNotifications(updated)
    localStorage.setItem('crm-notifications', JSON.stringify(updated))
  }

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }))
    setNotifications(updated)
    localStorage.setItem('crm-notifications', JSON.stringify(updated))
  }

  const deleteNotification = (notificationId: string) => {
    const updated = notifications.filter(n => n.id !== notificationId)
    setNotifications(updated)
    localStorage.setItem('crm-notifications', JSON.stringify(updated))
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      onClose()
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-600" />
      case 'testimonial':
        return <Star className="h-5 w-5 text-yellow-600" />
      case 'form_submission':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'client_message':
        return <AlertCircle className="h-5 w-5 text-purple-600" />
      default:
        return <Bell className="h-5 w-5 text-foreground" />
    }
  }

  const formatTimestamp = (timestamp: string | Date | null | undefined) => {
    if (!timestamp) return ''
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    if (isNaN(date.getTime())) return ''
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100]" onClick={onClose}>
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 35%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.05), transparent 30%), #0b0b0f'
              : 'radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04), transparent 35%), radial-gradient(circle at 80% 0%, rgba(0,0,0,0.05), transparent 30%), #f7f7fb'
          }}
        />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      </div>

      {/* Modal container - accounts for sidebar on desktop */}
      <div className="fixed inset-y-0 right-0 left-0 lg:left-64 z-[101] flex items-start justify-center p-4 sm:p-6 md:p-8 overflow-y-auto pointer-events-none">
        <div
          className={`neo-container neomorphic-card ${isDark ? 'dark-mode' : ''} max-w-2xl w-full max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-12rem)] md:max-h-[calc(100vh-16rem)] mt-16 sm:mt-20 md:mt-16 mb-8 overflow-y-auto pointer-events-auto`}
          style={{
            background: isDark
              ? 'linear-gradient(145deg, rgba(20,20,26,0.9), rgba(17,17,23,0.92))'
              : 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(245,245,250,0.96))',
          }}
        >
          {/* Header */}
          <div className="neo-inset border-b border-foreground/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Bell className="h-6 w-6 text-foreground" />
                <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="neo-badge bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="neo-icon-button transition-transform hover:scale-[1.1]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filters and Actions */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`neomorphic-button px-3 py-1.5 text-xs uppercase transition-transform hover:scale-[1.02] ${
                    filter === 'all' ? 'neo-button-active' : ''
                  } ${isDark ? 'dark-mode' : ''}`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`neomorphic-button px-3 py-1.5 text-xs uppercase transition-transform hover:scale-[1.02] ${
                    filter === 'unread' ? 'neo-button-active' : ''
                  } ${isDark ? 'dark-mode' : ''}`}
                >
                  Unread ({unreadCount})
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-tactical-gold hover:text-tactical-gold/80 font-primary font-bold uppercase"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase">
                  No Notifications
                </h3>
                <p className="text-muted-foreground font-primary text-sm">
                  {filter === 'unread'
                    ? "You're all caught up! No unread notifications."
                    : "You don't have any notifications yet."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`neo-inset neomorphic-card ${isDark ? 'dark-mode' : ''} p-4 rounded-lg transition-all cursor-pointer hover:scale-[1.01] ${
                      !notification.isRead ? 'border-l-4 border-tactical-gold' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className={`text-sm font-bold font-primary ${
                            !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap font-primary">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-primary mb-2">
                          {notification.description}
                        </p>
                        {notification.clientName && (
                          <div className="text-xs font-primary">
                            <span className="text-muted-foreground">Client: </span>
                            <span className="text-foreground font-semibold">{notification.clientName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-foreground/10">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="text-xs text-tactical-gold hover:text-tactical-gold/80 font-primary font-bold uppercase"
                        >
                          Mark Read
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-primary font-bold uppercase"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Info Box */}
            {notifications.length === 0 && (
              <div className="neo-inset p-4 border-l-4 border-tactical-gold mt-6">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-tactical-gold mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground font-primary">
                    <strong className="text-foreground">Incoming Updates:</strong> This is where you'll see notifications about client actions like scheduling appointments on Woodgreen Landscaping, submitting testimonials, and other incoming updates that require your attention.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default NotificationsModal
