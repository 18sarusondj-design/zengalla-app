import GlobalBanner from '../models/GlobalBanner.js';

// Public: Get active global banners for customer app
export const getActiveGlobalBanners = async (req, res) => {
  try {
    const banners = await GlobalBanner.find({ isActive: true })
      .sort({ priority: 1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Get all global banners
export const getAllGlobalBanners = async (req, res) => {
  try {
    const banners = await GlobalBanner.find().sort({ priority: 1, createdAt: -1 });
    res.json({ success: true, banners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Create global banner
export const createGlobalBanner = async (req, res) => {
  try {
    const { imageUrl, title, subtitle, linkUrl, isActive, priority } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const banner = new GlobalBanner({
      imageUrl,
      title,
      subtitle,
      linkUrl,
      isActive,
      priority
    });

    await banner.save();
    res.status(201).json({ success: true, banner, message: 'Global Banner created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Update global banner
export const updateGlobalBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const banner = await GlobalBanner.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!banner) {
      return res.status(404).json({ error: 'Global Banner not found' });
    }

    res.json({ success: true, banner, message: 'Global Banner updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: Delete global banner
export const deleteGlobalBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await GlobalBanner.findByIdAndDelete(id);

    if (!banner) {
      return res.status(404).json({ error: 'Global Banner not found' });
    }

    res.json({ success: true, message: 'Global Banner deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
