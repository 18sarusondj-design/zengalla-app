import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/grozy';
  console.log('Connecting to URI:', uri);
  await mongoose.connect(uri);
  console.log('Connected to DB');

  const email = 'testcustomer@grozy.com';
  // Delete existing test customer if any
  await User.deleteOne({ email });

  // Note: the pre-save hook in User.js already hashes the password, so we pass a plain text password 'Customer@123'
  const user = new User({
    name: 'Test Customer',
    email,
    password: 'Customer@123',
    phone: '9876543210',
    role: 'customer',
    status: 'active',
    isVerified: true
  });

  await user.save();
  console.log('Test customer created successfully!');
  await mongoose.disconnect();
}

run();
