# 白名單管理工具

這個目錄包含用於管理 KnittingCounter 白名單的管理工具。

## 設置

1. **安裝依賴**:
   ```bash
   cd admin
   npm install
   ```

2. **獲取 Firebase 服務帳號金鑰**:
   - 前往 [Firebase Console](https://console.firebase.google.com/)
   - 選擇你的專案 > Project Settings > Service Accounts
   - 點擊 "Generate new private key"
   - 下載金鑰文件並重命名為 `service-account-key.json`
   - 將文件放在 `admin/` 目錄下

3. **確保 .gitignore 設置**:
   ```
   admin/service-account-key.json
   admin/node_modules/
   ```

## 使用方法

```bash
# 添加用戶到白名單
node whitelist-manager.js add user@example.com

# 從白名單移除用戶
node whitelist-manager.js remove user@example.com

# 檢查用戶是否在白名單
node whitelist-manager.js check user@example.com

# 列出所有白名單用戶
node whitelist-manager.js list
```

## 安全注意事項

- `service-account-key.json` 包含敏感信息，已被 .gitignore 排除
- 只有擁有服務帳號金鑰的人才能執行這些操作
- 所有操作都會記錄到 Firestore，包含時間戳和操作者信息

## Firestore 結構

```
whitelists/{email} = {
  email: "user@example.com",
  addedAt: timestamp,
  addedBy: "admin-script"
}
```