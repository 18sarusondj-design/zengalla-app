import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAreaInsights,
  getShopInsights,
  changeArea
} from '../controllers/deliveryController.js';

const router = express.Router();

// Public route for registration insights
router.get('/area-insights', getAreaInsights);

// Authenticated routes for delivery partners
router.get('/shop-insights', protect, authorize('delivery'), getShopInsights);
router.post('/change-area', protect, authorize('delivery'), changeArea);

export default router;
