import User from '../models/User.js';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import { sendCouponEmail } from '../utils/mailer.js';

// GET /api/shops/lookup?code=...
export const lookupShopByCode = async (req, res) => {
  try {
    const { code } = req.query;
    const shop = await Shop.findOne({ storeCode: code });
    if (!shop) return res.status(404).json({ error: 'Invalid store code' });

    if (shop.subscriptionPlan === 'basic') {
      return res.status(403).json({ error: 'This shop is in offline-management mode and not visible online.' });
    }

    const staff = await User.find({ shopId: shop._id, role: 'staff' });
    const delivery = await User.find({ shopId: shop._id, role: 'delivery' });
    res.json({ success: true, shop, staff, delivery });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops — public, list all active shops

export const getShops = async (req, res) => {
  try {
    const { page = 1, limit = 50, isSponsored } = req.query;
    const filter = { 
      isActive: true,
      subscriptionPlan: 'premium' 
    };
    if (isSponsored === 'true') filter.isSponsored = true;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [shops, total] = await Promise.all([
      Shop.find(filter)
        .select('-razorpayKeySecret')
        .sort({ isSponsored: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Shop.countDocuments(filter)
    ]);

    res.json({ 
      success: true, 
      shops,
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


// GET /api/shops/nearby?lat=&lng=&radius=
export const getNearbyShops = async (req, res) => {
  try {
    const { lat, lng, radius = 10, page = 1, limit = 50 } = req.query;
    
    const filter = { 
      isActive: true,
      subscriptionPlan: 'premium'
    };

    if (!lat || !lng) {
      const shops = await Shop.find(filter).select('-razorpayKeySecret').limit(parseInt(limit));
      return res.json({ success: true, shops });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const shops = await Shop.find({
      ...filter,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: (isNaN(searchRadius) ? 10 : searchRadius) * 1000 // Convert km to meters
        }
      }
    })
    .select('-razorpayKeySecret')
    .skip(skip)
    .limit(parseInt(limit));

    res.json({ success: true, shops });
  } catch (err) {
    console.error('getNearbyShops Error:', err);
    res.status(500).json({ error: 'Geospatial search failed. Ensure shops have valid location data.', details: err.message });
  }
};


// GET /api/shops/my — vendor's own shop
export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).select('-razorpayKeySecret').lean();
    if (!shop) return res.json({ success: true, shop: null });

    // Add a flag so frontend knows if secret is already set
    shop.hasRazorpaySecret = !!shop.razorpayKeySecret;

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops/:id — public single shop
export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select('-razorpayKeySecret');
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    // If shop is offline-only (basic), only owner/staff can view it
    if (shop.subscriptionPlan === 'basic') {
      // Check if user is authenticated and authorized
      // This requires the 'authenticate' middleware on the route if we want to be strict
      // For now, if it's basic, we'll just block it from public view to be safe
      return res.status(403).json({ error: 'This shop is currently in offline-management mode and not visible online.' });
    }

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/shops — vendor creates shop
export const createShop = async (req, res) => {
  try {
    const existing = await Shop.findOne({ owner: req.user._id });
    if (existing) return res.status(409).json({ error: 'You already have a shop. Use PUT to update.' });
    const shop = await Shop.create({ ...req.body, owner: req.user._id });
    await User.findByIdAndUpdate(req.user._id, { shopId: shop._id });
    res.status(201).json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/shops/:id — vendor updates shop
export const updateShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found or unauthorized' });

    // Sanitize update: don't overwrite secret with empty string if user didn't change it
    const updateData = { ...req.body };
    if (!updateData.razorpayKeySecret) {
      delete updateData.razorpayKeySecret;
    }
    
    // Explicitly handle coupons to ensure they are NOT lost and are sanitized
    if (req.body.coupons && Array.isArray(req.body.coupons)) {
      updateData.coupons = req.body.coupons.map(c => ({
        ...c,
        expiryDate: c.expiryDate === '' ? undefined : c.expiryDate
      }));
    }

    const updated = await Shop.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updateData },
      { new: true }
    ).select('-razorpayKeySecret');

    if (!updated) return res.status(404).json({ error: 'Shop not found or unauthorized during update' });
    
    res.json({ success: true, shop: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/shops/:id/toggle — toggle isActive
export const toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    shop.isActive = !shop.isActive;
    await shop.save();
    
    // Don't leak secret even in toggle
    const sanitizedShop = shop.toObject();
    delete sanitizedShop.razorpayKeySecret;
    
    res.json({ success: true, isActive: shop.isActive, shop: sanitizedShop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/shops/:id/send-coupon
export const sendCouponToCustomers = async (req, res) => {
  try {
    const { coupon } = req.body;
    const shopId = req.params.id;

    if (!coupon) return res.status(400).json({ error: 'Coupon data is required' });

    const shop = await Shop.findOne({ _id: shopId, owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found or unauthorized' });

    // 1. Get all unique emails from orders of this shop
    const orders = await Order.find({ shopId, email: { $exists: true, $ne: '' } }).select('email');
    const emails = [...new Set(orders.map(o => o.email))];

    if (emails.length === 0) {
      return res.status(404).json({ error: 'No customer emails found for this shop.' });
    }

    // 2. Send emails (using Promise.allSettled to not fail all if one fails)
    const results = await Promise.allSettled(
      emails.map(email => sendCouponEmail(email, shop.name, coupon))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    res.json({ 
      success: true, 
      message: `Coupon sent to ${successful} customers.`,
      count: successful
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops/my/staff
export const getShopStaff = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const staff = await User.find({ shopId: shop._id, role: 'staff' })
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit));
      
    res.json({ success: true, users: staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// GET /api/shops/my/delivery
export const getShopDelivery = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const delivery = await User.find({ shopId: shop._id, role: 'delivery' })
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, users: delivery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// PATCH /api/shops/my/users/:id/status
export const updateShopUserStatus = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });
    
    const userToUpdate = await User.findOne({ _id: req.params.id, shopId: shop._id });
    if (!userToUpdate) return res.status(404).json({ error: 'User not found in your shop' });

    userToUpdate.status = req.body.status || userToUpdate.status;
    if (req.body.name) userToUpdate.name = req.body.name;
    if (req.body.phone) userToUpdate.phone = req.body.phone;
    if (req.body.photoUrl) userToUpdate.photoUrl = req.body.photoUrl;
    if (req.body.documentUrl) userToUpdate.documentUrl = req.body.documentUrl;
    
    await userToUpdate.save();

    res.json({ success: true, user: userToUpdate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/shops/my/b2b-partners
export const addB2BPartner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const { phone, gstin } = req.body;
    if (shop.b2bPartners.some(p => p.phone === phone)) {
      return res.status(400).json({ error: 'Partner with this phone already exists' });
    }
    if (gstin && shop.b2bPartners.some(p => p.gstin === gstin)) {
      return res.status(400).json({ error: 'Partner with this GSTIN already exists' });
    }

    shop.b2bPartners.push({ ...req.body, addedAt: new Date() });
    await shop.save();
    res.json({ success: true, partners: shop.b2bPartners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/shops/my/b2b-partners/:phone
export const updateB2BPartner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const partnerIdx = shop.b2bPartners.findIndex(p => p.phone === req.params.phone);
    if (partnerIdx === -1) return res.status(404).json({ error: 'Partner not found' });

    shop.b2bPartners[partnerIdx] = { ...shop.b2bPartners[partnerIdx].toObject(), ...req.body };
    await shop.save();
    res.json({ success: true, partners: shop.b2bPartners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/shops/my/b2b-partners/:phone
export const deleteB2BPartner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    shop.b2bPartners = shop.b2bPartners.filter(p => p.phone !== req.params.phone);
    await shop.save();
    res.json({ success: true, partners: shop.b2bPartners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// DELETE /api/shops/my/users/:id
export const deleteShopUser = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found' });

    const deleted = await User.findOneAndDelete({ _id: req.params.id, shopId: shop._id });
    if (!deleted) return res.status(404).json({ error: 'User not found in your shop' });

    res.json({ success: true, message: 'User removed from shop' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops/my/suppliers
export const getB2BSuppliers = async (req, res) => {
  try {
    const myShop = await Shop.findOne({ owner: req.user._id });
    if (!myShop) return res.status(404).json({ error: 'Your shop not found' });

    const phone = myShop.phone;
    if (!phone) return res.json({ success: true, shops: [] });

    // Find shops that have added this phone as a B2B partner
    const suppliers = await Shop.find({
      'b2bPartners.phone': phone
    }).select('name phone imageUrl address gstin isWholesale storeCode bankDetails');

    res.json({ success: true, shops: suppliers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops/lookup/b2b?phone=
export const lookupShop = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    // Find a shop where the owner's phone or shop phone matches
    const shop = await Shop.findOne({ phone }).populate('owner', 'name email');
    if (!shop) return res.status(404).json({ error: 'No registered shop found with this phone' });

    res.json({
      success: true,
      shop: {
        businessName: shop.name,
        ownerName: shop.owner?.name || '',
        gstin: shop.gstin || '',
        email: shop.owner?.email || '',
        phone: shop.phone,
        billingAddress: shop.address || '',
        city: shop.city || '',
        pincode: shop.pinCode || ''
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
