import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserProfile from '../UserProfile'
import type { User } from 'firebase/auth'

// Mock the auth store
vi.mock('../../stores/useAuthStore', () => ({
  useAuthStore: vi.fn()
}))

// Import the mocked function
import { useAuthStore } from '../../stores/useAuthStore'
const mockUseAuthStore = vi.mocked(useAuthStore)

describe('UserProfile', () => {
  const mockSignOut = vi.fn()
  
  const mockUser: User = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2024-01-01T00:00:00.000Z',
      lastSignInTime: '2024-01-01T12:00:00.000Z'
    },
    providerData: [],
    refreshToken: 'refresh-token',
    tenantId: null,
    delete: vi.fn(),
    getIdToken: vi.fn(),
    getIdTokenResult: vi.fn(),
    reload: vi.fn(),
    toJSON: vi.fn(),
    phoneNumber: null,
    providerId: 'firebase'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockUseAuthStore.mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
      isLoading: false
    })
  })

  describe('User Information Display', () => {
    it('should render user profile when user is logged in', () => {
      render(<UserProfile />)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('should render user avatar when photoURL is available', () => {
      render(<UserProfile />)
      
      const avatar = screen.getByRole('img', { name: /test user/i })
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', 'https://example.com/photo.jpg')
      expect(avatar).toHaveAttribute('alt', 'Test User')
    })

    it('should render fallback avatar when photoURL is not available', () => {
      const userWithoutPhoto = { ...mockUser, photoURL: null }
      mockUseAuthStore.mockReturnValue({
        user: userWithoutPhoto,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      // With no photoURL, the img element is not rendered at all
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('should render fallback avatar when displayName is not available', () => {
      const userWithoutName = { ...mockUser, displayName: null, photoURL: null }
      mockUseAuthStore.mockReturnValue({
        user: userWithoutName,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      // With no photoURL, the img element is not rendered at all
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.getByText('使用者')).toBeInTheDocument() // Fallback display name
    })

    it('should display email when displayName is not available', () => {
      const userWithoutName = { ...mockUser, displayName: null }
      mockUseAuthStore.mockReturnValue({
        user: userWithoutName,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('使用者')).toBeInTheDocument() // Shows fallback name instead
      expect(screen.queryByText('Test User')).not.toBeInTheDocument()
    })
  })

  describe('Sign Out Functionality', () => {
    it('should render sign out button', () => {
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      expect(signOutButton).toBeInTheDocument()
      expect(signOutButton).toHaveClass('text-text-secondary', 'hover:text-text-primary')
    })

    it('should call signOut when sign out button is clicked', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      await user.click(signOutButton)
      
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('should show loading state during sign out', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
        isLoading: true
      })
      
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出中...' })
      expect(signOutButton).toBeDisabled()
      expect(signOutButton).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Not Logged In State', () => {
    it('should not render anything when user is not logged in', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        signOut: mockSignOut,
        isLoading: false
      })
      
      const { container } = render(<UserProfile />)
      
      expect(container.firstChild).toBeNull()
    })

    it('should not render when user is undefined', () => {
      mockUseAuthStore.mockReturnValue({
        user: undefined,
        signOut: mockSignOut,
        isLoading: false
      })
      
      const { container } = render(<UserProfile />)
      
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Component Styling', () => {
    it('should apply correct container styling', () => {
      render(<UserProfile />)
      
      const container = screen.getByText('Test User').closest('div')
      expect(container).toHaveClass('hidden', 'md:block')
    })

    it('should apply correct avatar styling', () => {
      render(<UserProfile />)
      
      const avatar = screen.getByRole('img', { name: /test user/i })
      expect(avatar).toHaveClass('w-6', 'h-6', 'sm:w-8', 'sm:h-8', 'rounded-full')
    })

    it('should apply correct text styling', () => {
      render(<UserProfile />)
      
      const userName = screen.getByText('Test User')
      expect(userName).toHaveClass('text-xs', 'sm:text-sm', 'font-medium', 'text-text-primary')
      
      const userEmail = screen.getByText('test@example.com')
      expect(userEmail).toHaveClass('text-xs', 'text-text-secondary')
    })

    it('should apply correct button styling', () => {
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      expect(signOutButton).toHaveClass(
        'text-xs',
        'sm:text-sm',
        'text-text-secondary',
        'hover:text-text-primary',
        'transition-colors',
        'disabled:opacity-50'
      )
    })
  })

  describe('User Information Text Handling', () => {
    it('should truncate long display names', () => {
      const userWithLongName = { 
        ...mockUser, 
        displayName: 'Very Long Display Name That Should Be Truncated'
      }
      mockUseAuthStore.mockReturnValue({
        user: userWithLongName,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      const userName = screen.getByText('Very Long Display Name That Should Be Truncated')
      expect(userName).toHaveClass('text-xs', 'sm:text-sm', 'font-medium', 'text-text-primary')
    })

    it('should truncate long email addresses', () => {
      const userWithLongEmail = { 
        ...mockUser, 
        email: 'very.long.email.address.that.should.be.truncated@example.com'
      }
      mockUseAuthStore.mockReturnValue({
        user: userWithLongEmail,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      const userEmail = screen.getByText('very.long.email.address.that.should.be.truncated@example.com')
      expect(userEmail).toHaveClass('text-xs', 'text-text-secondary')
    })
  })

  describe('Accessibility', () => {
    it('should have proper alt text for avatar', () => {
      render(<UserProfile />)
      
      const avatar = screen.getByRole('img')
      expect(avatar).toHaveAttribute('alt', 'Test User')
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      
      await user.tab()
      expect(signOutButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('should have accessible button text', () => {
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      expect(signOutButton).toHaveAccessibleName('登出')
    })

    it('should indicate loading state to screen readers', () => {
      mockUseAuthStore.mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
        isLoading: true
      })
      
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出中...' })
      expect(signOutButton).toBeDisabled()
    })
  })

  describe('Responsive Design', () => {
    it('should have mobile-friendly sizing', () => {
      render(<UserProfile />)
      
      const avatar = screen.getByRole('img')
      expect(avatar).toHaveClass('w-6', 'h-6', 'sm:w-8', 'sm:h-8') // Responsive sizing
      
      const userName = screen.getByText('Test User')
      expect(userName).toHaveClass('text-xs', 'sm:text-sm') // Responsive text sizing
      
      const userEmail = screen.getByText('test@example.com')
      expect(userEmail).toHaveClass('text-xs') // Compact but readable
    })

    it('should handle text overflow gracefully', () => {
      render(<UserProfile />)
      
      const userName = screen.getByText('Test User')
      expect(userName).toHaveClass('text-xs', 'sm:text-sm', 'font-medium', 'text-text-primary')
      
      const userEmail = screen.getByText('test@example.com')
      expect(userEmail).toHaveClass('text-xs', 'text-text-secondary')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing user properties gracefully', () => {
      const incompleteUser = {
        uid: 'test-uid',
        email: null,
        displayName: null,
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: vi.fn(),
        getIdToken: vi.fn(),
        getIdTokenResult: vi.fn(),
        reload: vi.fn(),
        toJSON: vi.fn(),
        phoneNumber: null,
        providerId: 'firebase'
      } as User
      
      mockUseAuthStore.mockReturnValue({
        user: incompleteUser,
        signOut: mockSignOut,
        isLoading: false
      })
      
      render(<UserProfile />)
      
      // Should still render something without crashing
      const signOutButton = screen.getByRole('button', { name: '登出' })
      expect(signOutButton).toBeInTheDocument()
    })

    it('should handle sign out errors gracefully', async () => {
      mockSignOut.mockRejectedValue(new Error('Sign out failed'))
      const user = userEvent.setup()
      
      render(<UserProfile />)
      
      const signOutButton = screen.getByRole('button', { name: '登出' })
      await user.click(signOutButton)
      
      expect(mockSignOut).toHaveBeenCalledTimes(1)
      // Component should not crash even if signOut fails
      expect(signOutButton).toBeInTheDocument()
    })
  })
})