import fs from 'fs/promises';
import path from 'path';

import {
  DELIVERY_NOTE_OCR_PROMPT,
  DELIVERY_NOTE_RAW_TEXT_PROMPT
} from './ocrPrompt.js';
import { HttpError } from '../utils/errors.js';
import { preserveProductionBatchNo } from '../utils/warehouse/boxCodeParser.js';

/** 默认配置：优先读环境变量，未配置时使用 fallback */
const DEFAULT_OCR_API_KEY =
  'sk-ws-H.EEMRHXP.zavI.MEQCIDkVbgzuShtKNzw5s9OuIgeatkPHeKce8ds995QRIjEyAiAIibCGd4dP9EhPiceaa2aU1t-n_vYnGXh_UcWAG-Vssg';
// qwen3.7-plus 准确但常 >45s，易触发前端 uploadFile timeout；默认用更快的视觉模型
const DEFAULT_OCR_MODEL = 'qwen-vl-plus';
const DEFAULT_OCR_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
/** 服务端等待 OCR 的上限（毫秒），应略小于常见前端 60s 超时 */
const DEFAULT_OCR_TIMEOUT_MS = 55000;

function getOcrConfig () {
  return {
    apiKey: process.env.OCR_API_KEY || DEFAULT_OCR_API_KEY,
    model: process.env.OCR_MODEL || DEFAULT_OCR_MODEL,
    baseUrl: (process.env.OCR_BASE_URL || DEFAULT_OCR_BASE_URL).replace(/\/$/, ''),
    timeoutMs: Number(process.env.OCR_TIMEOUT_MS) > 0
      ? Number(process.env.OCR_TIMEOUT_MS)
      : DEFAULT_OCR_TIMEOUT_MS
  };
}

function resolveMimeType (filePath, mimetype) {
  if (mimetype && mimetype.startsWith('image/')) return mimetype;
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.bmp') return 'image/bmp';
  return 'image/jpeg';
}

