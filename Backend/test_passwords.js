import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/Grocery_Shop');
  const User = mongoose.model('User', new mongoose.Schema({ email: String, role: String, password: String, isVerified: Boolean }, { strict: false }), 'users');
  
  const hash = await bcrypt.hash('sarusondj@1', 12);
  
  await User.updateOne({ email: '18sarusondj@gmail.com' }, { $set: { password: hash, isVerified: true, role: 'admin' } });
  await User.updateMany({ email: { $in: ['sarusondj@gmail.com', 'sarusondj321@gmail.com', 'sarusondj1234@gmail.com'] } }, { $set: { password: hash } });
  await User.updateOne({ phone: '6364563283' }, { $set: { password: hash, isVerified: true, role: 'delivery' } });
  
  console.log('Passwords updated successfully.');
  process.exit(0);
}

run().catch(console.error);
