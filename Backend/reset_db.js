import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Shop from './src/models/Shop.js';
import Order from './src/models/Order.js';
import Product from './src/models/Product.js';
import InventoryLog from './src/models/InventoryLog.js';
import Review from './src/models/Review.js';
import Report from './src/models/Report.js';
import PushSubscription from './src/models/PushSubscription.js';

dotenv.config();

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    const adminEmail = 'sarusondj@gmail.com';

    // 1. Clear All History/Transactions
    console.log('Clearing orders, reports, and logs...');
    await Order.deleteMany({});
    await Report.deleteMany({});
    await InventoryLog.deleteMany({});
    await Review.deleteMany({});
    await PushSubscription.deleteMany({});

    // 2. Clear Catalog
    console.log('Clearing shops and products...');
    await Shop.deleteMany({});
    await Product.deleteMany({});

    // 3. Clear Users except Super Admin
    console.log('Clearing users except superadmin...');
    const result = await User.deleteMany({ 
      email: { $ne: adminEmail.toLowerCase() } 
    });
    console.log(`Reset complete. Total users deleted: ${result.deletedCount}`);
    
    // Check if admin still exists
    const admin = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!admin) {
      console.warn('WARNING: Super Admin was not found in the database. You may need to register it again.');
    } else {
      console.log('Super Admin account preserved:', admin.email);
    }

    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

reset();
