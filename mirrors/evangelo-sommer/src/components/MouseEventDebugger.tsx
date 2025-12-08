"use client"

import { useEffect } from 'react'

export const MouseEventDebugger = () => {
  useEffect(() => {
    const handleGlobalMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const zIndex = window.getComputedStyle(target).zIndex
      const pointerEvents = window.getComputedStyle(target).pointerEvents

      // Only log elements with significant z-index or pointer-events modifications
      if (parseInt(zIndex) > 1 || pointerEvents !== 'auto') {
        console.log('🔍 GLOBAL MOUSE OVER:', {
          tagName: target.tagName,
          className: target.className,
          zIndex,
          pointerEvents,
          position: window.getComputedStyle(target).position,
          elementRect: target.getBoundingClientRect(),
          eventTitle: target.textContent?.includes('Hedge') ? target.textContent.slice(0, 30) : 'N/A'
        })
      }
    }

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const zIndex = window.getComputedStyle(target).zIndex

      console.log('🔍 GLOBAL CLICK:', {
        tagName: target.tagName,
        className: target.className,
        zIndex,
        pointerEvents: window.getComputedStyle(target).pointerEvents,
        position: window.getComputedStyle(target).position,
        elementRect: target.getBoundingClientRect(),
        eventTitle: target.textContent?.includes('Hedge') ? target.textContent.slice(0, 50) : 'N/A',
        isEventBlock: target.closest('[data-event-block]') ? 'YES' : 'NO',
        isDropZone: target.closest('[role="button"]') ? 'YES' : 'NO'
      })
    }

    // Add global listeners
    document.addEventListener('mouseover', handleGlobalMouseOver, { passive: true })
    document.addEventListener('click', handleGlobalClick, { passive: true })

    return () => {
      document.removeEventListener('mouseover', handleGlobalMouseOver)
      document.removeEventListener('click', handleGlobalClick)
    }
  }, [])

  return null // This component doesn't render anything
}