import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import bodyParser from 'body-parser';

import router from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandlers.js';

const app = express();

// 配置 CORS，允许 Authorization 头
// 微信小程序需要允许所有来源
app.use(cors({
  origin: true, // 允许所有来源（包括微信小程序）
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 处理 OPTIONS 预检请求（微信小程序需要）
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

