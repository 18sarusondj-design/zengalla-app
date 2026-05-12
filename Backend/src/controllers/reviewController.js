import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Shop from '../models/Shop.js';

export const submitReview = async (req, res) => {
  try {
    const { orderId, shopId, shopRatings, productReviews, overallComment } = req.body;
    const review = await Review.create({
      orderId,
      shopId,
      userId: req.user._id,
      shopRatings,
      productReviews,
      overallComment
    });

    // Update Shop Rating (Average of delivery, packing, service)
    const shop = await Shop.findById(shopId);
    if (shop && shopRatings) {
      const delivery = shopRatings.delivery || 5;
      const packing = shopRatings.packing || 5;
      const service = shopRatings.service || 5;
      const avgReviewRating = (delivery + packing + service) / 3;
      
      const totalRatings = shop.totalOrders || 0; 
      const newRating = ((shop.rating * totalRatings) + avgReviewRating) / (totalRatings + 1);
      
      shop.rating = newRating;
      shop.totalOrders = (shop.totalOrders || 0) + 1;
      await shop.save();
    }

    // Update Product Ratings
    if (productReviews && productReviews.length > 0) {
      for (const pr of productReviews) {
        const product = await Product.findById(pr.productId);
        if (product) {
          const newNumReviews = product.numReviews + 1;
          const newRating = ((product.rating * product.numReviews) + pr.rating) / newNumReviews;
          
          product.rating = newRating;
          product.numReviews = newNumReviews;
          await product.save();
        }
      }
    }

    res.status(201).json({ success: true, review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getReviews = async (req, res) => {
  try {
    const { shopId, orderId, userId } = req.query;
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (orderId) filter.orderId = orderId;
    if (userId) filter.userId = userId;

    const reviews = await Review.find(filter)
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews", message: err.message });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find all reviews where productReviews array contains the productId
    const reviews = await Review.find({
      'productReviews.productId': productId
    })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

    // Extract only the relevant product review part and include user info
    const formattedReviews = reviews.map(rev => {
      const pReview = rev.productReviews.find(pr => pr.productId.toString() === productId);
      return {
        _id: rev._id,
        user: rev.userId,
        rating: pReview.rating,
        comment: pReview.comment,
        images: pReview.images,
        createdAt: rev.createdAt
      };
    });

    res.json({ success: true, reviews: formattedReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
