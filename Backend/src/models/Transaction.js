import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['SHOP_SUBSCRIPTION', 'BANNER_SUBSCRIPTION', 'MASTER_CATALOG_UNLOCK'] 
  },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentId: { type: String, required: true },
  orderId: { type: String, required: true },
  status: { type: String, default: 'SUCCESS' }
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
