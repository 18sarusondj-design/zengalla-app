import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Shop from '../models/Shop.js';
import SystemSettings from '../models/SystemSettings.js';
import Transaction from '../models/Transaction.js';
import Sponsorship from '../models/Sponsorship.js';
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
    if (!['MASTER_CATALOG_UNLOCK', 'SHOP_SUBSCRIPTION', 'BANNER_SUBSCRIPTION', 'SPONSORSHIP'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const rzp = await getSuperAdminRazorpay();
    const options = {
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `r_${req.user._id.toString().slice(-6)}_${Date.now()}`
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
      const rzp = await getSuperAdminRazorpay();
      const paymentDetails = await rzp.payments.fetch(razorpay_payment_id);
      const amount = paymentDetails.amount / 100;

      await Transaction.create({
        shopId,
        type,
        planName,
        amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });

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
      } else if (type === 'SPONSORSHIP') {
        const shop = await Shop.findById(shopId);
        if (!shop || !shop.pinCode) {
          return res.status(400).json({ error: 'Shop or PIN code missing' });
        }
        const pinCode = shop.pinCode;

        // Find the earliest available slot for this pincode
        // Get the latest endDate for each of the 4 slots
        const activeSponsorships = await Sponsorship.find({
          pinCode,
          endDate: { $gte: new Date() }
        });

        // Track max endDate per slot
        const slotEnds = { 1: Date.now(), 2: Date.now(), 3: Date.now(), 4: Date.now() };
        activeSponsorships.forEach(s => {
          const sEnd = new Date(s.endDate).getTime();
          if (sEnd > slotEnds[s.slotNumber]) {
            slotEnds[s.slotNumber] = sEnd;
          }
        });

        // Find the slot with the earliest available time
        let bestSlot = 1;
        let earliestAvail = slotEnds[1];
        for (let i = 2; i <= 4; i++) {
          if (slotEnds[i] < earliestAvail) {
            earliestAvail = slotEnds[i];
            bestSlot = i;
          }
        }

        const startDate = new Date(Math.max(Date.now(), earliestAvail));
        const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await Sponsorship.create({
          shopId,
          pinCode,
          startDate,
          endDate,
          slotNumber: bestSlot,
          priority: bestSlot // Priority determines display order
        });
        
        res.json({ success: true, message: 'Sponsorship Slot Booked Successfully!' });
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
