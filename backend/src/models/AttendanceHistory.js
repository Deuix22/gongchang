import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const AttendanceHistorySchema = new mongoose.Schema(
  {
    historyId: {
      type: String,
      unique: true,
      index: true
    },
    leaderId: {
      type: String,
      required: true
    },
    department: String,
    memberId: String,
    memberName: String,
    groupName: String,
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedBy: String,
    changedByName: String,
    changedAt: {
      type: Date,
      required: true,
      index: true // 添加索引优化日期范围查询性能
    }
  },
  {
    timestamps: true
  }
);

// 添加复合索引优化查询性能
AttendanceHistorySchema.index({ changedAt: -1, field: 1 });
AttendanceHistorySchema.index({ leaderId: 1, changedAt: -1 });
AttendanceHistorySchema.index({ field: 1, memberName: 1, changedAt: -1 });

AttendanceHistorySchema.pre('validate', function (next) {
  if (!this.historyId) {
    this.historyId = `hist_${nanoid(6)}`;
  }
  next();
});

const AttendanceHistory = mongoose.model('AttendanceHistory', AttendanceHistorySchema);

export default AttendanceHistory;

