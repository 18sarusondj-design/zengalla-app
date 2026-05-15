import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'Backend', '.env') });

const MONGO_URI = process.env.MONGO_URI;

async function deleteUser() {
  if (!MONGO_URI) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      name: String
    }));

    const email = 'sarusondj@gmail.com';
    const result = await User.deleteOne({ email: email.toLowerCase() });

    if (result.deletedCount > 0) {
      console.log(`SUCCESS: User with email ${email} has been removed from the database.`);
    } else {
      console.log(`INFO: No user found with email ${email}.`);
    }

    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

deleteUser();
