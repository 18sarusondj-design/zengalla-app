import User from '../models/User.js';
import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import Sponsorship from '../models/Sponsorship.js';
import { sendCouponEmail } from '../utils/mailer.js';
import { broadcastPushNotification } from '../services/notificationService.js';

// GET /api/shops/lookup?code=...
export const lookupShopByCode = async (req, res) => {
  try {
    const { code } = req.query;
    const shop = await Shop.findOne({ storeCode: code }).lean();
    if (!shop) return res.status(404).json({ error: 'Invalid store code' });

    if (shop.subscriptionPlan === 'basic') {
      return res.status(403).json({ error: 'This shop is in offline-management mode and not visible online.' });
    }

    const staff = await User.find({ shopId: shop._id, role: 'staff' }).lean();
    const delivery = await User.find({ shopId: shop._id, role: 'delivery' }).lean();
    res.json({ success: true, shop, staff, delivery });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops — public, list all active shops

export const getShops = async (req, res) => {
  try {
    const { page = 1, limit = 50, isSponsored, pinCode } = req.query;
    const filter = { 
      isActive: true,
      subscriptionPlan: 'premium' 
    };
    if (isSponsored === 'true') filter.isSponsored = true;

    // Load active sponsorships if pinCode is provided
    let sponsoredShopIds = [];
    let priorityMap = {};
    if (pinCode) {
      const activeSponsorships = await Sponsorship.find({
        pinCode,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }).sort({ priority: 1 });
      sponsoredShopIds = activeSponsorships.map(s => s.shopId.toString());
      activeSponsorships.forEach(s => {
        priorityMap[s.shopId.toString()] = s.priority;
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch all matching shops to sort properly across pages
    const allShops = await Shop.find(filter).select('-razorpayKeySecret').lean();

    // Enrich with sponsorship details
    let enrichedShops = allShops.map(shop => {
      if (pinCode) {
        const isPinSponsored = sponsoredShopIds.includes(shop._id.toString());
        shop.isSponsored = isPinSponsored;
        shop.sponsorshipPriority = isPinSponsored ? priorityMap[shop._id.toString()] : Infinity;
      } else {
        shop.sponsorshipPriority = shop.isSponsored ? 1 : Infinity;
      }
      return shop;
    });

    // Sort to prioritize: 1. Sponsored, 2. CreatedAt
    enrichedShops.sort((a, b) => {
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      if (a.isSponsored && b.isSponsored) {
        return (a.sponsorshipPriority || 9999) - (b.sponsorshipPriority || 9999);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const total = enrichedShops.length;
    const paginatedShops = enrichedShops.slice(skip, skip + parseInt(limit));

    res.json({ 
      success: true, 
      shops: paginatedShops,
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


// GET /api/shops/nearby?lat=&lng=&radius=&search=
export const getNearbyShops = async (req, res) => {
  try {
    const { lat, lng, radius = 10, page = 1, limit = 50, search = '', pinCode } = req.query;
    
    let filter = { 
      isActive: true,
      subscriptionPlan: 'premium'
    };

    let shopIdToProducts = {};

    // 1. If searching, find shops by name, category OR products they sell
    if (search) {
      const Product = (await import('../models/Product.js')).default;
      
      // Find products matching query
      const products = await Product.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }).select('shopId name').lean();
      
      products.forEach(p => {
        if (!shopIdToProducts[p.shopId]) shopIdToProducts[p.shopId] = [];
        if (!shopIdToProducts[p.shopId].includes(p.name)) {
          shopIdToProducts[p.shopId].push(p.name);
        }
      });

      const shopIdsFromProducts = Object.keys(shopIdToProducts);

      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { _id: { $in: shopIdsFromProducts } }
      ];
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const searchRadius = parseFloat(radius);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Load active sponsorships if pinCode is provided
    let sponsoredShopIds = [];
    let priorityMap = {};
    if (pinCode) {
      const activeSponsorships = await Sponsorship.find({
        pinCode,
        isActive: true,
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      }).sort({ priority: 1 });
      sponsoredShopIds = activeSponsorships.map(s => s.shopId.toString());
      activeSponsorships.forEach(s => {
        priorityMap[s.shopId.toString()] = s.priority;
      });
    }

    // 2. Perform the search
    let shops = [];
    const hasCoords = !isNaN(latitude) && !isNaN(longitude);

    try {
      if (hasCoords) {
        // Use aggregation for distance
        const pipeline = [
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [longitude, latitude] },
              distanceField: 'rawDistance',
              maxDistance: (isNaN(searchRadius) ? 10 : searchRadius) * 1000,
              query: filter,
              spherical: true
            }
          },
          {
            $set: {
              distance: { $round: [{ $divide: ['$rawDistance', 1000] }, 1] }
            }
          },
          {
            $project: {
              razorpayKeySecret: 0
            }
          },
          { $skip: skip },
          { $limit: parseInt(limit) }
        ];
        shops = await Shop.aggregate(pipeline);
      } else {
        // Fallback or no coords: standard find
        shops = await Shop.find(filter)
          .select('-razorpayKeySecret')
          .sort({ isSponsored: -1, rating: -1 })
          .limit(parseInt(limit) * 2)
          .lean();
      }
    } catch (geoErr) {
      console.warn('Spatial query failed, falling back to basic listing:', geoErr.message);
      shops = await Shop.find(filter)
        .select('-razorpayKeySecret')
        .sort({ isSponsored: -1, rating: -1 })
        .limit(parseInt(limit) * 2)
        .lean();
    }

    // 3. Attach matched products and final sorting
    shops = shops.map(shop => {
      const shopIdStr = shop._id.toString();
      let isSponsored = shop.isSponsored;
      let sponsorshipPriority = isSponsored ? 1 : Infinity;

      if (pinCode) {
        isSponsored = sponsoredShopIds.includes(shopIdStr);
        sponsorshipPriority = isSponsored ? priorityMap[shopIdStr] : Infinity;
      }

      return {
        ...shop,
        isSponsored,
        sponsorshipPriority,
        matchedProducts: shopIdToProducts[shop._id] || []
      };
    });

    // Re-sort to prioritize: 1. Sponsored, 2. Rating, 3. Distance
    shops.sort((a, b) => {
      // 1. Sponsored first
      if (a.isSponsored && !b.isSponsored) return -1;
      if (!a.isSponsored && b.isSponsored) return 1;
      
      // If both sponsored, sort by priority
      if (a.isSponsored && b.isSponsored) {
        const priorityA = a.sponsorshipPriority || 9999;
        const priorityB = b.sponsorshipPriority || 9999;
        if (priorityA !== priorityB) return priorityA - priorityB;
      }
      
      // 2. Best rating next
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      
      // 3. Distance (if available)
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    res.json({ 
      success: true, 
      shops: hasCoords ? shops : shops.slice(skip, skip + parseInt(limit)) 
    });
  } catch (err) {
    console.error('getNearbyShops Critical Error:', err);
    res.status(500).json({ 
      success: false,
      error: 'Search failed.', 
      details: err.message 
    });
  }
};


// GET /api/shops/my — vendor's own shop
export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    
    // Prevent browser caching so vendor always sees the latest updates after reload
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!shop) return res.json({ success: true, shop: null });

    // Add a flag so frontend knows if secret is already set
    shop.hasRazorpaySecret = !!shop.razorpayKeySecret;
    
    // Securely remove the secret before sending it to the frontend
    delete shop.razorpayKeySecret;

    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/shops/:id — public single shop
export const getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select('-razorpayKeySecret').lean();
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

    // 🔒 Location Security Check: If pinCode or Location is changing, verify they match
    const newPinCode = req.body.pinCode || req.body.pincode;
    const newLocation = req.body.location;

    const isPinChanged = newPinCode && newPinCode !== shop.pinCode;
    const isLocationChanged = newLocation && JSON.stringify(newLocation.coordinates) !== JSON.stringify(shop.location?.coordinates);

    // Only perform security check if a PIN or location actually changed
    if (isPinChanged || isLocationChanged) {
      const lat = newLocation?.coordinates?.[1] || shop.location?.coordinates?.[1];
      const lng = newLocation?.coordinates?.[0] || shop.location?.coordinates?.[0];
      const pinToVerify = newPinCode || shop.pinCode;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
          headers: { 'User-Agent': 'GrozyRetailApp/1.0' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            const postalCode = geoData.address.postcode;
            const officialPinCode = postalCode ? postalCode.split(' ')[0].replace(/\D/g, '').substring(0, 6) : null;
            
            // Log warning but don't block if it's a vendor updating their own shop
            if (officialPinCode && officialPinCode !== pinToVerify && pinToVerify.substring(0,3) !== officialPinCode.substring(0,3)) {
              console.warn(`Location Security Warning: Detected PIN ${officialPinCode} does not match provided PIN ${pinToVerify} for shop ${shop._id}`);
              // We no longer return 400 here to allow the vendor to save their business details
            }
          }
        }
      } catch (geoErr) {
        console.warn("OSM verification skipped due to error:", geoErr.message);
      }
    }

    // Sanitize update: don't overwrite secret with empty string if user didn't change it
    const updateData = { ...req.body };
    if (!updateData.razorpayKeySecret) {
      delete updateData.razorpayKeySecret;
    }

    // Force uppercase for identification fields
    if (updateData.gstin) updateData.gstin = updateData.gstin.toUpperCase();
    if (updateData.fssai) updateData.fssai = updateData.fssai.toUpperCase();
    
    // Explicitly handle coupons to ensure they are NOT lost and are sanitized
    let newCouponsDetected = [];

    if (req.body.coupons && Array.isArray(req.body.coupons)) {
      // Detect newly added coupons (they won't have an _id yet from the frontend)
      newCouponsDetected = req.body.coupons.filter(c => !c._id && c.isActive !== false);

      updateData.coupons = req.body.coupons.map(c => ({
        ...c,
        expiryDate: c.expiryDate === '' ? undefined : c.expiryDate,
        bannerId: (c.bannerId === '' || c.bannerId === undefined) ? null : c.bannerId
      }));
    }

    const updated = await Shop.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updateData },
      { new: true }
    ).select('-razorpayKeySecret');

    if (!updated) return res.status(404).json({ error: 'Shop not found or unauthorized during update' });
    
    // Trigger push notification if there are new coupons
    if (newCouponsDetected.length > 0) {
      const latestCoupon = newCouponsDetected[newCouponsDetected.length - 1];
      const discountText = latestCoupon.discountType === 'percentage' ? `${latestCoupon.discountValue}%` : `₹${latestCoupon.discountValue}`;
      
      broadcastPushNotification({
        title: `New Offer from ${updated.name || 'a nearby store'}! 🎉`,
        body: `Use code ${latestCoupon.code} to get ${discountText} off your next order. Shop now!`,
        url: `/shop/${updated._id}`,
        icon: updated.imageUrl || '/icon-192x192.png'
      }).catch(err => console.error("Broadcast failed:", err));
    }

    res.json({ success: true, shop: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/shops/:id/toggle — toggle isActive
export const toggleShopStatus = async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found or unauthorized' });

    const updated = await Shop.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: { isActive: !shop.isActive } },
      { new: true }
    ).select('-razorpayKeySecret');

    res.json({ success: true, isActive: updated.isActive, shop: updated });
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
      .limit(parseInt(limit))
      .lean();
      
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
      .limit(parseInt(limit))
      .lean();

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
    if (req.body.name !== undefined) userToUpdate.name = req.body.name;
    if (req.body.phone !== undefined) userToUpdate.phone = req.body.phone;
    if (req.body.photoUrl !== undefined) userToUpdate.photoUrl = req.body.photoUrl;
    if (req.body.documentUrl !== undefined) userToUpdate.documentUrl = req.body.documentUrl;
    if (req.body.accountName !== undefined) userToUpdate.accountName = req.body.accountName;
    if (req.body.accountNumber !== undefined) userToUpdate.accountNumber = req.body.accountNumber;
    if (req.body.ifscCode !== undefined) userToUpdate.ifscCode = req.body.ifscCode;
    if (req.body.bankName !== undefined) userToUpdate.bankName = req.body.bankName;
    
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
    }).select('name phone imageUrl address gstin isWholesale storeCode bankDetails').lean();

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
    const shop = await Shop.findOne({ phone }).populate('owner', 'name email').lean();
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
