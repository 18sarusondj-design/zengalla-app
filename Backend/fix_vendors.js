
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Shop = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);

async function fixVendors() {
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    console.log('Connected to DB');

    const vendors = await User.find({ role: 'vendor', status: 'pending' });
    console.log(`Found ${vendors.length} pending vendors.`);

    for (const v of vendors) {
      const shop = await Shop.findOne({ owner: v._id });
      if (shop && shop.subscriptionPlan && shop.subscriptionPlan !== 'none') {
        v.status = 'active';
        await v.save();
        console.log(`✅ Activated ${v.email} (Shop: ${shop.name}, Plan: ${shop.subscriptionPlan})`);
      } else {
          console.log(`ℹ️ Skipping ${v.email} - No active plan found.`);
      }
    }

    await mongoose.disconnect();
    console.log('Done.');
  } catch (err) {
    console.error(err);
  }
}

fixVendors();
