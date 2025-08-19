export class NetworkStatusManager {
  private static instance: NetworkStatusManager
  private isOnline: boolean = navigator.onLine
  private listeners: Array<(isOnline: boolean) => void> = []

  private constructor() {
    this.setupEventListeners()
  }

  static getInstance(): NetworkStatusManager {
    if (!NetworkStatusManager.instance) {
      NetworkStatusManager.instance = new NetworkStatusManager()
    }
    return NetworkStatusManager.instance
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('[NETWORK] Connection restored')
      this.isOnline = true
      this.notifyListeners()
    })

    window.addEventListener('offline', () => {
      console.log('[NETWORK] Connection lost')
      this.isOnline = false
      this.notifyListeners()
    })

    // 額外檢測機制，特別針對移動設備
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 當頁面重新獲得焦點時，檢查網絡狀態
        this.checkConnectionStatus()
      }
    })
  }

  private async checkConnectionStatus() {
    try {
      // 使用 Google DNS 進行更可靠的網路檢測
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch('https://dns.google/resolve?name=google.com&type=A', {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      const wasOffline = !this.isOnline
      this.isOnline = response.ok
      
      if (wasOffline && this.isOnline) {
        console.log('[NETWORK] Connection status verified: online')
        this.notifyListeners()
      }
    } catch (error) {
      const wasOnline = this.isOnline
      this.isOnline = false
      
      if (wasOnline) {
        console.log('[NETWORK] Connection status verified: offline', error)
        this.notifyListeners()
      }
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        console.error('[NETWORK] Error in network status listener:', error)
      }
    })
  }

  getIsOnline(): boolean {
    return this.isOnline
  }

  addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener)
    
    // 返回移除監聽器的函數
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  async waitForConnection(timeout = 10000): Promise<boolean> {
    if (this.isOnline) {
      return true
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        cleanup()
        resolve(false)
      }, timeout)

      const cleanup = this.addListener((isOnline) => {
        if (isOnline) {
          clearTimeout(timer)
          cleanup()
          resolve(true)
        }
      })
    })
  }
}

export const networkStatus = NetworkStatusManager.getInstance()