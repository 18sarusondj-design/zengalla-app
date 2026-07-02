import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';

// GET /api/delivery/area-insights
// Public endpoint for registration showing high-demand areas
export const getAreaInsights = async (req, res) => {
  try {
    // Get shop counts per pincode/area
    const shopsByArea = await Shop.aggregate([
      { $match: { isActive: true } },
      { 
        $group: {
          _id: { pinCode: "$pinCode", areaName: "$areaName" },
          shopCount: { $sum: 1 }
        }
      }
    ]);

    // Get delivery partner counts per pincode/area
    const deliveryPartnersByArea = await User.aggregate([
      { $match: { role: 'delivery', servicePincode: { $ne: '' } } },
      { 
        $group: {
          _id: { pinCode: "$servicePincode", areaName: "$serviceArea" },
          partnerCount: { $sum: 1 }
        }
      }
    ]);

    // Format and merge data
    const insights = shopsByArea.map(shopGroup => {
      const pinCode = shopGroup._id.pinCode || 'Unknown';
      const areaName = shopGroup._id.areaName || 'Unknown Area';
      const shopCount = shopGroup.shopCount;
      
      const partnerData = deliveryPartnersByArea.find(p => 
        p._id.pinCode === pinCode && p._id.areaName === areaName
      );
      const partnerCount = partnerData ? partnerData.partnerCount : 0;
      
      // Calculate High Demand tag
      // For example, if there are more than 3 shops per delivery partner, it's high demand.
      // Or if there are no partners but shops exist.
      const isHighDemand = (partnerCount === 0 && shopCount >= 2) || (shopCount / (partnerCount || 1) >= 3);

      return {
        pinCode,
        areaName,
        shopCount,
        isHighDemand
      };
    }).sort((a, b) => b.shopCount - a.shopCount);

    res.json({ success: true, data: insights });
  } catch (error) {
    console.error('getAreaInsights error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch area insights' });
  }
};

// GET /api/delivery/shop-insights
// Authenticated endpoint returning shops in the selected area and 7-day average orders
export const getShopInsights = async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { servicePincode, serviceArea } = req.user;
    if (!servicePincode) {
      return res.json({ success: true, data: [] });
    }

    // Find shops in this area
    const shops = await Shop.find({ pinCode: servicePincode, isActive: true })
      .select('name address pinCode areaName imageUrl category')
      .lean();

    if (shops.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const shopIds = shops.map(s => s._id);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get order counts for the last 7 days
    const orderCounts = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, shopId: { $in: shopIds } } },
      { $group: { _id: "$shopId", orderCount: { $sum: 1 } } }
    ]);

    // Merge data
    const shopInsights = shops.map(shop => {
      const orderData = orderCounts.find(o => o._id.toString() === shop._id.toString());
      const totalOrdersLast7Days = orderData ? orderData.orderCount : 0;
      const dailyAverage = (totalOrdersLast7Days / 7).toFixed(1);
      
      return {
        ...shop,
        dailyAverageOrders: parseFloat(dailyAverage),
        totalOrdersLast7Days
      };
    }).sort((a, b) => b.dailyAverageOrders - a.dailyAverageOrders);

    res.json({ success: true, data: shopInsights });
  } catch (error) {
    console.error('getShopInsights error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shop insights' });
  }
};

// POST /api/delivery/change-area
export const changeArea = async (req, res) => {
  try {
    if (req.user.role !== 'delivery') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { pinCode, areaName } = req.body;
    if (!pinCode) {
      return res.status(400).json({ success: false, error: 'Pincode is required' });
    }

    const now = new Date();
    const lastChange = req.user.lastAreaChangeAt;

    let canChange = false;
    let restrictionReason = '';

    if (!lastChange) {
      // First time setting it
      canChange = true;
    } else {
      const daysSinceChange = (now - lastChange) / (1000 * 60 * 60 * 24);
      
      if (daysSinceChange >= 15) {
        // Standard cooldown passed
        canChange = true;
      } else if (req.user.freeAreaChangeAvailable) {
        // Has a free pass
        canChange = true;
        req.user.freeAreaChangeAvailable = false; // consume it
      } else if (daysSinceChange <= 1) {
        // Zero-order 24-hour guarantee
        // Check if they had ANY orders assigned in this <24hr window
        const ordersHandled = await Order.countDocuments({
          deliveryPartnerId: req.user._id,
          createdAt: { $gte: lastChange }
        });

        if (ordersHandled === 0) {
          canChange = true;
        } else {
          restrictionReason = 'You have already handled orders in this area. You must wait 15 days to change again, or contact the Superadmin.';
        }
      } else {
        restrictionReason = 'You can only change your area once every 15 days. Please contact the Superadmin for immediate assistance.';
      }
    }

    if (!canChange) {
      return res.status(403).json({ success: false, error: restrictionReason, needsAdmin: true });
    }

    req.user.servicePincode = pinCode;
    req.user.serviceArea = areaName || '';
    req.user.lastAreaChangeAt = now;
    
    await req.user.save();

    res.json({ success: true, message: 'Area updated successfully', user: req.user });
  } catch (error) {
    console.error('changeArea error:', error);
    res.status(500).json({ success: false, error: 'Failed to change area' });
  }
};
