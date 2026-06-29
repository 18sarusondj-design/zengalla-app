import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  scheduledTime: { type: Date, default: null },
  message: { type: String, default: '' },
  razorpayKeyId: { type: String, default: '' },
  razorpayKeySecret: { type: String, default: '' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('SystemSettings', systemSettingsSchema);
