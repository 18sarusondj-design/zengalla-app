import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

async function audit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({}, 'email role status');
    console.log('ALL_USERS:', users);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

audit();
