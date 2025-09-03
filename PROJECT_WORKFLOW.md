# Knitting Counter 專案工作流程分析

本文檔旨在詳細說明 Knitting Counter 專案的整體架構、用戶流程、資料同步模型和主要功能模組，幫助開發者快速理解專案的運作方式。

## 核心技術棧

- **前端框架**: React (with Vite)
- **語言**: TypeScript
- **狀態管理**: Zustand
- **後端 & 資料庫**: Firebase (Authentication, Firestore)
- **路由**: React Router (推斷)

---

## 完整用戶流程分析

### 1. 應用程式啟動與用戶身份判斷

1.  **啟動入口**:
    - 程式從 `src/main.tsx` 開始，它會渲染 `src/AppWithSync.tsx`。
    - `AppWithSync.tsx` 是一個高階組件，其主要職責是**初始化同步邏輯**。它會根據用戶的登入狀態決定使用哪種資料同步方式。
    - 接著它會渲染主要的 `src/App.tsx`。

2.  **監聽用戶狀態**:
    - 在應用程式的高層級組件中（可能在 `AppWithSync.tsx` 或 `App.tsx`），`src/services/authListener.ts` 會被執行。
    - `authListener.ts` 會設定一個 Firebase Auth 的監聽器 (`onAuthStateChanged`)。
    - 當用戶登入、登出或刷新頁面時，此監聽器會被觸發，並更新 `src/stores/useAuthStore.ts` 中的用戶狀態（如 `user` 物件、`isAuthenticated` 旗標）。

3.  **路由與頁面渲染**:
    - `src/App.tsx` 內部包含路由邏輯，根據當前 URL 和 `useAuthStore` 中的用戶狀態來決定顯示哪個頁面組件。
    - `WelcomeLoadingView.tsx` 或 `LoadingPage.tsx` 可能會在身份驗證期間顯示，提供流暢的用戶體驗。

### 2. 用戶登入流程 (三種身份)

#### 場景 A：訪客 (Guest)

1.  **操作**: 用戶在初始頁面點擊「以訪客身份繼續」。
2.  **程式碼**:
    - `src/components/GuestModeLogin.tsx` 中的按鈕被點擊。
    - 觸發 `src/stores/useAuthStore.ts` 中的函式（例如 `loginAsGuest()`）。
    - 此函式會將 `isGuest` 設為 `true`，並可能在 `localStorage` 中設定一個旗標。
3.  **資料同步**:
    - `src/services/syncManager.ts` 偵測到 `isGuest` 為 `true`。
    - 它會將資料的讀寫模式切換到**本機儲存**。
    - 所有專案資料的 CRUD 操作都將透過 `src/utils/userStorage.ts` 或類似工具，將資料儲存在瀏覽器的 `localStorage` 或 `IndexedDB` 中。
    - `src/services/guestDataBackup.ts` 提供資料匯出/匯入功能。

#### 場景 B：非白名單用戶 (Non-Whitelisted User)

1.  **操作**: 用戶點擊「使用 Google 登入」。
2.  **程式碼**:
    - `src/components/GoogleSignIn.tsx` 呼叫 Firebase Auth 的 `signInWithPopup` 或 `signInWithRedirect` 方法。
    - 成功登入後，`authListener.ts` 收到用戶資訊，並更新 `useAuthStore`。
    - 應用程式呼叫 `src/services/whitelistService.ts` 中的 `isUserWhitelisted(user.uid)` 函式。
    - 此函式查詢 Firestore 的 `whitelist` 集合，檢查結果為**不存在**。
    - `useAuthStore` 中的 `isWhitelisted` 被設為 `false`。
3.  **資料同步**:
    - `syncManager.ts` 偵測到 `isAuthenticated` 為 `true` 但 `isWhitelisted` 為 `false`。
    - 應用程式進入**唯讀模式**或**有限功能模式**。
    - 允許從 Firestore 讀取該用戶已有的資料，但**停用**所有寫入操作（儲存、更新、刪除）。
    - `FirestoreProjectService.ts` 等服務在執行寫入操作前會進行權限檢查。

