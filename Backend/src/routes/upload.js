import express from 'express';
import { 
  upload, uploadImage, uploadReceipt, uploadReceiptMiddleware 
} from '../controllers/uploadController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/image', (req, res, next) => {
  console.log('--- UPLOAD REQUEST RECEIVED ---');
  console.log('User:', req.user?.email || 'Anonymous/Registration');
  next();
}, upload.single('image'), uploadImage);

router.post('/receipt', authenticate, uploadReceiptMiddleware.single('receipt'), uploadReceipt);

export default router;

