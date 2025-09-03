import { useAuthStore } from '../stores/useAuthStore'

export default function UserProfile() {
  const { user, userType, syncMode, signOut, signInWithGoogle, isLoading } = useAuthStore()
  
  const handleSignOut = async () => {
    try {
      await signOut()
      // clearUserData 會在 App.tsx 的 useEffect 中自動調用
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  // 訪客模式 - 顯示登入按鈕
  if (userType === 'guest') {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden md:block">
          <p className="text-xs sm:text-sm font-medium text-text-primary">
            訪客模式
          </p>
          <p className="text-xs text-text-secondary">
            僅本地儲存
          </p>
        </div>
        
        <button
          onClick={signInWithGoogle}
          disabled={isLoading}
          className="btn btn-ghost text-xs sm:text-sm"
        >
          {isLoading ? '登入中...' : '登入'}
        </button>
      </div>
    )
  }

  // 已登入用戶
  if (user && userType === 'authenticated') {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || '使用者'}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
            />
          )}
          <div className="hidden md:block">
            <p className="text-xs sm:text-sm font-medium text-text-primary">
              {user.displayName || '使用者'}
            </p>
            <p className="text-xs text-text-secondary">
              {syncMode === 'firebase' ? '雲端同步' : '本地同步'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          title="登出並清除當前用戶數據"
        >
          {isLoading ? '登出中...' : '登出'}
        </button>
      </div>
    )
  }

  // 未初始化狀態，不顯示任何內容
  return null
}