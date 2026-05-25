import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },

  role: { type: String, enum: ['customer', 'vendor', 'staff', 'delivery', 'admin'], default: 'customer' },

  status: { type: String, enum: ['active', 'pending', 'suspended', 'rejected', 'inactive'], default: 'active' },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
  walletBalance: { type: Number, default: 0 },
  shopBalances: [
    {
      shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop' },
      balance: { type: Number, default: 0 }
    }
  ],
  addresses: { type: Array, default: [] },
  address: { type: String, default: '' },
  pincode: { type: String, default: '' },
  deliveryModeEnabled: { type: Boolean, default: true },
  plan: { type: String, default: 'basic' },
  planExpiresAt: { type: Date, default: null },
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  photoUrl: { type: String, default: '' },
  documentUrl: { type: String, default: '' },
  selfieUrl: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  isOnline: { type: Boolean, default: false },
  tokenVersion: { type: Number, default: 0 },
  accountName: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  bankName: { type: String, default: '' },
}, { timestamps: true });


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => { delete ret.password; return ret; }
});

export default mongoose.model('User', userSchema);
