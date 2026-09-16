import { forbidden } from './errors.js';

const CAPACITY_META_WRITE_USER_IDS = ['manager_j4kcpw'];

export function canWriteCapacityMeta (user) {
  if (!user) return false;
  const role = String(user.role || '').trim();
  if (role === 'admin') return true;
  if (role === 'manager' || role === '管理员') return true;
  if (CAPACITY_META_WRITE_USER_IDS.includes(user.userId)) return true;
  return false;
}

export function requireCapacityMetaWrite (req, res, next) {
  if (!canWriteCapacityMeta(req.user)) {
    throw forbidden('仅管理员可修改产能基础数据');
  }
  next();
}
