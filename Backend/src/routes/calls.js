import express from 'express';
import { initiateMaskedCall } from '../controllers/callController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/connect', authenticate, initiateMaskedCall);

export default router;
