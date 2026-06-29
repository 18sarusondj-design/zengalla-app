import express from 'express';
import MasterProduct from '../models/MasterProduct.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import axios from 'axios';

const router = express.Router();
const adminAuth = requireRole('admin');

// GET /search?barcode=...
// Fetches from local Master Catalog first. If not found, calls Open Food Facts API.
router.get('/search', authenticate, async (req, res) => {
  try {
    const { barcode } = req.query;
    if (!barcode) return res.status(400).json({ error: 'Barcode is required' });

    // 1. Local Check
    const localProduct = await MasterProduct.findOne({ barcode });
    if (localProduct) {
      return res.json({ success: true, source: 'local', data: localProduct });
    }

    // 2. API Check
    const offUrl = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
    const offResponse = await axios.get(offUrl, { timeout: 5000 }).catch(() => null);

    if (offResponse && offResponse.data && offResponse.data.status === 1) {
      const p = offResponse.data.product;
      const name = p.product_name || p.generic_name || '';
      const imageUrl = p.image_url || p.image_front_url || '';
      let description = [];
      if (p.ingredients_text) description.push(`Ingredients: ${p.ingredients_text}`);
      if (p.quantity) description.push(`Quantity: ${p.quantity}`);
      if (p.brands) description.push(`Brand: ${p.brands}`);
      
      const category = (p.categories_hierarchy && p.categories_hierarchy.length > 0) 
        ? p.categories_hierarchy[p.categories_hierarchy.length - 1].replace(/^[a-z]+:/, '').replace(/-/g, ' ') 
        : 'General';

      const apiData = {
        barcode,
        name,
        imageUrl,
        description: description.join(' | '),
        category
      };

      return res.json({ success: true, source: 'api', data: apiData });
    }

    return res.status(404).json({ success: false, error: 'Product not found globally' });
  } catch (error) {
    console.error('Error fetching master product:', error);
    res.status(500).json({ error: 'Failed to search product' });
  }
});

// GET / 
// Fetch all master products (for admin)
router.get('/', authenticate, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50, missingImage } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    if (missingImage === 'true') {
      query.$or = query.$or || [];
      query.$and = [
        { $or: [{ imageUrl: { $exists: false } }, { imageUrl: '' }, { imageUrl: null }] }
      ];
      // If there's a search, preserve it with the missingImage check
      if (search) {
        const searchOr = query.$or;
        delete query.$or;
        query.$and.push({ $or: searchOr });
      } else {
        delete query.$or; // clean up empty $or if search was empty
      }
    }
    const products = await MasterProduct.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    const total = await MasterProduct.countDocuments(query);
    res.json({ success: true, products, total });
  } catch (error) {
    console.error('Error fetching master products:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

// POST / 
// Add a single master product (vendor or admin)
router.post('/', authenticate, async (req, res) => {
  try {
    const { barcode } = req.body;
    const existing = await MasterProduct.findOne({ barcode });
    if (existing) {
      return res.status(400).json({ error: 'Master product with this barcode already exists' });
    }
    const mp = new MasterProduct(req.body);
    await mp.save();
    res.json({ success: true, product: mp });
  } catch (error) {
    console.error('Error creating master product:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT /:id
// Edit master product (admin)
router.put('/:id', authenticate, adminAuth, async (req, res) => {
  try {
    const mp = await MasterProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!mp) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, product: mp });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /:id
// Delete master product (admin)
router.delete('/:id', authenticate, adminAuth, async (req, res) => {
  try {
    await MasterProduct.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// POST /bulk-import
// Bulk import from Excel (admin)
router.post('/bulk-import', authenticate, adminAuth, async (req, res) => {
  try {
    const { products } = req.body; // array of objects
    if (!Array.isArray(products)) return res.status(400).json({ error: 'Invalid payload' });

    let added = 0;
    let skipped = 0;

    for (const p of products) {
      if (!p.barcode || !p.name) {
        skipped++;
        continue;
      }

      const existing = await MasterProduct.findOne({ barcode: String(p.barcode) });
      if (existing) {
        skipped++;
        continue;
      }

      let finalProduct = { ...p, barcode: String(p.barcode) };

      // Optional: Auto fetch image in background from OFF
      if (!finalProduct.imageUrl) {
        const offUrl = `https://world.openfoodfacts.org/api/v0/product/${p.barcode}.json`;
        try {
          const offRes = await axios.get(offUrl, { timeout: 3000 });
          if (offRes && offRes.data && offRes.data.status === 1) {
            finalProduct.imageUrl = offRes.data.product.image_url || offRes.data.product.image_front_url || '';
          }
        } catch (e) {
          // ignore api failure on bulk import
        }
      }

      await MasterProduct.create(finalProduct);
      added++;
    }

    res.json({ success: true, added, skipped });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

export default router;
