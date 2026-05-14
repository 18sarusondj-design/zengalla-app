import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import { sendPushNotification } from '../services/notificationService.js';

// POST /api/orders — place order
export const placeOrder = async (req, res) => {
  try {
    const {
      shopId, items, totalPrice, orderType, paymentMethod, paymentStatus,
      customerName, email, phone, pickupTime, deliveryAddress, deliveryLocation,
      deliveryDistance, deliveryFee, platformFee, customerGstin, couponApplied,
      razorpayOrderId, razorpayPaymentId, razorpaySignature, useWalletBalance,
      cashAmount, onlineAmount, customerBusinessName, customerBusinessAddress, 
      walletExcess, paymentProofUrl, balanceDue
    } = req.body;

    if (!shopId || !items?.length) return res.status(400).json({ error: 'shopId and items are required' });

    // 1. Verify stock for all items first
    for (const item of items) {
      const pid = item.product?._id || item.productId;
      if (!pid) continue;
      const product = await Product.findById(pid);
      if (!product) continue;
      
      const available = Number(product.stockQuantity || product.stock || 0);
      if (available < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${available}`,
          productId: pid
        });
      }
    }

    // 2. Deduct stock and check for low stock alerts
    for (const item of items) {
      const pid = item.product?._id || item.productId;
      if (!pid) continue;
      const product = await Product.findByIdAndUpdate(pid, { $inc: { stock: -item.quantity } }, { new: true });
      
      // Notify Vendor if stock is low (< 10)
      if (product && product.stock <= 10) {
        const shop = await Shop.findById(shopId);
        if (shop && shop.owner) {
          sendPushNotification(shop.owner, {
            title: '⚠️ Low Stock Alert!',
            body: `${product.name} is low on stock (${product.stock} left).`,
            url: '/vendor/dashboard/inventory',
            priority: 'normal',
            tag: `low-stock-${product._id}`
          });
        }
      }
    }

    // 3. Handle Wallet Deductions
    let walletDeducted = 0;
    if (useWalletBalance && req.user) {
      const u = await User.findById(req.user._id);
      walletDeducted = Math.min(u.walletBalance || 0, totalPrice);
      await User.findByIdAndUpdate(req.user._id, { $inc: { walletBalance: -walletDeducted } });
    }

    // 4. Handle Wallet Excess (Additions)
    if (walletExcess > 0) {
      const targetUserId = req.user?._id || (await User.findOne({ phone }))?._id;
      if (targetUserId) {
        await User.findByIdAndUpdate(targetUserId, { $inc: { walletBalance: Number(walletExcess) } });
      }
    }

    const order = await Order.create({
      shopId, userId: req.user?._id || null, items,
      totalPrice, orderType, paymentMethod,
      paymentStatus: paymentStatus || (paymentMethod === 'COD' ? 'PENDING' : 'PAID'),
      customerName: customerName || req.user?.name || 'Guest',
      email: email || req.user?.email || '',
      phone: phone || req.user?.phone || '',
      pickupTime: pickupTime || 'ASAP', 
      deliveryAddress, deliveryLocation,
      deliveryDistance, deliveryFee, platformFee, customerGstin, couponApplied,
      razorpayOrderId, razorpayPaymentId, razorpaySignature, useWalletBalance,
      cashAmount, onlineAmount, customerBusinessName, customerBusinessAddress,
      paymentProofUrl,
      balanceDue: balanceDue !== undefined ? balanceDue : (paymentMethod === 'PAY_LATER' ? Math.max(0, totalPrice - (cashAmount || 0)) : 0),
    });

    // Notify Vendor (Shop Owner)
    const shop = await Shop.findById(shopId);
    if (shop && shop.owner) {
      sendPushNotification(shop.owner, {
        title: '🔔 New Order Received!',
        body: `New order from ${customerName || req.user?.name || 'Customer'} — ₹${totalPrice}`,
        url: '/vendor/dashboard/orders',
        orderId: order._id,
        priority: 'high',
        tag: `order-${order._id}`,
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'accept', title: 'Accept' }
        ]
      });
    }

    // 11. Notify Super Admins (ADMIN Role) with complete details
    const admins = await User.find({ role: 'admin' });
    const orderDetails = {
      title: '🚀 CRITICAL: New Order Placed!',
      body: `Order #${order._id.toString().slice(-6)} from ${shop?.name || 'Shop'} for ₹${totalPrice}`,
      url: '/super-admin/orders',
      orderId: order._id,
      priority: 'high',
      tag: `admin-order-${order._id}`,
      data: {
        orderId: order._id,
        customer: { name: order.customerName, phone: order.phone, address: order.deliveryAddress },
        shop: { name: shop?.name, phone: shop?.ownerPhone || 'N/A', address: shop?.address },
        items: order.items.map(i => `${i.name} (x${i.quantity})`).join(', '),
        total: order.totalPrice,
        payment: order.paymentMethod,
        type: order.orderType
      }
    };

    admins.forEach(admin => {
      sendPushNotification(admin._id, orderDetails);
    });

    res.status(201).json({ success: true, orderId: order._id, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/orders?shopId= OR ?userId=
export const getOrders = async (req, res) => {
  try {
    const { 
      shopId, userId, deliveryPartnerId, paymentStatus, status, hasBalanceDue, 
      startDate, endDate, buyerPhone, minAmount, maxAmount,
      page = 1, limit = 20
    } = req.query;
    
    const filter = {};
    if (shopId) filter.shopId = shopId;
    if (userId) filter.userId = userId;
    if (deliveryPartnerId) filter.deliveryPartnerId = deliveryPartnerId;
    if (paymentStatus) filter.paymentStatus = { $in: paymentStatus.split(',') };
    if (status) filter.status = { $in: status.split(',') };
    if (hasBalanceDue === 'true') filter.balanceDue = { $gt: 0 };
    if (buyerPhone) filter.phone = buyerPhone;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (minAmount || maxAmount) {
      filter.totalPrice = {};
      if (minAmount) filter.totalPrice.$gte = Number(minAmount);
      if (maxAmount) filter.totalPrice.$lte = Number(maxAmount);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('shopId')
        .populate('items.product')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({ 
      success: true, 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/orders/my — current user's orders
export const getMyOrders = async (req, res) => {
  try {
    const { paymentStatus, hasBalanceDue, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };
    if (paymentStatus) filter.paymentStatus = { $in: paymentStatus.split(',') };
    if (hasBalanceDue === 'true') filter.balanceDue = { $gt: 0 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('shopId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(filter)
    ]);

    res.json({ 
      success: true, 
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('deliveryPartnerId', 'name phone location isOnline');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Virtual field for frontend convenience
    const orderObj = order.toObject();
    if (order.deliveryPartnerId && order.deliveryPartnerId.location) {
      orderObj.driverLocation = {
        lat: order.deliveryPartnerId.location.coordinates[1],
        lng: order.deliveryPartnerId.location.coordinates[0]
      };
      orderObj.driverPhone = order.deliveryPartnerId.phone;
      orderObj.isDriverOnline = order.deliveryPartnerId.isOnline;
    }

    res.json({ success: true, order: orderObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Notify Customer
    if (order.userId) {
      let title = '📦 Order Update';
      let body = `Your order #${order._id.toString().slice(-6)} is now ${status.replace(/_/g, ' ')}.`;
      
      if (status === 'READY') {
        title = '✅ Order Ready!';
        body = 'Your order is packed and ready for pickup/delivery.';
      } else if (status === 'OUT_FOR_DELIVERY') {
        title = '🚚 Out for Delivery!';
        body = 'Our delivery partner is on the way to your location.';
      } else if (status === 'COMPLETED') {
        title = '🎉 Order Completed!';
        body = 'Thank you for shopping with ZenGalla!';
      }

      sendPushNotification(order.userId, {
        title,
        body,
        url: `/shop/${order.shopId}/orders`,
        orderId: order._id,
        tag: `order-status-${order._id}`
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/:id/cancel
export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'CANCELLED', cancellationReason: reason || '' },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/:id/payment
export const updateOrderPayment = async (req, res) => {
  try {
    const { paidAmount, paymentMethod: newMethod } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (paidAmount !== undefined) {
      const amount = Number(paidAmount);
      order.balanceDue = Math.max(0, order.balanceDue - amount);
      
      // Update payment record based on method
      if (newMethod === 'CASH') order.cashAmount += amount;
      else if (newMethod === 'ONLINE' || newMethod === 'UPI') order.onlineAmount += amount;
      
      if (order.balanceDue <= 0) {
        order.paymentStatus = 'PAID';
        order.balanceDue = 0;
      } else {
        order.paymentStatus = 'PARTIAL';
      }
    }
    
    if (newMethod && !order.paymentMethod.includes(newMethod)) {
       order.paymentMethod = order.paymentMethod === 'PAY_LATER' ? newMethod : `${order.paymentMethod} + ${newMethod}`;
    }

    await order.save();

    // Notify Vendor of Payment
    const shopDetail = await Shop.findById(order.shopId);
    if (shopDetail && shopDetail.owner) {
      sendPushNotification(shopDetail.owner, {
        title: '💰 Payment Received!',
        body: `Payment of ₹${paidAmount} received for Order #${order._id.toString().slice(-6)}.`,
        url: '/vendor/dashboard/ledger',
        priority: 'normal',
        tag: `payment-${order._id}-${Date.now()}`
      });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/orders/:id
export const deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET /api/orders/frequent — frequently ordered products
export const getFrequentItems = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).limit(50);
    const freqMap = {};
    const productDataMap = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const pid = item.product?._id || item.productId;
        if (!pid) return;
        freqMap[pid] = (freqMap[pid] || 0) + 1;
        if (!productDataMap[pid]) {
          productDataMap[pid] = item.product || { _id: pid, name: item.name, price: item.price, imageUrl: item.image };
        }
      });
    });

    const sortedProducts = Object.keys(freqMap)
      .sort((a, b) => freqMap[b] - freqMap[a])
      .map(pid => productDataMap[pid])
      .slice(0, 15);

    res.json({ success: true, products: sortedProducts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET /api/orders/available — for delivery partners
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      orderType: 'DELIVERY',
      status: { $in: ['NEW', 'PACKING', 'READY'] },
      deliveryPartnerId: null
    }).populate('shopId').sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/:id/accept — delivery partner accepts assigned order
export const acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Partner acknowledges the assignment
    order.isPartnerAccepted = true; 
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/:id/reject — delivery partner rejects assigned order
export const rejectOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.deliveryPartnerId = null;
    order.status = 'NEW'; // Return to pool for reassignment
    order.isPartnerAccepted = false;
    await order.save();
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/orders/my-active — delivery partner's active orders
export const getMyActiveOrder = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: { $in: ['ASSIGNED', 'PACKING', 'READY', 'OUT_FOR_DELIVERY'] }
    }).populate('shopId');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/orders/delivery-history — delivery partner's history
export const getDeliveryHistory = async (req, res) => {
  try {
    const orders = await Order.find({
      deliveryPartnerId: req.user._id,
      status: 'COMPLETED'
    }).populate('shopId').sort({ updatedAt: -1 }).limit(50);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/orders/location — update driver location
export const updateDriverLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await User.findByIdAndUpdate(req.user._id, {
      location: { type: 'Point', coordinates: [lng, lat] }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// PATCH /api/orders/toggle-online — toggle driver online status
export const toggleOnlineStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isOnline = !user.isOnline;
    await user.save();
    res.json({ success: true, isOnline: user.isOnline });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// PATCH /api/orders/:id/assign — vendor assigns partner
export const assignOrder = async (req, res) => {
  try {
    const { partnerId, deliveryFee, extraAmount } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const isB2B = order.orderType === 'B2B_PROCUREMENT';
    const isAdmin = req.user.role === 'admin';
    const isVendor = req.user.role === 'vendor' || req.user.role === 'staff';

    // RBAC Check for Delivery Assignment: ONLY Super Admin can manage delivery
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission Denied. Only Super Admin can manage delivery assignments.' });
    }

    order.deliveryPartnerId = partnerId;
    order.status = 'ASSIGNED'; // Move to assigned status
    
    if (deliveryFee !== undefined) order.deliveryFee = deliveryFee;
    if (extraAmount !== undefined) order.extraAmount = extraAmount;
    
    await order.save();

    // Notify Delivery Partner
    const shopDetail = await Shop.findById(order.shopId);
    sendPushNotification(partnerId, {
      title: '📦 New Delivery Assigned!',
      body: `New pickup from ${shopDetail?.name || 'Shop'} — Order ID: #${order._id.toString().slice(-6)}`,
      url: '/delivery/dashboard',
      orderId: order._id,
      priority: 'high',
      tag: `delivery-${order._id}`,
      actions: [
        { action: 'accept', title: 'Accept' },
        { action: 'view', title: 'Details' }
      ]
    });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
