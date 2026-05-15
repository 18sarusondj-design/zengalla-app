import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

async function updateUserPincode() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    await User.updateOne({ email: 'sarusondj@gmail.com' }, { $set: { pincode: '580031' } });
    console.log('SUCCESS: Pincode updated to 580031.');
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

updateUserPincode();
