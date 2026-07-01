import mongoose from 'mongoose';

const sponsorshipSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  pinCode: { type: String, required: true, index: true },
  priority: { type: Number, default: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  slotNumber: { type: Number, required: true, min: 1, max: 4 },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['ACTIVE', 'REFUND_REQUESTED', 'CANCELLED'], default: 'ACTIVE' },
  paymentId: { type: String }
}, { timestamps: true });

// Prevent duplicate sponsorships for same shop + pin code
sponsorshipSchema.index({ shopId: 1, pinCode: 1 }, { unique: true });
// Optimize location-based queries
sponsorshipSchema.index({ pinCode: 1, isActive: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Sponsorship', sponsorshipSchema);
