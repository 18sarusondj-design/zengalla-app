import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

async function fix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hashedPassword = await bcrypt.hash('sarusondj@1', 12);
    
    // Find the vendor account by the ID I found earlier or by the old email
    const result = await User.findOneAndUpdate(
      { email: 'sarusondj1@gmail.com' },
      { 
        email: 'sarusondj@gmail.com',
        password: hashedPassword 
      },
      { new: true }
    );
    
    if (result) {
      console.log('VENDOR_AUTH_FIXED_SUCCESSFULLY');
    } else {
      console.log('VENDOR_NOT_FOUND_TO_FIX');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

fix();
