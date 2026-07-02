import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendPushNotification } from './notificationService.js';

export const startDispatchEngine = () => {
  // Run every 10 seconds
  setInterval(async () => {
    try {
      await processTimeouts();
      await processNewAssignments();
    } catch (err) {
      console.error('❌ Dispatch Engine Error:', err);
    }
  }, 10000);
  console.log('🚀 Auto-Dispatch Engine started...');
};

const processTimeouts = async () => {
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
  
  const timedOutOrders = await Order.find({
    status: 'ASSIGNED',
    isPartnerAccepted: false,
    deliveryAssignedAt: { $lt: thirtySecondsAgo },
    deliveryPartnerId: { $ne: null }
  });

  for (const order of timedOutOrders) {
    // 1. Add current partner to rejectedBy
    if (!order.rejectedBy.includes(order.deliveryPartnerId)) {
      order.rejectedBy.push(order.deliveryPartnerId);
    }
    
    // 2. Unassign and return to pool
    order.deliveryPartnerId = null;
    order.status = 'READY'; // Keep it ready/new so processNewAssignments can pick it up
    order.deliveryAssignedAt = null;
    
    await order.save();
    console.log(`[DISPATCH] Order #${order._id.toString().slice(-6)} bounced due to 30s timeout.`);
  }
};

const processNewAssignments = async () => {
  // Find orders needing assignment
  const orders = await Order.find({
    orderType: 'DELIVERY',
    status: { $in: ['NEW', 'PACKING', 'READY'] },
    deliveryPartnerId: null
  }).populate('shopId');

  for (const order of orders) {
    if (!order.shopId || !order.shopId.pinCode) continue; // Skip if shop has no pincode

    // Find eligible partners
    // 1. Online, 2. Delivery Role, 3. Matches Pincode, 4. Not in rejectedBy
    const partners = await User.find({
      role: 'delivery',
      isOnline: true,
      servicePincode: order.shopId.pinCode,
      _id: { $nin: order.rejectedBy }
    }).sort({ lastAssignedAt: 1 }); // Oldest first (Round-Robin)

    if (partners.length === 0) {
      // No eligible partners found (either all offline or all rejected)
      // We leave it unassigned. The admin dashboard will show it.
      continue;
    }

    // Assign to the first eligible partner
    const selectedPartner = partners[0];
    
    // Check if partner already has 3 active orders (Optional Load Balancing limit)
    const activeOrderCount = await Order.countDocuments({
      deliveryPartnerId: selectedPartner._id,
      status: { $in: ['ASSIGNED', 'PACKING', 'READY', 'OUT_FOR_DELIVERY'] }
    });
    
    if (activeOrderCount >= 3) {
      continue; // Skip this round, they are too busy. Will check next loop or next partner
    }

    // ASSIGN
    order.deliveryPartnerId = selectedPartner._id;
    order.status = 'ASSIGNED';
    order.deliveryAssignedAt = new Date();
    await order.save();

    // UPDATE PARTNER
    selectedPartner.lastAssignedAt = new Date();
    await selectedPartner.save();

    console.log(`[DISPATCH] Assigned Order #${order._id.toString().slice(-6)} to ${selectedPartner.name}`);

    // NOTIFY PARTNER
    sendPushNotification(selectedPartner._id, {
      title: '📦 New Mission Assigned!',
      body: `Pickup from ${order.shopId.name}. You have 30s to accept!`,
      url: '/delivery/dashboard',
      orderId: order._id,
      priority: 'high',
      tag: `mission-${order._id}`
    });
  }
};
