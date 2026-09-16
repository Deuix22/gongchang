import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import { badRequest, notFound, forbidden } from '../utils/errors.js';
import { getWechatSession } from '../services/wechatService.js';
import config from '../config/env.js';

export async function createUser (req, res) {
  const { username, password, nickName, role, department } = req.body ?? {};

  // 验证必填字段
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    throw badRequest('username 必填且至少3个字符');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw badRequest('password 必填且至少6个字符');
  }

  // 验证角色（不能创建 admin）
  const validRoles = ['leader', 'manager'];
  const userRole = role && validRoles.includes(role) ? role : 'leader';
  if (role === 'admin') {
    throw badRequest('不能创建 admin 角色');
  }

  // 检查账号是否已存在
  const existingUser = await User.findOne({ username: username.trim() });
  if (existingUser) {
    throw badRequest('账号已存在');
  }

  // 加密密码
  const passwordHash = await bcrypt.hash(password, 10);

  // 创建用户
  const user = await User.create({
    username: username.trim(),
    passwordHash,
    nickName: nickName?.trim() || `用户${username.trim()}`,
    role: userRole,
    department: department?.trim() || null
  });

  res.status(201).json({
    userId: user.userId,
    username: user.username,
    nickName: user.nickName,
    role: user.role,
    department: user.department ?? null,
    createdAt: user.createdAt
  });
}

export async function getCurrentUser (req, res) {
  const user = await User.findOne({ userId: req.user.userId });
  if (!user) {
    throw notFound('用户不存在');
  }

  res.json({
    userId: user.userId,
    username: user.username ?? null,
    nickName: user.nickName,
    role: user.role,
    department: user.department ?? null,
    wechatOpenId: user.wechatOpenId ?? null,
    wechatTemplateId: config.wechatTemplateId || null, // 返回模板ID（建议）
    wechatAuthExpired: user.wechatAuthExpired ?? false, // 订阅消息授权是否过期
    authExpiredAt: user.authExpiredAt ?? null, // 授权过期时间
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  });
}

