import mongoose from 'mongoose';

const payoutRequestSchema = new mongoose.Schema({
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopId:            { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },

  requestedAmount:   { type: Number, required: true },       // Amount partner requested
  platformDeduction: { type: Number, default: 0 },           // ₹100 deducted (if still owing)
  netAmount:         { type: Number, required: true },        // requestedAmount - platformDeduction

  totalDeductedBefore: { type: Number, default: 0 },         // platformFeeDeducted snapshot before this request

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  adminNote: { type: String, default: '' },
}, { timestamps: true });

payoutRequestSchema.index({ deliveryPartnerId: 1, status: 1 });
payoutRequestSchema.index({ shopId: 1, status: 1 });

export default mongoose.model('PayoutRequest', payoutRequestSchema);
