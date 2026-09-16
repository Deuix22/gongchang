import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

export const DEFAULT_PRODUCTION_LINES = [
  'DIP1线', 'DIP2线', 'DIP3线', 'DIP4线', 'DIP5线', 'DIP6线', 'DIP7线'
];

const TimeSlotSchema = new mongoose.Schema(
  {
    timeRange: { type: String, required: true },
    startTime: { type: String, default: null },
    endTime: { type: String, default: null },
    /** 兼容字段，由 startTime 推导 */
    startHour: { type: Number, default: null },
    machineModel: { type: String, default: '' },
    singleWorkHours: { type: Number, min: 0, default: null },
    productionMinutes: { type: Number, required: true },
    productionHours: { type: Number, required: true },
    standardCapacity: { type: Number, required: true },
    actualCapacity: { type: Number, required: true },
    standardManpower: { type: Number, required: true },
    actualManpower: { type: Number, required: true },
    borrowedInManpower: { type: Number, default: 0 },
    borrowedInPosition: { type: String, default: '' },
    lentOutManpower: { type: Number, default: 0 },
    lentOutPosition: { type: String, default: '' },
    ictPassRate: { type: String, default: '' },
    fctPassRate: { type: String, default: '' },
    reasonRemark: { type: String, default: '' },
    standardCapacityPcs: { type: Number, default: null },
    outputHours: { type: Number, default: null },
    attendanceHours: { type: Number, default: null },
    capacityDifference: { type: Number, default: null },
    productionAchievementRate: { type: Number, default: null }
  },
  { _id: false }
);

const CapacityReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      index: true
    },
    /** legacy | v2（分时段提报） */
    format: {
      type: String,
      enum: ['legacy', 'v2'],
      default: 'v2'
    },
    productionLine: { type: String, required: true, index: true },
    // —— v2 字段 ——
    reportDate: { type: String, index: true },
    teamLeader: { type: String, default: '' },
    processSegment: { type: String, default: '' },
    /** reportDate__productionLine__teamLeader__processSegment，便于按前端 recordKey 定位 */
    recordKey: { type: String, default: '', index: true },
    machineModel: { type: String, default: '' },
    personInCharge: { type: String, default: '' },
    submitter: { type: String, default: '' },
    reasonRemark: { type: String, default: '' },
    /** 提报时机型+制程段对应的单台工时快照（/min） */
    singleWorkHours: { type: Number, min: 0, default: null },
    timeSlots: { type: [TimeSlotSchema], default: [] },
    // —— legacy 字段（历史数据兼容） ——
    batchNo: { type: String, default: null },
    model: { type: String, default: null },
    process: { type: String, default: null },
    passQuantity: { type: Number, min: 0, default: null },
    attendanceHours: { type: Number, min: 0, default: null },
    outputHours: { type: Number, min: 0, default: null },
    durationMinutes: { type: Number, min: 0, default: null },
    uph: { type: Number, min: 0, default: null },
    startDate: { type: String, default: null },
    startTime: { type: String, default: null },
    endDate: { type: String, default: null },
    endTime: { type: String, default: null },
    submittedBy: { type: String, default: null }
  },
  { timestamps: true }
);

CapacityReportSchema.pre('validate', function (next) {
  if (!this.reportId) {
    this.reportId = `cap_${nanoid(6)}`;
  }
  next();
});

CapacityReportSchema.index(
  {
    reportDate: 1,
    productionLine: 1,
    teamLeader: 1,
    processSegment: 1,
    submitter: 1
  },
  {
    unique: true,
    partialFilterExpression: { format: 'v2' },
    name: 'uniq_v2_capacity_business_key'
  }
);
CapacityReportSchema.index({ productionLine: 1, startDate: 1 });
CapacityReportSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('CapacityReport', CapacityReportSchema);
