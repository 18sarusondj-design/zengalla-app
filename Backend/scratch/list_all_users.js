import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

async function listAllUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const users = await User.find({});
    console.log(`Total Users: ${users.length}`);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}) Role: ${u.role} Status: ${u.status}`);
    });
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

listAllUsers();
