"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, List, Settings, CalendarDays, Grid3x3, Clock, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useViewManager, TimeManagerView } from '@/contexts/ViewManagerContext'
import { format } from 'date-fns'

const ViewSelectorDebug: React.FC = () => {
  const { state, setCurrentView, navigateDate } = useViewManager()
  const { currentView, selectedDate } = state
  
  console.log('ViewSelectorDebug - Current State:', { currentView, selectedDate: selectedDate.toDateString() })

  const handlePrevious = () => {
    console.log('🔄 Previous button clicked!')
    console.log('Current state before navigate:', { currentView, selectedDate: selectedDate.toDateString() })
    
    try {
      navigateDate('previous')
      console.log('✅ navigateDate("previous") called successfully')
    } catch (error) {
      console.error('❌ Error calling navigateDate("previous"):', error)
    }
  }

  const handleNext = () => {
    console.log('🔄 Next button clicked!')
    console.log('Current state before navigate:', { currentView, selectedDate: selectedDate.toDateString() })
    
    try {
      navigateDate('next')
      console.log('✅ navigateDate("next") called successfully')
    } catch (error) {
      console.error('❌ Error calling navigateDate("next"):', error)
    }
  }

  const handleToday = () => {
    console.log('🔄 Today button clicked!')
    console.log('Current state before navigate:', { currentView, selectedDate: selectedDate.toDateString() })
    
    try {
      navigateDate('today')
      console.log('✅ navigateDate("today") called successfully')
    } catch (error) {
      console.error('❌ Error calling navigateDate("today"):', error)
    }
  }

  // Effect to log state changes
  useEffect(() => {
    console.log('🔄 ViewSelectorDebug state changed:', { 
      currentView, 
      selectedDate: selectedDate.toDateString(),
      timestamp: new Date().toLocaleTimeString()
    })
  }, [currentView, selectedDate])

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

  return (
    <div className="bg-yellow-100 p-4 border border-yellow-400 rounded-lg mb-4">
      <h3 className="font-bold text-lg mb-2 text-red-600">🐛 DEBUG Navigation Component</h3>
      
      <div className="mb-4 p-2 bg-white rounded border">
        <div className="text-sm">
          <div><strong>Current View:</strong> {currentView}</div>
          <div><strong>Selected Date:</strong> {selectedDate.toDateString()}</div>
          <div><strong>Formatted:</strong> {formatDateForView(selectedDate, currentView)}</div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          className="border-2 border-red-500 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1 text-xs sm:text-sm"
          title={getQuickNavigationLabels(currentView).previous}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {getQuickNavigationLabels(currentView).previous}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleToday}
          className="border-2 border-tactical-gold-500 bg-tactical-gold-muted text-tactical-brown-dark hover:bg-tactical-gold-muted px-3 py-1 font-medium text-xs sm:text-sm"
          title={`Navigate to ${getContextualButtonLabel(currentView).toLowerCase()}`}
        >
          {getContextualButtonLabel(currentView)}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          className="border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1 text-xs sm:text-sm"
          title={getQuickNavigationLabels(currentView).next}
        >
          {getQuickNavigationLabels(currentView).next}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="mt-2 text-xs text-tactical-grey-500">
        Check browser console for navigation debug logs
      </div>
    </div>
  )
}

export default ViewSelectorDebug