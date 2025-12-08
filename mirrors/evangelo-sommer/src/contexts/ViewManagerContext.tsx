"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarView } from '@/types/scheduling'
import { createLocalDate } from '@/lib/timezone-utils'

export type TimeManagerView = 'day' | 'week' | 'month' | 'year' | 'agenda' | 'objectives'

interface ViewManagerState {
  currentView: TimeManagerView
  selectedDate: Date
  workingHours: {
    start: string
    end: string
  }
  displaySettings: {
    showWeekends: boolean
    showAllDayEvents: boolean
    showCompletedTasks: boolean
    defaultEventDuration: number
  }
}

interface ViewManagerContextType {
  state: ViewManagerState
  setCurrentView: (view: TimeManagerView) => void
  setSelectedDate: (date: Date) => void
  navigateDate: (direction: 'previous' | 'next' | 'today') => void
  updateWorkingHours: (start: string, end: string) => void
  updateDisplaySettings: (settings: Partial<ViewManagerState['displaySettings']>) => void
  resetToToday: () => void
  isLoading: boolean
}

const ViewManagerContext = createContext<ViewManagerContextType | undefined>(undefined)

const getDefaultState = (): ViewManagerState => ({
  currentView: 'agenda',
  selectedDate: createLocalDate(), // Fresh date each time
  workingHours: {
    start: '07:00',
    end: '19:00'
  },
  displaySettings: {
    showWeekends: true,
    showAllDayEvents: true,
    showCompletedTasks: true,
    defaultEventDuration: 60
  }
})

interface ViewManagerProviderProps {
  children: ReactNode
}

