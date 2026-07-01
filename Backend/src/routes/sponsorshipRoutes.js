import express from 'express';
import { getSponsorshipStatus, requestRefund } from '../controllers/sponsorshipController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/status', getSponsorshipStatus);
router.post('/:id/refund-request', requestRefund);

export default router;
