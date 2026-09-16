import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import { normalizeBoxNo } from '../utils/warehouse/boxCodeParser.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const WarehouseShipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      unique: true,
      index: true
    },
    /** 规范化后的完整箱单号；空串表示仅按批号手输出货，不参与箱单唯一校验 */
    boxNo: { type: String, default: '' },
    batchKey: { type: String, required: true, index: true },
    productionBatchNo: { type: String, default: '' },
    quantityPcs: { type: Number, required: true, min: 1 },
    deliveryNoteItemId: { type: String, default: null },
    operatorId: { type: String, default: null }
  },
  { timestamps: true }
);

WarehouseShipmentSchema.pre('validate', function (next) {
  if (!this.shipmentId) {
    this.shipmentId = `ws_${nanoid(8)}`;
  }
  this.boxNo = normalizeBoxNo(this.boxNo);
  next();
});

WarehouseShipmentSchema.index({ batchKey: 1, createdAt: -1 });

// 非空 boxNo 全局唯一：同一箱单一生只允许成功出货一次；空串允许多条（手输批号）
WarehouseShipmentSchema.index(
  { boxNo: 1 },
  {
    unique: true,
    partialFilterExpression: { boxNo: { $gt: '' } },
    name: 'uk_warehouse_shipments_box_no'
  }
);

export default mongoose.model('WarehouseShipment', WarehouseShipmentSchema);
