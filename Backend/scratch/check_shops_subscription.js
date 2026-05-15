import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

async function checkShops() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Shop = mongoose.model('Shop', new mongoose.Schema({}, { strict: false }));
    const shops = await Shop.find({});
    console.log(`Total Shops Found: ${shops.length}`);
    shops.forEach(s => {
      console.log(`- Name: ${s.shopName || s.name}`);
      console.log(`  Subscription: ${s.subscriptionPlan}`);
      console.log(`  Active: ${s.isActive}`);
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkShops();
