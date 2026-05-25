import express from 'express';
import { 
  getUsers, updateUserStatus, updateUserRole, deleteUser, 
  getStats, getReports, replyToReport, getAllShops, toggleSponsorship,
  deleteReport, updateShopPlan, getSystemSettings, updateSystemSettings,
  getAllDeliveryPartners, updateDeliveryPartner, deleteDeliveryPartner, toggleShopBannersAccess,
  getSponsorships, createSponsorship, updateSponsorship, deleteSponsorship, getShopsByPinCode
} from '../controllers/adminController.js';

import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', getUsers);
router.get('/shops', getAllShops);
router.get('/stats', getStats);
router.get('/reports', getReports);

router.patch('/reports/:id/reply', replyToReport);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.patch('/shops/:id/sponsor', toggleSponsorship);
router.patch('/shops/:id/plan', updateShopPlan);
router.patch('/shops/:id/banners-access', toggleShopBannersAccess);
router.delete('/users/:id', deleteUser);
router.delete('/reports/:id', deleteReport);

router.get('/system-settings', getSystemSettings);
router.patch('/system-settings', updateSystemSettings);
router.get('/delivery-partners', getAllDeliveryPartners);
router.put('/delivery-partners/:id', updateDeliveryPartner);
router.delete('/delivery-partners/:id', deleteDeliveryPartner);

// Sponsorships management
router.get('/sponsorships', getSponsorships);
router.post('/sponsorships', createSponsorship);
router.put('/sponsorships/:id', updateSponsorship);
router.delete('/sponsorships/:id', deleteSponsorship);
router.get('/shops/by-pincode/:pinCode', getShopsByPinCode);

export default router;

