# Store 遷移計劃

## 遷移策略概覽

基於架構分析，我們採用**漸進式遷移策略**，從舊的單體 store (`src/store/`) 遷移到新的模組化 store 系統 (`src/stores/`)。

## 遷移原則

### 核心原則
1. **零停機遷移** - 保持生產環境穩定運行
2. **漸進式替換** - 一次遷移一個組件
3. **向後相容** - 新舊系統並存期間保持相容性
4. **完整測試** - 每個遷移步驟都要通過完整測試

### 風險控制
1. **功能對等** - 確保新系統功能完全覆蓋舊系統
2. **數據一致** - 保證數據遷移過程中的一致性
3. **回滾機制** - 每個階段都可以快速回滾

## 遷移階段規劃

### 階段 1：基礎設施準備 (1-2週)

#### 1.1 完善新 Store 系統
- [ ] **補全同步邏輯** - 將舊系統的 Firebase 同步邏輯移植到 `useSyncStore`
- [ ] **錯誤處理** - 實現完整的錯誤處理機制
- [ ] **離線支援** - 實現離線模式和數據恢復
- [ ] **用戶隔離** - 確保多用戶數據隔離正確

#### 1.2 建立遷移工具
```typescript
// 創建遷移輔助工具
export class StoreMigrationHelper {
  // 檢查數據一致性
  static validateDataConsistency(): boolean
  
  // 遷移用戶數據
  static migrateUserData(userId: string): Promise<void>
  
  // 回滾功能
  static rollbackToOldStore(): void
}
```

#### 1.3 建立測試框架
- [ ] **整合測試** - 測試新舊系統數據交互
- [ ] **E2E 測試** - 端到端功能測試
- [ ] **性能測試** - 確保性能不降級

### 階段 2：核心 Store 遷移 (2-3週)

#### 2.1 AuthStore 整合 (優先級：高)
由於 `authStore.ts` 已經相對獨立且穩定：
- [ ] 將現有 `authStore` 整合到新系統
- [ ] 確保認證流程不受影響
- [ ] 測試用戶登入/登出功能

#### 2.2 BaseStore 功能完善 (優先級：高)
- [ ] 實現完整的錯誤處理
- [ ] 實現載入狀態管理
- [ ] 實現本地更新追蹤

#### 2.3 SyncStore 核心功能 (優先級：極高)
將 `syncedAppStore.ts` 中的同步邏輯提取到 `useSyncStore`：

```typescript
// 需要移植的核心功能：
- updateProjectLocally() // 本地更新與重試機制
- syncWithFirestore() // Firebase 同步
- subscribeToFirestoreChanges() // 實時訂閱
- initializeUserProfile() // 用戶配置初始化
- 網絡狀態監聽 // 離線/在線狀態處理
```

### 階段 3：組件逐步遷移 (3-4週)

#### 3.1 基礎組件優先 (第1週)

**3.1.1 SyncStatusIndicator** (風險：低)
```typescript
// 舊代碼
const { isSyncing, isLocallyUpdating } = useSyncedAppStore()

// 新代碼
const { isSyncing } = useSyncStore()
const { isLocallyUpdating } = useBaseStore()
```

**3.1.2 WelcomeLoadingView** (風險：低)
```typescript
// 舊代碼
const { isLoading, isSyncing, projects, error } = useSyncedAppStore()

// 新代碼
const { isLoading, error } = useBaseStore()
const { isSyncing } = useSyncStore()
const { projects } = useProjectStore()
```

#### 3.2 核心業務組件 (第2-3週)

**3.2.1 ProjectListView** (風險：中)
```typescript
// 舊代碼
const { projects, createProject, deleteProject } = useSyncedAppStore()

// 新代碼
const { projects, createProject, deleteProject } = useProjectStore()
```

**3.2.2 YarnManagerView** (風險：中)
```typescript
// 舊代碼
const { currentProject, addYarn, updateYarn, deleteYarn } = useSyncedAppStore()

// 新代碼
const { currentProject } = useProjectStore()
const { addYarn, updateYarn, deleteYarn } = useYarnStore()
```

**3.2.3 ProgressTrackingView** (風險：高)
```typescript
// 舊代碼 - 複雜的進度邏輯
const { updateChart } = useSyncedAppStore()

// 新代碼 - 分離關注點
const { nextStitch, previousStitch, setCurrentRound } = useProgressStore()
const { updateChart } = useChartStore()
```

