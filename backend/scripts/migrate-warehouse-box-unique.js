#!/usr/bin/env node
/**
 * 仓储出货表：规范化 boxNo，并创建非空箱单号唯一索引
 *
 * 用法：
 *   node scripts/migrate-warehouse-box-unique.js
 *   npm run migrate:warehouse-box-unique
 */
import mongoose from 'mongoose';
import config from '../src/config/env.js';
import WarehouseShipment from '../src/models/WarehouseShipment.js';
import { normalizeBoxNo } from '../src/utils/warehouse/boxCodeParser.js';

mongoose.set('autoIndex', false);

const INDEX_NAME = 'uk_warehouse_shipments_box_no';

async function normalizeExistingBoxNos () {
  const docs = await WarehouseShipment.find({
    boxNo: { $exists: true, $nin: [null, ''] }
  }).select('_id shipmentId boxNo').lean();

  let updated = 0;
  for (const doc of docs) {
    const normalized = normalizeBoxNo(doc.boxNo);
    if (normalized === doc.boxNo) continue;
    await WarehouseShipment.updateOne(
      { _id: doc._id },
      { $set: { boxNo: normalized } }
    );
    updated += 1;
  }
  console.log('[migrate] 已规范化 boxNo 条数:', updated);
}

async function dedupeBoxNos () {
  const rows = await WarehouseShipment.aggregate([
    { $match: { boxNo: { $gt: '' } } },
    {
      $group: {
        _id: '$boxNo',
        items: {
          $push: {
            _id: '$_id',
            shipmentId: '$shipmentId',
            createdAt: '$createdAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]);

  if (!rows.length) {
    console.log('[migrate] 无重复 boxNo，可安全创建唯一索引');
    return;
  }

  console.warn(`[migrate] 发现 ${rows.length} 组重复 boxNo，保留最早一条，其余加 #DUP_ 后缀`);
  for (const row of rows) {
    const items = [...row.items].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const [keeper, ...dups] = items;
    console.warn(`  - ${row._id}：保留 ${keeper.shipmentId}`);
    for (const dup of dups) {
      const newBoxNo = `${row._id}#DUP_${dup.shipmentId}`;
      await WarehouseShipment.updateOne(
        { _id: dup._id },
        { $set: { boxNo: newBoxNo } }
      );
      console.warn(`    ${dup.shipmentId} → ${newBoxNo}`);
    }
  }
}

async function ensureUniqueIndex () {
  const collection = WarehouseShipment.collection;
  const indexes = await collection.indexes();
  const existing = indexes.find(i => i.name === INDEX_NAME);
  if (existing) {
    console.log('[migrate] 唯一索引已存在:', existing.key, existing.partialFilterExpression ?? '');
    return;
  }

  await collection.createIndex(
    { boxNo: 1 },
    {
      unique: true,
      partialFilterExpression: { boxNo: { $gt: '' } },
      name: INDEX_NAME
    }
  );
  console.log('[migrate] 已创建唯一索引', INDEX_NAME);
}

async function migrateWarehouseBoxUnique () {
  await mongoose.connect(config.mongodbUri, { dbName: config.mongodbDbName });
  console.log('[migrate] 已连接数据库:', config.mongodbDbName || '(default)');

  console.log('[migrate] 步骤 1/3：规范化已有 boxNo');
  await normalizeExistingBoxNos();

  console.log('[migrate] 步骤 2/3：处理重复箱单号');
  await dedupeBoxNos();

  console.log('[migrate] 步骤 3/3：创建非空 boxNo 唯一索引');
  await ensureUniqueIndex();

  const created = (await WarehouseShipment.collection.indexes()).find(i => i.name === INDEX_NAME);
  if (!created?.unique) {
    throw new Error('唯一索引创建失败或不是 unique');
  }
  console.log('[migrate] ✅ boxNo 唯一索引就绪');
}

migrateWarehouseBoxUnique()
  .then(() => {
    console.log('[migrate] 完成');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error('[migrate] 失败:', err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
