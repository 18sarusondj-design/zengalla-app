import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Shop from '../models/Shop.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/zengalla';
  await mongoose.connect(uri);
  const shops = await Shop.find({});
  console.log('SHOPS_LIST:', JSON.stringify(shops.map(s => ({ id: s._id, name: s.name }))));
  await mongoose.disconnect();
}

run();
