
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

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

// Avoid model re-definition errors
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Shop = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);

async function checkVendors() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error("MONGO_URI not found in env");
        process.exit(1);
    }
    await mongoose.connect(uri);
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
