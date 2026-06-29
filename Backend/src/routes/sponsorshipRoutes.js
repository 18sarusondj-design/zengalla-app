import express from 'express';
import { getSponsorshipStatus } from '../controllers/sponsorshipController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/status', getSponsorshipStatus);

export default router;
