import 'dotenv/config';
import mongoose from 'mongoose';
import Shop from './src/models/Shop.js';

const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const shop = await Shop.findById('6a0714f19775edf407a4b2eb').lean();
    console.log('Shop Document in DB:', shop);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
