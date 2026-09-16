import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

import app from './app.js';
import config from './config/env.js';

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
  // 不要立即退出，让错误处理中间件处理
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', { reason, promise });
  // 不要立即退出，让错误处理中间件处理
});

async function bootstrap () {
  try {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }

    await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName
    });
    console.log('[database] connected');

    const server = app.listen(config.port, () => {
      console.log(`[server] listening on port ${config.port}`);
    });

    // 处理服务器错误
    server.on('error', (err) => {
      console.error('[Server Error]', err);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      console.log('[server] SIGTERM received, closing server');
      server.close(() => {
        mongoose.connection.close();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('[bootstrap] failed to start application');
    console.error(err);
    process.exit(1);
  }
}

bootstrap();

