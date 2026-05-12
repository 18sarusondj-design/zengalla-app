import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  const email = 'sarusondj@gmail.com';
  const res = await User.deleteMany({ 
    email: { $regex: new RegExp('^' + email + '$', 'i') } 
  });
  console.log('Total Users Deleted:', res.deletedCount);
  process.exit(0);
}
clean();
