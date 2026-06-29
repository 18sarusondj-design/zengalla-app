import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Shop from '../models/Shop.js';
import SystemSettings from '../models/SystemSettings.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Helper to get Super Admin Razorpay Instance
const getSuperAdminRazorpay = async () => {
  const settings = await SystemSettings.findOne({ key: 'SUPER_ADMIN_KEYS' });
  if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
    throw new Error('Super Admin Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: settings.razorpayKeyId,
    key_secret: settings.razorpayKeySecret
  });
};

// GET /keys
// Returns just the public key ID for frontend checkout
router.get('/keys', authenticate, async (req, res) => {
  try {
    const settings = await SystemSettings.findOne({ key: 'SUPER_ADMIN_KEYS' });
    if (!settings || !settings.razorpayKeyId) {
      return res.status(404).json({ error: 'Super Admin Razorpay keys not configured' });
    }
    res.json({ success: true, keyId: settings.razorpayKeyId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch keys' });
  }
});

// POST /create-order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { amount, type } = req.body;
    if (!['MASTER_CATALOG_UNLOCK', 'SHOP_SUBSCRIPTION', 'BANNER_SUBSCRIPTION'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const rzp = await getSuperAdminRazorpay();
    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `rcpt_mc_${req.user._id}_${Date.now()}`
    };

    const order = await rzp.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating unlock order:', error);
    res.status(500).json({ error: error.message || 'Payment initiation failed' });
  }
});

// POST /verify-payment
router.post('/verify-payment', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shopId, type, planName, durationDays } = req.body;
    
    const settings = await SystemSettings.findOne({ key: 'SUPER_ADMIN_KEYS' });
    if (!settings || !settings.razorpayKeySecret) {
      return res.status(500).json({ error: 'Super Admin Secret missing' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', settings.razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      if (type === 'MASTER_CATALOG_UNLOCK') {
        await Shop.findByIdAndUpdate(shopId, { masterCatalogEnabled: true });
        res.json({ success: true, message: 'Master Catalog Unlocked Successfully!' });
      } else if (type === 'SHOP_SUBSCRIPTION') {
        const shop = await Shop.findById(shopId);
        let baseDate = shop.planExpiresAt && shop.planExpiresAt > new Date() ? shop.planExpiresAt : new Date();
        shop.planExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        shop.subscriptionPlan = 'premium';
        shop.softwarePlanName = planName;
        await shop.save();
        res.json({ success: true, message: 'Software Subscription Extended Successfully!' });
      } else if (type === 'BANNER_SUBSCRIPTION') {
        const shop = await Shop.findById(shopId);
        let baseDate = shop.bannersExpiresAt && shop.bannersExpiresAt > new Date() ? shop.bannersExpiresAt : new Date();
        shop.bannersExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        shop.bannersEnabled = true;
        shop.bannersPlan = planName;
        await shop.save();
        res.json({ success: true, message: 'Banner Subscription Activated Successfully!' });
      } else {
        res.json({ success: true, message: 'Payment verified!' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
