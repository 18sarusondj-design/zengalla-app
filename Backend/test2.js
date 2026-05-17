import 'dotenv/config';
import mongoose from 'mongoose';
import Shop from './src/models/Shop.js';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shop';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    const shops = await Shop.find({}).lean();
    console.log('Shops in DB:', shops.map(s => ({
      _id: s._id,
      name: s.name,
      owner: s.owner,
      phone: s.phone,
      gstin: s.gstin,
      fssai: s.fssai
    })));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
