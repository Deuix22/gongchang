import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const AttendanceRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      unique: true,
      index: true
    },
    leaderId: {
      type: String,
      required: true,
      index: true
    },
    leaderName: {
      type: String,
      required: true
    },
    department: {
      type: String,
      required: true,
      default: ''
    },
    recordDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD
    },
    memberId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    shiftType: {
      type: String,
      enum: ['day', 'night'],
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true // 添加索引优化日期范围查询性能
    },
    lastUpdatedBy: {
      type: String,
      default: null
    },
    createdBy: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

AttendanceRecordSchema.pre('validate', function (next) {
  if (!this.recordId) {
    this.recordId = `att_${nanoid(6)}`;
  }
  if (!this.leaderName) {
    this.leaderName = this.leaderId;
  }
  if (!this.department) {
    this.department = '';
  }
  next();
});

// 唯一键：leaderId + memberId + recordDate，确保每日追加存储
AttendanceRecordSchema.index({ leaderId: 1, memberId: 1, recordDate: 1 }, { unique: true });
AttendanceRecordSchema.index({ leaderId: 1, startTime: -1 });
AttendanceRecordSchema.index({ submittedAt: -1 }); // 优化按提交时间查询

const AttendanceRecord = mongoose.model('AttendanceRecord', AttendanceRecordSchema);

export default AttendanceRecord;