#### 場景 C：白名單用戶 (Whitelisted User)

1.  **操作**: 與場景 B 相同，用戶使用 Google 登入。
2.  **程式碼**:
    - 流程與場景 B 相同，直到白名單檢查。
    - `whitelistService.ts` 的檢查結果為**存在**，`useAuthStore` 中的 `isWhitelisted` 被設為 `true`。
3.  **資料同步**:
    - `syncManager.ts` 偵測到 `isAuthenticated` 和 `isWhitelisted` 均為 `true`。
    - 啟動與 **Firestore 的即時雙向同步**。
    - `src/services/FirestoreConnectionManager.ts` 建立與 Firestore 的即時監聽器 (`onSnapshot`)。
    - 當 Firestore 資料變化時，自動更新到對應的 Zustand store。
    - 當用戶在客戶端操作時，呼叫 `Firestore...Service.ts` 中的函式將變更寫入 Firestore。

---

### 主要頁面功能與程式碼對應

| 頁面/視圖 | 組件檔案 | 主要職責 | 互動的程式碼 |
| :--- | :--- | :--- | :--- |
| **專案列表** | `ProjectListView.tsx` | 顯示所有專案的列表，提供新增、刪除專案的入口。 | - **讀取**: 從 `useProjectStore.ts` 獲取專案列表。<br>- **寫入**: 呼叫 `FirestoreProjectService.ts` (白名單) 或 `userStorage.ts` (訪客)。 |
| **專案詳情** | `ProjectDetailView.tsx` | 顯示單一專案的詳細資訊，包括圖表、紗線用量等。 | - **讀取**: 從 `useProjectStore` 和 `useChartStore.ts` 獲取資料。<br>- **互動**: 包含 `ChartManagement.tsx` 和 `YarnDisplay.tsx` 等子組件。 |
| **圖表/織圖編輯器** | `PatternEditorView.tsx` | 核心功能，用於建立和編輯編織圖樣。 | - **狀態管理**: `usePatternEditorState.ts`, `usePatternStore.ts`。<br>- **操作**: `usePatternOperations.ts` 處理回合/針法邏輯。<br>- **儲存**: 呼叫 `FirestoreRoundService.ts` (白名單) 或 `userStorage.ts` (訪客)。 |
| **進度追蹤** | `ProgressTrackingView.tsx` | 讓用戶根據圖樣追蹤自己的編織進度。 | - **讀取**: 從 `useProgressStore.ts` 獲取進度。<br>- **計算**: `useProgressCalculations.ts` 計算完成度。<br>- **互動**: `useChartProgressOperations.ts` 處理進度更新。 |
| **用戶個人資料** | `UserProfile.tsx` | 顯示用戶資訊，提供登出、同步設定等功能。 | - **狀態**: 從 `useAuthStore.ts` 讀取用戶資訊。<br>- **操作**: 呼叫 `authStore` 的登出函式。<br>- **同步**: `SyncStatusIndicator.tsx` 顯示同步狀態。 |

---

### 訪客 (Guest) vs. 白名單用戶 (Whitelisted) 核心差異總結

| 功能 | 訪客 (Guest) | 白名單用戶 (Whitelisted) |
| :--- | :--- | :--- |
| **登入方式** | 點擊「訪客模式」，不需帳號。 | 使用 Google 帳號登入，且帳號需在白名單內。 |
| **資料儲存位置** | **瀏覽器本機儲存** (`localStorage` / `IndexedDB`)。 | **雲端 Firestore 資料庫**。 |
| **資料同步** | **無**自動跨裝置同步。資料僅存於當前裝置。 | **即時**跨裝置同步。 |
| **資料持久性** | **低**。清除瀏覽器快取或更換裝置會導致資料遺失。 | **高**。資料跟隨 Google 帳號，安全儲存在雲端。 |
| **相關程式碼** | `GuestModeLogin.tsx`, `userStorage.ts`, `guestDataBackup.ts` | `GoogleSignIn.tsx`, `whitelistService.ts`, `Firestore...Service.ts` |