function normalizeShippingDate (value) {
  if (value == null || value === '') return null;
  const raw = String(value).trim();
  if (!raw || raw === 'null') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const m1 = raw.match(/(\d{4})[./年-](\d{1,2})[./月-](\d{1,2})/);
  if (m1) {
    return `${m1[1]}-${String(m1[2]).padStart(2, '0')}-${String(m1[3]).padStart(2, '0')}`;
  }

  const m2 = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m2) {
    const a = Number(m2[1]);
    const b = Number(m2[2]);
    const y = m2[3];
    if (a > 12) {
      return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }
    return `${y}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
  }

  return raw;
}

function normalizeQuantityPcs (value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  let s = String(value).trim();
  if (!s || s === 'null') return null;
  s = s.replace(/,/g, '');
  s = s.replace(/\s*(pcs|PCS|件|个|台|箱)\s*/gi, '');
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

function emptyToNull (value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s.toLowerCase() === 'null') return null;
  return s;
}

/**
 * 产品编码清洗：
 * - 单元格换行：002.027.00 07196 → 002.027.0007196
 * - 缺段点：002.027 0004083 → 002.027.0004083
 */
function normalizeProductCode (value) {
  let s = emptyToNull(value);
  if (!s) return null;
  s = s.replace(/\s+/g, ' ').trim();

  let m = s.match(/^(\d+\.\d+\.\d+)\s+(\d+)$/);
  if (m) return `${m[1]}${m[2]}`;

  m = s.match(/^(\d+\.\d+)\s+(\d+)$/);
  if (m) return `${m[1]}.${m[2]}`;

  return s.replace(/\s+/g, '').replace(/\.+/g, '.');
}

function normalizeSalesModel (value) {
  const s = emptyToNull(value);
  if (!s) return null;
  const cleaned = s.replace(/\s+/g, ' ').trim();
  // 明显是品名而非型号时丢弃，避免前端回填错误
  if (/洗衣机|家电组件|组件|品名/.test(cleaned) && !/[A-Za-z]\./.test(cleaned)) {
    return null;
  }
  return cleaned;
}

function normalizeDeliveryNoteNo (value) {
  let s = emptyToNull(value);
  if (!s) return null;
  s = s.replace(/\s+/g, '').toUpperCase();
  // 常见 OCR 把 HFYD 认成 HFVD
  s = s.replace(/^HFVD/, 'HFYD');
  return s;
}

function normalizeProductionBatchNoField (value) {
  const s = emptyToNull(value);
  if (!s) return null;
  return preserveProductionBatchNo(s) || s.toUpperCase().replace(/\s+/g, '');
}

function sanitizeStructuredResult (parsed) {
  const headerSrc = parsed?.header && typeof parsed.header === 'object' ? parsed.header : {};
  const itemsSrc = Array.isArray(parsed?.items) ? parsed.items : [];

  const header = {
    customerName: emptyToNull(headerSrc.customerName),
    shippingDate: normalizeShippingDate(headerSrc.shippingDate)
  };

  const items = itemsSrc
    .filter(row => row && typeof row === 'object')
    .map(row => ({
      customerOrderNo: emptyToNull(row.customerOrderNo),
      salesModel: normalizeSalesModel(row.salesModel),
      productCode: normalizeProductCode(row.productCode),
      quantityPcs: normalizeQuantityPcs(row.quantityPcs),
      productionBatchNo: normalizeProductionBatchNoField(row.productionBatchNo),
      deliveryNoteNo: normalizeDeliveryNoteNo(row.deliveryNoteNo)
    }))
    .filter(row =>
      row.customerOrderNo ||
      row.salesModel ||
      row.productCode ||
      row.productionBatchNo ||
      row.quantityPcs != null
    );

  const noteNos = items.map(i => i.deliveryNoteNo).filter(Boolean);
  if (noteNos.length) {
    // 取最长的送货单号（避免截断版覆盖完整版）
    const primaryNoteNo = noteNos.reduce((a, b) => (b.length > a.length ? b : a));
    for (const row of items) {
      if (!row.deliveryNoteNo || row.deliveryNoteNo.length < primaryNoteNo.length) {
        row.deliveryNoteNo = primaryNoteNo;
      }
    }
  }

  const rawTextFromModel = emptyToNull(parsed?.rawText);
  const rawText = rawTextFromModel || buildRawTextFromStructured(header, items);

  return { header, items, rawText };
}

function buildRawTextFromStructured (header, items) {
  const lines = [];
  if (header?.customerName) lines.push(`收货客户：${header.customerName}`);
  if (header?.shippingDate) lines.push(`发运日：${header.shippingDate}`);
  for (const it of items || []) {
    lines.push(
      [
        it.customerOrderNo,
        it.salesModel,
        it.productCode,
        it.quantityPcs,
        it.productionBatchNo,
        it.deliveryNoteNo
      ]
        .filter(v => v != null && v !== '')
        .join('\t')
    );
  }
  return lines.join('\n');
}

function extractJsonObject (content) {
  if (!content || typeof content !== 'string') return null;
  let text = content.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const sliced = text.slice(start, end + 1);
    try {
      return JSON.parse(sliced);
    } catch {
      text = sliced;
    }
  } else {
    try {
      return JSON.parse(text);
    } catch {
      // fallthrough
    }
  }

  return salvagePartialDeliveryNote(text);
}

function salvagePartialDeliveryNote (text) {
  if (!text) return null;
  let header = null;
  let items = null;
  let rawText = null;

  const headerMatch = text.match(/"header"\s*:\s*(\{[\s\S]*?\})\s*,\s*"items"/);
  if (headerMatch) {
    try {
      header = JSON.parse(headerMatch[1]);
    } catch {
      header = null;
    }
  }

  // 非贪婪对大表格可能提前截断；改为从 items 起括号配对
  const itemsIdx = text.indexOf('"items"');
  if (itemsIdx >= 0) {
    const arrStart = text.indexOf('[', itemsIdx);
    if (arrStart >= 0) {
      let depth = 0;
      let end = -1;
      for (let i = arrStart; i < text.length; i++) {
        const ch = text[i];
        if (ch === '[') depth += 1;
        else if (ch === ']') {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end > arrStart) {
        const arrText = text.slice(arrStart, end + 1);
        try {
          items = JSON.parse(arrText);
        } catch {
          try {
            items = JSON.parse(arrText.replace(/,\s*$/, '') + ']');
          } catch {
            items = null;
          }
        }
      }
    }
  }

  const rawMatch = text.match(/"rawText"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (rawMatch) {
    try {
      rawText = JSON.parse(`"${rawMatch[1]}"`);
    } catch {
      rawText = rawMatch[1];
    }
  }

  if (!header && !items && !rawText) return null;
  return {
    header: header || { customerName: null, shippingDate: null },
    items: Array.isArray(items) ? items : [],
    rawText: rawText || null
  };
}

function buildMockResult () {
  return {
    header: {
      customerName: '创维电器股份有限公司',
      shippingDate: '2026-05-19'
    },
    items: [
      {
        customerOrderNo: 'N032402-000494-001',
        salesModel: 'S.XG01Z BCW.6',
        productCode: '002.027.0004083',
        quantityPcs: 1500,
        productionBatchNo: 'GR-HFYZBU26040149',
        deliveryNoteNo: 'HFYD260519023630'
      }
    ],
    rawText:
      '收货客户：创维电器股份有限公司\n发运日：2026-05-19\nN032402-000494-001\tS.XG01Z BCW.6\t002.027.0004083\t1500\tGR-HFYZBU26040149\tHFYD260519023630'
  };
}

async function callDashScopeChat ({ apiKey, baseUrl, model, timeoutMs, messages, maxTokens, jsonMode }) {
  const url = `${baseUrl}/chat/completions`;
  const body = {
    model,
    temperature: 0,
    max_tokens: maxTokens,
    messages
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new HttpError(
        500,
        `OCR 识别超时（>${Math.round(timeoutMs / 1000)}秒），请缩小图片后重试，或联系管理员调整 OCR_MODEL`,
        'OCR_TIMEOUT'
      );
    }
    throw new HttpError(500, '调用 OCR 服务失败，请检查网络或稍后重试', 'OCR_NETWORK_ERROR', {
      reason: err.message
    });
  } finally {
    clearTimeout(timer);
  }

  const responseText = await response.text();
  let payload;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const apiMessage =
      payload?.error?.message ||
      payload?.message ||
      responseText?.slice(0, 200) ||
      `HTTP ${response.status}`;
    throw new HttpError(
      500,
      `OCR 识别失败：${apiMessage}`,
      'OCR_API_ERROR',
      { status: response.status }
    );
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (content == null || content === '') {
    throw new HttpError(500, 'OCR 服务未返回有效识别结果', 'OCR_EMPTY_RESULT');
  }
  return String(content);
}

/**
 * 结构化结果为空时，再抽一次纯文本，保证前端至少有 rawText 可兜底
 */
async function fallbackRawText ({ apiKey, baseUrl, model, timeoutMs, dataUrl }) {
  try {
    const content = await callDashScopeChat({
      apiKey,
      baseUrl,
      model,
      timeoutMs: Math.min(timeoutMs, 25000),
      maxTokens: 2048,
      jsonMode: false,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DELIVERY_NOTE_RAW_TEXT_PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ]
    });
    return content.trim();
  } catch (err) {
    console.warn('[OCR] rawText fallback failed:', err.message);
    return '';
  }
}

/**
 * 调用 DashScope OpenAI 兼容视觉接口，识别送货单图片。
 * @returns {Promise<{header, items, rawText}|{rawText: string}>}
 */
export async function recognizeDeliveryNoteImage ({ filePath, mimetype }) {
  if (!filePath) {
    throw new HttpError(400, '缺少图片文件路径', 'INVALID_PARAMS');
  }

  if (process.env.OCR_MOCK === '1' || process.env.OCR_MOCK === 'true') {
    return buildMockResult();
  }

  const { apiKey, model, baseUrl, timeoutMs } = getOcrConfig();
  if (!apiKey) {
    throw new HttpError(500, 'OCR 服务未配置 API Key，请设置 OCR_API_KEY', 'OCR_CONFIG_ERROR');
  }

  let imageBuffer;
  try {
    imageBuffer = await fs.readFile(filePath);
  } catch (err) {
    throw new HttpError(500, '读取上传图片失败', 'OCR_FILE_ERROR', {
      reason: err.message
    });
  }

  const mime = resolveMimeType(filePath, mimetype);
  const dataUrl = `data:${mime};base64,${imageBuffer.toString('base64')}`;

  const content = await callDashScopeChat({
    apiKey,
    baseUrl,
    model,
    timeoutMs,
    // 视研多行表格需要更大输出配额，避免 items 被截成空
    maxTokens: 4096,
    jsonMode: true,
    messages: [
      { role: 'system', content: DELIVERY_NOTE_OCR_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请识别这张送货单图片。明细可能有十几行，请全部放入 items，并给出 rawText。'
          },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ]
  });

  const parsed = extractJsonObject(content);
  if (!parsed) {
    // 非 JSON：直接当 rawText
    const rawText = content.trim();
    if (!rawText) {
      throw new HttpError(500, 'OCR 未识别出可用文本', 'OCR_EMPTY_RESULT');
    }
    return { rawText };
  }

  if (parsed.header || Array.isArray(parsed.items) || parsed.rawText) {
    const result = sanitizeStructuredResult(parsed);
    const hasItems = Array.isArray(result.items) && result.items.length > 0;
    const hasRaw =
      typeof result.rawText === 'string' &&
      result.rawText.trim().length > 0 &&
      /GR-HFYZBU|HFYD|客户|发运|3C\d{3}-|N\d+/i.test(result.rawText);

    // 只有表头、没有明细且无可用 rawText → 二次抽取纯文本，避免前端「识别不到」
    if (!hasItems && !hasRaw) {
      const fallback = await fallbackRawText({
        apiKey,
        baseUrl,
        model,
        timeoutMs,
        dataUrl
      });
      if (fallback) {
        return {
          header: result.header,
          items: result.items,
          rawText: fallback
        };
      }
    }

    return result;
  }

  return { rawText: content.trim() };
}
