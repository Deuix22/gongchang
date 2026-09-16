import DeliveryNote from '../models/DeliveryNote.js';
import DeliveryNoteItem from '../models/DeliveryNoteItem.js';
import WarehouseShipment from '../models/WarehouseShipment.js';
import { badRequest } from '../utils/errors.js';
import { extractBatchKeyFromProductionBatchNo } from '../utils/warehouse/boxCodeParser.js';
import { getBusinessDayRange } from '../services/warehouseService.js';

function buildItemFilter ({ productionBatchNo, batchKey, salesModel }) {
  const filter = {};
  if (productionBatchNo) {
    const key = extractBatchKeyFromProductionBatchNo(productionBatchNo);
    if (key) {
      filter.batchKey = key;
    } else {
      filter.productionBatchNo = new RegExp(
        String(productionBatchNo).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );
    }
  } else if (batchKey) {
    const digits = String(batchKey).replace(/\D/g, '');
    if (digits.length >= 8) {
      filter.batchKey = digits.slice(-8);
    }
  }
  if (salesModel) {
    filter.salesModel = new RegExp(
      String(salesModel).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );
  }
  return filter;
}

function allocateBatchOutbound (rows, batchOutboundTotal) {
  const batchInbound = rows.reduce((s, r) => s + r.cumulativeInboundQuantityPcs, 0);
  if (batchInbound <= 0) {
    rows.forEach(r => {
      r.cumulativeOutboundQuantityPcs = 0;
      r.cumulativeRemainingQuantityPcs = r.cumulativeInboundQuantityPcs;
    });
    return;
  }
  let allocated = 0;
  rows.forEach((r, idx) => {
    if (idx === rows.length - 1) {
      r.cumulativeOutboundQuantityPcs = batchOutboundTotal - allocated;
    } else {
      r.cumulativeOutboundQuantityPcs = Math.floor(
        (batchOutboundTotal * r.cumulativeInboundQuantityPcs) / batchInbound
      );
      allocated += r.cumulativeOutboundQuantityPcs;
    }
    r.cumulativeRemainingQuantityPcs =
      r.cumulativeInboundQuantityPcs - r.cumulativeOutboundQuantityPcs;
  });
}

function allocateBatchTodayOutbound (rows, batchTodayOutbound) {
  const batchTodayInbound = rows.reduce((s, r) => s + r.todayInboundQuantityPcs, 0);
  if (batchTodayInbound <= 0) {
    rows.forEach(r => {
      r.todayOutboundQuantityPcs = 0;
    });
    return;
  }
  let allocated = 0;
  rows.forEach((r, idx) => {
    if (idx === rows.length - 1) {
      r.todayOutboundQuantityPcs = batchTodayOutbound - allocated;
    } else {
      r.todayOutboundQuantityPcs = Math.floor(
        (batchTodayOutbound * r.todayInboundQuantityPcs) / batchTodayInbound
      );
      allocated += r.todayOutboundQuantityPcs;
    }
  });
}

export async function traceManageQuery (req, res) {
  const { productionBatchNo, batchKey, salesModel } = req.query ?? {};
  if (!productionBatchNo && !batchKey && !salesModel) {
    throw badRequest('请至少提供 productionBatchNo、batchKey 或 salesModel 之一');
  }

  const filter = buildItemFilter({ productionBatchNo, batchKey, salesModel });
  const items = await DeliveryNoteItem.find(filter).lean();
  if (!items.length) {
    return res.json({ list: [], summary: null });
  }

  const noteIds = [...new Set(items.map(i => i.deliveryNoteId))];
  const notes = await DeliveryNote.find({ noteId: { $in: noteIds } }).lean();
  const noteMap = new Map(notes.map(n => [n.noteId, n]));

  const { start: todayStart, end: todayEnd } = getBusinessDayRange();

  const groupMap = new Map();
  for (const item of items) {
    const groupKey = `${item.productionBatchNo}::${item.salesModel}`;
    if (!groupMap.has(groupKey)) {
      const note = noteMap.get(item.deliveryNoteId);
      groupMap.set(groupKey, {
        id: `trace_${item.batchKey}_${item.salesModel}`.replace(/\s+/g, '_'),
        batchKey: item.batchKey,
        productionBatchNo: item.productionBatchNo,
        salesModel: item.salesModel,
        productCode: item.productCode,
        customerName: note?.customerName ?? '',
        customerOrderNo: item.customerOrderNo,
        deliveryNoteNo: item.deliveryNoteNo,
        todayInboundQuantityPcs: 0,
        todayOutboundQuantityPcs: 0,
        cumulativeInboundQuantityPcs: 0,
        cumulativeOutboundQuantityPcs: 0,
        cumulativeRemainingQuantityPcs: 0
      });
    }
    const row = groupMap.get(groupKey);
    row.cumulativeInboundQuantityPcs += item.quantityPcs || 0;
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    if (createdAt && createdAt >= todayStart && createdAt <= todayEnd) {
      row.todayInboundQuantityPcs += item.quantityPcs || 0;
    }
  }

  const batchKeys = [...new Set(items.map(i => i.batchKey))];
  const allShipments = await WarehouseShipment.find({
    batchKey: { $in: batchKeys }
  }).lean();
  const shipmentByBatch = new Map();
  for (const sh of allShipments) {
    if (!shipmentByBatch.has(sh.batchKey)) {
      shipmentByBatch.set(sh.batchKey, { total: 0, today: 0 });
    }
    const agg = shipmentByBatch.get(sh.batchKey);
    agg.total += sh.quantityPcs || 0;
    const createdAt = sh.createdAt ? new Date(sh.createdAt) : null;
    if (createdAt && createdAt >= todayStart && createdAt <= todayEnd) {
      agg.today += sh.quantityPcs || 0;
    }
  }

  const rowsByBatch = new Map();
  for (const row of groupMap.values()) {
    if (!rowsByBatch.has(row.batchKey)) rowsByBatch.set(row.batchKey, []);
    rowsByBatch.get(row.batchKey).push(row);
  }

  for (const [bk, rows] of rowsByBatch.entries()) {
    const shipAgg = shipmentByBatch.get(bk) ?? { total: 0, today: 0 };
    allocateBatchOutbound(rows, shipAgg.total);
    allocateBatchTodayOutbound(rows, shipAgg.today);
  }

  const list = [...groupMap.values()].sort((a, b) =>
    a.productionBatchNo.localeCompare(b.productionBatchNo)
  );

  const summary = list.reduce(
    (acc, row) => ({
      todayInboundQuantityPcs: acc.todayInboundQuantityPcs + row.todayInboundQuantityPcs,
      todayOutboundQuantityPcs: acc.todayOutboundQuantityPcs + row.todayOutboundQuantityPcs,
      cumulativeInboundQuantityPcs:
        acc.cumulativeInboundQuantityPcs + row.cumulativeInboundQuantityPcs,
      cumulativeOutboundQuantityPcs:
        acc.cumulativeOutboundQuantityPcs + row.cumulativeOutboundQuantityPcs,
      cumulativeRemainingQuantityPcs:
        acc.cumulativeRemainingQuantityPcs + row.cumulativeRemainingQuantityPcs
    }),
    {
      todayInboundQuantityPcs: 0,
      todayOutboundQuantityPcs: 0,
      cumulativeInboundQuantityPcs: 0,
      cumulativeOutboundQuantityPcs: 0,
      cumulativeRemainingQuantityPcs: 0
    }
  );

  res.json({ list, summary });
}
