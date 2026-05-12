import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

async function reset() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hashedPassword = await bcrypt.hash('test1234', 12);
    await User.findOneAndUpdate(
      { email: 'sarusondj1@gmail.com' },
      { password: hashedPassword }
    );
    console.log('PASSWORD_RESET_SUCCESS');
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

reset();
