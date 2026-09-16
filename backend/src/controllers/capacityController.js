import mongoose from 'mongoose';
import CapacityReport, { DEFAULT_PRODUCTION_LINES } from '../models/CapacityReport.js';
import { getOrCreateCapacityMeta } from '../models/CapacityMeta.js';
import { badRequest } from '../utils/errors.js';
import {
  getAllowedProductionLines,
  getAllowedProcesses,
  getAllowedModels,
  getCapacityMetaSnapshot,
  getSingleWorkHoursFromMeta,
  normalizeModelConfigs
} from '../services/capacityMetaService.js';
import {
  enrichTimeSlotCalculatedFields,
  enrichTimeSlotForResponse,
  computeManpowerTotalAchievementRate,
  HALF_HOUR_TIME_RE,
  parseTimeToMinutes,
  parseTimeRangeString,
  slotTimeKey,
  deriveStartHour
} from '../utils/capacityCalculations.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function ensureNonEmpty (value, name) {
  if (value == null || (typeof value === 'string' && !value.trim())) {
    throw badRequest(`${name} 必填`);
  }
  return typeof value === 'string' ? value.trim() : value;
}

function ensureNumber (value, name, { min = 0, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (!required) return undefined;
    throw badRequest(`${name} 必填`);
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < min) {
    throw badRequest(`${name} 须为不小于 ${min} 的数字`);
  }
  return num;
}

