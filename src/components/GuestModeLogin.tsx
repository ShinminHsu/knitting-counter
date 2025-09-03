import React from 'react'
import { useAuthStore } from '../stores/useAuthStore'

export const GuestModeLogin: React.FC = () => {
  const { signInWithGoogle, enterGuestMode, isLoading, error, userType, user } = useAuthStore()

  // 如果已經登入，不顯示登入界面
  if (user && userType === 'authenticated') {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <div className="max-w-md w-full space-y-8 p-6">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            編織計數器
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            選擇使用方式
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Google 登入按鈕 */}
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="btn btn-primary w-full py-3"
          >
            {isLoading ? (
              '登入中...'
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                使用 Google 帳號登入
              </>
            )}
          </button>
          
          {/* Google 登入說明 */}
          <div className="card bg-background-secondary border-border">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-text-primary">
                  雲端同步模式
                </h3>
                <div className="mt-1 text-sm text-text-secondary">
                  數據會同步到雲端，可在多個裝置間使用
                </div>
                <div className="mt-2 text-sm text-text-secondary">
                  <p className="mb-2">
                    目前雲端同步功能只開放給特定用戶使用。<br />
                    您的帳號將使用本地模式，數據不會同步到雲端。
                  </p>
                  <p className="font-semibold text-text-primary">
                    如需雲端同步功能，請聯繫管理員申請權限。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 分隔線 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background-primary text-text-tertiary">或</span>
            </div>
          </div>

          {/* 訪客模式按鈕 */}
          <button
            onClick={enterGuestMode}
            disabled={isLoading}
            className="btn btn-primary w-full py-3"
          >
            以訪客身份使用
          </button>
          
          {/* 訪客模式說明 */}
          <div className="card">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-text-primary">
                  本地模式
                </h3>
                <div className="mt-1 text-sm text-text-secondary">
                  <p className="mb-2">
                    數據僅儲存在此裝置上，不會同步到雲端
                  </p>
                  <p className="font-semibold text-text-primary">
                    注意：清除瀏覽器數據或強制重新整理可能導致資料遺失
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}