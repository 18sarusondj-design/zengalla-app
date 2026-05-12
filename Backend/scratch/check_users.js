import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_shop';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const users = await User.find({}).select('email role password isVerified');
    console.log('--- USERS IN DATABASE ---');
    users.forEach(u => {
      console.log(`Email: ${u.email} | Role: ${u.role} | Verified: ${u.isVerified} | HasPassword: ${!!u.password}`);
    });
    console.log('-------------------------');
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkUsers();
