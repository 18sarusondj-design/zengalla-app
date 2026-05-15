import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function checkUser() {
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

    const emails = ['sarusondj@gmail.com', '18sarusondj@gmail.com'];
    
    for (const email of emails) {
      const user = await User.findOne({ email: email.toLowerCase() });

      if (user) {
        console.log(`\nUser Found: ${email}`);
        console.log(`Name: ${user.name}`);
        console.log(`Role: ${user.role}`);
        console.log(`Status: ${user.status}`);

        if (user.role !== 'admin' || user.status !== 'active') {
          console.log('User is NOT set as active admin. Updating now...');
          user.role = 'admin';
          user.status = 'active';
          await user.save();
          console.log('SUCCESS: User promoted to Active Admin.');
        } else {
          console.log('User is already an Active Admin.');
        }
      } else {
        console.log(`\nUser with email ${email} not found.`);
      }
    }

    // List all admins just in case
    const admins = await User.find({ role: 'admin' });
    console.log('\nCurrent Admins in DB:');
    admins.forEach(a => console.log(`- ${a.name} (${a.email}) Status: ${a.status}`));

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUser();
