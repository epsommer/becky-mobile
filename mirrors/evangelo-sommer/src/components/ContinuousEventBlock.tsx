"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { Clock, MapPin, User, AlertTriangle, Move, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UnifiedEvent, Priority } from '@/components/EventCreationModal'
import { ConflictResult, ConflictSeverity } from '@/lib/conflict-detector'
import { useDragDrop } from '@/components/DragDropContext'

export interface ContinuousEventBlockProps {
  event: UnifiedEvent
  conflicts?: ConflictResult
  conflictingEvents?: UnifiedEvent[]
  startHour: number
  durationHours: number
  pixelsPerHour: number
  onDragStart?: (event: UnifiedEvent) => void
  onDragEnd?: (event: UnifiedEvent, newSlot: { date: string; hour: number }) => void
  onEventClick?: (event: UnifiedEvent) => void
  onConflictClick?: (conflicts: ConflictResult) => void
  onResizeStart?: (event: UnifiedEvent, handle: 'top' | 'bottom') => void
  onResizeEnd?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  isDragging?: boolean
  showConflicts?: boolean
  isCompact?: boolean
  className?: string
}

interface BlockPosition {
  top: number
  height: number
  left: number
  width: number
}

const ContinuousEventBlock: React.FC<ContinuousEventBlockProps> = ({
  event,
  conflicts,
  conflictingEvents = [],
  startHour,
  durationHours,
  pixelsPerHour,
  onDragStart,
  onDragEnd,
  onEventClick,
  onConflictClick,
  onResizeStart,
  onResizeEnd,
  isDragging = false,
  showConflicts = true,
  isCompact = false,
  className = ''
}) => {
  const blockRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [dragState, setDragState] = useState({
    isDragging: false,
    startPos: { x: 0, y: 0 }
  })

  // Resize state
  const [resizeState, setResizeState] = useState<{
    isResizing: boolean
    handle: 'top' | 'bottom' | null
    startY: number
    originalHeight: number
    currentDeltaY: number
  }>({
    isResizing: false,
    handle: null,
    startY: 0,
    originalHeight: 0,
    currentDeltaY: 0
  })

  const { dragState: globalDragState } = useDragDrop()

  // Calculate precise positioning based on start time
  const blockPosition = useMemo((): BlockPosition => {
    const startTime = parseISO(event.startDateTime)
    const startMinutes = startTime.getMinutes()
    const duration = event.duration || 60
    
    // Calculate exact pixel position
    const minutesFromHourStart = startMinutes
    const topOffset = (minutesFromHourStart / 60) * pixelsPerHour
    const height = (duration / 60) * pixelsPerHour
    
    return {
      top: startHour * pixelsPerHour + topOffset,
      height: Math.max(height, 30), // Minimum height for visibility
      left: 0,
      width: 100 // Full width of time slot
    }
  }, [event, startHour, pixelsPerHour])

  // Get priority-based colors
  const getPriorityColor = (priority: Priority): string => {
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
        return 'bg-tactical-grey-800/30 text-tactical-grey-200 border-l-gray-500'
    }
  }

  // Get conflict-based styling
  const getConflictStyling = (): string => {
    if (!conflicts?.hasConflicts || !showConflicts) return ''
    
    const maxSeverity = conflicts.conflicts.reduce((max, conflict) => {
      const severityOrder: Record<ConflictSeverity, number> = { 
        warning: 1, error: 2, critical: 3 
      }
      return severityOrder[conflict.severity] > severityOrder[max] ? conflict.severity : max
    }, 'warning' as ConflictSeverity)

    switch (maxSeverity) {
      case 'critical':
        return 'ring-2 ring-red-500 bg-red-900/20 border-l-red-700'
      case 'error':
        return 'ring-2 ring-orange-400 bg-orange-900/20 border-l-orange-600'
      case 'warning':
        return 'ring-1 ring-yellow-400 bg-yellow-900/20 border-l-yellow-500'
      default:
        return ''
    }
  }

  // Format time display
  const formatEventTime = (startDateTime: string, duration: number): string => {
    const start = parseISO(startDateTime)
    const end = addMinutes(start, duration)
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't start drag if resizing
    if (resizeState.isResizing) {
      return
    }

    // Only start drag from the drag handle area
    const target = e.target as HTMLElement
    const isDragHandle = target.closest('.cursor-grab') || target.closest('.cursor-grabbing')
    const isResizeHandle = target.closest('[data-resize-handle]')

    if (!isDragHandle || isResizeHandle) {
      return // Don't start drag from other areas or resize handles
    }

    e.preventDefault()
    const isTouch = 'touches' in e
    const clientX = isTouch ? e.touches[0].clientX : e.clientX
    const clientY = isTouch ? e.touches[0].clientY : e.clientY

    setDragState({
      isDragging: true,
      startPos: { x: clientX, y: clientY }
    })

    onDragStart?.(event)
  }, [event, onDragStart, resizeState.isResizing])

  // Handle drag end
  const handleDragEnd = useCallback((endEvent: MouseEvent | TouchEvent) => {
    const endClientX = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientX : endEvent.clientX
    const endClientY = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientY : endEvent.clientY
    
    // Find drop zone under cursor
    const elementUnder = document.elementFromPoint(endClientX, endClientY)
    const dropZone = elementUnder?.closest('[data-drop-zone]')
    
    if (dropZone) {
      const dropDate = dropZone.getAttribute('data-drop-date') || ''
      const dropHour = parseInt(dropZone.getAttribute('data-drop-hour') || '0')
      
      onDragEnd?.(event, { date: dropDate, hour: dropHour })
    }

    setDragState({
      isDragging: false,
      startPos: { x: 0, y: 0 }
    })
  }, [event, onDragEnd])

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent, handle: 'top' | 'bottom') => {
    console.log('🎯 ContinuousEventBlock resize start - handle:', handle, 'event:', event.title)
    e.preventDefault()
    e.stopPropagation()

    const isTouch = 'touches' in e
    const clientY = isTouch ? e.touches[0].clientY : e.clientY

    const originalHeight = blockRef.current?.offsetHeight || 0

    setResizeState({
      isResizing: true,
      handle,
      startY: clientY,
      originalHeight,
      currentDeltaY: 0
    })

    onResizeStart?.(event, handle)

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY
      const deltaY = moveClientY - clientY

      setResizeState(prev => ({
        ...prev,
        currentDeltaY: deltaY
      }))
    }

    const handleEnd = (endEvent: MouseEvent | TouchEvent) => {
      endEvent.preventDefault()
      endEvent.stopPropagation()

      const endClientY = 'changedTouches' in endEvent ? endEvent.changedTouches[0].clientY : endEvent.clientY
      const deltaY = endClientY - clientY

      console.log('🎯 ContinuousEventBlock resize end - deltaY:', deltaY, 'handle:', handle)

      // Calculate time changes for multi-hour events
      // For multi-hour events, snap to 30-minute intervals (pixelsPerHour/2 = pixels per 30min)
      const pixelsPer30Min = pixelsPerHour / 2
      const snapDelta = Math.round(deltaY / pixelsPer30Min) * pixelsPer30Min
      const deltaMinutes = (snapDelta / pixelsPer30Min) * 30

      const currentStart = parseISO(event.startDateTime)
      const currentEnd = event.endDateTime ? parseISO(event.endDateTime) : addMinutes(currentStart, event.duration)

      let newStart = currentStart
      let newEnd = currentEnd

      if (handle === 'top') {
        // Top handle: change START time, keep END time fixed
        newStart = addMinutes(currentStart, deltaMinutes)
        // Ensure minimum duration of 30 minutes
        if (newStart >= addMinutes(currentEnd, -30)) {
          newStart = addMinutes(currentEnd, -30)
        }
      } else {
        // Bottom handle: change END time, keep START time fixed
        newEnd = addMinutes(currentEnd, deltaMinutes)
        // Ensure minimum duration of 30 minutes
        if (newEnd <= addMinutes(currentStart, 30)) {
          newEnd = addMinutes(currentStart, 30)
        }
      }

      const newStartString = format(newStart, 'yyyy-MM-dd\'T\'HH:mm:ss')
      const newEndString = format(newEnd, 'yyyy-MM-dd\'T\'HH:mm:ss')

      const originalStartString = format(currentStart, 'yyyy-MM-dd\'T\'HH:mm:ss')
      const originalEndString = format(currentEnd, 'yyyy-MM-dd\'T\'HH:mm:ss')

      console.log('🎯 ContinuousEventBlock resize end comparison:', {
        event: event.title,
        handle,
        originalStart: originalStartString,
        originalEnd: originalEndString,
        newStart: newStartString,
        newEnd: newEndString,
        hasChanged: newStartString !== originalStartString || newEndString !== originalEndString
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
        currentDeltaY: 0
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
  }, [event, onResizeStart, onResizeEnd, pixelsPerHour])

  // Handle click
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Don't handle click if it's on the conflict button or drag handle
    const target = e.target as HTMLElement
    const isConflictButton = target.closest('button[class*="conflict"]') || target.closest('button[class*="ring-orange"]')
    const isDragHandle = target.closest('.cursor-grab') || target.closest('.cursor-grabbing')

    if (isConflictButton || isDragHandle) {
      return // Let the specific handlers deal with these
    }

    e.preventDefault()
    e.stopPropagation()

    if (!dragState.isDragging) {
      console.log('🔥 ContinuousEventBlock clicked:', event.title)
      onEventClick?.(event)
    }
  }, [event, dragState.isDragging, onEventClick])

  // Handle conflict click
  const handleConflictClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (conflicts) {
      onConflictClick?.(conflicts)
    }
  }, [conflicts, onConflictClick])

  // Calculate dynamic styles with resize feedback
  const blockStyles = useMemo(() => {
    let styles: React.CSSProperties = {
      position: 'absolute' as const,
      top: `${blockPosition.top}px`,
      height: `${blockPosition.height}px`,
      left: '0',
      right: '0',
      zIndex: isDragging ? 1000 : conflicts?.hasConflicts ? 30 : 25, // Ensure events are above DropZones (z-index 15 during drag, 5 otherwise)
      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      opacity: isDragging ? 0.9 : 1,
      transition: isDragging ? 'none' : 'all 0.2s ease-in-out'
    }

    // Add resize visual feedback
    if (resizeState.isResizing && typeof resizeState.currentDeltaY === 'number') {
      const pixelsPer30Min = pixelsPerHour / 2
      const deltaY = resizeState.currentDeltaY || 0
      const snapDelta = Math.round(deltaY / pixelsPer30Min) * pixelsPer30Min

      if (resizeState.handle === 'top') {
        // Top handle resize: extend/shrink from the top
        if (snapDelta < 0) {
          // Extending upward: increase height and move element up
          styles.transform = `translateY(${snapDelta}px)`
          styles.height = `${blockPosition.height + Math.abs(snapDelta)}px`
        } else {
          // Shrinking from top: move element down and decrease height
          styles.transform = `translateY(${snapDelta}px)`
          styles.height = `${Math.max(40, blockPosition.height - snapDelta)}px` // Minimum 40px height
        }
      } else if (resizeState.handle === 'bottom') {
        // Bottom handle resize: extend/shrink from the bottom
        styles.height = `${Math.max(40, blockPosition.height + snapDelta)}px` // Minimum 40px height
      }

      styles.transition = 'none' // Disable transitions during resize
      styles.zIndex = 1000
      styles.border = '2px dashed #f59e0b' // Dashed tactical gold border during resize
      styles.backgroundColor = 'rgba(245, 158, 11, 0.15)' // Slightly more visible background
    }

    return styles
  }, [blockPosition, isDragging, conflicts, resizeState, pixelsPerHour])

  return (
    <div
      ref={blockRef}
      data-event-block="true"
      style={blockStyles}
      className={`
        group cursor-pointer select-none
        ${getPriorityColor(event.priority)}
        ${getConflictStyling()}
        border-l-4 rounded-r-md shadow-sm hover:shadow-md
        ${isHovered ? 'shadow-lg' : ''}
        ${isCompact ? 'px-2 py-1' : 'px-3 py-2'}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      {/* Drag handle */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-20 group-hover:opacity-40 cursor-grab active:cursor-grabbing">
        <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-current" />
        </div>
      </div>

      {/* Event content */}
      <div
        className="relative z-10 h-full flex flex-col justify-between cursor-pointer"
        onClick={handleClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <h4 className={`font-semibold font-primary ${
            isCompact ? 'text-xs' : blockPosition.height < 60 ? 'text-sm' : 'text-base'
          } truncate mr-2 leading-tight`}>
            {event.title}
          </h4>
          
          {/* Priority and conflict badges */}
          <div className="flex items-center gap-1">
            {!isCompact && (
              <Badge 
                variant="outline" 
                className="text-xs"
              >
                {event.priority.toUpperCase()}
              </Badge>
            )}
            
            {/* Unified Conflict indicator - combines both conflict types */}
            {((conflicts?.hasConflicts && showConflicts) || conflictingEvents.length > 0) && (
              <button
                onClick={handleConflictClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                  transition-colors hover:opacity-80
                  ${conflicts?.conflicts.some(c => c.severity === 'critical') || conflictingEvents.length > 0
                    ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                    : conflicts?.conflicts.some(c => c.severity === 'error')
                    ? 'bg-orange-900/30 text-orange-300 border border-orange-800/50'
                    : 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                  }
                `}
              >
                <AlertTriangle className="w-3 h-3" />
                {(conflicts?.conflicts.length || 0) + conflictingEvents.length}
              </button>
            )}
          </div>
        </div>

        {/* Event details - only show if there's enough height */}
        {blockPosition.height >= 80 && !isCompact && (
          <div className="space-y-1 text-xs opacity-90">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {formatEventTime(event.startDateTime, event.duration || 60)}
              </span>
            </div>
            
            {event.location && (
              <div className="flex items-center">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            
            {event.clientName && (
              <div className="flex items-center">
                <User className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{event.clientName}</span>
              </div>
            )}
          </div>
        )}

        {/* Minimal details for smaller heights */}
        {blockPosition.height >= 40 && blockPosition.height < 80 && !isCompact && (
          <div className="text-xs opacity-90">
            <div className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              <span className="truncate">
                {format(parseISO(event.startDateTime), 'h:mm a')}
              </span>
              {event.clientName && (
                <>
                  <span className="mx-1">•</span>
                  <span className="truncate">{event.clientName}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute -top-2 -right-2 bg-tactical-gold text-hud-text-primary rounded-full p-1">
          <Move className="w-3 h-3" />
        </div>
      )}

      {/* Resize Handles */}
      {!isCompact && (
        <>
          {/* Top resize handle */}
          <div
            data-resize-handle="top"
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

      {/* Conflict details overlay on hover */}
      {conflicts?.hasConflicts && showConflicts && isHovered && (
        <div
          className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white text-xs p-2 rounded-b-md cursor-pointer hover:bg-opacity-100 transition-all z-20"
          onClick={handleConflictClick}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          title="Click to resolve conflicts"
        >
          <div className="font-medium mb-1">
            {conflicts.conflicts.length} Conflict{conflicts.conflicts.length > 1 ? 's' : ''}:
          </div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {conflicts.conflicts.slice(0, 2).map((conflict, index) => (
              <div key={conflict.id} className="text-xs opacity-90">
                • {conflict.message}
              </div>
            ))}
            {conflicts.conflicts.length > 2 && (
              <div className="text-xs opacity-75">
                +{conflicts.conflicts.length - 2} more...
              </div>
            )}
          </div>
          <div className="text-xs opacity-60 mt-1 text-center">
            Click to resolve conflicts
          </div>
        </div>
      )}

      {/* Unified conflict details popup above the event on hover */}
      {isHovered && ((conflicts?.hasConflicts && showConflicts) || conflictingEvents.length > 0) && (
            <div
              className="absolute left-0 right-0 bg-black/95 text-white text-xs rounded-md shadow-lg z-40 p-3"
              style={{
                bottom: `${blockPosition.height + 8}px`,
                maxWidth: '300px'
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <div className="font-semibold mb-2 text-red-300">
                {(conflicts?.conflicts.length || 0) + conflictingEvents.length} Total Conflict{((conflicts?.conflicts.length || 0) + conflictingEvents.length) > 1 ? 's' : ''}:
              </div>

              <div className="space-y-3 max-h-32 overflow-y-auto">
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
                          onEventClick?.(conflictEvent)
                        }}
                      >
                        <div className="font-medium text-white">
                          {conflictEvent.title}
                        </div>
                        <div className="text-xs text-gray-300">
                          {format(parseISO(conflictEvent.startDateTime), 'h:mm a')}
                          {conflictEvent.endDateTime && ` - ${format(parseISO(conflictEvent.endDateTime), 'h:mm a')}`}
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

export default ContinuousEventBlock