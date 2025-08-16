import { useAuthStore } from '../store/authStore'

export default function UserProfile() {
  const { user, signOut, isLoading } = useAuthStore()

  if (!user) return null

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
            {user.email}
          </p>
        </div>
      </div>
      
      <button
        onClick={signOut}
        disabled={isLoading}
        className="text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
      >
        {isLoading ? '登出中...' : '登出'}
      </button>
    </div>
  )
}