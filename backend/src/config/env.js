import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/attendance',
  mongodbDbName: process.env.MONGODB_DB ?? undefined,
  jwtSecret: process.env.JWT_SECRET ?? 'change_this_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  wechatAppId: process.env.WECHAT_APPID ?? process.env.WECHAT_APP_ID ?? '',
  wechatAppSecret: process.env.WECHAT_SECRET ?? process.env.WECHAT_APP_SECRET ?? '',
  wechatTemplateId: process.env.WECHAT_TEMPLATE_ID ?? '',
  // 仓储送货单 OCR（DashScope OpenAI 兼容）；具体默认值见 ocrService.js
  ocrApiKey: process.env.OCR_API_KEY ?? '',
  // 默认 qwen-vl-plus（快）；需要更高精度可设 OCR_MODEL=qwen3.7-plus（较慢）
  ocrModel: process.env.OCR_MODEL ?? 'qwen-vl-plus',
  ocrBaseUrl: process.env.OCR_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  ocrTimeoutMs: Number(process.env.OCR_TIMEOUT_MS) > 0 ? Number(process.env.OCR_TIMEOUT_MS) : 50000
};

export default config;

