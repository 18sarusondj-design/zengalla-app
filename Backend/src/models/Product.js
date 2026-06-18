import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  mfd: { type: Date },
  expiryDate: { type: Date },
  stock: { type: Number, default: 0 },
  price: { type: Number, default: null },
  supplierName: { type: String, default: '' },
  warehouseLocation: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'NEAR_EXPIRY'], default: 'ACTIVE' }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  batches: [batchSchema],
  category: { type: String, default: 'General' },
  image: { type: String, default: '' },
  images: [{ type: String }],
  imageSettings: [{
    position: { type: String, default: '50% 50%' },
    zoom: { type: Number, default: 100 }
  }],
  barcode: { type: String, default: '' },
  unit: { type: String, default: 'pcs' },
  hsnCode: { type: String, default: '' },
  wholesalePrice: { type: Number, default: 0 },
  businessPrice: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  sellingType: { type: String, enum: ['piece', 'weight'], default: 'piece' },
  weightPerUnit: { type: Number, default: 0 },
  unitType: { type: String, default: 'PKT' },
  minimumOrderQuantity: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  aiReviewSummary: { type: String, default: '' },
}, { timestamps: true });

productSchema.index({ shopId: 1 });
productSchema.index({ category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ isActive: 1 });
productSchema.index({ barcode: 1 });
productSchema.index({ shopId: 1, isActive: 1 });
productSchema.index({ shopId: 1, category: 1 });

export default mongoose.model('Product', productSchema);

