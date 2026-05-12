import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shopRatings: {
    delivery: { type: Number, default: 5 },
    packing: { type: Number, default: 5 },
    service: { type: Number, default: 5 }
  },
  productReviews: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    rating: { type: Number, default: 5 },
    comment: { type: String, default: '' },
    images: [{ type: String }]
  }],
  overallComment: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
