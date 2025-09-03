import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, Unsubscribe } from 'firebase/auth'
import { auth, googleProvider } from '../config/firebase'
import { AuthState, UserType, SyncMode, UnifiedUser } from '../types/auth'
import { canUseFirebaseSync, getUserSyncModeFromFirestore } from '../services/whitelistService'
import { generateId } from '../utils'

interface AuthStore extends AuthState {
  // 錯誤狀態（為了向後兼容）
  error: string | null
  
  // 基本狀態管理
  setUser: (user: User | null) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setUserType: (userType: UserType) => void
  setSyncMode: (syncMode: SyncMode) => void
  setInitialized: (initialized: boolean) => void
  
  // 認證操作
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  enterGuestMode: () => void
  
  // 初始化和工具方法
  initialize: () => Unsubscribe
  getCurrentUser: () => UnifiedUser | null
  canUseFirebase: () => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      user: null,
      userType: 'uninitialized',
      syncMode: 'local',
      isLoading: false,
      isInitialized: false,
      error: null,

      // 基本狀態管理
      setUser: async (user) => {
        const userType: UserType = user ? 'authenticated' : 'guest'
        const syncMode: SyncMode = user ? await getUserSyncModeFromFirestore(user.email) : 'local'
        
        set({ 
          user, 
          userType, 
          syncMode,
          error: null // 清除錯誤訊息
        })
        
        console.log(`[AUTH] User updated:`, {
          hasUser: !!user,
          email: user?.email,
          userType,
          syncMode,
          canUseFirebase: user ? await canUseFirebaseSync(user.email) : false
        })
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      setUserType: (userType) => set({ userType }),
      setSyncMode: (syncMode) => set({ syncMode }),
      setInitialized: (initialized) => set({ isInitialized: initialized }),

      // Google 登入
      signInWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null })
          const result = await signInWithPopup(auth, googleProvider)
          
          // 檢查用戶是否可以使用 Firebase
          const canSync = await canUseFirebaseSync(result.user.email)
          const syncMode = await getUserSyncModeFromFirestore(result.user.email)
          
          set({ 
            user: result.user, 
            userType: 'authenticated',
            syncMode,
            isLoading: false 
          })
          
          // 顯示同步模式資訊
          if (!canSync) {
            console.warn(`[AUTH] User ${result.user.email} not in whitelist, using local-only mode`)
            set({ 
              error: '您目前只能使用本地同步模式，數據不會同步到雲端。如需雲端同步，請聯繫管理員。'
            })
            // 3秒後清除錯誤訊息
            setTimeout(() => {
              const currentState = get()
              if (currentState.error?.includes('本地同步模式')) {
                set({ error: null })
              }
            }, 3000)
          } else {
            console.log(`[AUTH] User ${result.user.email} authenticated with Firebase sync enabled`)
          }
          
        } catch (error: unknown) {
          console.error('Google 登入失敗:', error)
          const errorMessage = error instanceof Error ? error.message : '登入失敗'
          set({
            error: errorMessage,
            isLoading: false,
            userType: 'guest',
            syncMode: 'local'
          })
        }
      },

      // 進入訪客模式
      enterGuestMode: () => {
        console.log('[AUTH] Entering guest mode')
        set({
          user: null,
          userType: 'guest',
          syncMode: 'local',
          isLoading: false,
          error: null
        })
      },

      // 登出
      signOut: async () => {
        try {
          set({ isLoading: true, error: null })
          
          // 如果有 Firebase 用戶，執行 Firebase 登出
          const currentState = get()
          if (currentState.user) {
            await firebaseSignOut(auth)
          }
          
          // 重置為未初始化狀態，讓用戶重新選擇登入方式
          set({ 
            user: null, 
            userType: 'uninitialized',
            syncMode: 'local',
            isLoading: false 
          })
          
          console.log('[AUTH] User signed out, back to login selection')
        } catch (error: unknown) {
          console.error('登出失敗:', error)
          const errorMessage = error instanceof Error ? error.message : '登出失敗'
          set({
            error: errorMessage,
            isLoading: false
          })
        }
      },

      // 初始化認證狀態監聽
      initialize: () => {
        set({ isLoading: true })
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          const currentState = get()
          
          if (user) {
            // 有 Firebase 用戶，設定為已認證
            const syncMode: SyncMode = await getUserSyncModeFromFirestore(user.email)
            set({ 
              user, 
              userType: 'authenticated',
              syncMode,
              isLoading: false,
              isInitialized: true
            })
            
            console.log(`[AUTH] Firebase user restored:`, {
              email: user.email,
              syncMode,
              canUseFirebase: await canUseFirebaseSync(user.email)
            })
          } else {
            // 沒有 Firebase 用戶
            // 如果用戶已經主動選擇了訪客模式，保持訪客狀態
            // 否則保持未初始化狀態，等待用戶選擇
            const finalUserType: UserType = currentState.userType === 'guest' ? 'guest' : 'uninitialized'
            
            set({ 
              user: null, 
              userType: finalUserType,
              syncMode: 'local',
              isLoading: false,
              isInitialized: true
            })
            
            console.log(`[AUTH] No Firebase user, userType: ${finalUserType}`)
          }
        })
        
        return unsubscribe
      },

      // 獲取統一的用戶信息
      getCurrentUser: (): UnifiedUser | null => {
        const state = get()
        
        if (state.user) {
          // 已登入用戶
          return {
            id: state.user.uid,
            displayName: state.user.displayName,
            email: state.user.email,
            isGuest: false,
            syncMode: state.syncMode
          }
        } else if (state.userType === 'guest') {
          // 訪客用戶
          return {
            id: 'guest-' + generateId(),
            displayName: '訪客用戶',
            email: null,
            isGuest: true,
            syncMode: 'local'
          }
        }
        
        return null
      },

      // 檢查是否可以使用 Firebase
      canUseFirebase: (): boolean => {
        const state = get()
        return state.syncMode === 'firebase' && !!state.user
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        userType: state.userType,
        syncMode: state.syncMode,
        error: state.error
      })
    }
  )
)