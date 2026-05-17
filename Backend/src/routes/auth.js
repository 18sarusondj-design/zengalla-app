import express from 'express';
import { register, login, getMe, updateMe, updatePassword, lookup, verifyOTP, forgotPassword, resetPassword, verifyPassword, changePassword, refresh, logout } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);


router.get('/me', authenticate, getMe);

router.put('/me', authenticate, updateMe);
router.put('/password', authenticate, updatePassword);
router.get('/lookup', authenticate, lookup);
router.put('/change-password', authenticate, changePassword);
router.post('/verify-password', authenticate, verifyPassword);

export default router;
