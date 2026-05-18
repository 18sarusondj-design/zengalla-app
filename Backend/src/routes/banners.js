import express from 'express';
import {
  getShopActiveBanners,
  getBannerById,
  getVendorBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  linkProductToBanner,
  unlinkProductFromBanner
} from '../controllers/bannerController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Vendor/Staff routes
router.get('/my', authenticate, requireRole('vendor', 'staff'), getVendorBanners);

// Public routes
router.get('/shop/:shopId', getShopActiveBanners);
router.get('/:id', getBannerById);
router.post('/', authenticate, requireRole('vendor', 'staff'), createBanner);
router.put('/:id', authenticate, requireRole('vendor', 'staff'), updateBanner);
router.delete('/:id', authenticate, requireRole('vendor', 'staff'), deleteBanner);

// Safely linking/unlinking products
router.post('/:id/products', authenticate, requireRole('vendor', 'staff'), linkProductToBanner);
router.delete('/:id/products/:productId', authenticate, requireRole('vendor', 'staff'), unlinkProductFromBanner);

export default router;
