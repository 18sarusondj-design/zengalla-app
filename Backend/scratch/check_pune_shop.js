import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

async function checkShops() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    const shops = await Shop.find({ name: /pune/i });
    console.log(`Found ${shops.length} shops matching 'pune':`);
    shops.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.name}, Email: ${s.email || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkShops();
