import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { 
  getActiveGlobalBanners,
  getAllGlobalBanners,
  createGlobalBanner,
  updateGlobalBanner,
  deleteGlobalBanner
} from '../controllers/globalBannerController.js';

const router = express.Router();

// Public route for customer app
router.get('/', getActiveGlobalBanners);

// Admin routes (require super admin)
router.get('/admin', authenticate, requireRole('admin'), getAllGlobalBanners);
router.post('/admin', authenticate, requireRole('admin'), createGlobalBanner);
router.put('/admin/:id', authenticate, requireRole('admin'), updateGlobalBanner);
router.delete('/admin/:id', authenticate, requireRole('admin'), deleteGlobalBanner);

export default router;
