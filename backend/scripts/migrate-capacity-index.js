#!/usr/bin/env node
/**
 * 将产能 v2 唯一索引从四元组升级为含 processSegment 的五元组
 *
 * 旧（错误）: { reportDate, productionLine, teamLeader, submitter }
 * 新（正确）: { reportDate, productionLine, teamLeader, processSegment, submitter }
 *
 * 用法：
 *   node scripts/migrate-capacity-index.js
 *   npm run migrate:capacity-index
 */
import mongoose from 'mongoose';
import config from '../src/config/env.js';
import CapacityReport from '../src/models/CapacityReport.js';

function businessKey (doc) {
  return [
    doc.reportDate,
    doc.productionLine,
    doc.teamLeader,
    doc.processSegment ?? doc.process,
    doc.submitter
  ].map(v => String(v ?? '').trim()).join('||');
}

async function listIndexes (collection) {
  const indexes = await collection.indexes();
  const businessIndex = indexes.find(i => i.name === 'uniq_v2_capacity_business_key');
  console.log('[migrate] 当前业务唯一索引:', businessIndex?.key ?? '(不存在)');
  return indexes;
}

async function backfillProcessSegment () {
  const result = await CapacityReport.updateMany(
    {
      format: 'v2',
      $or: [
        { processSegment: { $in: [null, ''] } },
        { processSegment: { $exists: false } }
      ]
    },
    [
      {
        $set: {
          processSegment: {
            $trim: {
              input: {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ['$processSegment', ''] } }, 0] },
                  '$processSegment',
                  { $ifNull: ['$process', ''] }
                ]
              }
            }
          }
        }
      }
    ]
  );
  console.log('[migrate] 已回填 processSegment，匹配文档数:', result.matchedCount);
}

async function backfillRecordKey () {
  const docs = await CapacityReport.find({
    format: 'v2',
    $or: [
      { recordKey: { $in: [null, ''] } },
      { recordKey: { $exists: false } }
    ]
  }).lean();

  let updated = 0;
  for (const doc of docs) {
    const processSegment = String(doc.processSegment ?? doc.process ?? '').trim();
    if (!processSegment) continue;
    const recordKey = [
      String(doc.reportDate ?? '').trim(),
      String(doc.productionLine ?? '').trim(),
      String(doc.teamLeader ?? '').trim(),
      processSegment
    ].join('__');
    await CapacityReport.updateOne(
      { _id: doc._id },
      { $set: { recordKey, process: processSegment } }
    );
    updated += 1;
  }
  console.log('[migrate] 已回填 recordKey 条数:', updated);
}

async function reportDuplicates () {
  const docs = await CapacityReport.find({ format: 'v2' }).sort({ updatedAt: -1 }).lean();
  const groups = new Map();
  for (const doc of docs) {
    const key = businessKey(doc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  const dupGroups = [...groups.entries()].filter(([, items]) => items.length > 1);
  if (!dupGroups.length) {
    console.log('[migrate] 五元组业务主键无重复，可安全创建新索引');
    return;
  }

  console.warn(`[migrate] 发现 ${dupGroups.length} 组五元组重复记录，将保留 updatedAt 最新的一条：`);
  for (const [key, items] of dupGroups) {
    const [keeper, ...rest] = items;
    console.warn(`  - ${key}：保留 ${keeper.reportId}，删除 ${rest.map(d => d.reportId).join(', ')}`);
    const idsToDelete = rest.map(d => d._id);
    await CapacityReport.deleteMany({ _id: { $in: idsToDelete } });
  }
}

async function migrateCapacityIndex () {
  await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
  console.log('[migrate] 已连接数据库:', config.mongodbDbName || '(default)');

  const collection = CapacityReport.collection;
  await listIndexes(collection);

  console.log('[migrate] 步骤 1/4：回填 processSegment（须在创建新索引前完成）');
  await backfillProcessSegment();

  console.log('[migrate] 步骤 2/4：回填 recordKey');
  await backfillRecordKey();

  console.log('[migrate] 步骤 3/4：清理五元组重复记录');
  await reportDuplicates();

  console.log('[migrate] 步骤 4/4：删除旧索引并创建含 processSegment 的新唯一索引');
  try {
    await collection.dropIndex('uniq_v2_capacity_business_key');
    console.log('[migrate] 已删除旧索引 uniq_v2_capacity_business_key');
  } catch (err) {
    if (err.codeName === 'IndexNotFound' || err.message?.includes('index not found')) {
      console.log('[migrate] 旧索引不存在，跳过删除');
    } else {
      throw err;
    }
  }

  await CapacityReport.syncIndexes();
  console.log('[migrate] 已同步新索引');

  const businessIndex = (await collection.indexes()).find(i => i.name === 'uniq_v2_capacity_business_key');
  const expectedKeys = ['reportDate', 'productionLine', 'teamLeader', 'processSegment', 'submitter'];
  const actualKeys = Object.keys(businessIndex?.key ?? {});
  const ok = expectedKeys.every(k => actualKeys.includes(k)) && actualKeys.length === expectedKeys.length;

  console.log('[migrate] 新索引键:', businessIndex?.key);
  if (!ok) {
    throw new Error(`索引键不符合预期，期望: ${expectedKeys.join(', ')}`);
  }
  console.log('[migrate] ✅ 索引升级成功');
}

migrateCapacityIndex()
  .then(() => {
    console.log('[migrate] 完成');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error('[migrate] 失败:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
