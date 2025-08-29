import { describe, it, expect, beforeEach, vi } from 'vitest'
import { User, UserCredential } from 'firebase/auth'

// Mock Firebase modules first
vi.mock('../config/firebase', () => ({
  auth: {},
  googleProvider: {}
}))

vi.mock('firebase/auth', () => ({
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}))

// Import the store after mocking
import { useAuthStore } from './useAuthStore'

// Get the mocked functions
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
const mockSignInWithPopup = vi.mocked(signInWithPopup)
const mockSignOut = vi.mocked(signOut)
const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged)

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isLoading: false,
      error: null
    })
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
    })
  })

  describe('Basic State Setters', () => {
    it('should set user', () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' } as User
      const { setUser } = useAuthStore.getState()
      
      setUser(mockUser)
      expect(useAuthStore.getState().user).toBe(mockUser)
      
      setUser(null)
      expect(useAuthStore.getState().user).toBe(null)
    })

    it('should set loading state', () => {
      const { setLoading } = useAuthStore.getState()
      
      setLoading(true)
      expect(useAuthStore.getState().isLoading).toBe(true)
      
      setLoading(false)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })

    it('should set error state', () => {
      const { setError } = useAuthStore.getState()
      
      setError('Test error')
      expect(useAuthStore.getState().error).toBe('Test error')
      
      setError(null)
      expect(useAuthStore.getState().error).toBe(null)
    })
  })

  describe('Google Sign In', () => {
    it('should handle successful Google sign in', async () => {
      const mockUser = { 
        uid: 'test-uid', 
        email: 'test@example.com',
        displayName: 'Test User'
      } as User
      
      const mockResult: UserCredential = {
        user: mockUser,
        providerId: 'google.com',
        operationType: 'signIn'
      }
      mockSignInWithPopup.mockResolvedValue(mockResult)
      
      const { signInWithGoogle } = useAuthStore.getState()
      await signInWithGoogle()
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
      expect(mockSignInWithPopup).toHaveBeenCalledTimes(1)
    })

    it('should handle Google sign in failure with Error object', async () => {
      const testError = new Error('Sign in failed')
      mockSignInWithPopup.mockRejectedValue(testError)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { signInWithGoogle } = useAuthStore.getState()
      await signInWithGoogle()
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Sign in failed')
      expect(consoleSpy).toHaveBeenCalledWith('Google 登入失敗:', testError)
      
      consoleSpy.mockRestore()
    })

    it('should handle Google sign in failure with unknown error', async () => {
      mockSignInWithPopup.mockRejectedValue('Unknown error')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { signInWithGoogle } = useAuthStore.getState()
      await signInWithGoogle()
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('登入失敗')
      expect(consoleSpy).toHaveBeenCalledWith('Google 登入失敗:', 'Unknown error')
      
      consoleSpy.mockRestore()
    })

    it('should set loading state during sign in process', async () => {
      let loadingDuringSignIn = false
      mockSignInWithPopup.mockImplementation(async () => {
        loadingDuringSignIn = useAuthStore.getState().isLoading
        return {
          user: { uid: 'test' } as User,
          providerId: 'google.com',
          operationType: 'signIn'
        } as UserCredential
      })
      
      const { signInWithGoogle } = useAuthStore.getState()
      await signInWithGoogle()
      
      expect(loadingDuringSignIn).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('Sign Out', () => {
    it('should handle successful sign out', async () => {
      // Set initial user
      const mockUser = { uid: 'test-uid' } as User
      useAuthStore.setState({ user: mockUser })
      
      mockSignOut.mockResolvedValue(undefined)
      
      const { signOut } = useAuthStore.getState()
      await signOut()
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })

    it('should handle sign out failure with Error object', async () => {
      const testError = new Error('Sign out failed')
      mockSignOut.mockRejectedValue(testError)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { signOut } = useAuthStore.getState()
      await signOut()
      
      const state = useAuthStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Sign out failed')
      expect(consoleSpy).toHaveBeenCalledWith('登出失敗:', testError)
      
      consoleSpy.mockRestore()
    })

    it('should handle sign out failure with unknown error', async () => {
      mockSignOut.mockRejectedValue('Unknown error')
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { signOut } = useAuthStore.getState()
      await signOut()
      
      const state = useAuthStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('登出失敗')
      expect(consoleSpy).toHaveBeenCalledWith('登出失敗:', 'Unknown error')
      
      consoleSpy.mockRestore()
    })

    it('should set loading state during sign out process', async () => {
      let loadingDuringSignOut = false
      mockSignOut.mockImplementation(async () => {
        loadingDuringSignOut = useAuthStore.getState().isLoading
      })
      
      const { signOut } = useAuthStore.getState()
      await signOut()
      
      expect(loadingDuringSignOut).toBe(true)
      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('Auth State Initialization', () => {
    it('should set up auth state listener', () => {
      const mockUnsubscribe = vi.fn()
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe)
      
      const { initialize } = useAuthStore.getState()
      const unsubscribe = initialize()
      
      expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1)
      expect(typeof mockOnAuthStateChanged.mock.calls[0][1]).toBe('function')
      expect(unsubscribe).toBe(mockUnsubscribe)
    })

    it('should handle auth state changes with user', () => {
      const mockUser = { uid: 'test-uid', email: 'test@example.com' } as User
      let authStateCallback: (user: User | null) => void
      
      mockOnAuthStateChanged.mockImplementation((_, callback) => {
        authStateCallback = callback as (user: User | null) => void
        return vi.fn()
      })
      
      const { initialize } = useAuthStore.getState()
      initialize()
      
      // Simulate auth state change with user
      authStateCallback!(mockUser)
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.isLoading).toBe(false)
    })

    it('should handle auth state changes with null user', () => {
      let authStateCallback: (user: User | null) => void
      
      mockOnAuthStateChanged.mockImplementation((_, callback) => {
        authStateCallback = callback as (user: User | null) => void
        return vi.fn()
      })
      
      // Set initial user
      useAuthStore.setState({ user: { uid: 'test' } as User })
      
      const { initialize } = useAuthStore.getState()
      initialize()
      
      // Simulate auth state change with null user
      authStateCallback!(null)
      
      const state = useAuthStore.getState()
      expect(state.user).toBe(null)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('Error State Management', () => {
    it('should clear error on successful sign in', async () => {
      // Set initial error
      useAuthStore.setState({ error: 'Previous error' })
      
      const mockUser = { uid: 'test-uid' } as User
      mockSignInWithPopup.mockResolvedValue({
        user: mockUser,
        providerId: 'google.com',
        operationType: 'signIn'
      } as UserCredential)
      
      const { signInWithGoogle } = useAuthStore.getState()
      await signInWithGoogle()
      
      expect(useAuthStore.getState().error).toBe(null)
    })

    it('should clear error on successful sign out', async () => {
      // Set initial error
      useAuthStore.setState({ error: 'Previous error' })
      
      mockSignOut.mockResolvedValue(undefined)
      
      const { signOut } = useAuthStore.getState()
      await signOut()
      
      expect(useAuthStore.getState().error).toBe(null)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple sign in attempts', async () => {
      const mockUser = { uid: 'test-uid' } as User
      mockSignInWithPopup.mockResolvedValue({
        user: mockUser,
        providerId: 'google.com',
        operationType: 'signIn'
      } as UserCredential)
      
      const { signInWithGoogle } = useAuthStore.getState()
      
      // Start multiple sign in operations
      const promise1 = signInWithGoogle()
      const promise2 = signInWithGoogle()
      
      await Promise.all([promise1, promise2])
      
      // Should still have correct final state
      const state = useAuthStore.getState()
      expect(state.user).toBe(mockUser)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('should handle sign in followed by sign out', async () => {
      const mockUser = { uid: 'test-uid' } as User
      mockSignInWithPopup.mockResolvedValue({
        user: mockUser,
        providerId: 'google.com',
        operationType: 'signIn'
      } as UserCredential)
      mockSignOut.mockResolvedValue(undefined)
      
      const { signInWithGoogle, signOut } = useAuthStore.getState()
      
      await signInWithGoogle()
      expect(useAuthStore.getState().user).toBe(mockUser)
      
      await signOut()
      expect(useAuthStore.getState().user).toBe(null)
    })
  })

  describe('Persistence Integration', () => {
    it('should maintain user state structure for persistence', () => {
      const mockUser = { 
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User'
      } as User
      
      const { setUser } = useAuthStore.getState()
      setUser(mockUser)
      
      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      
      // Verify structure is serializable (no functions, circular references)
      expect(() => JSON.stringify(state.user)).not.toThrow()
    })
  })
})