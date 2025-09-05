import { logger } from './logger'

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
      logger.debug('Connection restored')
      this.isOnline = true
      this.notifyListeners()
    })

    window.addEventListener('offline', () => {
      logger.debug('Connection lost')
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
      // 首先嘗試簡單的網路檢測
      if (!navigator.onLine) {
        const wasOnline = this.isOnline
        this.isOnline = false
        if (wasOnline) {
          logger.debug('Navigator reports offline')
          this.notifyListeners()
        }
        return
      }

      // 嘗試多個端點進行網路檢測，提高成功率
      const testUrls = [
        'https://www.google.com/favicon.ico',
        'https://httpbin.org/status/200',
        '/favicon.ico' // 本地資源作為備用
      ]

      let connectionOk = false
      
      for (const url of testUrls) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 3000)
          
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            connectionOk = true
            break
          }
        } catch {
          // 繼續嘗試下一個URL
          continue
        }
      }
      
      const wasOffline = !this.isOnline
      this.isOnline = connectionOk
      
      if (wasOffline && this.isOnline) {
        logger.debug('Connection status verified: online')
        this.notifyListeners()
      } else if (!wasOffline && !this.isOnline) {
        logger.debug('Connection status verified: offline')
        this.notifyListeners()
      }
    } catch (error) {
      logger.error('Connection check failed:', error)
      // 保持當前狀態，不改變
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        logger.error('Error in network status listener:', error)
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