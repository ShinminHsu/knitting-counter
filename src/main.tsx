import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWithSync from './AppWithSync.tsx'
import './index.css'

// 在開發環境下載入 Firebase 調試工具
if (process.env.NODE_ENV === 'development') {
  import('./utils/devTools')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithSync />
    </BrowserRouter>
  </React.StrictMode>,
)