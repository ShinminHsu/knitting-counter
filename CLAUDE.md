# KnittingCounter Web Application

## 專案概述
基於React + TypeScript + Vite的編織計數器Web應用程式，提供跨裝置的編織專案管理和進度追蹤功能。

## 技術棧
- React 18 + TypeScript
- Vite 構建工具
- Tailwind CSS 樣式框架
- Zustand 狀態管理
- Firebase Authentication & Firestore
- React Router 路由管理

## 開發需求

### Commit 規範
- 使用英文撰寫commit message
- 保持簡潔，一句話描述更改
- 不在commit message中包含 "with claude"、"Co-Authored-By: Claude" 等AI相關字詞
- 使用標準的conventional commit格式（如：feat:, fix:, refactor:等）

### UI/UX 設計規範
- **不使用任何 emoji 或 icon** - 包括但不限於：
  - 慶祝或狀態表情符號（🎉, ✅, ❌ 等）
  - 功能性圖標（📊, 🧶, 🔧 等）
  - 裝飾性符號（→, ←, ↑, ↓ 等）
  - 統一使用純文字表達所有資訊和狀態
- 保持簡潔的文字界面，重視可讀性和可訪問性

### 測試與構建
- 開發完成後運行 `npm run lint` 檢查代碼規範
- 運行 `npm run build` 確保構建成功
- 確保所有TypeScript類型檢查通過

## 功能模組

### 已完成功能
1. **專案管理** - 創建、編輯、刪除編織專案
2. **進度追蹤** - 實時追蹤編織進度，支援查看模式
3. **織圖編輯** - 完整的織圖編輯器，支援針法和群組管理
4. **毛線管理** - 顏色管理和毛線資訊記錄
5. **用戶認證** - Google OAuth登入系統
6. **數據持久化** - localStorage本地存儲

### 開發中功能
1. **Firestore同步** - 跨裝置數據同步
2. **離線支援** - PWA離線功能
3. **匯入匯出** - 專案資料備份和分享

## 專案結構
```
src/
├── components/          # React組件
├── store/              # Zustand狀態管理
├── types/              # TypeScript類型定義
├── utils/              # 工具函數
├── config/             # 配置文件
└── services/           # API服務層
```

## 本地開發
```bash
npm install
npm run dev
```

## 部署
```bash
npm run build
npm run preview
```