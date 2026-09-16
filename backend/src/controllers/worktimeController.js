import WorktimeRecord from '../models/WorktimeRecord.js';
import { badRequest } from '../utils/errors.js';

function ensureNonEmpty (value, name) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    throw badRequest(`${name} 必填`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

export async function submitWorktime (req, res) {
  const body = req.body ?? {};
  const productionBatch = ensureNonEmpty(body.productionBatch, 'productionBatch');
  const team = ensureNonEmpty(body.team, 'team');
  const teamLeader = ensureNonEmpty(body.teamLeader, 'teamLeader');
  const actualStartDate = ensureNonEmpty(body.actualStartDate, 'actualStartDate');
  const actualStartTime = ensureNonEmpty(body.actualStartTime, 'actualStartTime');
  const actualEndDate = ensureNonEmpty(body.actualEndDate, 'actualEndDate');
  const actualEndTime = ensureNonEmpty(body.actualEndTime, 'actualEndTime');

  const record = await WorktimeRecord.create({
    productionBatch,
    productionModel: body.productionModel ?? undefined,
    singleWorkHours: body.singleWorkHours,
    machineCount: body.machineCount,
    outputWorkHours: body.outputWorkHours,
    exceptionReason: body.exceptionReason,
    exceptionDuration: body.exceptionDuration,
    workshop: body.workshop,
    productionLine: body.productionLine,
    team,
    teamLeader,
    attendanceCount: body.attendanceCount,
    actualStartDate,
    actualStartTime,
    actualEndDate,
    actualEndTime,
    actualOutput: body.actualOutput,
    lendHours: body.lendHours,
    borrowHours: body.borrowHours,
    submittedBy: req.user?.userId ?? null
  });

  res.status(201).json({
    success: true,
    id: record.recordId
  });
}

export async function listWorktime (req, res) {
  const {
    page = 1,
    pageSize = 20,
    productionBatch,
    team,
    teamLeader,
    startDate,
    endDate
  } = req.query ?? {};

  const filter = {};
  if (productionBatch) filter.productionBatch = new RegExp(productionBatch.trim(), 'i');
  if (team) filter.team = new RegExp(team.trim(), 'i');
  if (teamLeader) filter.teamLeader = new RegExp(teamLeader.trim(), 'i');
  if (startDate) filter.actualStartDate = { $gte: startDate };
  if (endDate) filter.actualEndDate = { $lte: endDate };

  const skip = Math.max(0, (Number(page) || 1) - 1) * Math.max(1, Math.min(100, Number(pageSize) || 20));
  const limit = Math.max(1, Math.min(100, Number(pageSize) || 20));

  const [list, total] = await Promise.all([
    WorktimeRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WorktimeRecord.countDocuments(filter)
  ]);

  res.json({
    list: list.map(doc => ({
      recordId: doc.recordId,
      productionBatch: doc.productionBatch,
      productionModel: doc.productionModel,
      singleWorkHours: doc.singleWorkHours,
      machineCount: doc.machineCount,
      outputWorkHours: doc.outputWorkHours,
      exceptionReason: doc.exceptionReason,
      exceptionDuration: doc.exceptionDuration,
      workshop: doc.workshop,
      productionLine: doc.productionLine,
      team: doc.team,
      teamLeader: doc.teamLeader,
      attendanceCount: doc.attendanceCount,
      actualStartDate: doc.actualStartDate,
      actualStartTime: doc.actualStartTime,
      actualEndDate: doc.actualEndDate,
      actualEndTime: doc.actualEndTime,
      actualOutput: doc.actualOutput,
      lendHours: doc.lendHours,
      borrowHours: doc.borrowHours,
      submittedBy: doc.submittedBy,
      createdAt: doc.createdAt
    })),
    total
  });
}
