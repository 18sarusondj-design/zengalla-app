import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  quantity: Number,
  image: String,
  hsnCode: String,
  unit: String,
  weight: Number,
});

const orderSchema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, default: 'Guest' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  status: {
    type: String,
    enum: ['NEW', 'ASSIGNED', 'PACKING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
    default: 'NEW'
  },
  orderType: { type: String, enum: ['PICKUP', 'DELIVERY', 'IN_STORE_BILL', 'B2B_PROCUREMENT'], default: 'PICKUP' },
  paymentMethod: { type: String, enum: ['COD', 'RAZORPAY', 'UPI', 'PAY_LATER', 'CREDIT', 'CASH', 'CARD', 'ONLINE', 'SPLIT', 'PARTIAL'], default: 'COD' },
  cashAmount: { type: Number, default: 0 },
  onlineAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'CREDIT', 'PARTIAL'], default: 'PENDING' },
  paymentGateway: { type: String, default: 'COD' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
  deliveryAddress: { type: Object, default: null },
  deliveryLocation: { type: Object, default: null },
  deliveryDistance: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  extraAmount: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  balanceDue: { type: Number, default: 0 },
  pickupTime: { type: String, default: 'ASAP' },
  customerGstin: { type: String, default: '' },
  customerBusinessName: { type: String, default: '' },
  customerBusinessAddress: { type: String, default: '' },
  couponApplied: { type: String, default: '' },
  cancellationReason: { type: String, default: '' },
  useWalletBalance: { type: Boolean, default: false },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isPartnerAccepted: { type: Boolean, default: false },
  deliveryProofUrl: { type: String, default: '' },
  paymentProofUrl: { type: String, default: '' },
  invoiceNumber: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
