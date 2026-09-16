import User from '../models/User.js';
import { verifyToken } from '../utils/jwt.js';
import { forbidden, unauthorized } from '../utils/errors.js';

export async function authenticate (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw unauthorized('未提供有效的 Authorization 头');
  }

  const token = authHeader.substring('Bearer '.length).trim();
  
  // 如果 token 为空，直接返回错误
  if (!token || token === '') {
    throw unauthorized('Token 不能为空');
  }

  // 检查 token 格式（JWT token 通常以 eyJ 开头）
  if (!token.startsWith('eyJ')) {
    console.error('[Auth] Token 格式不正确:', {
      tokenPrefix: token.substring(0, 30),
      tokenLength: token.length,
      path: req.path,
      method: req.method,
      fullToken: token.length > 100 ? token.substring(0, 100) + '...' : token
    });
    throw unauthorized('Token 格式不正确，请重新登录获取有效 token');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    // 记录详细的错误信息用于调试
    console.error('[Auth] Token 验证失败:', {
      error: err.name,
      message: err.message,
      path: req.path,
      method: req.method,
      tokenPrefix: token.substring(0, 20)
    });
    
    if (err.name === 'TokenExpiredError') {
      throw unauthorized('Token 已过期，请重新登录');
    } else if (err.name === 'JsonWebTokenError') {
      throw unauthorized('Token 不合法，请重新登录');
    }
    throw unauthorized('Token 验证失败，请重新登录');
  }

  if (!payload || !payload.userId) {
    throw unauthorized('Token 载荷无效');
  }

  const user = await User.findOne({ userId: payload.userId });
  if (!user) {
    throw unauthorized('用户不存在');
  }

  req.user = {
    userId: user.userId,
    role: user.role,
    nickName: user.nickName,
    department: user.department
  };

  next();
}

export function requireRoles (...roles) {
  return (req, res, next) => {
    if (!req.user) {
      throw unauthorized('未授权');
    }
    if (!roles.includes(req.user.role)) {
      throw forbidden('权限不足');
    }
    next();
  };
}

