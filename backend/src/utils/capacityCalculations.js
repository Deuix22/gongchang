/** 半小时粒度时间 HH:mm */
export const HALF_HOUR_TIME_RE = /^([01]\d|2[0-3]):(00|30)$/;

const DAY_SHIFT_START_MINUTES = 8 * 60; // 08:00
const DAY_SHIFT_END_MINUTES = 22 * 60; // 22:00

export function parseTimeToMinutes (timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).trim().split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function parseTimeRangeString (timeRange) {
  if (!timeRange || typeof timeRange !== 'string') return null;
  const parts = timeRange.split('-');
  if (parts.length !== 2) return null;
  const startTime = parts[0].trim();
  const endTime = parts[1].trim();
  if (!startTime || !endTime) return null;
  return { startTime, endTime };
}

/** 时段唯一键：startTime + endTime */
export function slotTimeKey (slot) {
  if (slot?.startTime && slot?.endTime) {
    return `${slot.startTime}|${slot.endTime}`;
  }
  const parsed = parseTimeRangeString(slot?.timeRange);
  if (parsed) return `${parsed.startTime}|${parsed.endTime}`;
  return slot?.timeRange ? String(slot.timeRange) : '';
}

export function deriveStartHour (startTime) {
  const mins = parseTimeToMinutes(startTime);
  if (mins == null) return null;
  return Math.floor(mins / 60);
}

/** 时段与 08:00–22:00 有重叠即纳入统计 */
export function isSlotInDayShiftRange (slot) {
  const startTime = slot?.startTime || parseTimeRangeString(slot?.timeRange)?.startTime;
  const endTime = slot?.endTime || parseTimeRangeString(slot?.timeRange)?.endTime;
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start == null || end == null) return false;
  return start < DAY_SHIFT_END_MINUTES && end > DAY_SHIFT_START_MINUTES;
}

/**
 * 按文档补全/校验时段自动计算字段
 * @param {object} slot
 * @param {number|null} singleWorkHours 单台工时 /min（时段机型）
 */
export function enrichTimeSlotCalculatedFields (slot, singleWorkHours) {
  const standardCapacity = Number(slot.standardCapacity) || 0;
  const productionHours = Number(slot.productionHours) || 0;
  const actualCapacity = Number(slot.actualCapacity) || 0;
  const actualManpower = Number(slot.actualManpower) || 0;
  const sw = Number(singleWorkHours);

  const standardCapacityPcs =
    slot.standardCapacityPcs != null && slot.standardCapacityPcs !== ''
      ? Number(slot.standardCapacityPcs)
      : standardCapacity * productionHours;

  const attendanceHours =
    slot.attendanceHours != null && slot.attendanceHours !== ''
      ? Number(slot.attendanceHours)
      : productionHours * actualManpower;

  let outputHours =
    slot.outputHours != null && slot.outputHours !== ''
      ? Number(slot.outputHours)
      : null;
  if (outputHours == null && Number.isFinite(sw) && sw >= 0) {
    outputHours = (sw * actualCapacity) / 60;
  }
  if (outputHours == null || !Number.isFinite(outputHours)) {
    outputHours = 0;
  }

  const capacityDifference =
    slot.capacityDifference != null && slot.capacityDifference !== ''
      ? Number(slot.capacityDifference)
      : standardCapacityPcs - actualCapacity;

  let productionAchievementRate =
    slot.productionAchievementRate != null && slot.productionAchievementRate !== ''
      ? Number(slot.productionAchievementRate)
      : null;
  if (productionAchievementRate == null) {
    productionAchievementRate =
      standardCapacityPcs > 0 ? (actualCapacity / standardCapacityPcs) * 100 : 0;
  }

  return {
    ...slot,
    singleWorkHours: Number.isFinite(sw) ? sw : slot.singleWorkHours ?? null,
    standardCapacityPcs: round2(standardCapacityPcs),
    outputHours: round2(outputHours),
    attendanceHours: round2(attendanceHours),
    capacityDifference: round2(capacityDifference),
    productionAchievementRate: round2(productionAchievementRate)
  };
}

export function round2 (n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/**
 * 人力总达成率：Σ outputHours / Σ attendanceHours × 100
 * 统计范围：与 08:00–22:00 有重叠的时段
 */
export function computeManpowerTotalAchievementRate (slots) {
  let outputSum = 0;
  let attendanceSum = 0;
  for (const slot of slots || []) {
    if (!isSlotInDayShiftRange(slot)) continue;
    outputSum += Number(slot.outputHours) || 0;
    attendanceSum += Number(slot.attendanceHours) || 0;
  }
  if (attendanceSum <= 0) return null;
  return round2((outputSum / attendanceSum) * 100);
}

/** 列表返回时补全旧数据缺失字段 */
export function enrichTimeSlotForResponse (slot, defaultMachineModel) {
  const enriched = { ...(slot?.toObject ? slot.toObject() : slot) };
  if (!enriched.startTime || !enriched.endTime) {
    const parsed = parseTimeRangeString(enriched.timeRange);
    if (parsed) {
      enriched.startTime = enriched.startTime || parsed.startTime;
      enriched.endTime = enriched.endTime || parsed.endTime;
    }
  }
  if (!enriched.machineModel && defaultMachineModel) {
    enriched.machineModel = defaultMachineModel;
  }
  if ((enriched.startHour == null || enriched.startHour === '') && enriched.startTime) {
    enriched.startHour = deriveStartHour(enriched.startTime);
  }
  if (enriched.reasonRemark == null) {
    enriched.reasonRemark = '';
  }
  return enriched;
}
