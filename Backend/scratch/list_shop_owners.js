import mongoose from 'mongoose';

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
const MONGO_URI = process.env.MONGO_URI;

async function listUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    const users = await User.find({ role: 'vendor' });
    console.log(`Total shop owners found: ${users.length}`);
    users.forEach(u => {
      console.log(`ID: ${u._id}, Email: ${u.email}, ShopId: ${u.shopId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
