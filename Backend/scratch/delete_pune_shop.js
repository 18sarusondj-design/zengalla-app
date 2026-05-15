import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

async function deletePuneShop() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    // Delete "pune's Store"
    const result1 = await Shop.deleteOne({ _id: '6a07057d0b615dff0250a4b6' });
    console.log(`Deleted 'pune's Store': ${result1.deletedCount}`);

    // Delete "pune" (the other one found)
    const result2 = await Shop.deleteOne({ _id: '6a07123f9775edf407a4aff5' });
    console.log(`Deleted 'pune': ${result2.deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deletePuneShop();
