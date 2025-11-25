import { useEffect } from 'react'

/**
 * Hook to fix PWA modal issues on mobile Safari
 * 
 * This hook addresses the following issues when a web app is added to home screen (PWA):
 * 1. Modal dialogs expanding to full device width
 * 2. Content not returning to original size when modal is closed
 * 3. Buttons becoming unreachable at the bottom of the screen
 */
export function useModalPWAFix(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      
      // Lock body scroll and prevent viewport resizing
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      
      // Prevent viewport changes on mobile Safari PWA
      const viewport = document.querySelector('meta[name=viewport]')
      const originalViewport = viewport?.getAttribute('content') || ''
      
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
      }
      
      return () => {
        // Restore scroll position and viewport
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        
        if (viewport && originalViewport) {
          viewport.setAttribute('content', originalViewport)
        }
        
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])
}