import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB for seeding');

    const adminEmail = 'admin@zengalla.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists');
    } else {
      await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: 'admin123', // You can change this later
        role: 'admin',
        status: 'active'
      });
      console.log('✨ Super Admin created successfully!');
      console.log('📧 Email: admin@zengalla.com');
      console.log('🔑 Password: admin123');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seedAdmin();
