"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Plus, Target, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { useDragDrop } from './DragDropContext'
import { UnifiedEvent } from '@/components/EventCreationModal'

interface DropZoneProps {
  date: string
  hour: number
  isOccupied?: boolean
  events?: UnifiedEvent[]
  onTimeSlotClick?: (date: Date, hour: number) => void
  className?: string
  children?: React.ReactNode
  showAlways?: boolean
  compact?: boolean
}

const DropZone: React.FC<DropZoneProps> = ({
  date,
  hour,
  isOccupied = false,
  events = [],
  onTimeSlotClick,
  className = '',
  children,
  showAlways = false,
  compact = false
}) => {
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  
  const {
    dragState,
    dropZoneState,
    showDropZones,
    setHoveredDropZone,
    setActiveDropZone
  } = useDragDrop()

  // Check if this is the currently active drop zone
  const isActiveDropZone = (
    dropZoneState.activeDropZone?.date === date &&
    dropZoneState.activeDropZone?.hour === hour
  )

  // Check if this is the currently hovered drop zone
  const isHoveredDropZone = (
    dropZoneState.hoveredDropZone?.date === date &&
    dropZoneState.hoveredDropZone?.hour === hour
  )

  // Format time for display
  const formatTimeSlot = (hour: number) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const period = hour < 12 ? 'AM' : 'PM'
    return `${displayHour}:00 ${period}`
  }

  // Handle drag enter
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 DropZone.handleDragEnter called for:', date, hour, 'isDragging:', dragState.isDragging)
    if (dragState.isDragging) {
      console.log('🎯 Setting dragged over and hovered drop zone')
      setIsDraggedOver(true)
      setHoveredDropZone({ date, hour })
    }
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 DropZone.handleDragOver called for:', date, hour, 'isDragging:', dragState.isDragging)
    if (dragState.isDragging) {
      console.log('🎯 Setting active drop zone to:', date, hour)
      setActiveDropZone({ date, hour })
    }
  }

  // Handle drag leave
  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger leave if we're actually leaving the drop zone
    const rect = dropZoneRef.current?.getBoundingClientRect()
    if (rect) {
      const { clientX, clientY } = e
      const isOutside = (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      )
      
      if (isOutside) {
        setIsDraggedOver(false)
        if (isHoveredDropZone) {
          setHoveredDropZone(null)
        }
        if (isActiveDropZone) {
          setActiveDropZone(null)
        }
      }
    }
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    console.log('🎯 DropZone.handleDrop called for:', date, hour)
    setIsDraggedOver(false)
    // The actual drop logic is handled in the DragDropContext
  }

  // Handle click to create new event
  const handleClick = (e: React.MouseEvent) => {
    console.log('🖱️ DROPZONE CLICK:', {
      hour,
      date: formatTimeSlot(hour),
      isOccupied,
      hasChildren: !!children,
      target: (e.target as HTMLElement).tagName,
      currentTarget: (e.currentTarget as HTMLElement).tagName,
      zIndex: (e.currentTarget as HTMLElement).style.zIndex,
      pointerEvents: (e.currentTarget as HTMLElement).style.pointerEvents
    })

    // Don't trigger time slot click if clicking on an event
    const target = e.target as HTMLElement
    const clickedOnEvent = target.closest('[data-event-block]') || target.closest('.group.cursor-pointer')

    if (!dragState.isDragging && onTimeSlotClick && !clickedOnEvent) {
      const clickDate = new Date(date + 'T00:00:00')
      onTimeSlotClick(clickDate, hour)
    }
  }

  // Handle mouse events for hover feedback
  const handleMouseEnter = (e: React.MouseEvent) => {
    console.log('🖱️ DROPZONE MOUSE - Enter:', {
      hour,
      date: formatTimeSlot(hour),
      isOccupied,
      hasChildren: !!children,
      isDragging: dragState.isDragging,
      target: (e.target as HTMLElement).tagName,
      currentTarget: (e.currentTarget as HTMLElement).tagName,
      zIndex: (e.currentTarget as HTMLElement).style.zIndex
    })
    if (!dragState.isDragging) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    console.log('🖱️ DROPZONE MOUSE - Leave:', {
      hour,
      date: formatTimeSlot(hour),
      target: (e.target as HTMLElement).tagName,
      currentTarget: (e.currentTarget as HTMLElement).tagName
    })
    setIsHovered(false)
  }

  // Check if parent has group-hover class (for time column integration)
  const [isGroupHovered, setIsGroupHovered] = useState(false)
  
  useEffect(() => {
    const parentElement = dropZoneRef.current?.closest('.group')
    if (!parentElement) return
    
    const handleGroupMouseEnter = () => setIsGroupHovered(true)
    const handleGroupMouseLeave = () => setIsGroupHovered(false)
    
    parentElement.addEventListener('mouseenter', handleGroupMouseEnter)
    parentElement.addEventListener('mouseleave', handleGroupMouseLeave)
    
    return () => {
      parentElement.removeEventListener('mouseenter', handleGroupMouseEnter)
      parentElement.removeEventListener('mouseleave', handleGroupMouseLeave)
    }
  }, [])

  // Visual state calculations
  const effectiveHovered = isHovered || isGroupHovered
  const shouldShowDropZone = showDropZones || showAlways || effectiveHovered
  const shouldShowContent = isOccupied || showDropZones || showAlways || effectiveHovered // Always show content if there are events

  const isValidDropTarget = !isOccupied || events.length === 0

  // Determine if this DropZone should be interactive
  const shouldBeInteractive = shouldShowContent && (effectiveHovered || showDropZones || showAlways || dragState.isDragging)

  // For drag operations, always allow drag events even if not visually interactive
  const shouldAllowDragEvents = dragState.isDragging || shouldBeInteractive

  // When there are events (children), the DropZone should not intercept pointer events unless dragging
  const shouldEnablePointerEvents = children ? dragState.isDragging : shouldAllowDragEvents
  const isCurrentTime = () => {
    const now = new Date()
    const currentDate = format(now, 'yyyy-MM-dd')
    const currentHour = now.getHours()
    return date === currentDate && hour === currentHour
  }

  return (
    <div
      ref={dropZoneRef}
      data-drop-zone="true"
      data-drop-date={date}
      data-drop-hour={hour.toString()}
      className={`
        relative transition-all duration-200 ease-in-out h-full overflow-visible
        ${compact ? 'min-h-[40px]' : 'min-h-[60px]'}
        ${shouldShowContent ? 'opacity-100' : 'opacity-0'}
        ${isActiveDropZone && isValidDropTarget ?
          'bg-tactical-gold-light border-2 border-tactical-gold shadow-md scale-105' :
          ''}
        ${isDraggedOver && isValidDropTarget ?
          'bg-green-50 border-2 border-green-400 shadow-lg' :
          ''}
        ${isDraggedOver && !isValidDropTarget ?
          'bg-red-50 border-2 border-red-400' :
          ''}
        ${effectiveHovered && !dragState.isDragging && !isOccupied ?
          'bg-tactical-grey-100 border-2 border-tactical-grey-400' :
          isOccupied ? '' : 'border-2 border-transparent'}
        ${isCurrentTime() ? 'bg-tactical-gold-light bg-opacity-30' : ''}
        ${className}
      `}
      style={{
        zIndex: isOccupied ? 1 :                          // Occupied slots always stay below events
               dragState.isDragging ? 10 :                // During drag, but still below events (reduced from 15)
               shouldBeInteractive && !isOccupied ? 2 : 1, // Interactive but well below events (reduced from 5)
        pointerEvents: shouldEnablePointerEvents ? 'auto' : 'none'
      }}
      onDragEnter={shouldAllowDragEvents ? handleDragEnter : undefined}
      onDragOver={shouldAllowDragEvents ? handleDragOver : undefined}
      onDragLeave={shouldAllowDragEvents ? handleDragLeave : undefined}
      onDrop={shouldAllowDragEvents ? handleDrop : undefined}
      onMouseEnter={shouldBeInteractive && !children ? handleMouseEnter : undefined}
      onMouseLeave={shouldBeInteractive && !children ? handleMouseLeave : undefined}
      onClick={shouldBeInteractive && !children ? handleClick : undefined}
    >
      {/* Content area */}
      <div
        className="relative h-full w-full"
        style={{
          pointerEvents: 'auto' // Always allow pointer events for children (events)
        }}
      >
        {children}
        
        {/* Drop zone indicator */}
        {shouldShowDropZone && (!isOccupied || dragState.isDragging) && (
          <div
            className={`
              absolute inset-0 flex items-center justify-center
              ${isOccupied ? 'bg-hud-background-secondary bg-opacity-20' : ''}
              ${compact ? 'text-xs' : 'text-sm'}
            `}
            style={{
              pointerEvents: children ? 'none' : 'auto' // Don't block events when there are children
            }}
          >
            {/* Valid drop target */}
            {isValidDropTarget && dragState.isDragging && (
              <div className="flex flex-col items-center gap-1 text-tactical-gold font-primary">
                <Target className={compact ? 'w-4 h-4' : 'w-6 h-6'} />
                <span className="font-semibold text-xs">Drop here</span>
                {!compact && (
                  <span className="text-xs opacity-75">
                    {formatTimeSlot(hour)}
                  </span>
                )}
              </div>
            )}
            
            {/* Invalid drop target */}
            {!isValidDropTarget && dragState.isDragging && (
              <div className="flex flex-col items-center gap-1 text-red-600 font-primary">
                <div className={`${compact ? 'w-4 h-4' : 'w-6 h-6'} rounded-full border-2 border-current flex items-center justify-center`}>
                  <span className="text-xs">×</span>
                </div>
                <span className="font-semibold text-xs">Occupied</span>
              </div>
            )}
            
            {/* Create event prompt */}
            {!dragState.isDragging && effectiveHovered && !isOccupied && (
              <div
                className="flex items-center gap-2 text-medium-grey hover:text-hud-text-primary font-primary bg-hud-background-secondary border border-hud-border rounded px-3 py-2 shadow-sm transition-colors"
                style={{ zIndex: 3 }} // Ensure it's above DropZone but below events (which have z-index 20+)
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium text-xs whitespace-nowrap">Add Event</span>
              </div>
            )}
            
            {/* Current time indicator */}
            {isCurrentTime() && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-tactical-gold shadow-sm">
                <div className="absolute -left-1 -top-1 w-2 h-2 bg-tactical-gold rounded-full shadow-sm">
                  <div className="absolute inset-0.5 bg-hud-text-primary rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Time slot info overlay */}
        {showDropZones && !compact && (
          <div className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 py-0.5 rounded font-primary">
            <Clock className="inline w-3 h-3 mr-1" />
            {formatTimeSlot(hour)}
          </div>
        )}
      </div>
    </div>
  )
}

export default DropZone