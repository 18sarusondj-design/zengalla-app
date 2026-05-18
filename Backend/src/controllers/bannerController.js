import Banner from '../models/Banner.js';
import Shop from '../models/Shop.js';
import Product from '../models/Product.js';

// GET /api/banners/shop/:shopId (Public - Active & Unexpired only)
export const getShopActiveBanners = async (req, res) => {
  try {
    const { shopId } = req.params;
    const now = new Date();
    
    const banners = await Banner.find({
      shopId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ createdAt: -1 });

    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/banners/:id (Public - Details with populated in-stock products)
export const getBannerById = async (req, res) => {
  try {
    const banner = await Banner.findById(req.params.id)
      .populate({
        path: 'products',
        match: { isActive: true, stock: { $gt: 0 } } // Auto Rules: Out of stock or inactive are hidden automatically
      });
      
    if (!banner) return res.status(404).json({ error: 'Banner not found' });
    
    // Auto Rule: If banner expired or inactive, notify client or handle
    const now = new Date();
    const isExpired = banner.endDate < now || banner.startDate > now;
    if (!banner.isActive || isExpired) {
      return res.status(400).json({ 
        error: 'This banner is currently inactive or expired.',
        isExpired: true,
        isActive: banner.isActive
      });
    }

    res.json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/banners/my (Vendor only)
export const getVendorBanners = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const banners = await Banner.find({ shopId: shop._id })
      .populate('products')
      .sort({ createdAt: -1 });

    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/banners (Vendor only)
export const createBanner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found. Please create your shop profile first.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const { title, subtitle, image, type, startDate, endDate, isActive, products } = req.body;
    
    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, Start Date and End Date are required.' });
    }

    const banner = await Banner.create({
      shopId: shop._id,
      title,
      subtitle: subtitle || '',
      image: image || '',
      type: type || 'offer',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : true,
      products: products || []
    });

    res.status(201).json({ success: true, banner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/banners/:id (Vendor only)
export const updateBanner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });

    // Validate Banner Ownership
    if (banner.shopId.toString() !== shop._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Banner does not belong to your shop.' });
    }

    const { title, subtitle, image, type, startDate, endDate, isActive, products } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (subtitle !== undefined) updateFields.subtitle = subtitle;
    if (image !== undefined) updateFields.image = image;
    if (type !== undefined) updateFields.type = type;
    if (startDate !== undefined) updateFields.startDate = new Date(startDate);
    if (endDate !== undefined) updateFields.endDate = new Date(endDate);
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (products !== undefined) updateFields.products = products;

    const updatedBanner = await Banner.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).populate('products');

    res.json({ success: true, banner: updatedBanner });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/banners/:id (Vendor only)
export const deleteBanner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });

    // Validate Banner Ownership
    if (banner.shopId.toString() !== shop._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Banner does not belong to your shop.' });
    }

    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Banner deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/banners/:id/products (Vendor only - Links a product safely)
export const linkProductToBanner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });

    // Validate Banner Ownership
    if (banner.shopId.toString() !== shop._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Banner does not belong to your shop.' });
    }

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ error: 'productId is required.' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    // Validate Product Ownership (Prevent unauthorized product linking)
    if (product.shopId.toString() !== shop._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Product does not belong to your shop.' });
    }

    if (banner.products.includes(productId)) {
      return res.status(400).json({ error: 'Product is already linked to this banner.' });
    }

    banner.products.push(productId);
    await banner.save();

    const populated = await Banner.findById(banner._id).populate('products');

    res.json({ success: true, banner: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/banners/:id/products/:productId (Vendor only - Unlinks a product safely)
export const unlinkProductFromBanner = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });
    if (!shop.bannersEnabled) return res.status(403).json({ error: 'Offer Banners feature is not enabled for your store. Please contact Super Admin for access.' });

    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ error: 'Banner not found.' });

    // Validate Banner Ownership
    if (banner.shopId.toString() !== shop._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Banner does not belong to your shop.' });
    }

    const { productId } = req.params;

    if (!banner.products.includes(productId)) {
      return res.status(400).json({ error: 'Product is not linked to this banner.' });
    }

    banner.products = banner.products.filter(id => id.toString() !== productId);
    await banner.save();

    const populated = await Banner.findById(banner._id).populate('products');

    res.json({ success: true, banner: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
