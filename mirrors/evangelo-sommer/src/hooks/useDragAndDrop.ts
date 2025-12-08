import { useCallback, useState, useRef, useEffect } from 'react'
import { UnifiedEvent } from '@/components/EventCreationModal'
import { getTouchCoordinates, getElementUnderPoint } from '@/lib/touch-utils'

export interface DragState {
  isDragging: boolean
  draggedItem: UnifiedEvent | null
  dragOffset: { x: number; y: number }
  currentPosition: { x: number; y: number }
  originalPosition: { x: number; y: number }
}

export interface DropZoneInfo {
  id: string
  element: HTMLElement
  data: any
}

export interface DragAndDropOptions {
  dragThreshold?: number
  snapToGrid?: boolean
  gridSize?: number
  enableVisualFeedback?: boolean
}

export interface DragAndDropCallbacks {
  onDragStart?: (item: UnifiedEvent, event: MouseEvent | TouchEvent) => void
  onDragMove?: (item: UnifiedEvent, position: { x: number; y: number }) => void
  onDragEnd?: (item: UnifiedEvent, dropZone: DropZoneInfo | null) => void
  onDrop?: (item: UnifiedEvent, dropZone: DropZoneInfo) => void
}

export const useDragAndDrop = (
  options: DragAndDropOptions = {},
  callbacks: DragAndDropCallbacks = {}
) => {
  const {
    dragThreshold = 5,
    snapToGrid = true,
    gridSize = 15,
    enableVisualFeedback = true
  } = options

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOffset: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    originalPosition: { x: 0, y: 0 }
  })

  const [registeredDropZones, setRegisteredDropZones] = useState<Map<string, DropZoneInfo>>(new Map())
  const dragElementRef = useRef<HTMLElement | null>(null)
  const isDraggingRef = useRef(false)

  // Register a drop zone
  const registerDropZone = useCallback((id: string, element: HTMLElement, data: any = {}) => {
    setRegisteredDropZones(prev => {
      const newMap = new Map(prev)
      newMap.set(id, { id, element, data })
      return newMap
    })

    // Return cleanup function
    return () => {
      setRegisteredDropZones(prev => {
        const newMap = new Map(prev)
        newMap.delete(id)
        return newMap
      })
    }
  }, [])

  // Start dragging
  const startDrag = useCallback((
    item: UnifiedEvent,
    event: MouseEvent | TouchEvent,
    element: HTMLElement
  ) => {
    const coordinates = getTouchCoordinates(event)
    const rect = element.getBoundingClientRect()
    
    const dragOffset = {
      x: coordinates.x - rect.left,
      y: coordinates.y - rect.top
    }

    setDragState({
      isDragging: true,
      draggedItem: item,
      dragOffset,
      currentPosition: coordinates,
      originalPosition: coordinates
    })

    dragElementRef.current = element
    isDraggingRef.current = true

    callbacks.onDragStart?.(item, event)

    // Prevent default to avoid text selection, etc.
    event.preventDefault()
  }, [callbacks])

  // Update drag position
  const updateDragPosition = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !dragState.draggedItem) return

    const coordinates = getTouchCoordinates(event)
    let position = coordinates

    // Apply grid snapping if enabled
    if (snapToGrid) {
      position = {
        x: Math.round(coordinates.x / gridSize) * gridSize,
        y: Math.round(coordinates.y / gridSize) * gridSize
      }
    }

    setDragState(prev => ({
      ...prev,
      currentPosition: position
    }))

    callbacks.onDragMove?.(dragState.draggedItem, position)
  }, [dragState.draggedItem, snapToGrid, gridSize, callbacks])

  // End dragging
  const endDrag = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !dragState.draggedItem) return

    const coordinates = getTouchCoordinates(event)
    
    // Find drop zone under cursor/touch point
    let dropZone: DropZoneInfo | null = null
    
    const elementUnder = getElementUnderPoint(
      coordinates.x, 
      coordinates.y, 
      dragElementRef.current || undefined
    )

    if (elementUnder) {
      // Check if the element or any parent is a registered drop zone
      let currentElement = elementUnder as HTMLElement
      while (currentElement && currentElement !== document.body) {
        const dropZoneId = currentElement.getAttribute('data-drop-zone-id')
        if (dropZoneId && registeredDropZones.has(dropZoneId)) {
          dropZone = registeredDropZones.get(dropZoneId)!
          break
        }
        currentElement = currentElement.parentElement as HTMLElement
      }
    }

    callbacks.onDragEnd?.(dragState.draggedItem, dropZone)
    
    if (dropZone) {
      callbacks.onDrop?.(dragState.draggedItem, dropZone)
    }

    // Reset state
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOffset: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      originalPosition: { x: 0, y: 0 }
    })

    dragElementRef.current = null
    isDraggingRef.current = false
  }, [dragState.draggedItem, registeredDropZones, callbacks])

  // Set up global mouse/touch event listeners when dragging
  useEffect(() => {
    if (!dragState.isDragging) return

    const handleMouseMove = (e: MouseEvent) => updateDragPosition(e)
    const handleMouseUp = (e: MouseEvent) => endDrag(e)
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault() // Prevent scrolling while dragging
      updateDragPosition(e)
    }
    const handleTouchEnd = (e: TouchEvent) => endDrag(e)

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dragState.isDragging, updateDragPosition, endDrag])

  // Helper function to create draggable props
  const getDraggableProps = useCallback((item: UnifiedEvent) => ({
    onMouseDown: (e: React.MouseEvent) => {
      if (e.currentTarget instanceof HTMLElement) {
        startDrag(item, e.nativeEvent, e.currentTarget)
      }
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.currentTarget instanceof HTMLElement) {
        startDrag(item, e.nativeEvent, e.currentTarget)
      }
    },
    style: {
      cursor: dragState.isDragging && dragState.draggedItem?.id === item.id ? 'grabbing' : 'grab',
      userSelect: 'none' as const,
      touchAction: 'none' as const,
    }
  }), [startDrag, dragState])

  // Helper function to create drop zone props
  const getDropZoneProps = useCallback((id: string, data: any = {}) => ({
    'data-drop-zone-id': id,
    ref: (element: HTMLElement | null) => {
      if (element) {
        const cleanup = registerDropZone(id, element, data)
        return cleanup
      }
    },
    className: `drop-zone ${dragState.isDragging ? 'drop-zone--active' : ''}`,
  }), [registerDropZone, dragState.isDragging])

  // Visual feedback helpers
  const getDragPreviewStyle = useCallback(() => {
    if (!dragState.isDragging) return { display: 'none' }

    return {
      position: 'fixed' as const,
      left: dragState.currentPosition.x - dragState.dragOffset.x,
      top: dragState.currentPosition.y - dragState.dragOffset.y,
      zIndex: 9999,
      pointerEvents: 'none' as const,
      opacity: 0.8,
      transform: 'rotate(2deg) scale(1.05)',
      transition: snapToGrid ? 'none' : 'transform 0.1s ease',
    }
  }, [dragState, snapToGrid])

  return {
    // State
    dragState,
    isDragging: dragState.isDragging,
    draggedItem: dragState.draggedItem,
    
    // Actions
    startDrag,
    endDrag,
    updateDragPosition,
    registerDropZone,
    
    // Helper functions
    getDraggableProps,
    getDropZoneProps,
    getDragPreviewStyle,
    
    // Drop zones
    registeredDropZones: Array.from(registeredDropZones.values())
  }
}