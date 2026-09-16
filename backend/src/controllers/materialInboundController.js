import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

import MaterialInboundRecord from '../models/MaterialInboundRecord.js';
import MaterialStock from '../models/MaterialStock.js';
import { conflict, invalidPayload, invalidQuery } from '../utils/errors.js';
import { normalizeRawCode, validateInboundPayload } from '../utils/warehouse/reelIdParser.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

function escapeRegex (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function trimParam (value) {
  if (value == null) return '';
  return String(value).trim();
}

function parsePagination (query = {}) {
  const pageRaw = query.page;
  const pageSizeRaw = query.pageSize;

  if (pageRaw != null && pageRaw !== '' && !/^\d+$/.test(String(pageRaw))) {
    throw invalidQuery('page 须为正整数');
  }
  if (pageSizeRaw != null && pageSizeRaw !== '' && !/^\d+$/.test(String(pageSizeRaw))) {
    throw invalidQuery('pageSize 须为正整数');
  }

  const page = Math.max(1, parseInt(pageRaw, 10) || 1);
  const pageSizeNum = parseInt(pageSizeRaw, 10) || 50;
  if (pageSizeNum > 100) {
    throw invalidQuery('pageSize 最大为 100');
  }
  const pageSize = Math.max(1, pageSizeNum);
  return { page, pageSize };
}

function buildInboundExactFilter (query = {}) {
  const filter = {};
  const fields = [
    'partNumber',
    'lotNumber',
    'materialBaseCode',
    'versionCode',
    'versionDesc',
    'designCode'
  ];
  for (const field of fields) {
    const v = trimParam(query[field]);
    if (v) filter[field] = v;
  }
  const rawCode = normalizeRawCode(query.rawCode);
  if (rawCode) filter.rawCode = rawCode;
  return filter;
}

function applyKeywordToInboundFilter (filter, keyword) {
  const kw = trimParam(keyword);
  if (!kw) return filter;
  const re = new RegExp(escapeRegex(kw), 'i');
  const keywordOr = [
    { rawCode: re },
    { partNumber: re },
    { lotNumber: re },
    { materialBaseCode: re }
  ];
  if (Object.keys(filter).length === 0) {
    return { $or: keywordOr };
  }
  return { $and: [filter, { $or: keywordOr }] };
}

function serializeInboundRecord (row) {
  return {
    id: row.inboundId,
    rawCode: row.rawCode,
    materialBaseCode: row.materialBaseCode ?? '',
    partNumber: row.partNumber,
    versionCode: row.versionCode ?? '',
    versionDesc: row.versionDesc ?? '',
    designCode: row.designCode ?? '',
    lotNumber: row.lotNumber,
    quantityPcs: row.quantityPcs ?? 0,
    operatorUserId: row.operatorUserId ?? null,
    inboundAt: row.createdAt,
    createdAt: row.createdAt
  };
}

function stockPairKey (partNumber, lotNumber) {
  return `${partNumber}::${lotNumber}`;
}

function throwReelAlreadyInbound (rawCode, existing) {
  throw conflict(
    '该 Reel ID 已入库，不能重复提交',
    {
      rawCode,
      inboundAt: existing?.createdAt ?? null,
      quantityPcs: existing?.quantityPcs ?? null,
      operatorUserId: existing?.operatorUserId ?? null
    },
    'REEL_ALREADY_INBOUND'
  );
}

function isRawCodeDuplicateKeyError (err) {
  const items = [
    err,
    err?.cause,
    ...(Array.isArray(err?.writeErrors) ? err.writeErrors : [])
  ].filter(Boolean);
  for (const item of items) {
    if (item.code !== 11000) continue;
    const keyPattern = item.keyPattern || {};
    const keyValue = item.keyValue || {};
    if (Object.prototype.hasOwnProperty.call(keyPattern, 'rawCode')) return true;
    if (Object.prototype.hasOwnProperty.call(keyValue, 'rawCode')) return true;
    const msg = String(item.message || item.errmsg || '');
    if (/rawCode|uk_material_inbound_raw_code/i.test(msg)) return true;
  }
  return false;
}

/**
 * POST /warehouse/materials/inbound
 */
export async function submitMaterialInbound (req, res) {
  const validated = validateInboundPayload(req.body ?? {});
  if (validated.error) {
    throw invalidPayload(validated.error);
  }

  const {
    rawCode,
    materialBaseCode,
    partNumber,
    versionCode,
    versionDesc,
    designCode,
    lotNumber,
    quantityPcs
  } = validated;

  const operatorUserId = req.user?.userId ?? null;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existing = await MaterialInboundRecord.findOne({ rawCode }).session(session);
    if (existing) {
      throwReelAlreadyInbound(rawCode, existing);
    }

    const [record] = await MaterialInboundRecord.create(
      [
        {
          rawCode,
          materialBaseCode,
          partNumber,
          versionCode,
          versionDesc,
          designCode,
          lotNumber,
          quantityPcs,
          operatorUserId
        }
      ],
      { session }
    );

    // 库存累加：按 partNumber + lotNumber；并发 upsert 冲突时重试一次更新
    try {
      await MaterialStock.findOneAndUpdate(
        { partNumber, lotNumber },
        {
          $inc: { onHandQty: quantityPcs },
          $setOnInsert: {
            stockId: `ms_${nanoid(10)}`,
            partNumber,
            lotNumber
          }
        },
        {
          upsert: true,
          new: true,
          session,
          setDefaultsOnInsert: true
        }
      );
    } catch (stockErr) {
      if (stockErr?.code !== 11000) throw stockErr;
      await MaterialStock.findOneAndUpdate(
        { partNumber, lotNumber },
        { $inc: { onHandQty: quantityPcs } },
        { session }
      );
    }

    await session.commitTransaction();

    res.status(200).json({
      id: record.inboundId,
      rawCode: record.rawCode,
      partNumber: record.partNumber,
      lotNumber: record.lotNumber,
      quantityPcs: record.quantityPcs,
      inboundAt: record.createdAt
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    if (isRawCodeDuplicateKeyError(err)) {
      const existing = await MaterialInboundRecord.findOne({ rawCode }).lean();
      throwReelAlreadyInbound(rawCode, existing);
    }
    throw err;
  } finally {
    session.endSession();
  }
}

/**
 * GET /warehouse/materials/inbound-records
 */
export async function listMaterialInboundRecords (req, res) {
  const { page, pageSize } = parsePagination(req.query);
  const filter = applyKeywordToInboundFilter(
    buildInboundExactFilter(req.query),
    req.query?.keyword
  );

  const total = await MaterialInboundRecord.countDocuments(filter);
  const rows = await MaterialInboundRecord.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean();

  res.json({
    list: rows.map(serializeInboundRecord),
    total
  });
}

/**
 * GET /warehouse/materials/stocks
 * 方案 A：库存行关联最近一条入库流水补齐展示字段；细字段过滤 join 流水表
 */
export async function listMaterialStocks (req, res) {
  const { page, pageSize } = parsePagination(req.query);
  const partNumber = trimParam(req.query?.partNumber);
  const lotNumber = trimParam(req.query?.lotNumber);
  const keyword = trimParam(req.query?.keyword);
  const materialBaseCode = trimParam(req.query?.materialBaseCode);
  const versionCode = trimParam(req.query?.versionCode);
  const versionDesc = trimParam(req.query?.versionDesc);
  const designCode = trimParam(req.query?.designCode);
  const rawCode = normalizeRawCode(req.query?.rawCode);

  const needsInboundJoin = Boolean(
    materialBaseCode || versionCode || versionDesc || designCode || rawCode
  );

  const andParts = [];
  if (partNumber) andParts.push({ partNumber });
  if (lotNumber) andParts.push({ lotNumber });

  if (needsInboundJoin) {
    const inboundFilter = buildInboundExactFilter(req.query);
    const pairs = await MaterialInboundRecord.find(inboundFilter)
      .select('partNumber lotNumber')
      .lean();
    if (!pairs.length) {
      return res.json({
        list: [],
        total: 0,
        summary: { skuCount: 0, totalOnHandQty: 0 }
      });
    }
    const uniquePairs = [
      ...new Map(
        pairs.map(p => [stockPairKey(p.partNumber, p.lotNumber), p])
      ).values()
    ];
    andParts.push({
      $or: uniquePairs.map(p => ({
        partNumber: p.partNumber,
        lotNumber: p.lotNumber
      }))
    });
  }

  if (keyword) {
    const re = new RegExp(escapeRegex(keyword), 'i');
    const keywordOr = [{ partNumber: re }, { lotNumber: re }];
    const inboundHits = await MaterialInboundRecord.find({
      $or: [
        { rawCode: re },
        { partNumber: re },
        { lotNumber: re },
        { materialBaseCode: re }
      ]
    })
      .select('partNumber lotNumber')
      .lean();

    const seen = new Set();
    for (const hit of inboundHits) {
      const key = stockPairKey(hit.partNumber, hit.lotNumber);
      if (seen.has(key)) continue;
      seen.add(key);
      keywordOr.push({
        partNumber: hit.partNumber,
        lotNumber: hit.lotNumber
      });
    }
    andParts.push({ $or: keywordOr });
  }

  const stockFilter = andParts.length === 0
    ? {}
    : andParts.length === 1
      ? andParts[0]
      : { $and: andParts };

  const [total, summaryAgg, stocks] = await Promise.all([
    MaterialStock.countDocuments(stockFilter),
    MaterialStock.aggregate([
      { $match: stockFilter },
      {
        $group: {
          _id: null,
          skuCount: { $sum: 1 },
          totalOnHandQty: { $sum: '$onHandQty' }
        }
      }
    ]),
    MaterialStock.find(stockFilter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean()
  ]);

  const summary = {
    skuCount: summaryAgg[0]?.skuCount ?? 0,
    totalOnHandQty: summaryAgg[0]?.totalOnHandQty ?? 0
  };

  const latestByPair = new Map();
  if (stocks.length) {
    const related = await MaterialInboundRecord.find({
      $or: stocks.map(s => ({
        partNumber: s.partNumber,
        lotNumber: s.lotNumber
      }))
    })
      .sort({ createdAt: -1 })
      .lean();

    for (const row of related) {
      const key = stockPairKey(row.partNumber, row.lotNumber);
      if (!latestByPair.has(key)) {
        latestByPair.set(key, row);
      }
    }
  }

  const list = stocks.map(stock => {
    const latest = latestByPair.get(
      stockPairKey(stock.partNumber, stock.lotNumber)
    );
    return {
      id: stock.stockId,
      partNumber: stock.partNumber,
      lotNumber: stock.lotNumber,
      onHandQty: stock.onHandQty ?? 0,
      updatedAt: stock.updatedAt,
      materialBaseCode: latest?.materialBaseCode ?? '',
      versionCode: latest?.versionCode ?? '',
      versionDesc: latest?.versionDesc ?? '',
      designCode: latest?.designCode ?? ''
    };
  });

  res.json({ list, total, summary });
}
