import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

async function listAllShops() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    const shops = await Shop.find({});
    console.log(`Total shops found: ${shops.length}`);
    shops.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.name}, Active: ${s.isActive}, Sponsored: ${s.isSponsored}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllShops();
