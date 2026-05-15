import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

async function checkUserLocation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const u = await User.findOne({ email: 'sarusondj@gmail.com' });
    console.log(`User: ${u.email}`);
    console.log(`Location: ${JSON.stringify(u.location)}`);
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkUserLocation();