function escapeRegExp (str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isLegacySubmitBody (body) {
  return Array.isArray(body?.timeSlots) !== true && body?.batchNo != null;
}

function normalizeTimeSlot (slot, index, defaultMachineModel, processSegment, slotSingleWorkHours) {
  if (!slot || typeof slot !== 'object') {
    throw badRequest(`timeSlots[${index}] 格式不正确`);
  }

  let startTime = slot.startTime != null ? String(slot.startTime).trim() : '';
  let endTime = slot.endTime != null ? String(slot.endTime).trim() : '';
  if ((!startTime || !endTime) && slot.timeRange) {
    const parsed = parseTimeRangeString(slot.timeRange);
    if (parsed) {
      startTime = startTime || parsed.startTime;
      endTime = endTime || parsed.endTime;
    }
  }
  if (!startTime || !endTime) {
    throw badRequest(`timeSlots[${index}] 须包含 startTime 与 endTime`);
  }
  if (!HALF_HOUR_TIME_RE.test(startTime)) {
    throw badRequest(`timeSlots[${index}].startTime 须为 HH:mm 且分钟为 00 或 30`);
  }
  if (!HALF_HOUR_TIME_RE.test(endTime)) {
    throw badRequest(`timeSlots[${index}].endTime 须为 HH:mm 且分钟为 00 或 30`);
  }

  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (endMins <= startMins) {
    throw badRequest(`timeSlots[${index}] endTime 须晚于 startTime`);
  }
  if (endMins - startMins < 30) {
    throw badRequest(`timeSlots[${index}] 时段时长须不少于 30 分钟`);
  }

  const machineModel =
    slot.machineModel != null && String(slot.machineModel).trim()
      ? String(slot.machineModel).trim()
      : defaultMachineModel;

  const timeRange =
    slot.timeRange != null && String(slot.timeRange).trim()
      ? String(slot.timeRange).trim()
      : `${startTime}-${endTime}`;

  const startHour =
    slot.startHour != null && slot.startHour !== ''
      ? Number(slot.startHour)
      : deriveStartHour(startTime);

  const base = {
    timeRange,
    startTime,
    endTime,
    startHour: Number.isFinite(startHour) ? startHour : null,
    machineModel,
    productionMinutes: ensureNumber(slot.productionMinutes, `timeSlots[${index}].productionMinutes`),
    productionHours: ensureNumber(slot.productionHours, `timeSlots[${index}].productionHours`),
    standardCapacity: ensureNumber(slot.standardCapacity, `timeSlots[${index}].standardCapacity`),
    actualCapacity: ensureNumber(slot.actualCapacity, `timeSlots[${index}].actualCapacity`),
    standardManpower: ensureNumber(slot.standardManpower, `timeSlots[${index}].standardManpower`),
    actualManpower: ensureNumber(slot.actualManpower, `timeSlots[${index}].actualManpower`),
    borrowedInManpower: ensureNumber(slot.borrowedInManpower, `timeSlots[${index}].borrowedInManpower`, { required: false }) ?? 0,
    borrowedInPosition: slot.borrowedInPosition != null ? String(slot.borrowedInPosition).trim() : '',
    lentOutManpower: ensureNumber(slot.lentOutManpower, `timeSlots[${index}].lentOutManpower`, { required: false }) ?? 0,
    lentOutPosition: slot.lentOutPosition != null ? String(slot.lentOutPosition).trim() : '',
    ictPassRate: slot.ictPassRate != null ? String(slot.ictPassRate).trim() : '',
    fctPassRate: slot.fctPassRate != null ? String(slot.fctPassRate).trim() : '',
    reasonRemark: slot.reasonRemark != null ? String(slot.reasonRemark).trim() : ''
  };

  const calcKeys = [
    'standardCapacityPcs',
    'outputHours',
    'attendanceHours',
    'capacityDifference',
    'productionAchievementRate'
  ];
  for (const key of calcKeys) {
    if (slot[key] != null && slot[key] !== '') {
      base[key] = Number(slot[key]);
    }
  }

  return enrichTimeSlotCalculatedFields(base, slotSingleWorkHours);
}

function buildRecordKey ({ reportDate, productionLine, teamLeader, processSegment }) {
  return [
    String(reportDate ?? '').trim(),
    String(productionLine ?? '').trim(),
    String(teamLeader ?? '').trim(),
    String(processSegment ?? '').trim()
  ].join('__');
}

function parseRecordKey (recordKey) {
  if (recordKey == null || recordKey === '') return null;
  const parts = String(recordKey).split('__');
  if (parts.length !== 4) return null;
  const [reportDate, productionLine, teamLeader, processSegment] = parts.map(p => p.trim());
  if (!reportDate || !productionLine || !teamLeader || !processSegment) return null;
  return { reportDate, productionLine, teamLeader, processSegment };
}

function buildSubmitterGroupKey (doc) {
  return `${doc.reportDate}::${doc.submitter || doc.teamLeader || ''}`;
}

async function buildManpowerRateMap (docsOnPage) {
  const v2Docs = docsOnPage.filter(
    d => d.format === 'v2' || (d.timeSlots && d.timeSlots.length > 0)
  );
  if (!v2Docs.length) return new Map();

  const keys = [...new Set(v2Docs.map(buildSubmitterGroupKey))];
  const orConditions = keys.map(key => {
    const [reportDate, submitter] = key.split('::');
    return { reportDate, submitter };
  });

  const allRelated = await CapacityReport.find({
    format: 'v2',
    $or: orConditions
  }).lean();

  const slotsByKey = new Map();
  for (const doc of allRelated) {
    const key = buildSubmitterGroupKey(doc);
    if (!slotsByKey.has(key)) slotsByKey.set(key, []);
    slotsByKey.get(key).push(...(doc.timeSlots || []));
  }

  const rateMap = new Map();
  for (const [key, slots] of slotsByKey) {
    rateMap.set(key, computeManpowerTotalAchievementRate(slots));
  }
  return rateMap;
}

function segmentMatches (doc, processSegment) {
  const segment = String(processSegment ?? '').trim();
  if (!segment) return false;
  const docSegment = String(doc.processSegment ?? doc.process ?? '').trim();
  return docSegment === segment;
}

function buildBusinessKeyFilter ({
  reportDate,
  productionLine,
  teamLeader,
  processSegment,
  submitter
}) {
  const segment = String(processSegment).trim();
  return {
    format: 'v2',
    reportDate: String(reportDate).trim(),
    productionLine: String(productionLine).trim(),
    teamLeader: String(teamLeader).trim(),
    submitter: String(submitter).trim(),
    $or: [{ processSegment: segment }, { process: segment }]
  };
}

function validateRecordKeyConsistency (body, processSegment) {
  const recordKey = body.recordKey != null ? String(body.recordKey).trim() : '';
  if (!recordKey) return;

  const parsedKey = parseRecordKey(recordKey);
  if (!parsedKey) {
    throw badRequest('recordKey 格式须为 reportDate__productionLine__teamLeader__processSegment');
  }

  const expected = buildRecordKey({
    reportDate: body.reportDate,
    productionLine: body.productionLine,
    teamLeader: body.teamLeader,
    processSegment
  });

  if (recordKey !== expected) {
    throw badRequest('recordKey 与 reportDate、productionLine、teamLeader、processSegment 不一致');
  }
}

async function findExistingV2Report (body, processSegment) {
  const recordId = body.id != null ? String(body.id).trim() : '';
  if (recordId) {
    let byId = await CapacityReport.findOne({ format: 'v2', reportId: recordId });
    if (!byId && mongoose.isValidObjectId(recordId)) {
      byId = await CapacityReport.findOne({ format: 'v2', _id: recordId });
    }
    if (byId) {
      if (segmentMatches(byId, processSegment)) {
        return byId;
      }
      throw badRequest('id 对应记录的制程段与本次提交的 processSegment 不一致');
    }
  }

  const recordKey = body.recordKey != null ? String(body.recordKey).trim() : '';
  const computedRecordKey = buildRecordKey({
    reportDate: body.reportDate,
    productionLine: body.productionLine,
    teamLeader: body.teamLeader,
    processSegment
  });

  if (recordKey) {
    const byStoredRecordKey = await CapacityReport.findOne({
      format: 'v2',
      recordKey,
      submitter: String(body.submitter).trim()
    });
    if (byStoredRecordKey) return byStoredRecordKey;
  }

  const byComputedRecordKey = await CapacityReport.findOne({
    format: 'v2',
    recordKey: computedRecordKey,
    submitter: String(body.submitter).trim()
  });
  if (byComputedRecordKey) return byComputedRecordKey;

  const parsedKey = parseRecordKey(recordKey);
  if (parsedKey) {
    const byParsedRecordKey = await CapacityReport.findOne(
      buildBusinessKeyFilter({
        ...parsedKey,
        submitter: body.submitter
      })
    );
    if (byParsedRecordKey) return byParsedRecordKey;
  }

  return CapacityReport.findOne(
    buildBusinessKeyFilter({
      reportDate: body.reportDate,
      productionLine: body.productionLine,
      teamLeader: body.teamLeader,
      processSegment,
      submitter: body.submitter
    })
  );
}

function sortTimeSlots (slots) {
  return [...slots].sort((a, b) => {
    const am = parseTimeToMinutes(a.startTime) ?? 0;
    const bm = parseTimeToMinutes(b.startTime) ?? 0;
    return am - bm;
  });
}

async function validateMachineModel (machineModel) {
  const model = String(machineModel).trim();
  const allowed = await getAllowedModels();
  if (allowed.length > 0 && !allowed.includes(model)) {
    throw badRequest(`machineModel 须为已维护机型之一：${allowed.join('、')}`);
  }
  return model;
}

async function validateProductionLine (productionLine) {
  const line = String(productionLine).trim();
  const allowed = await getAllowedProductionLines();
  if (!allowed.includes(line)) {
    throw badRequest(`productionLine 须为已维护线体之一：${allowed.join('、')}`);
  }
  return line;
}

async function validateProcessSegment (processSegment) {
  const segment = String(processSegment).trim();
  const allowed = await getAllowedProcesses();
  if (allowed.length > 0 && segment && !allowed.includes(segment)) {
    throw badRequest(`processSegment 须为已维护制程段之一：${allowed.join('、')}`);
  }
  return segment;
}

function mapReportToListItem (doc) {
  const base = {
    id: doc.reportId,
    reportId: doc.reportId,
    productionLine: doc.productionLine,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    submittedBy: doc.submittedBy
  };

  if (doc.format === 'v2' || (doc.timeSlots && doc.timeSlots.length > 0)) {
    const processSegment = doc.processSegment ?? doc.process ?? '';
    const recordKey =
      doc.recordKey ||
      buildRecordKey({
        reportDate: doc.reportDate,
        productionLine: doc.productionLine,
        teamLeader: doc.teamLeader,
        processSegment
      });
    return {
      ...base,
      format: 'v2',
      reportDate: doc.reportDate,
      teamLeader: doc.teamLeader,
      processSegment,
      process: processSegment,
      recordKey,
      machineModel: doc.machineModel,
      personInCharge: doc.personInCharge,
      submitter: doc.submitter,
      reasonRemark: doc.reasonRemark ?? '',
      singleWorkHours: doc.singleWorkHours ?? null,
      timeSlots: (doc.timeSlots ?? []).map(s =>
        enrichTimeSlotForResponse(s, doc.machineModel)
      )
    };
  }

  return {
    ...base,
    format: 'legacy',
    batchNo: doc.batchNo,
    model: doc.model,
    process: doc.process,
    passQuantity: doc.passQuantity,
    startDate: doc.startDate,
    startTime: doc.startTime,
    endDate: doc.endDate,
    endTime: doc.endTime,
    attendanceHours: doc.attendanceHours,
    outputHours: doc.outputHours,
    durationText:
      typeof doc.durationMinutes === 'number' && doc.durationMinutes > 0
        ? `${Math.floor(doc.durationMinutes / 60)}小时${doc.durationMinutes % 60}分钟`
        : null,
    uph: typeof doc.uph === 'number' && doc.uph > 0 ? doc.uph.toFixed(2) : null
  };
}

/** v2 分时段提报（整单覆盖） */
async function submitCapacityV2 (req, res) {
  const body = req.body ?? {};

  if (body.replaceExisting === false) {
    throw badRequest('replaceExisting 须为 true；增量追加已废弃，请升级客户端');
  }

  const reportDate = ensureNonEmpty(body.reportDate, 'reportDate');
  if (!DATE_RE.test(reportDate)) {
    throw badRequest('reportDate 格式须为 YYYY-MM-DD');
  }

  const productionLine = await validateProductionLine(body.productionLine);
  const teamLeader = ensureNonEmpty(body.teamLeader, 'teamLeader');
  const processSegment = await validateProcessSegment(
    ensureNonEmpty(body.processSegment, 'processSegment')
  );
  validateRecordKeyConsistency(body, processSegment);
  const recordKey = buildRecordKey({
    reportDate,
    productionLine,
    teamLeader,
    processSegment
  });
  const machineModel = await validateMachineModel(ensureNonEmpty(body.machineModel, 'machineModel'));
  const personInCharge = ensureNonEmpty(body.personInCharge, 'personInCharge');
  const submitter = ensureNonEmpty(body.submitter, 'submitter');
  const reasonRemark = body.reasonRemark != null ? String(body.reasonRemark).trim() : '';

  if (!Array.isArray(body.timeSlots) || body.timeSlots.length === 0) {
    throw badRequest('timeSlots 至少包含一个时段');
  }

  let singleWorkHours =
    body.singleWorkHours != null && body.singleWorkHours !== ''
      ? Number(body.singleWorkHours)
      : null;
  if (!Number.isFinite(singleWorkHours)) {
    singleWorkHours = await getSingleWorkHoursFromMeta(machineModel, processSegment);
  }

  const incomingSlots = [];
  const incomingKeys = new Set();
  for (let i = 0; i < body.timeSlots.length; i++) {
    const slot = body.timeSlots[i];
    const slotModel =
      slot.machineModel != null && String(slot.machineModel).trim()
        ? await validateMachineModel(slot.machineModel)
        : machineModel;

    let slotSingleWorkHours =
      slot.singleWorkHours != null && slot.singleWorkHours !== ''
        ? Number(slot.singleWorkHours)
        : null;
    if (!Number.isFinite(slotSingleWorkHours)) {
      slotSingleWorkHours = await getSingleWorkHoursFromMeta(slotModel, processSegment);
    }

    const normalized = normalizeTimeSlot(
      { ...slot, machineModel: slotModel },
      i,
      machineModel,
      processSegment,
      slotSingleWorkHours
    );

    const key = slotTimeKey(normalized);
    if (incomingKeys.has(key)) {
      throw badRequest(`时段 ${normalized.startTime}-${normalized.endTime} 重复`);
    }
    incomingKeys.add(key);
    incomingSlots.push(normalized);
  }

  const timeSlots = sortTimeSlots(incomingSlots);
  const existing = await findExistingV2Report(body, processSegment);

  let report;
  if (existing) {
    existing.reportDate = reportDate;
    existing.productionLine = productionLine;
    existing.teamLeader = teamLeader;
    existing.submitter = submitter;
    existing.processSegment = processSegment;
    existing.process = processSegment;
    existing.recordKey = recordKey;
    existing.machineModel = machineModel;
    existing.personInCharge = personInCharge;
    existing.reasonRemark = reasonRemark;
    existing.singleWorkHours = Number.isFinite(singleWorkHours) ? singleWorkHours : null;
    existing.timeSlots = timeSlots;
    existing.submittedBy = req.user?.userId ?? existing.submittedBy;
    await existing.save();
    report = existing;
  } else {
    report = await CapacityReport.create({
      format: 'v2',
      reportDate,
      productionLine,
      teamLeader,
      processSegment,
      process: processSegment,
      recordKey,
      machineModel,
      personInCharge,
      submitter,
      reasonRemark,
      singleWorkHours: Number.isFinite(singleWorkHours) ? singleWorkHours : null,
      timeSlots,
      submittedBy: req.user?.userId ?? null
    });
  }

  const payload = mapReportToListItem(report.toObject ? report.toObject() : report);
  res.status(200).json({
    success: true,
    id: report.reportId,
    data: payload
  });
}

/** legacy 提报（历史接口兼容） */
async function submitCapacityLegacy (req, res) {
  const {
    productionLine,
    batchNo,
    model,
    process,
    passQuantity,
    attendanceHours,
    outputHours,
    startDate,
    startTime,
    endDate,
    endTime
  } = req.body ?? {};

  const line = await validateProductionLine(productionLine);
  ensureNonEmpty(batchNo, 'batchNo');
  ensureNonEmpty(model, 'model');
  ensureNonEmpty(process, 'process');

  const qty = Number(passQuantity);
  if (!Number.isInteger(qty) || qty < 0) {
    throw badRequest('passQuantity 须为不小于 0 的整数');
  }

  let attendance = null;
  if (attendanceHours !== undefined) {
    attendance = ensureNumber(attendanceHours, 'attendanceHours');
  }
  let output = null;
  if (outputHours !== undefined) {
    output = ensureNumber(outputHours, 'outputHours');
  }

  ensureNonEmpty(startDate, 'startDate');
  ensureNonEmpty(startTime, 'startTime');
  ensureNonEmpty(endDate, 'endDate');
  ensureNonEmpty(endTime, 'endTime');

  const startStr = `${String(startDate).trim()} ${String(startTime).trim()}`;
  const endStr = `${String(endDate).trim()} ${String(endTime).trim()}`;
  if (endStr <= startStr) {
    throw badRequest('结束日期时间须晚于开始日期时间');
  }

  const report = await CapacityReport.create({
    format: 'legacy',
    productionLine: line,
    batchNo: String(batchNo).trim(),
    model: String(model).trim(),
    process: String(process).trim(),
    passQuantity: qty,
    attendanceHours: attendance,
    outputHours: output,
    startDate: String(startDate).trim(),
    startTime: String(startTime).trim(),
    endDate: String(endDate).trim(),
    endTime: String(endTime).trim(),
    submittedBy: req.user?.userId ?? null
  });

  res.status(200).json({
    success: true,
    data: mapReportToListItem(report.toObject())
  });
}

export async function submitCapacity (req, res) {
  const body = req.body ?? {};
  if (Array.isArray(body.timeSlots)) {
    return submitCapacityV2(req, res);
  }
  if (isLegacySubmitBody(body)) {
    return submitCapacityLegacy(req, res);
  }
  throw badRequest('请求体须包含 timeSlots（新格式）或 legacy 字段 batchNo 等');
}

export async function listCapacity (req, res) {
  const {
    page = 1,
    pageSize = 20,
    productionLine,
    processSegment,
    process,
    machineModel,
    model,
    teamLeader,
    submitter,
    personInCharge,
    reportDate,
    batchNo,
    startDate,
    endDate
  } = req.query ?? {};

  const filter = {};
  const andClauses = [];

  if (productionLine) {
    filter.productionLine = String(productionLine).trim();
  }

  const segment = processSegment || process;
  if (segment) {
    andClauses.push({
      $or: [{ processSegment: segment }, { process: segment }]
    });
  }

  const machine = machineModel || model;
  if (machine) {
    const re = new RegExp(escapeRegExp(String(machine).trim()), 'i');
    andClauses.push({
      $or: [{ machineModel: re }, { model: re }]
    });
  }
  if (teamLeader) {
    filter.teamLeader = String(teamLeader).trim();
  }
  if (submitter) {
    filter.submitter = String(submitter).trim();
  }
  if (personInCharge) {
    filter.personInCharge = new RegExp(escapeRegExp(String(personInCharge).trim()), 'i');
  }
  if (reportDate) {
    filter.reportDate = String(reportDate).trim();
  }
  if (batchNo) {
    filter.batchNo = new RegExp(escapeRegExp(String(batchNo).trim()), 'i');
  }

  if (startDate || endDate) {
    const dateOr = [];
    const v2Range = {};
    if (startDate) v2Range.$gte = startDate;
    if (endDate) v2Range.$lte = endDate;
    if (Object.keys(v2Range).length) {
      dateOr.push({ reportDate: v2Range });
    }
    const legacyRange = {};
    if (startDate) legacyRange.$gte = startDate;
    if (endDate) legacyRange.$lte = endDate;
    if (Object.keys(legacyRange).length) {
      dateOr.push({ startDate: legacyRange });
    }
    if (dateOr.length) {
      andClauses.push({ $or: dateOr });
    }
  }

  if (andClauses.length) {
    filter.$and = andClauses;
  }

  const limitRaw = Number(pageSize) || 20;
  const limit = Math.max(1, Math.min(10000, limitRaw));
  const skip = Math.max(0, (Number(page) || 1) - 1) * limit;

  const [list, total] = await Promise.all([
    CapacityReport.find(filter).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    CapacityReport.countDocuments(filter)
  ]);

  const manpowerRateMap = await buildManpowerRateMap(list);
  const mappedList = list.map(doc => {
    const item = mapReportToListItem(doc);
    if (item.format === 'v2') {
      const key = buildSubmitterGroupKey(doc);
      item.manpowerTotalAchievementRate = manpowerRateMap.get(key) ?? null;
    }
    return item;
  });

  res.json({
    list: mappedList,
    total
  });
}

export async function getProductionLines (req, res) {
  const lines = await getAllowedProductionLines();
  res.json({ list: lines, lines });
}

export async function getCapacityMeta (req, res) {
  const snapshot = await getCapacityMetaSnapshot();
  res.json(snapshot);
}

export async function updateCapacityMeta (req, res) {
  const { lines, models, processes, modelConfigs, modelWorktimes } = req.body ?? {};

  function normalizeStringArray (value) {
    if (!Array.isArray(value)) return undefined;
    return [...new Set(
      value
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(item => item.length > 0)
    )];
  }

  const nextLines = normalizeStringArray(lines);
  const nextModels = normalizeStringArray(models);
  const nextProcesses = normalizeStringArray(processes);
  const nextModelConfigs = normalizeModelConfigs(modelConfigs);

  const doc = await getOrCreateCapacityMeta();

  if (nextLines !== undefined) doc.lines = nextLines;
  if (nextProcesses !== undefined) doc.processes = nextProcesses;
  if (nextModelConfigs !== undefined) {
    doc.modelConfigs = nextModelConfigs;
    doc.models = nextModels !== undefined ? nextModels : Object.keys(nextModelConfigs);
  } else if (nextModels !== undefined) {
    doc.models = nextModels;
  }

  if (modelWorktimes !== undefined && modelWorktimes !== null) {
    if (typeof modelWorktimes !== 'object' || Array.isArray(modelWorktimes)) {
      throw badRequest('modelWorktimes 必须为对象');
    }
    const normalizedMap = new Map();
    for (const [rawKey, rawValue] of Object.entries(modelWorktimes)) {
      const key = typeof rawKey === 'string' ? rawKey.trim() : '';
      if (!key) continue;
      const num = Number(rawValue);
      if (!Number.isFinite(num) || num < 0) {
        throw badRequest(`modelWorktimes 中 ${key} 的值必须为非负数字`);
      }
      normalizedMap.set(key, num);
    }
    doc.modelWorktimes = normalizedMap;
  }

  await doc.save();

  const snapshot = await getCapacityMetaSnapshot();
  res.json({
    success: true,
    data: snapshot
  });
}

export { DEFAULT_PRODUCTION_LINES };
