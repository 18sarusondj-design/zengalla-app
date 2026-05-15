
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new mongoose.Schema({
  email: String,
  role: String,
  status: String,
  shopId: mongoose.Schema.Types.ObjectId
});

const ShopSchema = new mongoose.Schema({
  name: String,
  owner: mongoose.Schema.Types.ObjectId,
  subscriptionPlan: String,
  isActive: Boolean
});

const User = mongoose.model('User', UserSchema);
const Shop = mongoose.model('Shop', ShopSchema);

async function checkVendors() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const vendors = await User.find({ role: 'vendor' });
    console.log(`Found ${vendors.length} vendors:`);

    for (const v of vendors) {
      const shop = await Shop.findOne({ owner: v._id });
      console.log(`- Email: ${v.email}, Status: ${v.status}, Shop: ${shop ? shop.name : 'NONE'}, Plan: ${shop ? shop.subscriptionPlan : 'N/A'}`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkVendors();
