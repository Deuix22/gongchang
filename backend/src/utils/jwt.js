import jwt from 'jsonwebtoken';
import config from '../config/env.js';

export function signAccessToken (payload, options = {}) {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    ...options
  });
}

export function verifyToken (token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const error = new Error('Token 已过期');
      error.name = 'TokenExpiredError';
      error.expiredAt = err.expiredAt;
      throw error;
    } else if (err.name === 'JsonWebTokenError') {
      const error = new Error('Token 不合法');
      error.name = 'JsonWebTokenError';
      throw error;
    }
    throw err;
  }
}

