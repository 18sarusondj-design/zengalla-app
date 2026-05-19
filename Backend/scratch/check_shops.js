import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function checkShops() {
  try {
    if (!MONGO_URI) {
      console.error("MONGO_URI is undefined");
      process.exit(1);
    }
    await mongoose.connect(MONGO_URI);
    const Shop = mongoose.model('Shop', new mongoose.Schema({
      name: String,
      location: {
        type: { type: String, default: 'Point' },
        coordinates: [Number]
      },
      pinCode: String,
      areaName: String
    }));

    const shops = await Shop.find({});
    console.log("Current Shops:");
    console.log(JSON.stringify(shops, null, 2));

    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

checkShops();
