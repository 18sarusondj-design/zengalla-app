import mongoose from 'mongoose';
import 'dotenv/config';

// Try connecting to 'grozy' database instead of 'test'
const originalUri = process.env.MONGO_URI;
const grozyUri = originalUri.replace('/test?', '/grozy?');

console.log('Testing connection to grozy DB...');

mongoose.connect(grozyUri)
  .then(() => {
    console.log('✅ Connection to grozy DB successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection to grozy DB failed:', err.message);
    process.exit(1);
  });
