import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function reset() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGO_URI is not defined in .env');
        process.exit(1);
    }
    await mongoose.connect(uri);
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const user = await User.findOneAndUpdate(
      { email: '18sarusondj@gmail.com' },
      { 
        password: hashedPassword, 
        role: 'admin', 
        isVerified: true,
        status: 'active'
      },
      { new: true }
    );

    if (user) {
      console.log('Super Admin credentials updated successfully.');
      console.log('Email: 18sarusondj@gmail.com');
      console.log('Password: Admin@123');
    } else {
      console.log('User 18sarusondj@gmail.com not found. Creating new Super Admin...');
      await User.create({
        name: 'Super Admin',
        email: '18sarusondj@gmail.com',
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        status: 'active'
      });
      console.log('New Super Admin created successfully.');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

reset();
