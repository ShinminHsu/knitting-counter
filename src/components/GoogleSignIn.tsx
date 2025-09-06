import { useState } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import ConfirmDialog from './ConfirmDialog'
import knittingIcon from '../assets/images/kniitingIcon.png'

export default function GoogleSignIn() {
  const { signInWithGoogle, isLoading, error } = useAuthStore()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleGoogleSignIn = () => {
    setShowConfirmDialog(true)
  }

  const handleConfirmSignIn = () => {
    setShowConfirmDialog(false)
    signInWithGoogle()
  }

  const handleCancelSignIn = () => {
    setShowConfirmDialog(false)
  }

  return (
    <div className="min-h-screen bg-background-primary flex items-center justify-center px-4">
      <div className="card max-w-sm sm:max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl sm:text-4xl mb-3">🧶</div>
          <img src={knittingIcon} alt="Stitchie" className="w-12 h-12" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">Stitchie</h1> 
          <p className="text-sm sm:text-base text-text-secondary">
            使用 Google 帳戶登入以同步您的編織專案
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              使用 Google 登入
            </>
          )}
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-text-tertiary">
            登入即表示您同意我們的服務條款和隱私政策
          </p>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="確認登入"
        message="注意：目前此功能尚在開發中，即便登入後，您的資料也不會同步到雲端，與訪客模式相同。確定要使用Google帳號登入嗎？"
        onConfirm={handleConfirmSignIn}
        onCancel={handleCancelSignIn}
        confirmText="確定登入"
        cancelText="取消"
      />
    </div>
  )
}