export async function updateCurrentUser (req, res) {
  const { nickName, wechatCode, wechatUserInfo, wechatOpenId, wechatAuthExpired } = req.body ?? {};
  
  // 至少需要提供一个要更新的字段
  const hasNickName = nickName !== undefined;
  const hasWechatCode = !!wechatCode;
  const hasUnbindWechat = wechatOpenId === null || wechatOpenId === '';
  const hasClearAuthExpired = wechatAuthExpired === false;
  
  if (!hasNickName && !hasWechatCode && !hasUnbindWechat && !hasClearAuthExpired) {
    throw badRequest('至少需要提供一个要更新的字段（nickName、wechatCode、wechatOpenId 或 wechatAuthExpired）');
  }

  // 查找当前用户
  const user = await User.findOne({ userId: req.user.userId });
  if (!user) {
    throw notFound('用户不存在');
  }

  // 更新昵称（如果提供）
  if (hasNickName) {
    if (typeof nickName !== 'string' || nickName.trim() === '') {
      throw badRequest('nickName 不能为空');
    }
    const trimmedNickName = nickName.trim();
    if (trimmedNickName.length > 20) {
      throw badRequest('nickName 长度不能超过20个字符');
    }
    user.nickName = trimmedNickName;
  }

  // 处理微信绑定（如果提供 wechatCode）
  if (hasWechatCode) {
    try {
      // 调用微信API换取openId
      const wechatSession = await getWechatSession(wechatCode);
      
      // 保存openId
      user.wechatOpenId = wechatSession.openid;
      
      // 如果提供了 unionid，也保存
      if (wechatSession.unionid) {
        user.wechatUnionId = wechatSession.unionid;
      }
      
      // 可选：保存微信用户信息（如果提供）
      if (wechatUserInfo) {
        if (wechatUserInfo.nickName) {
          // 可以保存到单独的字段，或者不保存（因为已经有 nickName）
          // 这里暂时不保存，避免覆盖用户设置的昵称
        }
        if (wechatUserInfo.avatarUrl) {
          user.avatarUrl = wechatUserInfo.avatarUrl;
        }
      }
    } catch (error) {
      // getWechatSession 已经处理了错误，这里只需要重新抛出
      // 但为了符合文档要求，我们可以添加更详细的错误信息
      if (error.code === 'INVALID_PARAMS') {
        throw badRequest(`获取微信OpenID失败：${error.message}`, {
          errcode: error.details?.errcode,
          errmsg: error.details?.errmsg || error.message
        });
      }
      throw error;
    }
  }

  // 处理微信解绑（如果 wechatOpenId 为 null 或空字符串）
  if (hasUnbindWechat) {
    user.wechatOpenId = null;
    user.wechatUnionId = null;
    user.wechatAuthExpired = false;
    user.authExpiredAt = null;
    // 可选：清除微信头像（如果是从微信绑定时设置的）
    // 这里保留 avatarUrl，因为用户可能想保留头像
  }

  // 处理清除授权过期标记（用户重新授权后调用）
  if (hasClearAuthExpired) {
    user.wechatAuthExpired = false;
    user.authExpiredAt = null;
  }

  // 保存用户
  await user.save();

  // 返回更新后的用户信息
  res.json({
    userId: user.userId,
    username: user.username ?? null,
    nickName: user.nickName,
    role: user.role,
    department: user.department ?? null,
    wechatOpenId: user.wechatOpenId ?? null,
    wechatTemplateId: config.wechatTemplateId || null, // 返回模板ID（建议）
    wechatAuthExpired: user.wechatAuthExpired ?? false, // 订阅消息授权是否过期
    authExpiredAt: user.authExpiredAt ?? null, // 授权过期时间
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
}

export async function getAllUsers (req, res) {
  const isLeader = req.user?.role === 'leader';

  // 组长仅能查看已绑定微信的管理员列表，用于推送
  const query = isLeader
    ? {
        role: { $in: ['admin', 'manager'] },
        wechatOpenId: { $ne: null }
      }
    : {};

  const users = await User.find(query).sort({ createdAt: -1 });

  res.json(
    users.map(user => {
      if (isLeader) {
        return {
          userId: user.userId,
          nickName: user.nickName,
          role: user.role,
          wechatOpenId: user.wechatOpenId ?? null
        };
      }

      return {
        userId: user.userId,
        username: user.username ?? null,
        nickName: user.nickName,
        role: user.role,
        department: user.department ?? null,
        wechatOpenId: user.wechatOpenId ?? null,
        wechatAuthExpired: user.wechatAuthExpired ?? false, // 订阅消息授权是否过期
        authExpiredAt: user.authExpiredAt ?? null, // 授权过期时间
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      };
    })
  );
}

export async function promoteUser (req, res) {
  const { userId } = req.params;
  const user = await User.findOne({ userId });
  if (!user) {
    throw notFound('用户不存在');
  }
  if (user.role === 'admin') {
    throw badRequest('无法提升管理员');
  }
  const oldRole = user.role;
  user.role = 'manager';
  await user.save();
  res.json({
    userId: user.userId,
    oldRole,
    newRole: user.role,
    updatedAt: user.updatedAt
  });
}

export async function demoteUser (req, res) {
  const { userId } = req.params;
  const user = await User.findOne({ userId });
  if (!user) {
    throw notFound('用户不存在');
  }
  if (user.role !== 'manager') {
    throw badRequest('仅能将管理员降级为组长');
  }
  const oldRole = user.role;
  user.role = 'leader';
  await user.save();
  res.json({
    userId: user.userId,
    oldRole,
    newRole: user.role,
    updatedAt: user.updatedAt
  });
}

export async function deleteUser (req, res) {
  const { userId } = req.params;
  const currentUser = req.user;

  // 参数验证
  if (!userId) {
    throw badRequest('用户ID不能为空');
  }

  // 查找要删除的用户
  const userToDelete = await User.findOne({ userId });
  if (!userToDelete) {
    throw notFound('用户不存在');
  }

  // 防止删除平台管理员
  if (userToDelete.role === 'admin') {
    throw badRequest('不能删除平台管理员');
  }

  // 防止删除自己
  if (userToDelete.userId === currentUser.userId) {
    throw badRequest('不能删除自己的账号');
  }

  // 保存被删除用户的信息（用于返回）
  const deletedUserInfo = {
    userId: userToDelete.userId,
    nickName: userToDelete.nickName,
    role: userToDelete.role
  };

  // 删除用户
  await User.deleteOne({ userId });

  // 可选：删除相关的组员数据
  // await Member.deleteMany({ leaderId: userId });

  // 可选：删除相关的出勤记录
  // await AttendanceRecord.deleteMany({ leaderId: userId });

  res.json({
    success: true,
    message: '用户删除成功',
    deletedUser: deletedUserInfo
  });
}

