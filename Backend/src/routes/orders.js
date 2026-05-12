import express from 'express';
import {
  placeOrder, getOrders, getMyOrders, getOrderById,
  updateOrderStatus, cancelOrder, deleteOrder, updateOrderPayment, getFrequentItems,
  getAvailableOrders, acceptOrder, rejectOrder, assignOrder, getMyActiveOrder, getDeliveryHistory, updateDriverLocation, toggleOnlineStatus
} from '../controllers/orderController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, placeOrder);
router.get('/', authenticate, requireRole('vendor', 'staff', 'admin'), getOrders);
router.get('/my', authenticate, getMyOrders);
router.get('/frequent', authenticate, getFrequentItems);

// Delivery Routes
router.get('/available', authenticate, requireRole('delivery'), getAvailableOrders);
router.get('/my-active', authenticate, requireRole('delivery'), getMyActiveOrder);
router.get('/delivery-history', authenticate, requireRole('delivery'), getDeliveryHistory);
router.patch('/location', authenticate, requireRole('delivery'), updateDriverLocation);
router.patch('/toggle-online', authenticate, requireRole('delivery'), toggleOnlineStatus);
router.patch('/:id/accept', authenticate, requireRole('delivery'), acceptOrder);
router.patch('/:id/reject', authenticate, requireRole('delivery'), rejectOrder);
router.patch('/:id/assign', authenticate, requireRole('vendor', 'admin'), assignOrder);

router.get('/:id', authenticate, getOrderById);
router.patch('/:id/status', authenticate, requireRole('vendor', 'staff', 'delivery', 'admin'), updateOrderStatus);
router.patch('/:id/payment', authenticate, updateOrderPayment);
router.patch('/:id/cancel', authenticate, cancelOrder);
router.delete('/:id', authenticate, requireRole('vendor', 'admin'), deleteOrder);

export default router;
