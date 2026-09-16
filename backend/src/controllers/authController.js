import bcrypt from 'bcryptjs';

import config from '../config/env.js';
import User from '../models/User.js';
import { badRequest, unauthorized } from '../utils/errors.js';
import { signAccessToken } from '../utils/jwt.js';
import { generateRefreshToken, getRefreshTokenExpiryDate } from '../services/tokenService.js';
import { getWechatSession } from '../services/wechatService.js';

function serializeUser (user) {
  return {
    userId: user.userId,
    username: user.username ?? null,
    nickName: user.nickName,
    role: user.role,
    department: user.department ?? null,
    wechatOpenId: user.wechatOpenId ?? null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}

function buildTokenResponse (user, refreshToken) {
  return {
    token: signAccessToken({ userId: user.userId, role: user.role }),
    refreshToken,
    user: serializeUser(user)
  };
}

export async function loginAdmin (req, res) {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    throw badRequest('用户名与密码必填');
  }

  if (username !== config.adminUsername) {
    throw unauthorized('账号或密码不正确');
  }

  // 如果没有设置环境变量，使用默认密码的哈希值（仅用于开发环境）
  // 生产环境应通过环境变量 ADMIN_PASSWORD_HASH 设置
  const defaultPasswordHash = '$2a$10$RN4q1g.yO2PJoEhXejdve.OAuAq1gCY26wxgR60rGjvvtyw69fJJG'; // 030426
  const adminPasswordHash = config.adminPasswordHash || defaultPasswordHash;

  const match = await bcrypt.compare(password, adminPasswordHash);
  if (!match) {
    throw unauthorized('账号或密码不正确');
  }

  let adminUser = await User.findOne({ role: 'admin', username: config.adminUsername });
  if (!adminUser) {
    adminUser = await User.create({
      username: config.adminUsername,
      passwordHash: adminPasswordHash,
      nickName: '平台管理员',
      role: 'admin'
    });
  } else if (!adminUser.passwordHash) {
    // 如果现有 admin 用户没有 passwordHash，则更新
    adminUser.passwordHash = adminPasswordHash;
    await adminUser.save();
  }

  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiryDate();
  adminUser.refreshTokens.push({ token: refreshToken, expiresAt });
  adminUser.lastLoginAt = new Date();
  await adminUser.save();

  res.json(buildTokenResponse(adminUser, refreshToken));
}

export async function loginWechat (req, res) {
  const { code, userInfo } = req.body ?? {};

  console.log('[Wechat Login] 收到登录请求:', {
    hasCode: !!code,
    hasUserInfo: !!userInfo,
    userInfoNickName: userInfo?.nickName,
    userInfoAvatarUrl: userInfo?.avatarUrl,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    ip: req.ip || req.connection.remoteAddress
  });

  if (!code || !userInfo?.nickName) {
    console.error('[Wechat Login] 参数不完整:', { code, userInfo });
    throw badRequest('code 与 userInfo.nickName 必填');
  }

  const session = await getWechatSession(code);
  const openId = session.openid;
  const unionId = session.unionid ?? null;

  let user =
    (await User.findOne({ wechatOpenId: openId })) ||
    (unionId ? await User.findOne({ wechatUnionId: unionId }) : null);

  if (!user) {
    console.log('[Wechat Login] 创建新用户:', { openId, nickName: userInfo.nickName });
    user = await User.create({
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
      wechatOpenId: openId,
      wechatUnionId: unionId,
      role: 'leader'
    });
  } else {
    console.log('[Wechat Login] 更新现有用户:', { userId: user.userId, nickName: userInfo.nickName });
    user.nickName = userInfo.nickName ?? user.nickName;
    user.avatarUrl = userInfo.avatarUrl ?? user.avatarUrl;
    if (!user.wechatOpenId) {
      user.wechatOpenId = openId;
    }
    if (unionId && !user.wechatUnionId) {
      user.wechatUnionId = unionId;
    }
  }

  user.lastLoginAt = new Date();

  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiryDate();
  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  const response = buildTokenResponse(user, refreshToken);
  console.log('[Wechat Login] 登录成功:', {
    userId: user.userId,
    role: user.role,
    openId,
    isMock: session.isMock ?? false
  });

  res.json(response);
}

export async function refreshToken (req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    throw badRequest('refreshToken 必填');
  }

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) {
    throw unauthorized('刷新令牌无效');
  }

  const tokenEntry = user.refreshTokens.find(rt => rt.token === refreshToken);
  if (!tokenEntry || tokenEntry.expiresAt < new Date()) {
    throw unauthorized('刷新令牌已过期');
  }

  const newRefreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiryDate();

  tokenEntry.token = newRefreshToken;
  tokenEntry.expiresAt = expiresAt;
  await user.save();

  res.json({
    token: signAccessToken({ userId: user.userId, role: user.role }),
    refreshToken: newRefreshToken
  });
}

export async function login (req, res) {
  const { username, password } = req.body ?? {};
  
  if (!username || !password) {
    throw badRequest('用户名与密码必填');
  }

  // 查找用户（需要包含 passwordHash 字段）
  let user = await User.findOne({ username }).select('+passwordHash');
  
  // 兼容逻辑：如果是 admin 用户且通过 username 找不到，尝试通过 role 查找
  if (!user && username === config.adminUsername) {
    console.log('[Login] 通过 username 未找到 admin 用户，尝试通过 role 查找...');
    user = await User.findOne({ role: 'admin' }).select('+passwordHash');
    
    if (user) {
      // 更新 admin 用户的 username 和 passwordHash（如果缺失）
      const defaultPasswordHash = '$2a$10$RN4q1g.yO2PJoEhXejdve.OAuAq1gCY26wxgR60rGjvvtyw69fJJG'; // 030426
      const adminPasswordHash = config.adminPasswordHash || defaultPasswordHash;
      
      let needsUpdate = false;
      if (!user.username || user.username !== config.adminUsername) {
        user.username = config.adminUsername;
        needsUpdate = true;
        console.log('[Login] 更新 admin 用户的 username 为:', config.adminUsername);
      }
      
      if (!user.passwordHash) {
        user.passwordHash = adminPasswordHash;
        needsUpdate = true;
        console.log('[Login] 更新 admin 用户的 passwordHash');
      }
      
      if (needsUpdate) {
        await user.save();
        console.log('[Login] ✅ 已更新 admin 用户数据');
      }
    }
  }
  
  if (!user) {
    throw unauthorized('账号或密码不正确');
  }

  // 验证密码
  if (!user.passwordHash) {
    throw unauthorized('账号或密码不正确');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw unauthorized('账号或密码不正确');
  }

  // 更新最后登录时间
  user.lastLoginAt = new Date();

  // 生成刷新令牌
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiryDate();
  user.refreshTokens.push({ token: refreshToken, expiresAt });
  await user.save();

  res.json(buildTokenResponse(user, refreshToken));
}

export async function logout (req, res) {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    throw badRequest('refreshToken 必填');
  }

  const user = await User.findOne({ 'refreshTokens.token': refreshToken });
  if (!user) {
    return res.json({ success: true });
  }

  user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
  await user.save();

  res.json({ success: true });
}

