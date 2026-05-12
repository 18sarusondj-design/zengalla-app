import express from 'express';
import { submitReview, getReviews, getProductReviews } from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getReviews);
router.get('/product/:productId', getProductReviews);
router.post('/', authenticate, submitReview);

export default router;
