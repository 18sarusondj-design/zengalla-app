import express from 'express';
import { selectPlan } from '../controllers/monetizationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/select-plan', authenticate, selectPlan);

router.get('/stats/:pinCode', async (req, res) => {
  try {
    const count = await Shop.countDocuments({ pinCode: req.params.pinCode });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
