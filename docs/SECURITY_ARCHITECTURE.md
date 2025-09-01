# 安全架構方案

## 當前問題
1. **前端白名單不安全**: 硬編碼在前端，任何人都能查看和修改
2. **缺乏後端驗證**: Firestore 規則沒有真正的白名單檢查
3. **數據洩漏**: 非白名單用戶仍能寫入 Firebase
4. **UI 指示錯誤**: 非同步用戶顯示同步動畫

## 安全解決方案

### 方案1: Firebase Functions + Custom Claims (推薦)

#### 架構流程:
1. **用戶登入** → Firebase Auth
2. **Cloud Function 觸發** → 檢查用戶 email 是否在白名單中
3. **設置 Custom Claims** → `canUseFirebase: true/false`
4. **前端檢查 Claims** → 決定同步模式
5. **Firestore 規則驗證** → 基於 Custom Claims 允許/拒絕存取

#### 優點:
- ✅ 白名單存儲在後端 (Firestore/Admin SDK)
- ✅ 無法從前端繞過
- ✅ Firebase 規則真正阻止未授權訪問
- ✅ 即時生效，無需重新登入

#### 實現步驟:
1. 創建 Cloud Function 處理用戶登入事件
2. 在 Firestore 中創建 `whitelists` 集合存儲白名單
3. 修改 Firestore 規則檢查 Custom Claims
4. 前端改為檢查 `user.customClaims.canUseFirebase`

### 方案2: 純 Firestore 規則 (較簡單)

#### 架構流程:
1. 在 Firestore 創建 `/whitelists/{email}` 文檔
2. Firestore 規則直接查詢白名單集合
3. 前端嘗試寫入時，規則會自動檢查

#### 優點:
- ✅ 不需要 Cloud Functions
- ✅ 規則層面阻止未授權訪問
- ✅ 相對簡單實現

#### 缺點:
- ❌ 每次寫入都需要額外的 Firestore 讀取
- ❌ 前端無法預先知道權限狀態

## 建議實現順序

1. **立即修復**: 禁用非白名單用戶的同步指示器 ✅ (已完成)
2. **短期**: 實現方案2，立即阻止未授權寫入
3. **長期**: 升級到方案1，提供更好的用戶體驗

## 臨時安全措施

在實現完整解決方案之前:
1. 修改 Firestore 規則立即阻止非白名單用戶
2. 前端添加嘗試寫入後的錯誤處理
3. 清楚向用戶說明權限限制