import RazorpayPkg from 'razorpay';
import crypto from 'crypto';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import { sendPushNotification } from '../services/notificationService.js';

const Razorpay = RazorpayPkg.default || RazorpayPkg;

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, shopId } = req.body;
    console.log('--- Razorpay Order Request ---');
    console.log('Shop ID:', shopId);
    console.log('Amount:', amount);

    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    // Fetch shop's razorpay credentials
    const shop = await Shop.findById(shopId);
    if (!shop) {
      console.log('Shop not found in database');
      return res.status(404).json({ error: 'Shop not found' });
    }

    if (!shop.razorpayKeyId || !shop.razorpayKeySecret) {
      console.log('Shop missing Razorpay credentials');
      return res.status(400).json({ error: 'Shop not configured for online payments' });
    }

    const razorpayAmount = Math.round(parseFloat(amount) * 100);
    if (razorpayAmount < 100) {
      return res.status(400).json({ error: 'Minimum order amount for online payment is ₹1' });
    }

    console.log('Initializing Razorpay with key:', shop.razorpayKeyId);
    const razorpay = new Razorpay({
      key_id: shop.razorpayKeyId,
      key_secret: shop.razorpayKeySecret,
    });

    const options = {
      amount: razorpayAmount, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    console.log('Creating Razorpay order with options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created successfully:', order.id);

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: shop.razorpayKeyId
    });
  } catch (err) {
    console.error('CRITICAL: Razorpay Order Error:', err);
    res.status(500).json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, shopId } = req.body;

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', shop.razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      // If an orderId is passed, this is a post-placement payment (like settling Dues or paying COD online)
      if (req.body.orderId) {
        const order = await Order.findById(req.body.orderId);
        if (order) {
          const amountPaid = order.balanceDue;
          order.balanceDue = 0;
          order.paymentStatus = 'PAID';
          order.onlineAmount = (order.onlineAmount || 0) + amountPaid;
          
          if (!order.paymentMethod.includes('ONLINE')) {
             order.paymentMethod = order.paymentMethod === 'PAY_LATER' ? 'ONLINE' : 'SPLIT';
          }
          await order.save();

          // Notify the Vendor
          if (shop.owner) {
             sendPushNotification(shop.owner, {
               title: '💰 Online Payment Received!',
               body: `A customer just paid ₹${amountPaid} online for Order #${order._id.toString().slice(-6)}.`,
               url: '/vendor/dashboard/orders',
               priority: 'high',
               tag: `payment-${order._id}`
             });
          }
        }
      }
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
