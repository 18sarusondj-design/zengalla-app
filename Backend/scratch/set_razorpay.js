import mongoose from 'mongoose';
import SystemSettings from '../src/models/SystemSettings.js';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/Grocery_Shop');
  
  await SystemSettings.updateOne(
    { key: 'SUPER_ADMIN_KEYS' },
    {
      $set: {
        razorpayKeyId: 'rzp_test_rYn0qZ1m4J4RkU',
        razorpayKeySecret: '1jT8gq4u3o2HqjM0p3yB9W0P'
      }
    },
    { upsert: true }
  );
  
  console.log('Super Admin Razorpay keys seeded successfully.');
  process.exit(0);
}

run().catch(console.error);
