"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, List, Settings, CalendarDays, Grid3x3, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useViewManager, TimeManagerView } from '@/contexts/ViewManagerContext'
import { format } from 'date-fns'

const VIEW_CONFIGS = {
  day: {
    label: 'Day',
    icon: Clock,
    description: 'Daily timeline view',
    category: 'calendar'
  },
  week: {
    label: 'Week',
    icon: CalendarDays,
    description: '7-day week view',
    category: 'calendar'
  },
  month: {
    label: 'Month',
    icon: Calendar,
    description: 'Monthly calendar',
    category: 'calendar'
  },
  year: {
    label: 'Year',
    icon: Grid3x3,
    description: 'Year overview',
    category: 'calendar'
  },
  agenda: {
    label: 'Mission Objectives',
    icon: List,
    description: 'Mission objectives and priorities',
    category: 'planning'
  },
} as const

const CALENDAR_VIEWS: TimeManagerView[] = ['day', 'week', 'month', 'year']

interface ViewSelectorProps {
  showTitle?: boolean
  showNavigation?: boolean
  variant?: 'full' | 'compact'
}

const ViewSelectorFixed: React.FC<ViewSelectorProps> = ({ 
  showTitle = true, 
  showNavigation = true, 
  variant = 'full' 
}) => {
  const { state, setCurrentView, navigateDate } = useViewManager()
  const { currentView, selectedDate } = state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDateForView = (date: Date, view: TimeManagerView) => {
    switch (view) {
      case 'day':
      case 'agenda':
        return format(date, 'EEEE, MMMM do, yyyy')
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(date, 'MMMM yyyy')
      case 'year':
        return format(date, 'yyyy')
      default:
        return format(date, 'MMMM yyyy')
    }
  }

  const handleViewChange = (view: TimeManagerView) => {
    setCurrentView(view)
    setIsDropdownOpen(false)
  }

  // Enhanced navigation handlers with better error handling
  const handleNavigatePrevious = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔄 Previous navigation clicked')
    
    try {
      navigateDate('previous')
      console.log('✅ Previous navigation successful')
    } catch (error) {
      console.error('❌ Previous navigation failed:', error)
    }
  }

  const handleNavigateNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔄 Next navigation clicked')
    
    try {
      navigateDate('next')
      console.log('✅ Next navigation successful')
    } catch (error) {
      console.error('❌ Next navigation failed:', error)
    }
  }

  const handleNavigateToday = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('🔄 Today navigation clicked')
    
    try {
      navigateDate('today')
      console.log('✅ Today navigation successful')
    } catch (error) {
      console.error('❌ Today navigation failed:', error)
    }
  }

  const getContextualButtonLabel = (view: TimeManagerView): string => {
    switch (view) {
      case 'day':
      case 'agenda':
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
      case 'year':
        return 'This Year'
      default:
        return 'Today'
    }
  }

  const getQuickNavigationLabels = (view: TimeManagerView): { previous: string; next: string } => {
    switch (view) {
      case 'day':
      case 'agenda':
        return { previous: 'Yesterday', next: 'Tomorrow' }
      case 'week':
        return { previous: 'Last Week', next: 'Next Week' }
      case 'month':
        return { previous: 'Last Month', next: 'Next Month' }
      case 'year':
        return { previous: 'Last Year', next: 'Next Year' }
      default:
        return { previous: 'Previous', next: 'Next' }
    }
  }

  const CalendarViewDropdown = () => {
    return (
      <div ref={dropdownRef} className="relative">
        <Button
          variant="outline"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary px-3 py-2 flex items-center space-x-1"
          title="Calendar View"
        >
          <Calendar className="h-4 w-4" />
          <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-hud-border rounded-md shadow-lg z-50">
            <div className="py-1">
              {CALENDAR_VIEWS.map((view) => {
                const config = VIEW_CONFIGS[view as keyof typeof VIEW_CONFIGS]
                const Icon = config.icon
                const isActive = currentView === view

                return (
                  <button
                    key={view}
                    onClick={() => handleViewChange(view)}
                    className={`w-full px-4 py-2 text-left hover:bg-tactical-grey-100 flex items-center space-x-3 ${
                      isActive ? 'bg-tactical-gold-light text-hud-text-primary' : 'text-tactical-grey-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-tactical-grey-500">{config.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Show navigation only for calendar views
  const shouldShowNavigation = showNavigation && CALENDAR_VIEWS.includes(currentView)

  return (
    <div className="bg-hud-background-secondary p-4 md:p-6 border-b-2 border-hud-border-accent">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div className="flex-1">
          {showTitle && (
            <div className="mb-4">
              <h1 className="text-hero font-display font-black text-hud-text-primary uppercase tracking-wide">
                Time Manager
              </h1>
              <p className="text-label font-interface font-light text-medium-grey uppercase tracking-wider">
                {formatDateForView(selectedDate, currentView)}
              </p>
            </div>
          )}
          
          {/* Enhanced navigation with better event handling */}
          {shouldShowNavigation && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleNavigatePrevious}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 font-primary border-2 border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary px-3 py-1 text-xs sm:text-sm h-9"
                  title={getQuickNavigationLabels(currentView).previous}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).previous.toLowerCase()}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <button
                  type="button"
                  onClick={handleNavigateToday}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 font-primary border-2 border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary px-3 py-1 font-medium text-xs sm:text-sm h-9"
                  title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                  aria-label={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
                >
                  {getContextualButtonLabel(currentView)}
                </button>
                
                <button
                  type="button"
                  onClick={handleNavigateNext}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold uppercase tracking-wide transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 font-primary border-2 border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary px-3 py-1 text-xs sm:text-sm h-9"
                  title={getQuickNavigationLabels(currentView).next}
                  aria-label={`Navigate to ${getQuickNavigationLabels(currentView).next.toLowerCase()}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Mobile view - compact dropdowns and buttons */}
          <div className="flex md:hidden space-x-1">
            {/* Mission Objectives button always first */}
            {Object.entries(VIEW_CONFIGS)
              .filter(([viewKey]) => !CALENDAR_VIEWS.includes(viewKey as TimeManagerView))
              .map(([viewKey, config]) => {
                const view = viewKey as TimeManagerView
                const Icon = config.icon
                const isActive = currentView === view

                return (
                  <Button
                    key={view}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleViewChange(view)}
                    className={`${
                      isActive 
                        ? 'bg-tactical-gold text-hud-text-primary' 
                        : 'border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary'
                    } p-2`}
                    title={config.description}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                )
              })}
            
            {/* Calendar dropdown always visible */}
            <CalendarViewDropdown />
          </div>

          {/* Desktop view - full dropdown and buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Mission Objectives button always first */}
            {Object.entries(VIEW_CONFIGS)
              .filter(([viewKey]) => !CALENDAR_VIEWS.includes(viewKey as TimeManagerView))
              .map(([viewKey, config]) => {
                const view = viewKey as TimeManagerView
                const Icon = config.icon
                const isActive = currentView === view

                return (
                  <Button
                    key={view}
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => handleViewChange(view)}
                    className={`${
                      isActive 
                        ? 'bg-tactical-gold text-hud-text-primary' 
                        : 'border-hud-border-accent text-gold hover:bg-tactical-gold hover:text-hud-text-primary'
                    } px-4 py-2`}
                    title={config.description}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {config.label}
                  </Button>
                )
              })}
            
            {/* Calendar dropdown always visible */}
            <CalendarViewDropdown />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ViewSelectorFixed