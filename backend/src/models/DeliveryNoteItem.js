import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const DeliveryNoteItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      unique: true,
      index: true
    },
    deliveryNoteId: {
      type: String,
      required: true,
      index: true
    },
    customerOrderNo: { type: String, default: '' },
    salesModel: { type: String, default: '', index: true },
    productCode: { type: String, default: '' },
    quantityPcs: { type: Number, required: true, min: 0 },
    productionBatchNo: { type: String, required: true, index: true },
    batchKey: { type: String, required: true, index: true },
    deliveryNoteNo: { type: String, default: '' }
  },
  { timestamps: true }
);

DeliveryNoteItemSchema.pre('validate', function (next) {
  if (!this.itemId) {
    this.itemId = `dni_${nanoid(8)}`;
  }
  next();
});

DeliveryNoteItemSchema.index({ batchKey: 1, salesModel: 1 });

export default mongoose.model('DeliveryNoteItem', DeliveryNoteItemSchema);
