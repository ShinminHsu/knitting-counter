#!/usr/bin/env node

/**
 * 白名單管理工具
 * 使用 Firebase Admin SDK 安全地管理 Firestore 白名單
 * 
 * 用法:
 *   node admin/whitelist-manager.js add user@example.com
 *   node admin/whitelist-manager.js remove user@example.com  
 *   node admin/whitelist-manager.js list
 *   node admin/whitelist-manager.js check user@example.com
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// 服務帳號金鑰路徑 (不會推送到 git)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account-key.json');

// 檢查服務帳號金鑰是否存在
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('❌ 錯誤: 找不到服務帳號金鑰文件');
  console.log('');
  console.log('請按照以下步驟設置:');
  console.log('1. 前往 Firebase Console > Project Settings > Service Accounts');
  console.log('2. 點擊 "Generate new private key" 下載金鑰文件');
  console.log('3. 將文件重命名為 service-account-key.json');
  console.log(`4. 放置在: ${SERVICE_ACCOUNT_PATH}`);
  console.log('');
  console.log('注意: 此文件包含敏感信息，不會被推送到 git');
  process.exit(1);
}

// 初始化 Firebase Admin
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 工具函數
const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '未知';
  return timestamp.toDate().toLocaleString('zh-TW');
};

// 白名單操作函數
const whitelistOperations = {
  async add(email) {
    const normalizedEmail = normalizeEmail(email);
    
    try {
      const docRef = db.collection('whitelists').doc(normalizedEmail);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log(`⚠️  ${normalizedEmail} 已經在白名單中`);
        const data = doc.data();
        console.log(`   添加時間: ${formatTimestamp(data.addedAt)}`);
        return;
      }
      
      await docRef.set({
        email: normalizedEmail,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        addedBy: 'admin-script'
      });
      
      console.log(`✅ 成功添加 ${normalizedEmail} 到白名單`);
    } catch (error) {
      console.error(`❌ 添加失敗:`, error.message);
    }
  },

  async remove(email) {
    const normalizedEmail = normalizeEmail(email);
    
    try {
      const docRef = db.collection('whitelists').doc(normalizedEmail);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log(`⚠️  ${normalizedEmail} 不在白名單中`);
        return;
      }
      
      await docRef.delete();
      console.log(`✅ 成功從白名單移除 ${normalizedEmail}`);
    } catch (error) {
      console.error(`❌ 移除失敗:`, error.message);
    }
  },

  async check(email) {
    const normalizedEmail = normalizeEmail(email);
    
    try {
      const docRef = db.collection('whitelists').doc(normalizedEmail);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log(`✅ ${normalizedEmail} 在白名單中`);
        const data = doc.data();
        console.log(`   添加時間: ${formatTimestamp(data.addedAt)}`);
        console.log(`   添加者: ${data.addedBy || '未知'}`);
      } else {
        console.log(`❌ ${normalizedEmail} 不在白名單中`);
      }
    } catch (error) {
      console.error(`❌ 檢查失敗:`, error.message);
    }
  },

  async list() {
    try {
      const snapshot = await db.collection('whitelists').orderBy('addedAt', 'desc').get();
      
      if (snapshot.empty) {
        console.log('📝 白名單為空');
        return;
      }
      
      console.log(`📝 白名單 (共 ${snapshot.size} 個用戶):`);
      console.log('');
      
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ${data.email}`);
        console.log(`   添加時間: ${formatTimestamp(data.addedAt)}`);
        console.log(`   添加者: ${data.addedBy || '未知'}`);
        console.log('');
      });
    } catch (error) {
      console.error(`❌ 列表獲取失敗:`, error.message);
    }
  }
};

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('白名單管理工具');
    console.log('');
    console.log('用法:');
    console.log('  node admin/whitelist-manager.js add <email>     # 添加用戶到白名單');
    console.log('  node admin/whitelist-manager.js remove <email>  # 從白名單移除用戶');
    console.log('  node admin/whitelist-manager.js check <email>   # 檢查用戶是否在白名單');
    console.log('  node admin/whitelist-manager.js list           # 列出所有白名單用戶');
    console.log('');
    process.exit(0);
  }
  
  const command = args[0];
  const email = args[1];
  
  switch (command) {
    case 'add':
      if (!email) {
        console.error('❌ 錯誤: 請提供要添加的 email');
        process.exit(1);
      }
      if (!email.includes('@')) {
        console.error('❌ 錯誤: 請提供有效的 email 地址');
        process.exit(1);
      }
      await whitelistOperations.add(email);
      break;
      
    case 'remove':
      if (!email) {
        console.error('❌ 錯誤: 請提供要移除的 email');
        process.exit(1);
      }
      await whitelistOperations.remove(email);
      break;
      
    case 'check':
      if (!email) {
        console.error('❌ 錯誤: 請提供要檢查的 email');
        process.exit(1);
      }
      await whitelistOperations.check(email);
      break;
      
    case 'list':
      await whitelistOperations.list();
      break;
      
    default:
      console.error(`❌ 錯誤: 未知命令 '${command}'`);
      console.log('');
      console.log('可用命令: add, remove, check, list');
      process.exit(1);
  }
  
  process.exit(0);
}

// 錯誤處理
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的 Promise 拒絕:', reason);
  process.exit(1);
});

// 執行主程序
main().catch((error) => {
  console.error('❌ 程序執行錯誤:', error);
  process.exit(1);
});