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
      console.log(`  ID: ${s._id}`);
      console.log(`  Active: ${s.isActive}`);
      console.log(`  Location: ${JSON.stringify(s.location)}`);
      console.log(`  Owner: ${s.owner || s.vendorId}`);
      console.log(`  City: ${s.city}`);
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkShops();
