import express from 'express';
import { subscribe, unsubscribe, getVapidKey } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.get('/vapid-key', authenticate, getVapidKey);

export default router;
