/**
 * 認證相關的類型定義
 */

import { User } from 'firebase/auth'

// 用戶類型
export type UserType = 'guest' | 'authenticated' | 'uninitialized'

// 同步模式
export type SyncMode = 'local' | 'firebase'

// 認證狀態
export interface AuthState {
  // Firebase 用戶對象（登入用戶才有）
  user: User | null
  // 用戶類型
  userType: UserType
  // 同步模式
  syncMode: SyncMode
  // 是否正在載入
  isLoading: boolean
  // 是否已初始化
  isInitialized: boolean
}

// 訪客用戶信息（用於顯示）
export interface GuestUser {
  id: string
  displayName: string
  email: null
  isGuest: true
}

// 統一的用戶信息介面
export interface UnifiedUser {
  id: string
  displayName: string | null
  email: string | null
  isGuest: boolean
  syncMode: SyncMode
}

// 登入方法
export type LoginMethod = 'google' | 'guest'

// 認證事件
export type AuthEvent = 
  | 'login_success'
  | 'login_failed' 
  | 'logout'
  | 'guest_mode_enter'
  | 'sync_mode_change'