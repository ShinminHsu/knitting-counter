/**
 * 環境檢查工具
 * 統一檢查開發/生產環境的工具
 */

export function getEnvironmentInfo() {
  const info = {
    // Vite 環境變數
    viteMode: typeof import.meta !== 'undefined' ? import.meta.env?.MODE : 'unknown',
    viteDev: typeof import.meta !== 'undefined' ? import.meta.env?.DEV : false,
    viteProd: typeof import.meta !== 'undefined' ? import.meta.env?.PROD : false,
    
    // Node.js 環境變數  
    nodeEnv: typeof process !== 'undefined' ? process.env?.NODE_ENV : 'unknown',
    
    // 判斷結果
    isDevelopment: (typeof import.meta !== 'undefined' && import.meta.env?.DEV) || 
                   (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'),
    isProduction: (typeof import.meta !== 'undefined' && import.meta.env?.PROD) || 
                  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'),
    
    // 部署平台檢測
    isVercel: typeof process !== 'undefined' && !!process.env?.VERCEL,
    vercelEnv: typeof process !== 'undefined' ? process.env?.VERCEL_ENV : 'unknown',
    
    // Logger 狀態
    loggerDebugEnabled: undefined, // 會在下方設置
    hasDebugTools: typeof window !== 'undefined' && !!(window as any).debugLogger
  }
  
  return info
}

// 在開發環境下添加全域檢查工具
if (typeof window !== 'undefined') {
  (window as any).checkEnv = () => {
    const info = getEnvironmentInfo()
    console.group('🌍 環境資訊')
    console.log('Vite Mode:', info.viteMode)
    console.log('Vite DEV:', info.viteDev)
    console.log('Vite PROD:', info.viteProd)
    console.log('Node ENV:', info.nodeEnv)
    console.log('是否為開發環境:', info.isDevelopment)
    console.log('是否為生產環境:', info.isProduction)
    console.log('是否在 Vercel:', info.isVercel)
    console.log('Vercel 環境:', info.vercelEnv)
    console.log('Logger Debug 工具可用:', info.hasDebugTools)
    console.groupEnd()
    return info
  }
}

export default getEnvironmentInfo