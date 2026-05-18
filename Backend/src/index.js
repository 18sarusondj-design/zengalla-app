import 'dotenv/config'; // Loads environment variables
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import shopRoutes from './routes/shops.js';
import orderRoutes from './routes/orders.js';
import reviewRoutes from './routes/reviews.js';
import uploadRoutes from './routes/upload.js';
import monetizationRoutes from './routes/monetization.js';
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import paymentRoutes from './routes/payments.js';
import notificationRoutes from './routes/notifications.js';
import systemRoutes from './routes/system.js';
import bannerRoutes from './routes/banners.js';

const app = express();

// Middleware
app.use(cors());
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth Rate Limiting (Stricter - prevents brute force)
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Lock after 5 failed/rapid attempts
  message: { error: 'Too many login attempts, please wait 5 minutes.' }
});

// OTP Rate Limiting (Prevents OTP spam)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Max 3 OTP requests per 15 mins
  message: { error: 'Too many OTP requests, please wait 15 minutes.' }
});

app.use('/api', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/monetization', monetizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/banners', bannerRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    success: false
  });
});


// Database Connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shop';

// Mask URI for safe logging (hides password)
const maskedUri = MONGODB_URI.replace(/:([^@]+)@/, ':****@');
console.log(`📡 Attempting to connect to MongoDB: ${maskedUri}`);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on http://0.0.0.0:${PORT}`));
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    if (err.message.includes('authentication failed')) {
      console.error('👉 Tip: Check your MONGO_URI credentials and authSource.');
    }
    process.exit(1);
  });

// Handle Unhandled Rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle Uncaught Exceptions
process.on('uncaughtException', (err) => {
  console.error('🚫 Uncaught Exception:', err);
  // Optional: Graceful shutdown logic here if needed
});

