import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import Report from '../models/Report.js';

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
            isSponsored: s.isSponsored || false
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
          isSponsored: shopData?.isSponsored || false
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
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
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
    
    res.json({ success: true, shop: sanitizedShop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalVendors, totalOrders, totalShops, reports] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'vendor' }),
      Order.countDocuments(),
      Shop.countDocuments(),
      Report.find({ replyMessage: '' })
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
    }

    res.json({ success: true, shop });
  } catch (err) {
    console.error('UPDATE_SHOP_PLAN_ERROR:', err);
    res.status(500).json({ error: err.message });
  }
};
