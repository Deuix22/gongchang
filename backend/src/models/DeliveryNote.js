import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const DeliveryNoteSchema = new mongoose.Schema(
  {
    noteId: {
      type: String,
      unique: true,
      index: true
    },
    customerName: { type: String, required: true },
    shippingDate: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    createdBy: { type: String, default: null }
  },
  { timestamps: true }
);

DeliveryNoteSchema.pre('validate', function (next) {
  if (!this.noteId) {
    this.noteId = `dn_${nanoid(8)}`;
  }
  next();
});

export default mongoose.model('DeliveryNote', DeliveryNoteSchema);
