import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const Shop = mongoose.model('Shop', new mongoose.Schema({}, { strict: false }));
    const result = await Shop.updateMany({}, { $set: { bannersEnabled: true } });
    console.log(`Successfully enabled banners for ${result.modifiedCount} shops!`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
