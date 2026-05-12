import express from 'express';
import { 
  getUsers, updateUserStatus, updateUserRole, deleteUser, 
  getStats, getReports, replyToReport, getAllShops, toggleSponsorship,
  deleteReport, updateShopPlan
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
router.delete('/users/:id', deleteUser);
router.delete('/reports/:id', deleteReport);



export default router;

