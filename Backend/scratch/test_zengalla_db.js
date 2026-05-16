import mongoose from 'mongoose';
import 'dotenv/config';

// Try connecting to 'zengalla' database instead of 'test'
const originalUri = process.env.MONGO_URI;
const zengallaUri = originalUri.replace('/test?', '/zengalla?');

console.log('Testing connection to zengalla DB...');

mongoose.connect(zengallaUri)
  .then(() => {
    console.log('✅ Connection to zengalla DB successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection to zengalla DB failed:', err.message);
    process.exit(1);
  });
