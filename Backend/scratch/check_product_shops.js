import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

async function checkProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const productSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.model('Product', productSchema);

    const distinctShops = await Product.distinct('shopId');
    console.log(`Products found from ${distinctShops.length} distinct shops:`);
    console.log(distinctShops);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProducts();
