// 格式化時間間隔
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (hours > 0) {
    return `${hours}小時${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分鐘`
  } else {
    return `${seconds}秒`
  }
}

// 格式化日期
export function formatDate(date: Date | string | number): string {
  let dateObj: Date
  
  if (date instanceof Date) {
    dateObj = date
  } else {
    dateObj = new Date(date)
  }
  
  // 檢查日期是否有效
  if (isNaN(dateObj.getTime())) {
    return '無效日期'
  }
  
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj)
}