// Utility to prevent body scroll when modals are open
// Handles multiple modals being open at once and works on mobile devices

let scrollPosition = 0
let openModalsCount = 0

export function lockScroll(): void {
  if (openModalsCount === 0) {
    // Store current scroll position
    scrollPosition = window.pageYOffset || document.documentElement.scrollTop

    // Apply styles to prevent scrolling
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollPosition}px`
    document.body.style.width = '100%'
  }

  openModalsCount++
}

export function unlockScroll(): void {
  openModalsCount--

  if (openModalsCount <= 0) {
    openModalsCount = 0

    // Remove the fixed positioning
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''

    // Restore scroll position
    window.scrollTo(0, scrollPosition)
  }
}

// Reset function for cleanup (useful for React strict mode)
export function resetScrollLock(): void {
  openModalsCount = 0
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.width = ''
}
