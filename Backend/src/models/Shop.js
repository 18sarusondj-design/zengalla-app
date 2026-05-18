import mongoose from 'mongoose';

const shopSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  bannerUrl: { type: String, default: '' },
  address: { type: String, default: '' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], default: [75.1240, 15.3647], required: true } // [lng, lat]
  },

  category: { type: String, default: 'Grocery' },
  gstin: { type: String, default: '', uppercase: true },
  fssai: { type: String, default: '', uppercase: true },
  isActive: { type: Boolean, default: true },
  hasHomeDelivery: { type: Boolean, default: true },
  deliveryFee: { type: Number, default: 0 },
  deliveryPricePerKm: { type: Number, default: 0 },
  freeDeliveryThreshold: { type: Number, default: 500 },
  platformFee: { type: Number, default: 0 },
  razorpayKeyId: { type: String, default: '' },
  razorpayKeySecret: { type: String, default: '' },
  promoBanner: { type: String, default: '' },
  footerMessage: { type: String, default: '' },
  operatingHours: {
    enabled: { type: Boolean, default: false },
    start: { type: String, default: '09:00' },
    end: { type: String, default: '21:00' },
  },
  coupons: [{
    code: { type: String, uppercase: true },
    discountValue: Number,
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    minOrderAmount: { type: Number, default: 0 },
    expiryDate: Date,
    isActive: { type: Boolean, default: true },
    bannerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Banner', default: null }
  }],
  isWholesale: { type: Boolean, default: false },
  isPayLater: { type: Boolean, default: false },
  b2bPartners: [{
    businessName: String,
    ownerName: String,
    gstin: { type: String, uppercase: true },
    phone: String,
    altPhone: String,
    email: String,
    billingAddress: String,
    shippingAddress: String,
    state: String,
    stateCode: String,
    pincode: String,
    city: String,
    landmark: String,
    buyerType: { type: String, enum: ['Retailer', 'Wholesaler', 'Distributor', 'Restaurant', 'Other'], default: 'Retailer' },
    creditLimit: { type: Number, default: 0 },
    paymentTerms: { type: String, enum: ['Instant', '7 Days', '15 Days', '30 Days'], default: 'Instant' },
    notes: String,
    isActive: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now }
  }],
  payLaterPartners: { type: Array, default: [] },
  vipRewardsEnabled: { type: Boolean, default: false },
  vipPointThreshold: { type: Number, default: 1000 },
  vipPointValue: { type: Number, default: 10 },
  staffAccessCode: { type: String, default: '' },
  deliveryAccessCode: { type: String, default: '' },
  storeCode: { type: String, unique: true, sparse: true },
  paymentQR: { type: String, default: '' },
  pinCode: { type: String, index: true },
  areaName: { type: String, default: '' },
  subscriptionPlan: { type: String, enum: ['none', 'basic', 'premium'], default: 'none' },
  planStartedAt: { type: Date },
  planExpiresAt: { type: Date },
  isSponsored: { type: Boolean, default: false },
  sponsorshipType: { type: String, enum: ['none', 'paid', 'wildcard'], default: 'none' },
  sponsorshipExpiresAt: { type: Date },
  lastWildcardDate: { type: Date },
  hadFreeSponsorship: { type: Boolean, default: false },
  bannersEnabled: { type: Boolean, default: false },
  bannersEnabledAt: { type: Date, default: null },
  rating: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNo: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    branch: { type: String, default: '' },
    upiId: { type: String, default: '' },
  },
}, { timestamps: true });

shopSchema.index({ owner: 1 });
shopSchema.index({ name: 'text', address: 'text' });
shopSchema.index({ category: 1 });
shopSchema.index({ isActive: 1 });
shopSchema.index({ isSponsored: 1 });
shopSchema.index({ location: '2dsphere' });

export default mongoose.model('Shop', shopSchema);



