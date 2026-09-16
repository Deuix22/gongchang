import crypto from 'crypto';

import config from '../config/env.js';
import { badRequest } from '../utils/errors.js';
import User from '../models/User.js';

const WECHAT_SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';
const WECHAT_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';
const WECHAT_SUBSCRIBE_SEND_URL = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send';

// 缓存 access_token
let cachedAccessToken = null;
let tokenExpireTime = 0;

export async function getWechatSession (code) {
  if (!code) {
    throw badRequest('微信登录 code 不能为空');
  }

  // 如果未配置正式的 AppId/Secret，则退回到开发模式（基于 code 的稳定 hash）
  if (!config.wechatAppId || !config.wechatAppSecret) {
    const hash = crypto.createHash('sha256').update(code).digest('hex').slice(0, 24);
    return {
      openid: `dev_${hash}`,
      unionid: null,
      session_key: `dev_session_${hash}`,
      isMock: true
    };
  }

  const params = new URLSearchParams({
    appid: config.wechatAppId,
    secret: config.wechatAppSecret,
    js_code: code,
    grant_type: 'authorization_code'
  });

  const response = await fetch(`${WECHAT_SESSION_URL}?${params.toString()}`);
  if (!response.ok) {
    console.error('[Wechat] 获取 session 失败，HTTP 状态异常:', response.status, response.statusText);
    throw badRequest('微信登录失败，请稍后重试');
  }

  const data = await response.json();
  if (data.errcode) {
    console.error('[Wechat] 获取 session 出错:', data);
    throw badRequest(data.errmsg || '微信登录失败', {
      errcode: data.errcode,
      errmsg: data.errmsg
    });
  }

  if (!data.openid) {
    console.error('[Wechat] 返回数据缺少 openid:', data);
    throw badRequest('微信登录失败（缺少 openid）');
  }

  return {
    openid: data.openid,
    unionid: data.unionid ?? null,
    session_key: data.session_key ?? null,
    isMock: false
  };
}

/**
 * 获取微信 access_token（带缓存）
 * @returns {Promise<string>} access_token
 */
export async function getWechatAccessToken () {
  const now = Date.now();

  // 如果 token 未过期，直接返回缓存的 token
  if (cachedAccessToken && now < tokenExpireTime) {
    return cachedAccessToken;
  }

  // 如果未配置正式的 AppId/Secret，返回 mock token
  if (!config.wechatAppId || !config.wechatAppSecret) {
    cachedAccessToken = 'mock_access_token';
    tokenExpireTime = now + 7200 * 1000; // 2小时
    return cachedAccessToken;
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'client_credential',
      appid: config.wechatAppId,
      secret: config.wechatAppSecret
    });

    const response = await fetch(`${WECHAT_TOKEN_URL}?${params.toString()}`);
    if (!response.ok) {
      console.error('[Wechat] 获取 access_token 失败，HTTP 状态异常:', response.status, response.statusText);
      throw badRequest('获取微信 access_token 失败，请稍后重试');
    }

    const data = await response.json();
    if (data.errcode) {
      console.error('[Wechat] 获取 access_token 出错:', {
        errcode: data.errcode,
        errmsg: data.errmsg
      });
      throw badRequest(data.errmsg || '获取微信 access_token 失败', {
        errcode: data.errcode,
        errmsg: data.errmsg
      });
    }

    if (!data.access_token) {
      console.error('[Wechat] 返回数据缺少 access_token:', data);
      throw badRequest('获取微信 access_token 失败（缺少 access_token）');
    }

    // 缓存 token（提前5分钟过期，避免边界情况）
    cachedAccessToken = data.access_token;
    tokenExpireTime = now + (data.expires_in - 300) * 1000;

    console.log('[Wechat] 获取 access_token 成功:', {
      success: true,
      expires_in: data.expires_in,
      cached: true
    });

    return cachedAccessToken;
  } catch (error) {
    console.error('[Wechat] 获取 access_token 异常:', error);
    if (error.code === 'INVALID_PARAMS') {
      throw error;
    }
    throw badRequest('获取微信 access_token 失败', {
      error: error.message
    });
  }
}

/**
 * 发送微信订阅消息（带自动重试机制）
 * @param {string} openid - 接收者的 openid
 * @param {object} templateData - 模板数据
 * @param {string} accessToken - access_token（可选，如果不提供会自动获取）
 * @param {boolean} isRetry - 是否为重试（避免无限重试）
 * @returns {Promise<{success: boolean, error?: string, errcode?: number, errmsg?: string}>}
 */
