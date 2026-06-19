import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  requestPayout,
  getMyPayouts,
  getShopPayouts,
  approvePayout,
  rejectPayout,
} from '../controllers/payoutController.js';

const router = express.Router();

// Delivery partner routes
router.post('/request',   authenticate, requireRole('delivery'), requestPayout);
router.get('/my',         authenticate, requireRole('delivery'), getMyPayouts);

// Vendor / admin routes
router.get('/shop/:shopId', authenticate, requireRole('vendor', 'staff', 'admin'), getShopPayouts);
router.patch('/:id/approve', authenticate, requireRole('vendor', 'staff', 'admin'), approvePayout);
router.patch('/:id/reject',  authenticate, requireRole('vendor', 'staff', 'admin'), rejectPayout);

export default router;
