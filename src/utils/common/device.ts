// 檢查是否為移動設備
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// 檢查是否為 iOS 設備
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

// 檢查是否在 PWA 模式下運行
export function isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as { standalone?: boolean }).standalone === true
}