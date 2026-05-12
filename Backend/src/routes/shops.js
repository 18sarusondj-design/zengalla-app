import express from 'express';
import {
  getShops, getNearbyShops, getMyShop, getShopById, createShop, updateShop, toggleShopStatus, 
  lookupShopByCode, sendCouponToCustomers, getShopStaff, getShopDelivery, updateShopUserStatus, 
  deleteShopUser, addB2BPartner, updateB2BPartner, deleteB2BPartner, getB2BSuppliers, lookupShop
} from '../controllers/shopController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getShops);
router.get('/lookup', lookupShopByCode);
router.get('/nearby', getNearbyShops);
router.get('/my', authenticate, requireRole('vendor', 'staff'), getMyShop);
router.get('/my/staff', authenticate, requireRole('vendor'), getShopStaff);
router.get('/my/delivery', authenticate, requireRole('vendor'), getShopDelivery);
router.get('/my/suppliers', authenticate, requireRole('vendor'), getB2BSuppliers);
router.patch('/my/users/:id/status', authenticate, requireRole('vendor'), updateShopUserStatus);
router.delete('/my/users/:id', authenticate, requireRole('vendor'), deleteShopUser);

// B2B Partner Management
router.post('/my/b2b-partners', authenticate, requireRole('vendor'), addB2BPartner);
router.put('/my/b2b-partners/:phone', authenticate, requireRole('vendor'), updateB2BPartner);
router.delete('/my/b2b-partners/:phone', authenticate, requireRole('vendor'), deleteB2BPartner);
router.get('/lookup/b2b', authenticate, lookupShop);

router.get('/:id', getShopById);
router.post('/', authenticate, requireRole('vendor'), createShop);
router.put('/:id', authenticate, requireRole('vendor'), updateShop);
router.patch('/:id/toggle', authenticate, requireRole('vendor'), toggleShopStatus);
router.post('/:id/send-coupon', authenticate, requireRole('vendor'), sendCouponToCustomers);

export default router;
