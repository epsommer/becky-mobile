// Touch utilities for mobile drag and drop support

export interface TouchGestureOptions {
  longPressDuration?: number
  touchTolerancePx?: number
  preventDefaultOnMove?: boolean
}

export interface TouchGestureCallbacks {
  onLongPress?: (event: TouchEvent) => void
  onTap?: (event: TouchEvent) => void
  onDragStart?: (event: TouchEvent) => void
  onDragMove?: (event: TouchEvent) => void
  onDragEnd?: (event: TouchEvent) => void
}

export class TouchGestureHandler {
  private element: HTMLElement
  private options: Required<TouchGestureOptions>
  private callbacks: TouchGestureCallbacks
  
  private touchState = {
    startTime: 0,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    isLongPress: false,
    isDragging: false,
    longPressTimer: null as NodeJS.Timeout | null,
  }

  constructor(
    element: HTMLElement, 
    callbacks: TouchGestureCallbacks,
    options: TouchGestureOptions = {}
  ) {
    this.element = element
    this.callbacks = callbacks
    this.options = {
      longPressDuration: options.longPressDuration || 500,
      touchTolerancePx: options.touchTolerancePx || 10,
      preventDefaultOnMove: options.preventDefaultOnMove !== false
    }

    this.setupEventListeners()
  }

  private setupEventListeners() {
    this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false })
    this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false })
    this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false })
    this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false })
  }

  private handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    
    this.touchState.startTime = Date.now()
    this.touchState.startPosition = { x: touch.clientX, y: touch.clientY }
    this.touchState.currentPosition = { x: touch.clientX, y: touch.clientY }
    this.touchState.isLongPress = false
    this.touchState.isDragging = false

    // Start long press timer
    this.touchState.longPressTimer = setTimeout(() => {
      this.touchState.isLongPress = true
      this.callbacks.onLongPress?.(event)
    }, this.options.longPressDuration)
  }

  private handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    this.touchState.currentPosition = { x: touch.clientX, y: touch.clientY }

    const deltaX = Math.abs(touch.clientX - this.touchState.startPosition.x)
    const deltaY = Math.abs(touch.clientY - this.touchState.startPosition.y)
    const totalDelta = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // If we've moved beyond tolerance, cancel long press and start drag
    if (totalDelta > this.options.touchTolerancePx) {
      this.clearLongPressTimer()
      
      if (!this.touchState.isDragging) {
        this.touchState.isDragging = true
        this.callbacks.onDragStart?.(event)
      } else {
        this.callbacks.onDragMove?.(event)
      }

      if (this.options.preventDefaultOnMove) {
        event.preventDefault()
      }
    }
  }

  private handleTouchEnd = (event: TouchEvent) => {
    this.clearLongPressTimer()

    if (this.touchState.isDragging) {
      this.callbacks.onDragEnd?.(event)
    } else if (!this.touchState.isLongPress) {
      // It was a tap
      this.callbacks.onTap?.(event)
    }

    this.resetTouchState()
  }

  private handleTouchCancel = (event: TouchEvent) => {
    this.clearLongPressTimer()
    if (this.touchState.isDragging) {
      this.callbacks.onDragEnd?.(event)
    }
    this.resetTouchState()
  }

  private clearLongPressTimer() {
    if (this.touchState.longPressTimer) {
      clearTimeout(this.touchState.longPressTimer)
      this.touchState.longPressTimer = null
    }
  }

  private resetTouchState() {
    this.touchState = {
      startTime: 0,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      isLongPress: false,
      isDragging: false,
      longPressTimer: null,
    }
  }

  public destroy() {
    this.clearLongPressTimer()
    this.element.removeEventListener('touchstart', this.handleTouchStart)
    this.element.removeEventListener('touchmove', this.handleTouchMove)
    this.element.removeEventListener('touchend', this.handleTouchEnd)
    this.element.removeEventListener('touchcancel', this.handleTouchCancel)
  }
}

// Helper function to detect if device supports touch
export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

// Helper function to get touch coordinates consistently
export const getTouchCoordinates = (event: TouchEvent | MouseEvent): { x: number; y: number } => {
  if ('touches' in event && event.touches.length > 0) {
    return { x: event.touches[0].clientX, y: event.touches[0].clientY }
  } else if ('changedTouches' in event && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
  } else if ('clientX' in event && 'clientY' in event) {
    return { x: event.clientX, y: event.clientY }
  }
  return { x: 0, y: 0 }
}

// Helper function to detect if an element is under a point
export const getElementUnderPoint = (x: number, y: number, excludeElement?: HTMLElement): Element | null => {
  let element: Element | null = null
  
  if (excludeElement) {
    const originalPointerEvents = excludeElement.style.pointerEvents
    excludeElement.style.pointerEvents = 'none'
    element = document.elementFromPoint(x, y)
    excludeElement.style.pointerEvents = originalPointerEvents
  } else {
    element = document.elementFromPoint(x, y)
  }
  
  return element
}