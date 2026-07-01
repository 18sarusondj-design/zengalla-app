import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';
import Transaction from '../models/Transaction.js';
import Sponsorship from '../models/Sponsorship.js';
import Razorpay from 'razorpay';
import SystemSettings from '../models/SystemSettings.js';

// GET /api/admin/users?role=
export const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const filter = { role: { $ne: 'admin' } };
    if (role) filter.role = role;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (role === 'vendor') {
      const shops = await Shop.find({}).select('-razorpayKeySecret').lean();
      const shopMap = {};
      
      shops.forEach(s => { 
        if (s.owner) {
          shopMap[s.owner.toString()] = { 
            id: s._id, 
            name: s.name,
            pinCode: s.pinCode || 'N/A',
            areaName: s.areaName || '',
            plan: s.subscriptionPlan || 'none',
            planStartedAt: s.planStartedAt,
            planExpiresAt: s.planExpiresAt,
            sponsorship: s.sponsorshipType || 'none',
            isSponsored: s.isSponsored || false,
            bannersEnabled: s.bannersEnabled || false,
            bannersEnabledAt: s.bannersEnabledAt || null,
            bannersPlan: s.bannersPlan || 'none',
            bannersExpiresAt: s.bannersExpiresAt || null
          }; 
        }
      });

      const enriched = users.map(u => {
        const uId = u._id.toString();
        const shopData = shopMap[uId];
        
        let daysRemaining = null;
        if (shopData?.planExpiresAt) {
          const diff = new Date(shopData.planExpiresAt) - new Date();
          daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }
        
        return {
          ...u.toJSON(),
          shopId: shopData?.id || null,
          shopName: shopData?.name || 'NO SHOP',
          pinCode: shopData?.pinCode || 'N/A',
          areaName: shopData?.areaName || '',
          subscriptionPlan: shopData?.plan || 'none',
          planStartedAt: shopData?.planStartedAt || null,
          planExpiresAt: shopData?.planExpiresAt || null,
          daysRemaining,
          sponsorshipType: shopData?.sponsorship || 'none',
          isSponsored: shopData?.isSponsored || false,
          bannersEnabled: shopData?.bannersEnabled || false,
          bannersEnabledAt: shopData?.bannersEnabledAt || null,
          bannersPlan: shopData?.bannersPlan || 'none',
          bannersExpiresAt: shopData?.bannersExpiresAt || null
        };
      });
      
      return res.json({ success: true, users: enriched });
    }

    res.json({ success: true, users });
  } catch (err) {
    console.error('CRITICAL VENDOR FETCH ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};


// PATCH /api/admin/users/:id/status
export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.status = status;
    await user.save();

    // If activating a vendor, automatically grant 30-day free trial if they haven't had one
    if (status === 'active' && user.role === 'vendor') {
      const shop = await Shop.findOne({ owner: user._id });
      if (shop && !shop.planStartedAt) {
        shop.subscriptionPlan = 'premium';
        shop.softwarePlanName = '30-Day Free Trial';
        shop.planStartedAt = new Date();
        shop.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        shop.isApproved = true;
        await shop.save();
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/users/:id/role
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/reports/:id
export const deleteReport = async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Report deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/admin/shops
export const getAllShops = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const shops = await Shop.find({})
      .sort({ createdAt: -1 })
      .select('-razorpayKeySecret')
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ success: true, shops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// PATCH /api/admin/shops/:id/sponsor
export const toggleSponsorship = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // If we are trying to enable sponsorship
    if (!shop.isSponsored) {
      const sponsoredInPinCount = await Shop.countDocuments({ 
        pinCode: shop.pinCode, 
        isSponsored: true 
      });

      if (sponsoredInPinCount >= 3) {
        return res.status(400).json({ 
          error: `Limit reached! You can only sponsor up to 3 shops in Pin Code: ${shop.pinCode}.` 
        });
      }
    }

    shop.isSponsored = !shop.isSponsored;
    shop.sponsorshipType = shop.isSponsored ? 'paid' : 'none'; // Default to paid when manually toggled
    await shop.save();
    
    const sanitizedShop = shop.toObject();
    delete sanitizedShop.razorpayKeySecret;
    
    if (shop.owner) {
      await User.findByIdAndUpdate(shop.owner, { status: 'active' });
    }

    res.json({ success: true, shop: sanitizedShop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [totalUsers, totalVendors, totalOrders, totalShops, reports, totalRiders, activeDeliveries, completedDeliveriesToday] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      Order.countDocuments(),
      Shop.countDocuments(),
      Report.find({ replyMessage: '' }),
      User.countDocuments({ role: 'delivery' }),
      Order.countDocuments({ status: { $in: ['ASSIGNED', 'PICKED_UP'] } }),
      Order.countDocuments({ status: 'DELIVERED', updatedAt: { $gte: startOfDay } })
    ]);

    const shops = await Shop.find({});
    const pendingVendorsCount = shops.filter(s => !s.isActive).length;

    res.json({ 
      success: true, 
      stats: { 
        totalUsers, 
        totalVendors, 
        totalOrders, 
        totalShops,
        totalRiders,
        activeDeliveries,
        completedDeliveriesToday,
        pendingVendors: pendingVendorsCount,
        vendorReports: reports.filter(r => r.userRole === 'vendor').length,
        customerReports: reports.filter(r => r.userRole === 'customer').length
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/reports
export const getReports = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role) filter.userRole = role;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// POST /api/reports
export const createReport = async (req, res) => {
  try {
    const { senderName, email, userRole, message } = req.body;
    const report = await Report.create({ senderName, email, userRole, message });
    res.status(201).json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/reports/:id/reply
export const replyToReport = async (req, res) => {
  try {
    const { replyMessage } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { replyMessage, status: 'RESOLVED' }, { new: true });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/shops/:id/plan
export const updateShopPlan = async (req, res) => {
  try {
    const { subscriptionPlan, sponsorshipType } = req.body;
    
    const updateData = { 
      subscriptionPlan, 
      sponsorshipType 
    };

    if (subscriptionPlan && subscriptionPlan !== 'none') {
      updateData.planStartedAt = new Date();
      updateData.planExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 Days
    }

    const shop = await Shop.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-razorpayKeySecret');
    
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // CRITICAL: Activate the vendor's user account so they can access the dashboard
    if (shop.owner) {
      await User.findByIdAndUpdate(shop.owner, { status: 'active' });
      console.log(`[AUTH] Activated owner ${shop.owner} for shop ${shop._id}`);
    }

    res.json({ success: true, shop });
  } catch (err) {
    console.error('UPDATE_SHOP_PLAN_ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/shops/:id/unlock-location
export const unlockShopLocation = async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(
      req.params.id, 
      { canEditLocation: true }, 
      { new: true }
    ).select('-razorpayKeySecret');
    
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    res.json({ success: true, shop, message: 'Location edit unlocked for this shop.' });
  } catch (err) {
    console.error('UNLOCK_LOCATION_ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};
// GET /api/admin/system-settings
export const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find({});
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/admin/system-settings
export const updateSystemSettings = async (req, res) => {
  try {
    const { key, updates, scheduledTime, message, isActive } = req.body;
    const targetKey = key || 'maintenance';
    
    let updatePayload = { scheduledTime, message, isActive };
    if (updates) {
      updatePayload = { ...updatePayload, ...updates };
    }

    const settings = await SystemSettings.findOneAndUpdate(
      { key: targetKey },
      updatePayload,
      { new: true, upsert: true }
    );
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/delivery-partners
export const getAllDeliveryPartners = async (req, res) => {
  try {
    const partners = await User.find({ role: 'delivery' }).select('-password').populate('shopId', 'name');
    res.json({ success: true, users: partners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Removed createGlobalDeliveryPartner as per user request to only allow self-registration

// PUT /api/admin/delivery-partners/:id
export const updateDeliveryPartner = async (req, res) => {
  try {
    const { name, phone, password, photoUrl, documentUrl, status } = req.body;
    const updateData = { name, phone, photoUrl, documentUrl, status };
    if (password) updateData.password = password;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return res.status(404).json({ error: 'Delivery partner not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/delivery-partners/:id
export const deleteDeliveryPartner = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Delivery partner deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// PATCH /api/admin/shops/:id/banners-access
// Body: { plan: '7day' | '30day' } to grant/extend, { action: 'revoke' } to disable
export const toggleShopBannersAccess = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const { plan, action } = req.body || {};

    if (action === 'revoke') {
      // Revoke / disable immediately
      shop.bannersEnabled = false;
      shop.bannersEnabledAt = null;
      shop.bannersPlan = 'none';
      shop.bannersExpiresAt = null;

    } else if (['7day', '30day', '6month', '1year'].includes(plan)) {
      const durationMs = {
        '7day':   7   * 24 * 60 * 60 * 1000,
        '30day':  30  * 24 * 60 * 60 * 1000,
        '6month': 180 * 24 * 60 * 60 * 1000,
        '1year':  365 * 24 * 60 * 60 * 1000,
      }[plan];

      // Jio-style stacking: if current plan is still active, extend from its expiry
      const currentExpiry = shop.bannersExpiresAt ? new Date(shop.bannersExpiresAt) : null;
      const isCurrentlyActive = shop.bannersEnabled && currentExpiry && currentExpiry > new Date();
      const baseTime = isCurrentlyActive ? currentExpiry.getTime() : Date.now();

      shop.bannersEnabled = true;
      shop.bannersEnabledAt = shop.bannersEnabledAt || new Date(); // Keep original grant date
      shop.bannersPlan = plan;
      shop.bannersExpiresAt = new Date(baseTime + durationMs);

    } else {
      // Legacy toggle (no plan body) — default to 7day
      if (shop.bannersEnabled) {
        shop.bannersEnabled = false;
        shop.bannersEnabledAt = null;
        shop.bannersPlan = 'none';
        shop.bannersExpiresAt = null;
      } else {
        shop.bannersEnabled = true;
        shop.bannersEnabledAt = new Date();
        shop.bannersPlan = '7day';
        shop.bannersExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    }

    await shop.save();

    const sanitizedShop = shop.toObject();
    delete sanitizedShop.razorpayKeySecret;

    res.json({ success: true, shop: sanitizedShop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/sponsorships
export const getSponsorships = async (req, res) => {
  try {
    const { pinCode } = req.query;
    const filter = {};
    if (pinCode) filter.pinCode = pinCode;
    const sponsorships = await Sponsorship.find(filter)
      .populate('shopId', 'name email phone pinCode owner isActive')
      .sort({ pinCode: 1, priority: 1 });
    res.json({ success: true, sponsorships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/sponsorships
export const createSponsorship = async (req, res) => {
  try {
    const { shopId, pinCode, priority, startDate, endDate, isActive } = req.body;
    
    // Check if duplicate sponsorship exists
    const existing = await Sponsorship.findOne({ shopId, pinCode });
    if (existing) {
      return res.status(400).json({ error: 'This shop is already sponsored under this PIN code.' });
    }

    const sponsorship = await Sponsorship.create({
      shopId,
      pinCode,
      priority: Number(priority) || 1,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== false
    });

    // Populate shop info
    const populated = await sponsorship.populate('shopId', 'name email phone pinCode owner isActive');

    res.status(201).json({ success: true, sponsorship: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/admin/sponsorships/:id
export const updateSponsorship = async (req, res) => {
  try {
    const { priority, startDate, endDate, isActive } = req.body;
    
    const updateData = {};
    if (priority !== undefined) updateData.priority = Number(priority);
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const sponsorship = await Sponsorship.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('shopId', 'name email phone pinCode owner isActive');

    if (!sponsorship) {
      return res.status(404).json({ error: 'Sponsorship not found' });
    }

    res.json({ success: true, sponsorship });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/admin/sponsorships/:id
export const deleteSponsorship = async (req, res) => {
  try {
    const sponsorship = await Sponsorship.findByIdAndDelete(req.params.id);
    if (!sponsorship) {
      return res.status(404).json({ error: 'Sponsorship not found' });
    }
    res.json({ success: true, message: 'Sponsorship deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/shops/by-pincode/:pinCode
export const getShopsByPinCode = async (req, res) => {
  try {
    const { pinCode } = req.params;
    const shops = await Shop.find({ pinCode }).select('-razorpayKeySecret');
    res.json({ success: true, shops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/users/:shopId/transactions
export const getUserTransactions = async (req, res) => {
  try {
    const { shopId } = req.params;
    const transactions = await Transaction.find({ shopId }).sort({ createdAt: -1 });
    const sponsorships = await Sponsorship.find({ shopId }).sort({ createdAt: -1 });
    res.json({ success: true, transactions, sponsorships });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/admin/sponsorships/:id/cancel-refund
export const cancelAndRefundSponsorship = async (req, res) => {
  try {
    const { id } = req.params;
    const { deductionAmount } = req.body;

    const sponsorship = await Sponsorship.findById(id);
    if (!sponsorship) return res.status(404).json({ error: 'Sponsorship not found' });

    if (sponsorship.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Sponsorship is already cancelled' });
    }

    if (!sponsorship.paymentId) {
      return res.status(400).json({ error: 'No associated payment found for automatic refund' });
    }

    const refundAmountRupees = 199 - (deductionAmount || 49);
    
    const settings = await SystemSettings.findOne({ key: 'SUPER_ADMIN_KEYS' });
    if (!settings || !settings.razorpayKeyId || !settings.razorpayKeySecret) {
      return res.status(500).json({ error: 'Razorpay keys not configured' });
    }
    
    const rzp = new Razorpay({
      key_id: settings.razorpayKeyId,
      key_secret: settings.razorpayKeySecret
    });

    await rzp.payments.refund(sponsorship.paymentId, {
      amount: refundAmountRupees * 100, // in paise
      notes: {
        reason: 'Vendor requested cancellation before start date',
        sponsorshipId: sponsorship._id.toString()
      }
    });

    sponsorship.status = 'CANCELLED';
    sponsorship.isActive = false;
    await sponsorship.save();

    res.json({ success: true, message: `Sponsorship cancelled and ₹${refundAmountRupees} refunded successfully` });
  } catch (err) {
    console.error('Cancel and refund error:', err);
    res.status(500).json({ error: err.message || 'Refund processing failed' });
  }
};

