"use client"

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import { Move, Clock, User, MapPin } from 'lucide-react'
import { useDragDrop } from './DragDropContext'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'

interface DragVisualFeedbackProps {
  containerRef?: React.RefObject<HTMLElement>
}

const DragVisualFeedback: React.FC<DragVisualFeedbackProps> = ({ containerRef }) => {
  const { dragState, dropZoneState } = useDragDrop()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Track mouse position during drag
  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setMousePosition({ x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [dragState.isDragging])

  if (!mounted || !dragState.isDragging || !dragState.draggedEvent) {
    return null
  }

  const event = dragState.draggedEvent

  const getPriorityColor = (priority: Priority): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-l-red-500 shadow-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-l-orange-500 shadow-orange-200'
      case 'medium':
        return 'bg-tactical-gold-light text-hud-text-primary border-l-tactical-gold shadow-tactical-gold/20'
      case 'low':
        return 'bg-green-100 text-green-800 border-l-green-500 shadow-green-200'
      default:
        return 'bg-tactical-grey-200 text-tactical-grey-700 border-l-gray-500 shadow-gray-200'
    }
  }

  const formatEventTime = (startDateTime: string, endDateTime?: string): string => {
    const start = parseISO(startDateTime)
    if (endDateTime) {
      const end = parseISO(endDateTime)
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
    }
    return format(start, 'h:mm a')
  }

  const getDropFeedbackText = (): string | null => {
    if (dropZoneState.activeDropZone) {
      const { date, hour } = dropZoneState.activeDropZone
      const dropDate = new Date(date + 'T00:00:00')
      dropDate.setHours(hour)
      
      const isToday = format(new Date(), 'yyyy-MM-dd') === date
      const dateText = isToday ? 'Today' : format(dropDate, 'MMM d')
      const timeText = format(dropDate, 'h:mm a')
      
      return `Drop to reschedule to ${dateText} at ${timeText}`
    }
    
    return null
  }

  const dragPreview = (
    <div
      className="fixed z-[9999] pointer-events-none select-none"
      style={{
        left: mousePosition.x - (dragState.dragOffset.x || 0),
        top: mousePosition.y - (dragState.dragOffset.y || 0),
      }}
    >
      {/* Ghost/Preview of the dragged event */}
      <div className={`
        relative max-w-xs
        ${getPriorityColor(event.priority)}
        border-l-4 rounded-r-md shadow-2xl
        transform rotate-2 scale-105
        opacity-90
        animate-pulse
      `}>
        <div className="p-3">
          {/* Drag indicator icon */}
          <div className="absolute -top-2 -right-2 bg-tactical-gold text-hud-text-primary rounded-full p-1 shadow-lg">
            <Move className="w-4 h-4" />
          </div>

          {/* Event content */}
          <div className="relative">
            <h4 className="font-semibold text-sm font-primary truncate mb-1">
              {event.title}
            </h4>
            
            <div className="space-y-1 text-xs opacity-80">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                <span>{formatEventTime(event.startDateTime, event.endDateTime)}</span>
              </div>
              
              {event.clientName && (
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{event.clientName}</span>
                </div>
              )}
              
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drop feedback tooltip */}
      {getDropFeedbackText() && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2">
          <div className="bg-black bg-opacity-90 text-white text-xs px-3 py-2 rounded-lg font-primary whitespace-nowrap shadow-xl">
            {getDropFeedbackText()}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black bg-opacity-90 rotate-45"></div>
          </div>
        </div>
      )}

      {/* Connection line to original position */}
      {dragState.originalSlot && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            width: '100vw',
            height: '100vh',
            left: -mousePosition.x,
            top: -mousePosition.y,
          }}
        >
          <defs>
            <pattern
              id="connectionLine"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
            >
              <path
                d="M 0,8 l 8,-8 M -2,2 l 4,-4 M 6,10 l 4,-4"
                stroke="rgba(255, 193, 7, 0.6)"
                strokeWidth="1"
              />
            </pattern>
          </defs>
        </svg>
      )}
    </div>
  )

  // Use portal to render outside of normal component hierarchy
  const portalRoot = containerRef?.current || document.body
  
  return createPortal(dragPreview, portalRoot)
}

export default DragVisualFeedback