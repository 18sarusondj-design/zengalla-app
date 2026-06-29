import mongoose from 'mongoose';

const globalBannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true },
  title: { type: String },
  subtitle: { type: String },
  linkUrl: { type: String },
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }
}, { timestamps: true });

// Optimize lookups
globalBannerSchema.index({ isActive: 1, priority: 1 });

export default mongoose.model('GlobalBanner', globalBannerSchema);
