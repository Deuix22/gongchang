import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const UploadTaskSchema = new mongoose.Schema(
  {
    uploadId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    fileName: String,
    startDate: Date,
    endDate: Date,
    parsedRows: Number,
    anomalies: [
      {
        memberId: String,
        name: String,
        reason: String,
        manualStartTime: String,
        manualDuration: Number,
        uploadedDuration: Number
      }
    ],
    anomalyReportUrl: String,
    status: {
      type: String,
      enum: ['processing', 'finished', 'failed'],
      default: 'processing'
    },
    createdBy: String,
    errorMessage: String
  },
  {
    timestamps: true
  }
);

const UploadTask = mongoose.model('UploadTask', UploadTaskSchema);

export default UploadTask;

