import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const WorktimeRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      unique: true,
      index: true
    },
    productionBatch: { type: String, required: true },
    productionModel: String,
    singleWorkHours: mongoose.Schema.Types.Mixed,
    machineCount: mongoose.Schema.Types.Mixed,
    outputWorkHours: mongoose.Schema.Types.Mixed,
    exceptionReason: String,
    exceptionDuration: String,
    workshop: String,
    productionLine: String,
    team: { type: String, required: true },
    teamLeader: { type: String, required: true },
    attendanceCount: mongoose.Schema.Types.Mixed,
    actualStartDate: { type: String, required: true },
    actualStartTime: { type: String, required: true },
    actualEndDate: { type: String, required: true },
    actualEndTime: { type: String, required: true },
    actualOutput: mongoose.Schema.Types.Mixed,
    lendHours: mongoose.Schema.Types.Mixed,
    borrowHours: mongoose.Schema.Types.Mixed,
    submittedBy: String
  },
  { timestamps: true }
);

WorktimeRecordSchema.pre('validate', function (next) {
  if (!this.recordId) {
    this.recordId = `wt_${nanoid(6)}`;
  }
  next();
});

WorktimeRecordSchema.index({ productionBatch: 1 });
WorktimeRecordSchema.index({ team: 1, actualStartDate: 1 });

export default mongoose.model('WorktimeRecord', WorktimeRecordSchema);
