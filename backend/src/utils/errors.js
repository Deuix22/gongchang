export class HttpError extends Error {
  constructor (status, message, code = 'HTTP_ERROR', details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function badRequest (message, details) {
  return new HttpError(400, message ?? '参数不合法', 'INVALID_PARAMS', details);
}

export function invalidPayload (message, details) {
  return new HttpError(400, message ?? '参数不合法', 'INVALID_PAYLOAD', details);
}

export function invalidQuery (message, details) {
  return new HttpError(400, message ?? '查询参数不合法', 'INVALID_QUERY', details);
}

export function unauthorized (message, details) {
  return new HttpError(401, message ?? '未授权', 'UNAUTHORIZED', details);
}

export function forbidden (message, details) {
  return new HttpError(403, message ?? '权限不足', 'FORBIDDEN', details);
}

export function notFound (message, details) {
  return new HttpError(404, message ?? '资源不存在', 'NOT_FOUND', details);
}

export function conflict (message, details, code = 'CONFLICT') {
  return new HttpError(409, message ?? '资源冲突', code, details);
}

