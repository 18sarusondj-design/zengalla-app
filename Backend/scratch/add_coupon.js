import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from '../src/models/Shop.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery-shop');
    console.log('Connected to MongoDB');

    const shops = await Shop.find({});
    console.log('Shops found:', shops.length);
    shops.forEach(s => console.log(`- ${s.name} (${s._id})`));

    if (shops.length > 0) {
      const shop = shops[0];
      // Add a test coupon if it doesn't exist
      const hasSAVE20 = shop.coupons.some(c => c.code === 'SAVE20');
      if (!hasSAVE20) {
        shop.coupons.push({
          code: 'SAVE20',
          discountValue: 20,
          discountType: 'percentage',
          minOrderAmount: 100,
          isActive: true
        });
        await shop.save();
        console.log(`Added SAVE20 coupon to ${shop.name}`);
      } else {
        console.log(`SAVE20 already exists in ${shop.name}`);
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