export async function sendWechatSubscribeMessage (openid, templateData, accessToken = null, isRetry = false) {
  console.log('[Wechat] 准备发送订阅消息:', { 
    openid, 
    hasAppId: !!config.wechatAppId, 
    hasAppSecret: !!config.wechatAppSecret,
    isDevOpenId: openid.startsWith('dev_'),
    hasTemplateId: !!config.wechatTemplateId,
    isRetry
  });

  // 如果未配置正式的 AppId/Secret，或者 openid 是开发模式（以 dev_ 开头），返回 mock 成功
  if (!config.wechatAppId || !config.wechatAppSecret || openid.startsWith('dev_')) {
    console.log('[Wechat] 开发模式，模拟发送成功:', { 
      openid: openid.substring(0, 10) + '...',
      templateData 
    });
    return { success: true };
  }

  // 生产环境需要配置模板ID
  if (!config.wechatTemplateId) {
    console.warn('[Wechat] 未配置模板ID，跳过发送');
    return { 
      success: false, 
      error: '未配置微信模板ID',
      errcode: 'MISSING_TEMPLATE_ID'
    };
  }

  // 如果没有提供 accessToken，自动获取
  let token = accessToken;
  if (!token) {
    token = await getWechatAccessToken();
  }

  try {
    const payloadData = {};
    for (const [field, value] of Object.entries(templateData ?? {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      payloadData[field] = { value: value.toString() };
    }

    const requestBody = {
      touser: openid,
      template_id: config.wechatTemplateId,
      page: 'pages/settings/index', // 跳转到设置页面
      data: Object.keys(payloadData).length > 0
        ? payloadData
        : { thing1: { value: '异常数据检测' } }
    };

    const params = new URLSearchParams({ access_token: token });
    const response = await fetch(`${WECHAT_SUBSCRIBE_SEND_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('[Wechat] 发送订阅消息失败，HTTP 状态异常:', response.status, response.statusText);
      return {
        success: false,
        error: `发送失败: HTTP ${response.status}`
      };
    }

    const data = await response.json();

    // 详细记录微信API返回
    console.log('[Wechat] 微信API返回:', {
      errcode: data.errcode,
      errmsg: data.errmsg,
      msgid: data.msgid,
      openid: openid.substring(0, 10) + '...'
    });

    // 处理 access_token 过期（40001），自动刷新后重试
    if (data.errcode === 40001 && !isRetry) {
      console.warn('[Wechat] access_token过期，自动刷新后重试');
      // 清除缓存的 token
      cachedAccessToken = null;
      tokenExpireTime = 0;
      
      // 获取新的 access_token
      const newAccessToken = await getWechatAccessToken();
      
      // 重试发送（只重试一次）
      return await sendWechatSubscribeMessage(openid, templateData, newAccessToken, true);
    }

    if (data.errcode !== 0) {
      // 根据错误码返回详细的错误信息
      let errorMessage = data.errmsg || '发送失败';

      // 根据文档要求，处理特定错误码
      switch (data.errcode) {
        case 40001:
          errorMessage = `微信API错误: access_token无效 (${data.errcode})`;
          console.error('[Wechat] access_token无效，已尝试刷新但重试失败');
          break;
        case 40037:
          errorMessage = `微信API错误: 模板ID无效 (${data.errcode})`;
          console.error('[Wechat] 模板ID无效，请检查配置');
          break;
        case 43101:
          errorMessage = `微信API错误: 用户拒绝接收消息 (${data.errcode})`;
          console.warn('[Wechat] 用户订阅消息授权已过期，需要重新授权');
          break;
        case 47003:
          errorMessage = `微信API错误: 参数错误 (${data.errcode})`;
          console.error('[Wechat] 模板数据格式错误');
          break;
        default:
          errorMessage = `微信API错误: ${data.errmsg} (${data.errcode})`;
      }

      console.error('[Wechat] 发送订阅消息出错:', {
        errcode: data.errcode,
        errmsg: data.errmsg,
        openid: openid.substring(0, 10) + '...'
      });

      return {
        success: false,
        error: errorMessage,
        errcode: data.errcode,
        errmsg: data.errmsg
      };
    }

    console.log('[Wechat] 订阅消息发送成功:', {
      openid: openid.substring(0, 10) + '...',
      msgid: data.msgid
    });
    return { success: true, msgid: data.msgid };
  } catch (error) {
    console.error('[Wechat] 发送订阅消息异常:', {
      error: error.message,
      stack: error.stack,
      openid: openid.substring(0, 10) + '...'
    });
    return {
      success: false,
      error: error.message || '发送失败'
    };
  }
}

/**
 * 标记用户需要重新授权订阅消息
 * @param {string} openid - 用户的 wechatOpenId
 * @returns {Promise<void>}
 */
export async function markUserNeedReauthorize (openid) {
  if (!openid || openid.startsWith('dev_')) {
    return;
  }

  try {
    await User.updateOne(
      { wechatOpenId: openid },
      {
        wechatAuthExpired: true,
        authExpiredAt: new Date()
      }
    );
    console.log('[Wechat] 已标记用户需要重新授权:', {
      openid: openid.substring(0, 10) + '...',
      authExpiredAt: new Date()
    });
  } catch (error) {
    console.error('[Wechat] 标记用户需要重新授权失败:', {
      openid: openid.substring(0, 10) + '...',
      error: error.message
    });
  }
}

/**
 * 清除用户的授权过期标记（用户重新授权后调用）
 * @param {string} openid - 用户的 wechatOpenId
 * @returns {Promise<void>}
 */
export async function clearUserAuthExpired (openid) {
  if (!openid || openid.startsWith('dev_')) {
    return;
  }

  try {
    await User.updateOne(
      { wechatOpenId: openid },
      {
        wechatAuthExpired: false,
        authExpiredAt: null
      }
    );
    console.log('[Wechat] 已清除用户授权过期标记:', {
      openid: openid.substring(0, 10) + '...'
    });
  } catch (error) {
    console.error('[Wechat] 清除用户授权过期标记失败:', {
      openid: openid.substring(0, 10) + '...',
      error: error.message
    });
  }
}