export const ViewManagerProvider: React.FC<ViewManagerProviderProps> = ({ children }) => {
  const [state, setState] = useState<ViewManagerState>(getDefaultState())
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialize state from URL params and localStorage
  useEffect(() => {
    try {
      let initialState = { ...getDefaultState() }
      
      // Load from localStorage first
      const savedState = localStorage.getItem('time-manager-view-state')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        let savedDate = createLocalDate() // Default to today
        
        if (parsedState.selectedDate) {
          // Parse stored date as local date to avoid timezone issues
          const dateParts = parsedState.selectedDate.split('-').map(Number)
          if (dateParts.length === 3) {
            savedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
          } else {
            // Fallback to ISO parsing if format is different
            savedDate = new Date(parsedState.selectedDate)
          }
          
          // Only reset if the date is invalid - allow navigation to any valid date
          if (isNaN(savedDate.getTime())) {
            console.log('Invalid date found, resetting to today')
            savedDate = createLocalDate()
          } else {
            console.log('Using saved date from localStorage:', savedDate.toDateString())
          }
        }
        
        initialState = {
          ...initialState,
          ...parsedState,
          selectedDate: savedDate
        }
      }
      
      // Override with URL params if present
      const urlView = searchParams.get('view') as TimeManagerView
      const urlDate = searchParams.get('date')
      
      if (urlView && ['day', 'week', 'month', 'year', 'agenda'].includes(urlView)) {
        initialState.currentView = urlView
      }
      
      if (urlDate && !isNaN(new Date(urlDate).getTime())) {
        // Parse URL date as local date to avoid timezone issues
        let urlParsedDate: Date
        const urlDateParts = urlDate.split('-').map(Number)
        if (urlDateParts.length === 3) {
          urlParsedDate = new Date(urlDateParts[0], urlDateParts[1] - 1, urlDateParts[2])
        } else {
          urlParsedDate = new Date(urlDate)
        }
        
        // Use URL date if it's valid - allow any date for navigation
        if (!isNaN(urlParsedDate.getTime())) {
          initialState.selectedDate = urlParsedDate
          console.log('Using URL date:', urlParsedDate.toDateString())
        } else {
          console.log('Invalid URL date, keeping current date')
        }
      }
      
      // Final check: ensure we always have a valid date
      if (isNaN(initialState.selectedDate.getTime())) {
        console.log('Final check: invalid date found, resetting to today')
        initialState.selectedDate = createLocalDate()
      } else {
        console.log('Final check: using valid date:', initialState.selectedDate.toDateString())
      }
      
      console.log('ViewManager initialized with date:', initialState.selectedDate.toDateString())
      setState(initialState)
    } catch (error) {
      console.error('Error loading view manager state:', error)
      // Fallback to default state with today's date
      setState(getDefaultState())
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  // Save to localStorage and update URL when state changes
  useEffect(() => {
    if (!isLoading) {
      try {
        // Save to localStorage using local date format to avoid timezone issues
        localStorage.setItem('time-manager-view-state', JSON.stringify({
          ...state,
          selectedDate: `${state.selectedDate.getFullYear()}-${(state.selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${state.selectedDate.getDate().toString().padStart(2, '0')}`
        }))
        
        // Update URL parameters without triggering navigation
        const params = new URLSearchParams()
        params.set('view', state.currentView)
        params.set('date', state.selectedDate.toISOString().split('T')[0])
        
        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState(null, '', newUrl)
      } catch (error) {
        console.error('Error saving view manager state:', error)
      }
    }
  }, [state, isLoading])

  const setCurrentView = (view: TimeManagerView) => {
    setState(prev => {
      let newSelectedDate = prev.selectedDate
      
      // When switching to day view, always use today's date for better UX
      if (view === 'day' && prev.currentView !== 'day') {
        newSelectedDate = createLocalDate()
        console.log('Switching to day view: setting date to today', newSelectedDate.toDateString())
      }
      
      return { 
        ...prev, 
        currentView: view,
        selectedDate: newSelectedDate
      }
    })
    
    // Update URL immediately for better UX
    const params = new URLSearchParams(window.location.search)
    params.set('view', view)
    
    // Update date in URL if switching to day view
    if (view === 'day') {
      const today = createLocalDate()
      params.set('date', today.toISOString().split('T')[0])
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }

  const setSelectedDate = (date: Date) => {
    setState(prev => ({ ...prev, selectedDate: date }))
    
    // Update URL immediately for better UX
    const params = new URLSearchParams(window.location.search)
    params.set('date', date.toISOString().split('T')[0])
    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }

  const navigateDate = (direction: 'previous' | 'next' | 'today') => {
    setState(prev => {
      let newDate = new Date(prev.selectedDate)
      
      if (direction === 'today') {
        // Create a proper local date for the user's timezone - always fresh
        newDate = createLocalDate()
      } else {
        const currentView = prev.currentView
        const multiplier = direction === 'next' ? 1 : -1
        
        switch (currentView) {
          case 'day':
          case 'agenda':
            newDate.setDate(newDate.getDate() + multiplier)
            break
          case 'week':
            newDate.setDate(newDate.getDate() + (7 * multiplier))
            break
          case 'month':
            newDate.setMonth(newDate.getMonth() + multiplier)
            break
          case 'year':
            newDate.setFullYear(newDate.getFullYear() + multiplier)
            break
        }
      }
      
      return { ...prev, selectedDate: newDate }
    })
  }

  const updateWorkingHours = (start: string, end: string) => {
    setState(prev => ({
      ...prev,
      workingHours: { start, end }
    }))
  }

  const updateDisplaySettings = (settings: Partial<ViewManagerState['displaySettings']>) => {
    setState(prev => ({
      ...prev,
      displaySettings: { ...prev.displaySettings, ...settings }
    }))
  }

  const resetToToday = () => {
    const today = createLocalDate()
    console.log('Resetting to today:', today.toDateString())
    
    // Clear localStorage and reset to today
    localStorage.removeItem('time-manager-view-state')
    setState(prev => ({ ...prev, selectedDate: today }))
  }

  const contextValue: ViewManagerContextType = {
    state,
    setCurrentView,
    setSelectedDate,
    navigateDate,
    updateWorkingHours,
    updateDisplaySettings,
    resetToToday,
    isLoading
  }

  return (
    <ViewManagerContext.Provider value={contextValue}>
      {children}
    </ViewManagerContext.Provider>
  )
}

export const useViewManager = (): ViewManagerContextType => {
  const context = useContext(ViewManagerContext)
  if (context === undefined) {
    throw new Error('useViewManager must be used within a ViewManagerProvider')
  }
  return context
}