import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const AbnormalWorktimeSchema = new mongoose.Schema(
  {
    abnormalId: {
      type: String,
      unique: true,
      index: true
    },
    name: { type: String, required: true },
    people: mongoose.Schema.Types.Mixed,
    hours: mongoose.Schema.Types.Mixed,
    totalHours: mongoose.Schema.Types.Mixed,
    remark: String,
    source: { type: String, default: '生产', enum: ['生产', '工程', '品质'] },
    engineeringReason: String,
    qualityStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    qualityComment: String,
    submittedBy: String
  },
  { timestamps: true }
);

AbnormalWorktimeSchema.pre('validate', function (next) {
  if (!this.abnormalId) {
    this.abnormalId = `abn_${nanoid(6)}`;
  }
  next();
});

AbnormalWorktimeSchema.index({ source: 1, qualityStatus: 1 });

export default mongoose.model('AbnormalWorktime', AbnormalWorktimeSchema);
