import { getOrCreateCapacityMeta } from '../models/CapacityMeta.js';
import { DEFAULT_PRODUCTION_LINES } from '../models/CapacityReport.js';
import { badRequest } from '../utils/errors.js';

function normalizeLines (lines) {
  return [...new Set(
    (lines || [])
      .map(s => String(s).trim())
      .filter(Boolean)
  )];
}

function toPlainObject (value) {
  if (!value) return {};
  if (value instanceof Map) return Object.fromEntries(value);
  if (typeof value === 'object') return value;
  return {};
}

function isFlatModelConfig (cfg) {
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return false;
  return (
    'singleWorkHours' in cfg ||
    'standardCapacity' in cfg ||
    'standardManpower' in cfg
  ) && !Object.values(cfg).some(v => v && typeof v === 'object' && !Array.isArray(v));
}

function normalizeProcessConfig (cfg) {
  if (!cfg || typeof cfg !== 'object') return null;
  const out = {};
  if (cfg.singleWorkHours !== undefined && cfg.singleWorkHours !== null && cfg.singleWorkHours !== '') {
    const v = Number(cfg.singleWorkHours);
    if (!Number.isFinite(v) || v < 0) {
      throw badRequest('singleWorkHours 须为非负数字');
    }
    out.singleWorkHours = v;
  }
  if (cfg.standardCapacity !== undefined && cfg.standardCapacity !== null && cfg.standardCapacity !== '') {
    const v = Number(cfg.standardCapacity);
    if (!Number.isFinite(v) || v < 0) {
      throw badRequest('standardCapacity 须为非负数字');
    }
    out.standardCapacity = v;
  }
  if (cfg.standardManpower !== undefined && cfg.standardManpower !== null && cfg.standardManpower !== '') {
    const v = Number(cfg.standardManpower);
    if (!Number.isFinite(v) || v < 0) {
      throw badRequest('standardManpower 须为非负数字');
    }
    out.standardManpower = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function normalizeModelConfigs (input) {
  if (input === undefined) return undefined;
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw badRequest('modelConfigs 必须为对象');
  }

  const result = {};
  for (const [modelName, config] of Object.entries(input)) {
    const model = String(modelName).trim();
    if (!model || !config || typeof config !== 'object') continue;

    if (isFlatModelConfig(config)) {
      const flat = normalizeProcessConfig(config);
      if (flat) result[model] = flat;
      continue;
    }

    const processMap = {};
    for (const [processName, processCfg] of Object.entries(config)) {
      const process = String(processName).trim();
      if (!process) continue;
      const normalized = normalizeProcessConfig(processCfg);
      if (normalized) processMap[process] = normalized;
    }
    if (Object.keys(processMap).length > 0) {
      result[model] = processMap;
    }
  }
  return result;
}

function buildModelConfigsFromDoc (doc) {
  const raw = toPlainObject(doc.modelConfigs);
  if (Object.keys(raw).length > 0) {
    return raw;
  }

  const legacy = toPlainObject(doc.modelWorktimes);
  if (Object.keys(legacy).length === 0) {
    return {};
  }

  const migrated = {};
  for (const [model, hours] of Object.entries(legacy)) {
    const h = Number(hours);
    if (!Number.isFinite(h) || h < 0) continue;
    migrated[model] = { singleWorkHours: h };
  }
  return migrated;
}

export async function getAllowedProductionLines () {
  const meta = await getOrCreateCapacityMeta();
  const lines = normalizeLines(meta.lines);
  return lines.length > 0 ? lines : [...DEFAULT_PRODUCTION_LINES];
}

export async function getAllowedProcesses () {
  const meta = await getOrCreateCapacityMeta();
  return normalizeLines(meta.processes);
}

export async function getAllowedModels () {
  const snapshot = await getCapacityMetaSnapshot();
  return snapshot.models ?? [];
}

export async function getCapacityMetaSnapshot () {
  const doc = await getOrCreateCapacityMeta();
  const modelConfigs = buildModelConfigsFromDoc(doc);
  const modelsFromConfigs = Object.keys(modelConfigs);
  const models = normalizeLines(doc.models);
  const mergedModels = models.length > 0 ? models : modelsFromConfigs;

  return {
    lines: doc.lines ?? [],
    processes: doc.processes ?? [],
    models: mergedModels,
    modelConfigs,
    modelWorktimes: doc.modelWorktimes ? Object.fromEntries(doc.modelWorktimes) : {}
  };
}

/**
 * 从 meta 读取单台工时（/min），优先嵌套 [机型][制程段]
 */
export async function getSingleWorkHoursFromMeta (machineModel, processSegment) {
  const snapshot = await getCapacityMetaSnapshot();
  const cfg = snapshot.modelConfigs?.[machineModel];
  if (!cfg || typeof cfg !== 'object') return null;

  if (cfg[processSegment] && typeof cfg[processSegment] === 'object') {
    const v = cfg[processSegment].singleWorkHours;
    return Number.isFinite(Number(v)) ? Number(v) : null;
  }

  if (isFlatModelConfig(cfg) && cfg.singleWorkHours != null) {
    return Number(cfg.singleWorkHours);
  }

  return null;
}
