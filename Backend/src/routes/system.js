import express from 'express';
import SystemSettings from '../models/SystemSettings.js';

const router = express.Router();

// GET /api/system/maintenance
router.get('/maintenance', async (req, res) => {
  try {
    const settings = await SystemSettings.findOne({ key: 'maintenance' });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
