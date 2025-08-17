import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, Unsubscribe } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Unsubscribe
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, _get) => ({
      // 初始狀態
      user: null,
      isLoading: false,
      error: null,

      // 基本動作
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Google 登入
      signInWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null })
          const result = await signInWithPopup(auth, googleProvider)
          set({ user: result.user, isLoading: false })
        } catch (error: any) {
          console.error('Google 登入失敗:', error)
          set({ 
            error: error.message || '登入失敗', 
            isLoading: false 
          })
        }
      },

      // 登出
      signOut: async () => {
        try {
          set({ isLoading: true, error: null })
          await firebaseSignOut(auth)
          set({ user: null, isLoading: false })
        } catch (error: any) {
          console.error('登出失敗:', error)
          set({ 
            error: error.message || '登出失敗', 
            isLoading: false 
          })
        }
      },

      // 初始化認證狀態監聽
      initialize: () => {
        return onAuthStateChanged(auth, (user) => {
          set({ user, isLoading: false })
        })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user
      })
    }
  )
)