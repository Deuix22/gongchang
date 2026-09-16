import AbnormalWorktime from '../models/AbnormalWorktime.js';
import { badRequest, notFound } from '../utils/errors.js';

function ensureNonEmpty (value, name) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    throw badRequest(`${name} 必填`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

export async function submitAbnormal (req, res) {
  const { name, people, hours, totalHours, remark } = req.body ?? {};
  ensureNonEmpty(name, 'name');

  const record = await AbnormalWorktime.create({
    name,
    people: people ?? undefined,
    hours: hours ?? undefined,
    totalHours: totalHours ?? undefined,
    remark: remark ?? undefined,
    source: '生产',
    qualityStatus: 'pending',
    submittedBy: req.user?.userId ?? null
  });

  res.status(201).json({
    success: true,
    abnormalId: record.abnormalId,
    id: record.abnormalId,
    name: record.name,
    source: record.source,
    qualityStatus: record.qualityStatus
  });
}

export async function updateEngineeringReason (req, res) {
  const { id } = req.params;
  const { engineeringReason } = req.body ?? {};
  const doc = await AbnormalWorktime.findOne({ abnormalId: id });
  if (!doc) throw notFound('异常记录不存在');
  doc.engineeringReason = engineeringReason != null ? String(engineeringReason) : '';
  await doc.save();
  res.json({ success: true, abnormalId: doc.abnormalId });
}

export async function qualityApprove (req, res) {
  const { id } = req.params;
  const { status, comment } = req.body ?? {};
  if (!['approved', 'rejected'].includes(status)) {
    throw badRequest('status 须为 approved 或 rejected');
  }
  const doc = await AbnormalWorktime.findOne({ abnormalId: id });
  if (!doc) throw notFound('异常记录不存在');
  doc.qualityStatus = status;
  doc.qualityComment = comment != null ? String(comment) : '';
  await doc.save();
  res.json({ success: true, abnormalId: doc.abnormalId, qualityStatus: doc.qualityStatus });
}

export async function listAbnormal (req, res) {
  const {
    page = 1,
    pageSize = 20,
    source,
    qualityStatus
  } = req.query ?? {};

  const filter = {};
  if (source) filter.source = source;
  if (qualityStatus) filter.qualityStatus = qualityStatus;

  const skip = Math.max(0, (Number(page) || 1) - 1) * Math.max(1, Math.min(100, Number(pageSize) || 20));
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 20));

  const [list, total] = await Promise.all([
    AbnormalWorktime.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AbnormalWorktime.countDocuments(filter)
  ]);

  res.json({
    list: list.map(doc => ({
      abnormalId: doc.abnormalId,
      name: doc.name,
      people: doc.people,
      hours: doc.hours,
      totalHours: doc.totalHours,
      remark: doc.remark,
      source: doc.source,
      engineeringReason: doc.engineeringReason,
      qualityStatus: doc.qualityStatus,
      qualityComment: doc.qualityComment,
      submittedBy: doc.submittedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    })),
    total
  });
}
