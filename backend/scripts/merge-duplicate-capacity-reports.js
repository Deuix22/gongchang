/**
 * 合并 v2 产能提报重复记录（按业务主键 reportDate+productionLine+teamLeader+processSegment+submitter）
 * 保留 updatedAt 最新的一条；其余记录的 timeSlots 按 startTime+endTime 去重合并后删除。
 *
 * 用法：node scripts/merge-duplicate-capacity-reports.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import CapacityReport from '../src/models/CapacityReport.js';
import { slotTimeKey } from '../src/utils/capacityCalculations.js';

function businessKey (doc) {
  return [
    doc.reportDate,
    doc.productionLine,
    doc.teamLeader,
    doc.processSegment ?? doc.process,
    doc.submitter
  ].map(v => String(v ?? '').trim()).join('||');
}

function mergeSlots (groups) {
  const map = new Map();
  for (const doc of groups) {
    for (const slot of doc.timeSlots || []) {
      const key = slotTimeKey(slot);
      if (key) map.set(key, slot);
    }
  }
  return [...map.values()];
}

async function main () {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('请设置 MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const docs = await CapacityReport.find({ format: 'v2' }).sort({ updatedAt: -1 }).lean();
  const groups = new Map();
  for (const doc of docs) {
    const key = businessKey(doc);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  let mergedGroups = 0;
  let deleted = 0;

  for (const [, items] of groups) {
    if (items.length <= 1) continue;
    mergedGroups += 1;

    const [keeper, ...rest] = items;
    const mergedTimeSlots = mergeSlots(items);

    await CapacityReport.updateOne(
      { _id: keeper._id },
      { $set: { timeSlots: mergedTimeSlots } }
    );

    const idsToDelete = rest.map(d => d._id);
    const result = await CapacityReport.deleteMany({ _id: { $in: idsToDelete } });
    deleted += result.deletedCount ?? 0;

    console.log(
      `合并 ${keeper.reportDate} ${keeper.productionLine} ${keeper.teamLeader} ` +
      `${keeper.processSegment ?? keeper.process}：` +
      `保留 ${keeper.reportId}，删除 ${idsToDelete.length} 条`
    );
  }

  console.log(`完成：${mergedGroups} 组重复，删除 ${deleted} 条记录`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
