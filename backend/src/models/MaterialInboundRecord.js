import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';
import { normalizeRawCode } from '../utils/warehouse/reelIdParser.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const MaterialInboundRecordSchema = new mongoose.Schema(
  {
    inboundId: {
      type: String,
      unique: true,
      index: true
    },
    /** 完整 Reel ID，全局唯一 */
    rawCode: { type: String, required: true },
    materialBaseCode: { type: String, required: true, index: true },
    partNumber: { type: String, required: true, index: true },
    versionCode: { type: String, default: '' },
    versionDesc: { type: String, default: '' },
    designCode: { type: String, default: '' },
    lotNumber: { type: String, required: true, index: true },
    quantityPcs: { type: Number, required: true, min: 1 },
    operatorUserId: { type: String, default: null }
  },
  { timestamps: true }
);

MaterialInboundRecordSchema.pre('validate', function (next) {
  if (!this.inboundId) {
    this.inboundId = `mi_${nanoid(10)}`;
  }
  this.rawCode = normalizeRawCode(this.rawCode);
  next();
});

MaterialInboundRecordSchema.index(
  { rawCode: 1 },
  { unique: true, name: 'uk_material_inbound_raw_code' }
);
MaterialInboundRecordSchema.index({ partNumber: 1, lotNumber: 1 });

export default mongoose.model('MaterialInboundRecord', MaterialInboundRecordSchema);
