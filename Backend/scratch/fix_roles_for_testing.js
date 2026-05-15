import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function fixRoles() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      role: String,
      status: String,
      name: String
    }));

    // Set sarusondj@gmail.com to Customer
    const user1 = await User.findOne({ email: 'sarusondj@gmail.com' });
    if (user1) {
      user1.role = 'customer';
      user1.status = 'active';
      await user1.save();
      console.log('SUCCESS: sarusondj@gmail.com set to CUSTOMER.');
    } else {
      console.log('sarusondj@gmail.com not found. Creating as customer...');
      await User.create({
        email: 'sarusondj@gmail.com',
        role: 'customer',
        status: 'active',
        name: 'Sarvesh Customer',
        password: '$2b$10$YourHashedPasswordHere' // This might be an issue if we don't know the hash
      });
    }

    // Keep 18sarusondj@gmail.com as Admin (optional, but good to have one admin)
    const adminUser = await User.findOne({ email: '18sarusondj@gmail.com' });
    if (adminUser) {
      adminUser.role = 'admin';
      adminUser.status = 'active';
      await adminUser.save();
      console.log('SUCCESS: 18sarusondj@gmail.com remains ADMIN.');
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixRoles();
