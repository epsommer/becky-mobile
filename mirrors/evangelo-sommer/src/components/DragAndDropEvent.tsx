"use client"

import React, { useState, useRef, useEffect } from 'react'
import { format, addMinutes, parseISO } from 'date-fns'
import { Clock, MapPin, User, GripVertical, Move, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'
import { ConflictResult, ConflictSeverity } from '@/lib/conflict-detector'
import { useDragDrop } from '@/components/DragDropContext'

export interface DragPosition {
  x: number
  y: number
}

export interface DragData {
  event: UnifiedEvent
  originalSlot: {
    date: string
    hour: number
  }
  dragOffset: DragPosition
}

export interface DropZoneData {
  date: string
  hour: number
  element: HTMLElement
}

interface DragAndDropEventProps {
  event: UnifiedEvent
  conflicts?: ConflictResult
  conflictingEvents?: UnifiedEvent[]
  currentDate: string
  currentHour: number
  pixelsPerHour?: number
  onDragStart?: (data: DragData) => void
  onDragEnd?: (data: DragData, dropZone: DropZoneData | null) => void
  onResizeStart?: (event: UnifiedEvent, handle: 'top' | 'bottom') => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  isDragging?: boolean
  isResizing?: boolean
  onClick?: (event: UnifiedEvent) => void
  showResizeHandles?: boolean
  showConflicts?: boolean
  isCompact?: boolean
  className?: string
}

const DragAndDropEvent: React.FC<DragAndDropEventProps> = ({
  event,
  conflicts,
  conflictingEvents = [],
  currentDate,
  currentHour,
  pixelsPerHour = 80,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onResizeEnd,
  onConflictClick,
  isDragging = false,
  isResizing = false,
  onClick,
  showResizeHandles = true,
  showConflicts = true,
  isCompact = false,
  className = ''
}) => {
  const eventRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const {
    dragState,
    startDrag,
    endDrag,
    setActiveDropZone
  } = useDragDrop()
  // Removed internal drag state - now using HTML5 drag API with DragDropContext
  
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean
    handle: 'top' | 'bottom' | null
    startY: number
    originalHeight: number
    currentDeltaY: number
    previewStart?: string
    previewEnd?: string
    initialTop?: number
  }>({
    isResizing: false,
    handle: null,
    startY: 0,
    originalHeight: 0,
    currentDeltaY: 0
  })

  // Touch support states
  const [touchState, setTouchState] = useState<{
    isTouch: boolean
    touchStartTime: number
    longPressTimer: NodeJS.Timeout | null
  }>({
    isTouch: false,
    touchStartTime: 0,
    longPressTimer: null
  })

  const getPriorityColor = (priority: Priority): string => {
    // Add debug logging for hedge trimming events
    if (event.title?.toLowerCase().includes('hedge')) {
      console.log('🌿 DEBUG - Hedge event priority:', priority)
      console.log('🌿 DEBUG - Event title:', event.title)
    }

    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 text-red-200 border-l-red-500'
      case 'high':
        return 'bg-orange-900/30 text-orange-200 border-l-orange-500'
      case 'medium':
        return 'bg-tactical-gold/20 text-tactical-gold-light border-l-tactical-gold'
      case 'low':
        return 'bg-green-900/30 text-green-200 border-l-green-500'
      default:
        console.warn('⚠️ Event using default color due to invalid priority:', priority, 'for event:', event.title)
        return 'bg-tactical-grey-800/30 text-tactical-grey-200 border-l-gray-500'
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

  // Conflict handling functions
  const getConflictSeverityColor = (): string => {
    if (!conflicts?.hasConflicts || !showConflicts) return ''

    const maxSeverity = conflicts.conflicts.reduce((max, conflict) => {
      const severityOrder: Record<ConflictSeverity, number> = {
        warning: 1, error: 2, critical: 3
      }
      return severityOrder[conflict.severity] > severityOrder[max] ? conflict.severity : max
    }, 'warning' as ConflictSeverity)

    switch (maxSeverity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'error': return 'text-orange-600 bg-orange-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleConflictClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (conflicts && onConflictClick) {
      onConflictClick(conflicts)
    }
  }

  // Mouse drag handling removed - now using HTML5 drag API

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, handle: 'top' | 'bottom') => {
    console.log('🎯 Resize start - handle:', handle, 'event:', event.title)
    e.preventDefault()
    e.stopPropagation()

    const isTouch = 'touches' in e
    const clientY = isTouch ? e.touches[0].clientY : e.clientY

    const originalHeight = eventRef.current?.offsetHeight || 0
    const initialTop = eventRef.current?.offsetTop || 0

    setResizeState({
      isResizing: true,
      handle,
      startY: clientY,
      originalHeight,
      currentDeltaY: 0,
      initialTop
    })

    console.log('🎯 Resize state set:', { handle, startY: clientY, originalHeight })
    onResizeStart?.(event, handle)

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      const deltaY = moveClientY - clientY

      // Update visual state for real-time feedback
      setResizeState(prev => ({
        ...prev,
        currentDeltaY: deltaY
      }))

      // Calculate preview times for visual feedback
      const currentStart = parseISO(event.startDateTime)
      const currentEnd = event.endDateTime ? parseISO(event.endDateTime) : addMinutes(currentStart, event.duration)

      // Snap to hour/half-hour positions - use dynamic pixelsPerHour
      const pixelsPer30Min = pixelsPerHour / 2
      const snapDelta = Math.round(deltaY / pixelsPer30Min) * pixelsPer30Min
      const deltaMinutes = (snapDelta / pixelsPer30Min) * 30 // 30 minutes per snap

      console.log('🔍 RESIZE MOVE DEBUG:', {
        eventTitle: event.title,
        handle,
        mousePosition: {
          startY: clientY,
          currentY: moveClientY,
          deltaY: deltaY
        },
        pixelCalculation: {
          pixelsPer30Min,
          snapDelta,
          deltaMinutes
        },
        originalTimes: {
          start: format(currentStart, 'HH:mm'),
          end: format(currentEnd, 'HH:mm'),
          duration: event.duration
        },
        currentHour,
        currentDate
      })

      let previewStart = currentStart
      let previewEnd = currentEnd

      if (handle === 'top') {
        // Top handle: change START time, keep END time fixed
        previewStart = addMinutes(currentStart, deltaMinutes)
        // previewEnd stays the same (currentEnd)
        console.log('🎯 Top handle resize:', {
          deltaY,
          deltaMinutes,
          originalStart: format(currentStart, 'HH:mm'),
          originalEnd: format(currentEnd, 'HH:mm'),
          newStart: format(previewStart, 'HH:mm'),
          newEnd: format(previewEnd, 'HH:mm')
        })

        // Ensure minimum duration of 30 minutes
        if (previewStart >= addMinutes(currentEnd, -30)) {
          previewStart = addMinutes(currentEnd, -30)
        }
      } else {
        // Bottom handle: change END time, keep START time fixed
        previewEnd = addMinutes(currentEnd, deltaMinutes)
        // previewStart stays the same (currentStart)
        console.log('🎯 Bottom handle resize:', {
          deltaY,
          deltaMinutes,
          originalStart: format(currentStart, 'HH:mm'),
          originalEnd: format(currentEnd, 'HH:mm'),
          newStart: format(previewStart, 'HH:mm'),
          newEnd: format(previewEnd, 'HH:mm')
        })

        // Ensure minimum duration of 30 minutes
        if (previewEnd <= addMinutes(currentStart, 30)) {
          previewEnd = addMinutes(currentStart, 30)
        }
      }

      // Update preview state for visual feedback
      setResizeState(prev => ({
        ...prev,
        currentDeltaY: deltaY,
        previewStart: format(previewStart, 'yyyy-MM-dd\'T\'HH:mm:ss'),
        previewEnd: format(previewEnd, 'yyyy-MM-dd\'T\'HH:mm:ss')
      }))
    }

    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      endEvent.preventDefault()
      endEvent.stopPropagation()

      const endClientY = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientY : endEvent.clientY
      const deltaY = endClientY - clientY

      console.log('🎯 Resize end - deltaY:', deltaY, 'handle:', handle)

      // Snap to hour/half-hour positions - use dynamic pixelsPerHour
      const pixelsPer30Min = pixelsPerHour / 2
      const snapDelta = Math.round(deltaY / pixelsPer30Min) * pixelsPer30Min
      const deltaMinutes = (snapDelta / pixelsPer30Min) * 30 // 30 minutes per snap

      console.log('🎯 Resize calculation:', { deltaY, snapDelta, deltaMinutes, pixelsPer30Min })

      const currentStart = parseISO(event.startDateTime)
      const currentEnd = event.endDateTime ? parseISO(event.endDateTime) : addMinutes(currentStart, event.duration)

      console.log('🔍 RESIZE END DEBUG:', {
        eventTitle: event.title,
        handle,
        originalEvent: {
          startDateTime: event.startDateTime,
          endDateTime: event.endDateTime,
          duration: event.duration,
          currentHour,
          currentDate
        },
        parsedTimes: {
          currentStart: format(currentStart, 'yyyy-MM-dd HH:mm:ss'),
          currentEnd: format(currentEnd, 'yyyy-MM-dd HH:mm:ss')
        },
        mouseData: {
          startY: clientY,
          endY: endClientY,
          deltaY,
          snapDelta,
          deltaMinutes
        },
        pixelSettings: {
          pixelsPer30Min,
          expectedPixelsPerHour: pixelsPer30Min * 2,
          passedPixelsPerHour: pixelsPerHour,
          calculatedPixelsPer30Min: pixelsPerHour / 2
        }
      })
      
      let newStart = currentStart
      let newEnd = currentEnd
      
      if (handle === 'top') {
        // Top handle: adjust start time (earlier = negative deltaMinutes, later = positive)
        newStart = addMinutes(currentStart, deltaMinutes)
        // Ensure minimum duration of 30 minutes
        if (newStart >= addMinutes(currentEnd, -30)) {
          newStart = addMinutes(currentEnd, -30)
        }
        // Don't change end time when using top handle
      } else {
        // Bottom handle: adjust end time (earlier = negative deltaMinutes, later = positive)
        newEnd = addMinutes(currentEnd, deltaMinutes)
        // Ensure minimum duration of 30 minutes
        if (newEnd <= addMinutes(currentStart, 30)) {
          newEnd = addMinutes(currentStart, 30)
        }
        // Don't change start time when using bottom handle
      }
      
      const newStartString = format(newStart, 'yyyy-MM-dd\'T\'HH:mm:ss')
      const newEndString = format(newEnd, 'yyyy-MM-dd\'T\'HH:mm:ss')

      const originalStartString = format(currentStart, 'yyyy-MM-dd\'T\'HH:mm:ss')
      const originalEndString = format(currentEnd, 'yyyy-MM-dd\'T\'HH:mm:ss')

      console.log('🎯 Resize end comparison:', {
        event: event.title,
        handle,
        originalStart: originalStartString,
        originalEnd: originalEndString,
        newStart: newStartString,
        newEnd: newEndString,
        hasChanged: newStartString !== originalStartString || newEndString !== originalEndString,
        finalTimes: {
          originalStartFormatted: format(currentStart, 'HH:mm'),
          originalEndFormatted: format(currentEnd, 'HH:mm'),
          newStartFormatted: format(newStart, 'HH:mm'),
          newEndFormatted: format(newEnd, 'HH:mm'),
          calculatedDurationMinutes: Math.abs(newEnd.getTime() - newStart.getTime()) / (1000 * 60)
        }
      })

      // Only trigger resize confirmation if times actually changed
      if (newStartString !== originalStartString || newEndString !== originalEndString) {
        console.log('🎯 Times changed, calling onResizeEnd')
        onResizeEnd?.(event, newStartString, newEndString)
      } else {
        console.log('🎯 No changes detected, skipping confirmation modal')
      }
      
      setResizeState({
        isResizing: false,
        handle: null,
        startY: 0,
        originalHeight: 0,
        currentDeltaY: 0,
        previewStart: undefined,
        previewEnd: undefined,
        initialTop: undefined
      })

      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }

  // Handle touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchState(prev => ({
      ...prev,
      isTouch: true,
      touchStartTime: Date.now(),
      longPressTimer: setTimeout(() => {
        // Start drag on long press
        const dragOffset = { x: 0, y: 0 }
        startDrag(event, dragOffset, { date: currentDate, hour: currentHour })
        const dragData: DragData = {
          event,
          originalSlot: { date: currentDate, hour: currentHour },
          dragOffset
        }
        onDragStart?.(dragData)
      }, 500) // 500ms long press to start drag
    }))
  }

  const handleTouchEnd = () => {
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer)
    }

    // If it was a quick tap and not a drag, handle as click
    if (!dragState.isDragging && Date.now() - touchState.touchStartTime < 300) {
      console.log('🎯 Touch tap triggered for:', event.title)
      onClick?.(event)
    } else {
      console.log('🎯 Touch tap suppressed - was drag or long press:', {
        isDragging: dragState.isDragging,
        duration: Date.now() - touchState.touchStartTime
      })
    }

    setTouchState({
      isTouch: false,
      touchStartTime: 0,
      longPressTimer: null
    })
  }

  // Clean up touch timer on unmount
  useEffect(() => {
    return () => {
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer)
      }
    }
  }, [touchState.longPressTimer])

  // Calculate dynamic styles for dragging and resizing
  const getDynamicStyles = () => {
    const isCurrentlyDragging = dragState.draggedEvent?.id === event.id

    // Base styles for dragging
    let styles: React.CSSProperties = {
      zIndex: isCurrentlyDragging ? 1000 : 20 // Ensure events are above DropZones (z-index 15 during drag, 5 otherwise)
    }

    if (isCurrentlyDragging) {
      styles.opacity = 0.8
    }

    // Add resize visual feedback by absolutely positioning the event during resize
    if (resizeState.isResizing && typeof resizeState.currentDeltaY === 'number') {
      const pixelsPer30Min = pixelsPerHour / 2
      const deltaY = resizeState.currentDeltaY || 0
      const snapDelta = Math.round(deltaY / pixelsPer30Min) * pixelsPer30Min
      const minHeight = 40
      const originalHeight = resizeState.originalHeight || 40
      const initialTop = resizeState.initialTop || 0

      if (resizeState.handle === 'top') {
        // Top handle resize: extend/shrink from the top
        if (snapDelta < 0) {
          // Extending upward: move element up and increase height
          styles.position = 'absolute'
          styles.top = `${initialTop + snapDelta}px`
          styles.left = '0'
          styles.right = '0'
          styles.height = `${originalHeight + Math.abs(snapDelta)}px`
        } else {
          // Shrinking from top: move element down and decrease height
          styles.position = 'absolute'
          styles.top = `${initialTop + snapDelta}px`
          styles.left = '0'
          styles.right = '0'
          styles.height = `${Math.max(minHeight, originalHeight - snapDelta)}px`
        }
      } else if (resizeState.handle === 'bottom') {
        // Bottom handle resize: extend/shrink from the bottom
        styles.position = 'absolute'
        styles.top = `${initialTop}px`
        styles.left = '0'
        styles.right = '0'
        styles.height = `${Math.max(minHeight, originalHeight + snapDelta)}px`
      }

      styles.transition = 'none' // Disable transitions during resize
      styles.zIndex = 1000
      styles.border = '2px dashed #f59e0b' // Dashed tactical gold border during resize
      styles.backgroundColor = 'rgba(245, 158, 11, 0.15)' // Slightly more visible background
    }

    return styles
  }

  return (
    <div
      ref={eventRef}
      data-event-block="true"
      draggable={!resizeState.isResizing}
      className={`
        relative group cursor-move select-none transition-all duration-200
        ${getPriorityColor(event.priority)}
        border-l-4 rounded-r-md shadow-sm hover:shadow-md
        ${isDragging || dragState.draggedEvent?.id === event.id ? 'shadow-lg scale-105' : ''}
        ${isCompact ? 'p-2' : 'p-3'}
        ${className}
      `}
      style={getDynamicStyles()}
      onDragStart={(e) => {
        console.log('🎯 HTML5 dragStart triggered for:', event.title)

        // Set drag data for HTML5 API
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/json', JSON.stringify({
          eventId: event.id,
          eventTitle: event.title
        }))

        // Start drag in context
        const dragOffset = { x: 0, y: 0 } // HTML5 drag doesn't need precise offset
        startDrag(event, dragOffset, { date: currentDate, hour: currentHour })

        // Call legacy callback
        const dragData: DragData = {
          event,
          originalSlot: { date: currentDate, hour: currentHour },
          dragOffset
        }
        onDragStart?.(dragData)
      }}
      onDragEnd={(e) => {
        console.log('🎯 HTML5 dragEnd triggered for:', event.title)

        // End drag in context
        endDrag()

        // Legacy callback with drop zone detection
        const dropZoneData: DropZoneData | null = null // HTML5 API handles this differently
        onDragEnd?.({ event, originalSlot: { date: currentDate, hour: currentHour }, dragOffset: { x: 0, y: 0 } }, dropZoneData)
      }}
      onMouseDown={(e) => {
        // Check if clicking on resize handles - if so, don't allow drag
        const target = e.target as HTMLElement
        if (target.closest('[data-resize-handle]')) {
          console.log('🎯 Resize handle detected, preventing drag')
          e.preventDefault()
          return
        }
      }}
      onClick={(e) => {
        console.log('🎯 EVENT CLICK DEBUG:', {
          eventTitle: event.title,
          target: (e.target as HTMLElement).tagName,
          currentTarget: (e.currentTarget as HTMLElement).tagName,
          zIndex: (e.currentTarget as HTMLElement).style.zIndex,
          pointerEvents: (e.currentTarget as HTMLElement).style.pointerEvents,
          isDragging: dragState.isDragging,
          isTouch: touchState.isTouch,
          position: (e.currentTarget as HTMLElement).style.position,
          top: (e.currentTarget as HTMLElement).style.top,
          eventPhase: e.eventPhase
        })
        e.stopPropagation()
        // Only trigger onClick if it wasn't a drag operation (context will tell us)
        if (!dragState.isDragging && !touchState.isTouch) {
          console.log('🎯 Event click triggered for:', event.title)
          onClick?.(event)
        } else {
          console.log('🎯 Click suppressed - was drag operation or touch:', {
            isDragging: dragState.isDragging,
            isTouch: touchState.isTouch
          })
        }
      }}
      onMouseEnter={(e) => {
        console.log('🎯 EVENT MOUSE ENTER:', {
          eventTitle: event.title,
          target: (e.target as HTMLElement).tagName,
          currentTarget: (e.currentTarget as HTMLElement).tagName,
          zIndex: (e.currentTarget as HTMLElement).style.zIndex
        })
        setIsHovered(true)
      }}
      onMouseLeave={(e) => {
        console.log('🎯 EVENT MOUSE LEAVE:', {
          eventTitle: event.title,
          target: (e.target as HTMLElement).tagName,
          currentTarget: (e.currentTarget as HTMLElement).tagName
        })
        setIsHovered(false)
      }}
    >

      {/* Resize Handles */}
      {showResizeHandles && !isCompact && (
        <>
          {/* Top resize handle */}
          <div
            data-resize-handle="top"
            draggable={false}
            className="absolute -top-1 left-0 right-0 h-2 cursor-n-resize opacity-0 group-hover:opacity-100 transition-opacity bg-current bg-opacity-20 z-50 pointer-events-none group-hover:pointer-events-auto"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleResizeStart(e, 'top')
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleResizeStart(e, 'top')
            }}
          >
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-current rounded-full opacity-60" />
          </div>

          {/* Bottom resize handle */}
          <div
            data-resize-handle="bottom"
            draggable={false}
            className="absolute -bottom-1 left-0 right-0 h-2 cursor-s-resize opacity-0 group-hover:opacity-100 transition-opacity bg-current bg-opacity-20 z-50 pointer-events-none group-hover:pointer-events-auto"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleResizeStart(e, 'bottom')
            }}
            onTouchStart={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleResizeStart(e, 'bottom')
            }}
          >
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-current rounded-full opacity-60" />
          </div>
        </>
      )}

      {/* Event Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-1">
          <h4 className={`font-semibold font-primary ${isCompact ? 'text-xs' : 'text-sm'} truncate mr-2`}>
            {event.title}
          </h4>
          <div className="flex items-center gap-1">
            {((conflicts?.hasConflicts && showConflicts) || conflictingEvents.length > 0) && (
              <button
                onClick={handleConflictClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  transition-colors hover:opacity-80 border
                  ${conflicts?.conflicts.some(c => c.severity === 'critical') || conflictingEvents.length > 0
                    ? 'text-red-600 bg-red-100 border-red-200'
                    : conflicts?.conflicts.some(c => c.severity === 'error')
                    ? 'text-orange-600 bg-orange-100 border-orange-200'
                    : 'text-yellow-600 bg-yellow-100 border-yellow-200'
                  }
                `}
                title={`${(conflicts?.conflicts.length || 0) + conflictingEvents.length} conflict(s) - Click to resolve`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>{(conflicts?.conflicts.length || 0) + conflictingEvents.length}</span>
              </button>
            )}
            <Badge
              variant="outline"
              className={`text-xs ${isCompact ? 'hidden' : ''}`}
            >
              {event.priority.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className={`space-y-1 text-xs opacity-80 ${isCompact ? 'hidden' : ''}`}>
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatEventTime(event.startDateTime, event.endDateTime)}</span>
          </div>
          
          {event.location && (
            <div className="flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          
          {event.clientName && (
            <div className="flex items-center">
              <User className="w-3 h-3 mr-1" />
              <span className="truncate">{event.clientName}</span>
            </div>
          )}
        </div>

        {/* Drag indicator */}
        {(isDragging || dragState.draggedEvent?.id === event.id) && (
          <div className="absolute -top-2 -right-2 bg-tactical-gold text-hud-text-primary rounded-full p-1">
            <Move className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Unified conflict details popup above the event on hover */}
      {isHovered && ((conflicts?.hasConflicts && showConflicts) || conflictingEvents.length > 0) && (
        <div
          className="absolute left-0 right-0 bg-black/95 text-white text-xs rounded-md shadow-lg z-40 p-3 -top-2"
          style={{
            transform: 'translateY(-100%)',
            maxWidth: '280px'
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="font-semibold mb-2 text-red-300">
            {(conflicts?.conflicts.length || 0) + conflictingEvents.length} Total Conflict{((conflicts?.conflicts.length || 0) + conflictingEvents.length) > 1 ? 's' : ''}:
          </div>

          <div className="space-y-3 max-h-28 overflow-y-auto">
            {/* Show system-detected conflicts first */}
            {conflicts?.hasConflicts && showConflicts && (
              <div>
                <div className="text-xs text-yellow-300 font-medium mb-1">
                  System Conflicts ({conflicts.conflicts.length}):
                </div>
                {conflicts.conflicts.slice(0, 2).map((conflict, index) => (
                  <div key={conflict.id} className="border-l-2 border-yellow-400 pl-2 mb-1">
                    <div className="text-xs text-gray-300">
                      • {conflict.message}
                    </div>
                  </div>
                ))}
                {conflicts.conflicts.length > 2 && (
                  <div className="text-xs text-gray-400 pl-2">
                    +{conflicts.conflicts.length - 2} more system conflicts...
                  </div>
                )}
              </div>
            )}

            {/* Show conflicting events */}
            {conflictingEvents.length > 0 && (
              <div>
                <div className="text-xs text-red-300 font-medium mb-1">
                  Overlapping Events ({conflictingEvents.length}):
                </div>
                {conflictingEvents.map((conflictEvent, index) => (
                  <div
                    key={conflictEvent.id}
                    className="border-l-2 border-red-400 pl-2 hover:bg-white/10 rounded p-1 cursor-pointer mb-1"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onClick?.(conflictEvent)
                    }}
                  >
                    <div className="font-medium text-white">
                      {conflictEvent.title}
                    </div>
                    <div className="text-xs text-gray-300">
                      {formatEventTime(conflictEvent.startDateTime, conflictEvent.endDateTime)}
                    </div>
                    {conflictEvent.clientName && (
                      <div className="text-xs text-gray-400">
                        {conflictEvent.clientName}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-400 mt-2 text-center border-t border-gray-600 pt-2">
            {conflictingEvents.length > 0 ? 'Click events to view details • ' : ''}Click triangle to resolve conflicts
          </div>

          {/* Arrow pointing down to the event */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95"></div>
        </div>
      )}

    </div>
  )
}

export default DragAndDropEvent