export function notFoundHandler (req, res, next) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '资源不存在',
      details: {}
    }
  });
}

export function errorHandler (err, req, res, next) {
  // 确保响应还没有被发送
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  
  // 记录错误日志（生产环境可以配置日志级别）
  if (status >= 500) {
    console.error('[Error]', {
      status,
      code: err.code || 'INTERNAL_ERROR',
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query
    });
  } else {
    console.warn('[Error]', {
      status,
      code: err.code || 'HTTP_ERROR',
      message: err.message,
      path: req.path,
      method: req.method
    });
  }

  // 发送错误响应
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || '服务器内部错误',
      details: err.details || {}
    }
  });
}

