import Product from '../models/Product.js';
import Shop from '../models/Shop.js';
import InventoryLog from '../models/InventoryLog.js';
import MasterProduct from '../models/MasterProduct.js';

// GET /api/products?shopId=
export const getProducts = async (req, res) => {
  try {
    const { shopId, category, page = 1, limit = 50 } = req.query;
    if (!shopId) return res.status(400).json({ error: 'shopId is required' });
    
    const filter = { shopId };
    if (category) filter.category = category;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(filter)
    ]);
    
    res.json({ 
      success: true, 
      products,
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


// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found. Please create your shop profile first.' });
    
    // Calculate total stock from batches if provided
    let totalStock = req.body.stock || req.body.stockQuantity || 0;
    if (req.body.batches && Array.isArray(req.body.batches) && req.body.batches.length > 0) {
      totalStock = req.body.batches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
    }

    const productData = {
      ...req.body,
      shopId: shop._id,
      stock: totalStock,
      batches: req.body.batches || []
    };

    const product = await Product.create(productData);
    
    // Log Activity
    await InventoryLog.create({
      shopId: shop._id,
      productId: product._id,
      action: 'STOCK_IN',
      quantity: product.stock || 0,
      newStock: product.stock || 0,
      reason: 'Product Created',
      performedBy: req.user._id
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!req.user.shopId || product.shopId.toString() !== req.user.shopId.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only update products for your shop.' });
    }
    const shop = await Shop.findById(req.user.shopId);
    
    const prevStock = product.stock || 0;
    const prevBatchesCount = product.batches?.length || 0;

    // Calculate total stock from batches if provided
    let totalStock = req.body.stock ?? req.body.stockQuantity ?? product.stock;
    if (req.body.batches && Array.isArray(req.body.batches) && req.body.batches.length > 0) {
      totalStock = req.body.batches.reduce((sum, b) => sum + (Number(b.stock) || 0), 0);
    }

    const updateData = {
      ...req.body,
      stock: totalStock,
      batches: req.body.batches || product.batches
    };

    const updated = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // Log if stock changed or batches added
    if (updated.stock !== prevStock || updated.batches?.length !== prevBatchesCount) {
      await InventoryLog.create({
        shopId: shop._id,
        productId: updated._id,
        action: updated.batches?.length > prevBatchesCount ? 'BATCH_ADDED' : 'ADJUSTMENT',
        quantity: updated.stock - prevStock,
        previousStock: prevStock,
        newStock: updated.stock,
        reason: updated.batches?.length > prevBatchesCount ? 'New Batch Integrated' : 'Manual Update',
        performedBy: req.user._id
      });
    }

    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!req.user.shopId || product.shopId.toString() !== req.user.shopId.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only delete products from your shop.' });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/products/bulk-stock — update stock for multiple products
export const bulkUpdateStock = async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, stock }]
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array' });
    if (!req.user.shopId) return res.status(403).json({ error: 'No shop associated with user' });

    const ops = updates.map(async ({ id, stock }) => {
      const p = await Product.findById(id);
      if (p && p.shopId.toString() === req.user.shopId.toString()) {
        return Product.findByIdAndUpdate(id, { stock: parseFloat(stock) || 0 }, { new: true });
      }
      return null;
    });
    await Promise.all(ops);
    res.json({ success: true, message: 'Stock updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH /api/products/:id/decrement-stock
export const decrementStock = async (req, res) => {
  try {
    const { amount = 1 } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    // RBAC: Only allow if it's the vendor's own shop, or block it entirely if it's meant for internal use.
    // Assuming staff/vendor can manually decrement:
    if (!req.user || !req.user.shopId || req.user.shopId.toString() !== product.shopId.toString()) {
      return res.status(403).json({ error: 'Access denied: You can only decrement stock for your own shop.' });
    }
    
    // Prevent negative stock
    const newStock = Math.max(0, (product.stock || 0) - amount);
    product.stock = newStock;
    await product.save();
    
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/products/:id/logs
export const getProductLogs = async (req, res) => {
  try {
    const logs = await InventoryLog.find({ productId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/products/bulk
export const bulkImportProducts = async (req, res) => {
  try {
    const { products, autoFill } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is empty or invalid.' });
    }

    const shop = await Shop.findById(req.user.shopId);
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });

    // Validate premium feature usage
    if (autoFill && !shop.masterCatalogEnabled) {
      return res.status(403).json({ error: 'Master Catalog Auto-Fill is not enabled for this shop.' });
    }

    // Process products
    const processedProducts = [];
    for (const item of products) {
      let finalProduct = {
        ...item,
        shopId: shop._id,
        stock: Number(item.stock) || 0,
        price: Number(item.price) || 0,
        mrp: Number(item.mrp) || 0,
        wholesalePrice: Number(item.wholesalePrice) || 0,
        businessPrice: Number(item.businessPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
        name: item.name || 'Unnamed Product',
        category: item.category || 'General',
        sellingType: item.sellingType || 'piece',
        unit: item.unit || 'Unit'
      };

      if (autoFill && item.barcode) {
        // Query Master Catalog for this barcode
        const masterItem = await MasterProduct.findOne({ barcode: item.barcode }).lean();
        if (masterItem) {
          // Merge missing fields intelligently
          finalProduct.name = finalProduct.name !== 'Unnamed Product' ? finalProduct.name : masterItem.name;
          finalProduct.category = finalProduct.category !== 'General' ? finalProduct.category : masterItem.category;
          if (!finalProduct.description && masterItem.description) {
            finalProduct.description = masterItem.description;
          }
          if (masterItem.imageUrl) {
            if (!finalProduct.images || finalProduct.images.length === 0) {
              finalProduct.images = [masterItem.imageUrl];
            }
          }
          if (!finalProduct.unit && masterItem.unit) finalProduct.unit = masterItem.unit;
          if (!finalProduct.sellingType && masterItem.sellingType) finalProduct.sellingType = masterItem.sellingType;
        }
      }

      processedProducts.push(finalProduct);
    }

    // Insert to DB
    const insertedProducts = await Product.insertMany(processedProducts);

    // Create logs for all inserted items that have stock
    const logEntries = insertedProducts
      .filter(p => p.stock > 0)
      .map(p => ({
        shopId: shop._id,
        productId: p._id,
        action: 'STOCK_IN',
        quantity: p.stock,
        newStock: p.stock,
        reason: 'Bulk Import',
        performedBy: req.user._id
      }));

    if (logEntries.length > 0) {
      await InventoryLog.insertMany(logEntries);
    }

    res.status(201).json({ success: true, count: insertedProducts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
