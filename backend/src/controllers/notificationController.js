import { badRequest } from '../utils/errors.js';
import config from '../config/env.js';
import { getWechatAccessToken, sendWechatSubscribeMessage, markUserNeedReauthorize } from '../services/wechatService.js';

const sentLogs = [];
const MAX_THING_LENGTH = 20;

function truncateThingValue (value, fallback = '异常数据检测') {
  const text = (value ?? fallback).toString().trim();
  const chars = Array.from(text);
  if (chars.length <= MAX_THING_LENGTH) {
    return text;
  }
  return chars.slice(0, MAX_THING_LENGTH).join('');
}

function formatTimestamp (input) {
  const pad = num => num.toString().padStart(2, '0');
  const format = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  if (!input) {
    return format(new Date());
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date());
  }

  return format(parsed);
}

function toSafeNumber (value, fallback = 0) {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return fallback;
}

function buildWechatTemplateData (data) {
  const detailCount = Array.isArray(data?.details) ? data.details.length : undefined;

  return {
    thing1: truncateThingValue(data?.teamName ?? data?.summary ?? '异常数据检测'),
    number2: toSafeNumber(data?.shouldCheckinCount ?? data?.anomalyCount ?? detailCount ?? 0),
    number3: toSafeNumber(data?.actualCheckinCount ?? detailCount ?? data?.anomalyCount ?? 0),
    number4: toSafeNumber(data?.lateCount ?? 0),
    time7: formatTimestamp(data?.uploadedAt)
  };
}

/**
 * 发送微信通知
 * @param {object} req - Express 请求对象
 * @param {object} res - Express 响应对象
 */
export async function sendWechatNotification (req, res) {
  const { targets, data } = req.body ?? {};

  // 验证参数
  if (!Array.isArray(targets) || targets.length === 0) {
    throw badRequest('目标用户列表不能为空');
  }

  if (!data || typeof data.anomalyCount === 'undefined') {
    throw badRequest('通知数据不完整，缺少 anomalyCount');
  }

  // 检查微信模板ID是否配置，未配置时直接返回失败列表
  if (!config.wechatTemplateId) {
    const failed = targets.map(target => ({
      userId: target.userId,
      wechatOpenId: target.wechatOpenId,
      error: '未配置微信模板ID'
    }));

    return res.json({
      success: true,
      sent: 0,
      failed
    });
  }

  try {
    // 获取 access_token
    const accessToken = await getWechatAccessToken();

    // 准备模板数据
    const templateData = buildWechatTemplateData(data);

    // 发送通知给所有目标用户
    const results = {
      sent: 0,
      failed: []
    };

    for (const target of targets) {
      if (!target.wechatOpenId) {
        console.warn('[Notification] 目标用户缺少 wechatOpenId:', target.userId);
        results.failed.push({
          userId: target.userId,
          wechatOpenId: target.wechatOpenId ?? null,
          error: '缺少wechatOpenId',
          errcode: 'MISSING_OPENID'
        });
        continue;
      }

      console.log('[Notification] 开始发送通知给:', { userId: target.userId, wechatOpenId: target.wechatOpenId });
      const result = await sendWechatSubscribeMessage(
        target.wechatOpenId,
        templateData,
        accessToken
      );
      console.log('[Notification] 发送结果:', { userId: target.userId, result });

      if (result.success) {
        results.sent++;
      } else {
        // 处理授权过期（43101），标记用户需要重新授权
        if (result.errcode === 43101) {
          console.warn('[Notification] 用户订阅消息授权已过期，标记需要重新授权:', {
            userId: target.userId,
            wechatOpenId: target.wechatOpenId
          });
          await markUserNeedReauthorize(target.wechatOpenId);
          results.failed.push({
            userId: target.userId,
            wechatOpenId: target.wechatOpenId,
            error: result.error || '用户订阅消息授权已过期，需要重新授权',
            errcode: result.errcode,
            errmsg: result.errmsg || '用户拒绝接收消息'
          });
        } else {
          results.failed.push({
            userId: target.userId,
            wechatOpenId: target.wechatOpenId,
            error: result.error || '发送失败',
            errcode: result.errcode || undefined,
            errmsg: result.errmsg || undefined
          });
        }
      }
    }

    // 记录发送日志
    sentLogs.push({
      targets,
      data,
      results,
      sentAt: new Date()
    });

    // 返回结果
    res.json({
      success: true,
      sent: results.sent,
      failed: results.failed
    });
  } catch (error) {
    console.error('[Notification] 发送微信通知失败:', error);
    throw badRequest(error.message || '发送微信通知失败', {
      error: error.message
    });
  }
}

/**
 * 获取通知发送日志
 * @returns {Array} 发送日志列表
 */
export function getNotificationLogs () {
  return sentLogs;
}

