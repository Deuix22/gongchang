#!/usr/bin/env node

/**
 * 数据迁移脚本：为现有 admin 用户添加 username 和 passwordHash
 * 
 * 使用方法：
 *   node scripts/migrate-admin-user.js
 * 
 * 或通过 npm script：
 *   npm run migrate:admin
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 导入配置和模型
import config from '../src/config/env.js';
import User from '../src/models/User.js';

const defaultPasswordHash = '$2a$10$RN4q1g.yO2PJoEhXejdve.OAuAq1gCY26wxgR60rGjvvtyw69fJJG'; // 030426
const adminPasswordHash = config.adminPasswordHash || defaultPasswordHash;
const adminUsername = config.adminUsername || 'admin';

async function migrateAdminUser () {
  try {
    // 连接数据库
    console.log('[Migration] 正在连接数据库...');
    await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName
    });
    console.log('[Migration] 数据库连接成功');

    // 查找所有 admin 用户
    const adminUsers = await User.find({ role: 'admin' });
    console.log(`[Migration] 找到 ${adminUsers.length} 个 admin 用户`);

    if (adminUsers.length === 0) {
      console.log('[Migration] 未找到 admin 用户，创建新的 admin 用户...');
      const newAdmin = await User.create({
        username: adminUsername,
        passwordHash: adminPasswordHash,
        nickName: '平台管理员',
        role: 'admin'
      });
      console.log('[Migration] ✅ 已创建新的 admin 用户:', {
        userId: newAdmin.userId,
        username: newAdmin.username
      });
    } else {
      // 更新所有 admin 用户
      for (const adminUser of adminUsers) {
        let updated = false;
        const updates = {};

        // 检查并更新 username
        if (!adminUser.username || adminUser.username !== adminUsername) {
          updates.username = adminUsername;
          updated = true;
          console.log(`[Migration] 用户 ${adminUser.userId} 缺少 username，将设置为 "${adminUsername}"`);
        }

        // 检查并更新 passwordHash
        // 需要先查询包含 passwordHash 的用户
        const userWithPassword = await User.findOne({ userId: adminUser.userId }).select('+passwordHash');
        if (!userWithPassword?.passwordHash) {
          updates.passwordHash = adminPasswordHash;
          updated = true;
          console.log(`[Migration] 用户 ${adminUser.userId} 缺少 passwordHash，将设置为默认密码哈希`);
        }

        if (updated) {
          await User.updateOne(
            { userId: adminUser.userId },
            { $set: updates }
          );
          console.log(`[Migration] ✅ 已更新用户 ${adminUser.userId}:`, updates);
        } else {
          console.log(`[Migration] ✓ 用户 ${adminUser.userId} 数据完整，无需更新`);
        }
      }
    }

    // 验证迁移结果
    console.log('\n[Migration] 验证迁移结果...');
    const verifiedAdmin = await User.findOne({ role: 'admin', username: adminUsername }).select('+passwordHash');
    if (verifiedAdmin && verifiedAdmin.username === adminUsername && verifiedAdmin.passwordHash) {
      console.log('[Migration] ✅ 验证成功！admin 用户数据完整:');
      console.log('  - userId:', verifiedAdmin.userId);
      console.log('  - username:', verifiedAdmin.username);
      console.log('  - passwordHash:', verifiedAdmin.passwordHash ? '已设置' : '未设置');
      console.log('  - role:', verifiedAdmin.role);
      
      // 测试密码验证
      const testPassword = '030426';
      const match = await bcrypt.compare(testPassword, verifiedAdmin.passwordHash);
      if (match) {
        console.log('[Migration] ✅ 密码验证成功！可以使用密码 "030426" 登录');
      } else {
        console.log('[Migration] ⚠️  密码验证失败！请检查密码哈希是否正确');
      }
    } else {
      console.log('[Migration] ❌ 验证失败！admin 用户数据不完整');
    }

    console.log('\n[Migration] 迁移完成！');
  } catch (error) {
    console.error('[Migration] ❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('[Migration] 数据库连接已关闭');
  }
}

// 运行迁移
migrateAdminUser();

