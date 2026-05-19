import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('Testing Cloudinary Connection...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

try {
  // Try to query or do a simple test upload of a small base64 pixel
  const res = await cloudinary.uploader.upload('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', {
    folder: 'test_connection'
  });
  console.log('Success! Uploaded test image URL:', res.secure_url);
  process.exit(0);
} catch (err) {
  console.error('Cloudinary Test Failed:', err);
  process.exit(1);
}
