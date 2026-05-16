import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGO_URI;

console.log('Testing connection to:', MONGODB_URI.replace(/:([^@]+)@/, ':****@'));

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