#### 3.3 複雜組件 (第4週)

**3.3.1 ProjectDetailView** (風險：高)
```typescript
// 舊代碼 - 多種功能混合
const { migrateCurrentProjectToMultiChart } = useSyncedAppStore()

// 新代碼 - 職責分離
const { migrateCurrentProjectToMultiChart } = useChartStore()
```

**3.3.2 PatternEditorContainer** (風險：高)
```typescript
// 舊代碼
const { setCurrentChart } = useSyncedAppStore()

// 新代碼
const { setCurrentChart } = useChartStore()
```

**3.3.3 StitchGroupTemplateModal** (風險：中)
```typescript
// 舊代碼
const { stitchGroupTemplates, saveStitchGroupAsTemplate } = useSyncedAppStore()

// 新代碼
const { templates, saveTemplate } = useTemplateStore()
```

### 階段 4：應用入口遷移 (1週)

#### 4.1 App.tsx 和 AppWithSync.tsx
```typescript
// 舊代碼 - 單一巨大store
const { loadUserProjects, clearUserDataSilently, setError } = useSyncedAppStore()

// 新代碼 - 組合多個store
const { setError } = useBaseStore()
const { loadUserProjects, clearUserDataSilently } = useProjectStore()
const { isSyncing } = useSyncStore()
```

### 階段 5：清理和優化 (1週)

#### 5.1 移除舊系統
- [ ] 確認所有組件已遷移
- [ ] 移除舊 store 文件
- [ ] 清理未使用的導入
- [ ] 更新文檔

#### 5.2 性能優化
- [ ] 代碼分割優化
- [ ] Bundle 大小分析
- [ ] 性能基準測試

## 遷移檢查清單

### 每個組件遷移前
- [ ] 創建功能測試用例
- [ ] 記錄當前行為
- [ ] 確認依賴的 store 功能已實現

### 每個組件遷移後
- [ ] 通過所有功能測試
- [ ] 驗證數據同步正常
- [ ] 檢查錯誤處理
- [ ] 進行性能測試
- [ ] 更新文檔

### 每個階段完成後
- [ ] 完整回歸測試
- [ ] 性能對比分析
- [ ] 代碼審查
- [ ] 準備回滾方案

## 數據遷移策略

### localStorage 鍵名映射
```typescript
// 舊系統
'knitting-counter-storage'
'synced-knitting-counter-storage'
'auth-storage'

// 新系統
'project-store'
'sync-store'
'auth-storage' // 保持不變
// 其他 stores 根據需要添加
```

### 數據格式轉換
```typescript
interface DataMigration {
  // 檢查是否需要遷移
  needsMigration(data: any): boolean
  
  // 轉換數據格式
  migrateData(oldData: any): any
  
  // 驗證遷移結果
  validateMigration(oldData: any, newData: any): boolean
}
```

## 回滾計劃

### 自動回滾觸發條件
1. 嚴重功能異常 (如數據丟失)
2. 性能下降超過 20%
3. 用戶報告的關鍵問題

### 回滾步驟
1. **立即回滾** - 恢復舊組件
2. **數據恢復** - 恢復 localStorage 數據
3. **問題分析** - 分析失敗原因
4. **修復重試** - 修復問題後重新嘗試

## 風險預警和緩解

### 高風險點
1. **Firebase 同步邏輯** 
   - 緩解：詳細測試離線/在線切換
   - 監控：實時監控同步成功率

2. **用戶數據丟失**
   - 緩解：每個階段前備份數據
   - 監控：數據一致性檢查

3. **性能降級**
   - 緩解：每個階段進行性能測試
   - 監控：關鍵指標監控

### 成功指標
- [ ] 零數據丟失
- [ ] 性能不降級 (同等或更好)
- [ ] 所有功能正常運作
- [ ] 代碼質量提升 (更好的可維護性)

## 時程安排

| 階段 | 時間 | 里程碑 |
|------|------|--------|
| 階段 1 | 週 1-2 | 新系統基礎設施完成 |
| 階段 2 | 週 3-5 | 核心 Store 遷移完成 |
| 階段 3 | 週 6-9 | 所有組件遷移完成 |
| 階段 4 | 週 10 | 應用入口遷移完成 |
| 階段 5 | 週 11 | 清理和優化完成 |

**總預估時間：11週**

---

*此計劃基於當前代碼分析，實際執行時可能需要根據具體情況調整*