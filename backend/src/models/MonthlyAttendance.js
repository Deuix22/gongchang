import mongoose from 'mongoose';

const MonthlyAttendanceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    yearMonth: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}$/ // YYYY-MM 格式
    },
    leaderId: {
      type: String,
      required: true,
      index: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/ // YYYY-MM-DD 格式
    },
    records: {
      type: [{
        memberId: String,
        memberName: String,
        startTime: Date,
        endTime: Date,
        duration: Number,
        shiftType: {
          type: String,
          enum: ['day', 'night']
        },
        department: String
      }],
      required: true,
      default: []
    },
    submittedAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// 复合索引：用于按年月和组长查询
MonthlyAttendanceSchema.index({ yearMonth: 1, leaderId: 1 });

// 唯一索引：确保同一天只有一条记录
MonthlyAttendanceSchema.index({ yearMonth: 1, leaderId: 1, date: 1 }, { unique: true });

const MonthlyAttendance = mongoose.model('MonthlyAttendance', MonthlyAttendanceSchema);

export default MonthlyAttendance;

