import mongoose from 'mongoose';
import 'dotenv/config';

// The URI exactly as printed/configured in Render, which lacks "/test?" or "/zengalla?"
const faultyUri = "mongodb://18sarusondj:FPBNzkjqgJ8fBZ8k@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0";

console.log('Testing connection with faulty URI (no database/question mark)...');

mongoose.connect(faultyUri)
  .then(() => {
    console.log('✅ Connection successful!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
