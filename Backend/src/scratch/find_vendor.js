import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function findVendor() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
       console.log("MONGO_URI is missing in .env!");
       return;
    }
    await mongoose.connect(uri);
    const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String }));
    const vendor = await User.findOne({ role: 'vendor' });
    console.log('VENDOR_FOUND:', vendor);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

findVendor();
