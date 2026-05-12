import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// Configure Cloudinary globally
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Memory storage
export const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

export const uploadReceiptMiddleware = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// POST /api/upload/image
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
        console.error('[UPLOAD] No file in request');
        return res.status(400).json({ success: false, error: 'No file provided' });
    }
    
    console.log(`[UPLOAD] Processing: ${req.file.originalname} (${req.file.mimetype})`);

    // Standard Cloudinary Upload using Stream (Most robust for binary)
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'zengalla',
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    console.log(`[UPLOAD] Cloudinary Success: ${result.secure_url}`);
    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    console.error(`[UPLOAD] Cloudinary Error:`, err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Upload Failed', 
      message: err.message 
    });
  }
};

// POST /api/upload/receipt
export const uploadReceipt = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file provided' });
    
    const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'zengalla/receipts',
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
