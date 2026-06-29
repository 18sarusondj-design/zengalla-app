import mongoose from 'mongoose';

const masterProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },
  imageUrl: { type: String, default: '' },
  barcode: { type: String, required: true, unique: true },
  hsnCode: { type: String, default: '' },
  taxRate: { type: Number, default: 0 },
  basePrice: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  sellingType: { type: String, enum: ['piece', 'weight'], default: 'piece' },
  weightPerUnit: { type: Number, default: 0 },
  unitType: { type: String, default: 'GM' },
}, { timestamps: true });

masterProductSchema.index({ barcode: 1 });
masterProductSchema.index({ name: 'text', description: 'text' });
masterProductSchema.index({ category: 1 });

export default mongoose.model('MasterProduct', masterProductSchema);
