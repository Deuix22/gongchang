import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const ExportTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: ['group', 'all'],
      required: true
    },
    params: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['processing', 'finished', 'failed'],
      default: 'processing'
    },
    progress: {
      type: Number,
      default: 0
    },
    downloadUrl: String,
    expiredAt: Date,
    createdBy: String,
    errorMessage: String
  },
  {
    timestamps: true
  }
);

const ExportTask = mongoose.model('ExportTask', ExportTaskSchema);

export default ExportTask;

