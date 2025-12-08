"use client"

import React, { createContext, useContext, useState, useRef, useCallback } from 'react'
import { UnifiedEvent } from '@/components/EventCreationModal'

export interface DragState {
  isDragging: boolean
  draggedEvent: UnifiedEvent | null
  dragOffset: { x: number; y: number }
  originalSlot: { date: string; hour: number } | null
}

export interface DropZoneState {
  activeDropZone: { date: string; hour: number } | null
  hoveredDropZone: { date: string; hour: number } | null
}

export interface ResizeState {
  isResizing: boolean
  resizedEvent: UnifiedEvent | null
  resizeHandle: 'top' | 'bottom' | null
}

interface DragDropContextType {
  // States
  dragState: DragState
  dropZoneState: DropZoneState
  resizeState: ResizeState
  
  // Actions
  startDrag: (event: UnifiedEvent, offset: { x: number; y: number }, originalSlot: { date: string; hour: number }) => void
  endDrag: () => void
  setHoveredDropZone: (zone: { date: string; hour: number } | null) => void
  setActiveDropZone: (zone: { date: string; hour: number } | null) => void
  startResize: (event: UnifiedEvent, handle: 'top' | 'bottom') => void
  endResize: () => void
  
  // Callbacks
  onEventDrop?: (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => void
  onEventResize?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
  
  // Visual feedback
  showDropZones: boolean
  setShowDropZones: (show: boolean) => void
}

const DragDropContext = createContext<DragDropContextType | null>(null)

interface DragDropProviderProps {
  children: React.ReactNode
  onEventDrop?: (event: UnifiedEvent, fromSlot: { date: string; hour: number }, toSlot: { date: string; hour: number }) => void
  onEventResize?: (event: UnifiedEvent, newStartTime: string, newEndTime: string) => void
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  onEventDrop,
  onEventResize
}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    dragOffset: { x: 0, y: 0 },
    originalSlot: null
  })

  const [dropZoneState, setDropZoneState] = useState<DropZoneState>({
    activeDropZone: null,
    hoveredDropZone: null
  })

  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    resizedEvent: null,
    resizeHandle: null
  })

  const [showDropZones, setShowDropZones] = useState(false)

  const startDrag = useCallback((
    event: UnifiedEvent,
    offset: { x: number; y: number },
    originalSlot: { date: string; hour: number }
  ) => {
    console.log('🎯 DragDropContext.startDrag called for:', event.title, 'from slot:', originalSlot)
    setDragState({
      isDragging: true,
      draggedEvent: event,
      dragOffset: offset,
      originalSlot
    })
    setShowDropZones(true)
    console.log('🎯 DragDropContext: Drag state updated, showDropZones set to true')
  }, [])

  const endDrag = useCallback(() => {
    console.log('🎯 DragDropContext.endDrag called')
    console.log('🎯 Current dragState:', dragState)
    console.log('🎯 Current dropZoneState:', dropZoneState)

    // If we have an active drop zone, trigger the drop callback
    if (dragState.originalSlot && dropZoneState.activeDropZone && dragState.draggedEvent) {
      const isSameSlot = (
        dragState.originalSlot.date === dropZoneState.activeDropZone.date &&
        dragState.originalSlot.hour === dropZoneState.activeDropZone.hour
      )

      console.log('🎯 Drop zone conditions:', {
        hasOriginalSlot: !!dragState.originalSlot,
        hasActiveDropZone: !!dropZoneState.activeDropZone,
        hasDraggedEvent: !!dragState.draggedEvent,
        isSameSlot,
        hasOnEventDrop: !!onEventDrop
      })

      if (!isSameSlot && onEventDrop) {
        console.log('🎯 Calling onEventDrop:', dragState.draggedEvent.title, 'from', dragState.originalSlot, 'to', dropZoneState.activeDropZone)
        onEventDrop(dragState.draggedEvent, dragState.originalSlot, dropZoneState.activeDropZone)
      } else {
        console.log('🎯 Not calling onEventDrop - same slot or no callback')
      }
    } else {
      console.log('🎯 Not calling onEventDrop - missing required data')
    }

    console.log('🎯 Resetting drag state')
    setDragState({
      isDragging: false,
      draggedEvent: null,
      dragOffset: { x: 0, y: 0 },
      originalSlot: null
    })
    setDropZoneState({
      activeDropZone: null,
      hoveredDropZone: null
    })
    setShowDropZones(false)
  }, [dragState, dropZoneState, onEventDrop])

  const setHoveredDropZone = useCallback((zone: { date: string; hour: number } | null) => {
    setDropZoneState(prev => ({ ...prev, hoveredDropZone: zone }))
  }, [])

  const setActiveDropZone = useCallback((zone: { date: string; hour: number } | null) => {
    console.log('🎯 DragDropContext.setActiveDropZone called with:', zone)
    setDropZoneState(prev => ({ ...prev, activeDropZone: zone }))
  }, [])

  const startResize = useCallback((event: UnifiedEvent, handle: 'top' | 'bottom') => {
    setResizeState({
      isResizing: true,
      resizedEvent: event,
      resizeHandle: handle
    })
  }, [])

  const endResize = useCallback(() => {
    setResizeState({
      isResizing: false,
      resizedEvent: null,
      resizeHandle: null
    })
  }, [])

  const contextValue: DragDropContextType = {
    dragState,
    dropZoneState,
    resizeState,
    startDrag,
    endDrag,
    setHoveredDropZone,
    setActiveDropZone,
    startResize,
    endResize,
    onEventDrop,
    onEventResize,
    showDropZones,
    setShowDropZones
  }

  return (
    <DragDropContext.Provider value={contextValue}>
      {children}
    </DragDropContext.Provider>
  )
}

export const useDragDrop = () => {
  const context = useContext(DragDropContext)
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider')
  }
  return context
}

export default DragDropContext