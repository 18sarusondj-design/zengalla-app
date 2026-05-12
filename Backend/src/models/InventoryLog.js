import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId },
  action: { 
    type: String, 
    enum: ['STOCK_IN', 'STOCK_OUT', 'BATCH_ADDED', 'BATCH_EXPIRED', 'ADJUSTMENT', 'SALE'], 
    required: true 
  },
  quantity: { type: Number, required: true },
  previousStock: { type: Number },
  newStock: { type: Number },
  reason: { type: String, default: '' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('InventoryLog', inventoryLogSchema);
