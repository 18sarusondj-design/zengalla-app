import express from 'express';
import {
  getProducts, getProductById, createProduct,
  updateProduct, deleteProduct, bulkUpdateStock, decrementStock, getProductLogs, bulkImportProducts
} from '../controllers/productController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/:id', getProductById);
router.get('/:id/logs', authenticate, requireRole('vendor', 'staff'), getProductLogs);
router.post('/bulk', authenticate, requireRole('vendor', 'staff'), bulkImportProducts);
router.post('/', authenticate, requireRole('vendor', 'staff'), createProduct);
router.put('/:id', authenticate, requireRole('vendor', 'staff'), updateProduct);
router.delete('/:id', authenticate, requireRole('vendor', 'staff'), deleteProduct);
router.patch('/bulk-stock', authenticate, requireRole('vendor', 'staff'), bulkUpdateStock);
router.patch('/:id/decrement-stock', authenticate, decrementStock);

export default router;
