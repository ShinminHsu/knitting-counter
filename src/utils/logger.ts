/**
 * 統一的日誌管理工具
 * 開發環境：支援所有日誌輸出
 * 生產環境：僅輸出錯誤和警告，debug日誌被隱藏
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  enabled: boolean
  levels: {
    debug: boolean
    info: boolean
    warn: boolean
    error: boolean
  }
}

class Logger {
  private config: LoggerConfig

  constructor() {
    // 檢查環境：Vite 使用 import.meta.env，Node.js 使用 process.env
    const isDev = (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || 
                  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development')
    
    // 默認配置：生產環境只顯示警告和錯誤
    this.config = {
      enabled: true,
      levels: {
        debug: isDev,
        info: isDev,
        warn: true,
        error: true
      }
    }

    // 在開發環境下提供全局控制介面
    if (isDev && typeof window !== 'undefined') {
      this.initDevTools()
    }
  }

  private initDevTools() {
    if (typeof window === 'undefined') return

    ;(window as any).debugLogger = {
      enable: () => {
        this.config.enabled = true
        this.config.levels = { debug: true, info: true, warn: true, error: true }
        console.log('Logger enabled with all levels')
      },
      disable: () => {
        this.config.enabled = false
        console.log('Logger disabled')
      },
      setLevel: (level: LogLevel, enabled: boolean) => {
        this.config.levels[level] = enabled
        console.log(`Logger ${level} level ${enabled ? 'enabled' : 'disabled'}`)
      },
      getConfig: () => {
        console.log('Current logger config:', this.config)
        return this.config
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && this.config.levels[level]
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log('[DEBUG]', ...args)
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info('[INFO]', ...args)
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn('[WARN]', ...args)
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error('[ERROR]', ...args)
    }
  }

  // 群組日誌（僅開發環境）
  group(label: string) {
    if (this.shouldLog('debug')) {
      console.group(label)
    }
  }

  groupEnd() {
    if (this.shouldLog('debug')) {
      console.groupEnd()
    }
  }
}

// 創建單例logger實例
export const logger = new Logger()

// 擴展全局類型聲明
declare global {
  interface Window {
    debugLogger?: {
      enable: () => void
      disable: () => void
      setLevel: (level: LogLevel, enabled: boolean) => void
      getConfig: () => LoggerConfig
    }
  }
}