import express from 'express';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import Transaction from '../models/Transaction.js';
import SystemSettings from '../models/SystemSettings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

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

// GET /ledger/unsettled (For Vendor)
router.get('/unsettled', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'vendor' || !req.user.shopId) {
      return res.status(403).json({ error: 'Only vendors can view their ledger' });
    }

    const unsettledOrders = await Order.find({
      shopId: req.user.shopId,
      status: 'delivered', // Only charge for delivered orders
      isPlatformFeeSettled: false
    }).sort({ createdAt: -1 });

    let totalPlatformFee = 0;
    let totalDeliveryFee = 0;

    const formattedOrders = unsettledOrders.map(order => {
      // Ensure platform fee is 10 for everyone as requested (if not already set in DB)
      const platformFee = order.platformFee || 10;
      const deliveryFee = order.deliveryFee || 0;
      
      totalPlatformFee += platformFee;
      totalDeliveryFee += deliveryFee;

      return {
        _id: order._id,
        orderNumber: order.orderNumber || order._id.toString().substring(0, 8),
        createdAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        platformFee,
        deliveryFee,
        total: platformFee + deliveryFee
      };
    });

    const totalOwed = totalPlatformFee + totalDeliveryFee;
    const razorpayDeduction = Math.round(totalOwed * 0.02 * 100) / 100; // 2%
    const finalAmountToPay = Math.max(0, totalOwed - razorpayDeduction);

    res.json({
      success: true,
      unsettledOrders: formattedOrders,
      summary: {
        totalPlatformFee,
        totalDeliveryFee,
        totalOwed,
        razorpayDeduction,
        finalAmountToPay
      }
    });
  } catch (error) {
    console.error('Error fetching unsettled ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

// POST /ledger/create-settlement-order
router.post('/create-settlement-order', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'vendor' || !req.user.shopId) {
      return res.status(403).json({ error: 'Only vendors can settle dues' });
    }

    const { amount } = req.body;
    if (amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const rzp = await getSuperAdminRazorpay();
    const options = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `l_${req.user._id.toString().slice(-6)}_${Date.now()}`
    };

    const order = await rzp.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Error creating settlement order:', error);
    res.status(500).json({ error: error.message || 'Payment initiation failed' });
  }
});

// POST /ledger/verify-settlement
router.post('/verify-settlement', authenticate, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, orderIds } = req.body;
    
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
      // Create Transaction Record
      await Transaction.create({
        shopId: req.user.shopId,
        type: 'PLATFORM_FEE_SETTLEMENT',
        amount: amount,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });

      // Mark Orders as Settled
      if (orderIds && orderIds.length > 0) {
        await Order.updateMany(
          { _id: { $in: orderIds } },
          { $set: { isPlatformFeeSettled: true } }
        );
      }

      res.json({ success: true, message: 'Dues Settled Successfully!' });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (error) {
    console.error('Verify settlement error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /ledger/admin-view/:shopId (For Super Admin)
router.get('/admin-view/:shopId', authenticate, async (req, res) => {
  try {
    // Basic super admin check could go here if `authenticate` doesn't enforce it
    const { shopId } = req.params;

    const unsettledOrders = await Order.find({
      shopId: shopId,
      status: 'delivered',
      isPlatformFeeSettled: false
    });

    let currentOutstanding = 0;
    unsettledOrders.forEach(order => {
      currentOutstanding += (order.platformFee || 10) + (order.deliveryFee || 0);
    });
    // Apply 2% deduction to match vendor's view
    currentOutstanding = Math.max(0, currentOutstanding - (currentOutstanding * 0.02));

    const settlements = await Transaction.find({
      shopId: shopId,
      type: 'PLATFORM_FEE_SETTLEMENT'
    }).sort({ createdAt: -1 });

    const lifetimeSettled = settlements.reduce((sum, txn) => sum + txn.amount, 0);

    res.json({
      success: true,
      currentOutstanding,
      lifetimeSettled,
      settlements
    });
  } catch (error) {
    console.error('Error fetching admin ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger' });
  }
});

export default router;
