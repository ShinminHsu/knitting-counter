import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GoogleSignIn from '../GoogleSignIn'
import { useAuthStore } from '../../stores/useAuthStore'

// Mock the auth store
vi.mock('../../stores/useAuthStore')

const mockUseAuthStore = vi.mocked(useAuthStore)

describe('GoogleSignIn', () => {
  const mockSignInWithGoogle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation
    mockUseAuthStore.mockReturnValue({
      signInWithGoogle: mockSignInWithGoogle,
      isLoading: false,
      error: null
    })
  })

  describe('Component Rendering', () => {
    it('should render the sign-in page with title and description', () => {
      render(<GoogleSignIn />)
      
      expect(screen.getByText('🧶')).toBeInTheDocument()
      expect(screen.getByText('編織計數器')).toBeInTheDocument()
      expect(screen.getByText('使用 Google 帳戶登入以同步您的編織專案')).toBeInTheDocument()
    })

    it('should render Google sign-in button', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      expect(signInButton).toBeInTheDocument()
      expect(signInButton).not.toBeDisabled()
    })

    it('should render Google logo in the button', () => {
      render(<GoogleSignIn />)
      
      const googleLogo = screen.getByRole('button').querySelector('svg')
      expect(googleLogo).toBeInTheDocument()
    })

    it('should render privacy policy text', () => {
      render(<GoogleSignIn />)
      
      expect(screen.getByText('登入即表示您同意我們的服務條款和隱私政策')).toBeInTheDocument()
    })
  })

  describe('Sign In Functionality', () => {
    it('should call signInWithGoogle when button is clicked', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      fireEvent.click(signInButton)
      
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple clicks properly', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      fireEvent.click(signInButton)
      fireEvent.click(signInButton)
      
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(2)
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: true,
        error: null
      })

      render(<GoogleSignIn />)
      
      const loadingSpinner = screen.getByRole('button').querySelector('.animate-spin')
      expect(loadingSpinner).toBeInTheDocument()
      expect(loadingSpinner).toHaveClass('animate-spin', 'rounded-full', 'h-5', 'w-5', 'border-b-2', 'border-gray-600')
    })

    it('should disable button when loading', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: true,
        error: null
      })

      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button')
      expect(signInButton).toBeDisabled()
      expect(signInButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    })

    it('should not show Google logo when loading', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: true,
        error: null
      })

      render(<GoogleSignIn />)
      
      expect(screen.queryByText('使用 Google 登入')).not.toBeInTheDocument()
    })

    it('should not call signInWithGoogle when button is disabled', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: true,
        error: null
      })

      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button')
      fireEvent.click(signInButton)
      
      expect(mockSignInWithGoogle).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should display error message when error exists', () => {
      const errorMessage = 'Sign in failed. Please try again.'
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        error: errorMessage
      })

      render(<GoogleSignIn />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
    })

    it('should style error message appropriately', () => {
      const errorMessage = 'Authentication error'
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        error: errorMessage
      })

      render(<GoogleSignIn />)
      
      const errorElement = screen.getByText(errorMessage)
      expect(errorElement).toHaveClass('text-red-700')
      expect(errorElement.closest('div')).toHaveClass('mb-4', 'p-3', 'bg-red-50', 'border', 'border-red-200', 'rounded-lg')
    })

    it('should not display error container when no error', () => {
      render(<GoogleSignIn />)
      
      const errorContainer = screen.queryByText(/error/i)
      expect(errorContainer).not.toBeInTheDocument()
    })

    it('should still allow sign-in attempt when there is an error', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        error: 'Previous error'
      })

      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      expect(signInButton).not.toBeDisabled()
      
      fireEvent.click(signInButton)
      expect(mockSignInWithGoogle).toHaveBeenCalled()
    })
  })

  describe('Button Styling', () => {
    it('should have correct styling classes', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      expect(signInButton).toHaveClass(
        'w-full',
        'flex',
        'items-center',
        'justify-center',
        'gap-3',
        'px-4',
        'py-3',
        'bg-white',
        'border',
        'border-gray-300',
        'rounded-lg',
        'hover:bg-gray-50',
        'transition-colors'
      )
    })

    it('should have hover effect classes', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      expect(signInButton).toHaveClass('hover:bg-gray-50', 'transition-colors')
    })
  })

  describe('Layout and Responsive Design', () => {
    it('should have responsive card container', () => {
      render(<GoogleSignIn />)
      
      const card = screen.getByText('編織計數器').closest('.card')
      expect(card).toHaveClass('max-w-sm', 'sm:max-w-md', 'w-full')
    })

    it('should have responsive text sizing', () => {
      render(<GoogleSignIn />)
      
      const title = screen.getByText('編織計數器')
      expect(title).toHaveClass('text-xl', 'sm:text-2xl')
      
      const description = screen.getByText('使用 Google 帳戶登入以同步您的編織專案')
      expect(description).toHaveClass('text-sm', 'sm:text-base')
    })

    it('should have responsive emoji sizing', () => {
      render(<GoogleSignIn />)
      
      const emoji = screen.getByText('🧶')
      expect(emoji).toHaveClass('text-3xl', 'sm:text-4xl')
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<GoogleSignIn />)
      
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('編織計數器')
    })

    it('should have accessible button text', () => {
      render(<GoogleSignIn />)
      
      const button = screen.getByRole('button', { name: /使用 Google 登入/ })
      expect(button).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      signInButton.focus()
      expect(signInButton).toHaveFocus()
    })

    it('should have proper focus states', () => {
      render(<GoogleSignIn />)
      
      const signInButton = screen.getByRole('button', { name: /使用 Google 登入/ })
      // Focus states are handled by CSS, we just ensure the button is focusable
      expect(signInButton).not.toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Google Logo SVG', () => {
    it('should render Google logo with correct paths', () => {
      render(<GoogleSignIn />)
      
      const svgElement = screen.getByRole('button').querySelector('svg')
      expect(svgElement).toHaveAttribute('viewBox', '0 0 24 24')
      expect(svgElement).toHaveClass('w-5', 'h-5')
      
      // Check for Google logo color paths
      const paths = svgElement?.querySelectorAll('path')
      expect(paths).toHaveLength(4) // Google logo has 4 colored parts
    })

    it('should have correct Google brand colors in SVG paths', () => {
      render(<GoogleSignIn />)
      
      const svgElement = screen.getByRole('button').querySelector('svg')
      const paths = svgElement?.querySelectorAll('path')
      
      expect(paths?.[0]).toHaveAttribute('fill', '#4285F4') // Blue
      expect(paths?.[1]).toHaveAttribute('fill', '#34A853') // Green  
      expect(paths?.[2]).toHaveAttribute('fill', '#FBBC05') // Yellow
      expect(paths?.[3]).toHaveAttribute('fill', '#EA4335') // Red
    })
  })

  describe('Integration States', () => {
    it('should handle loading and error states together', () => {
      mockUseAuthStore.mockReturnValue({
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: true,
        error: 'Previous error'
      })

      render(<GoogleSignIn />)
      
      // Should show both error and loading state
      expect(screen.getByText('Previous error')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should transition from normal to loading state', async () => {
      let currentState = {
        signInWithGoogle: mockSignInWithGoogle,
        isLoading: false,
        error: null
      }

      const { rerender } = render(<GoogleSignIn />)
      
      // Initially not loading
      expect(screen.getByText('使用 Google 登入')).toBeInTheDocument()
      expect(screen.getByRole('button')).not.toBeDisabled()
      
      // Update to loading state
      currentState.isLoading = true
      mockUseAuthStore.mockReturnValue(currentState)
      rerender(<GoogleSignIn />)
      
      expect(screen.queryByText('使用 Google 登入')).not.toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument()
    })
  })
})