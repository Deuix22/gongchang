import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);

const MaterialStockSchema = new mongoose.Schema(
  {
    stockId: {
      type: String,
      unique: true,
      index: true
    },
    partNumber: { type: String, required: true },
    lotNumber: { type: String, required: true },
    onHandQty: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

MaterialStockSchema.pre('validate', function (next) {
  if (!this.stockId) {
    this.stockId = `ms_${nanoid(10)}`;
  }
  next();
});

MaterialStockSchema.index(
  { partNumber: 1, lotNumber: 1 },
  { unique: true, name: 'uk_material_stock_part_lot' }
);

export default mongoose.model('MaterialStock', MaterialStockSchema);
