import mongoose from 'mongoose';
import Shop from '../src/models/Shop.js';
import User from '../src/models/User.js';

const uri = 'mongodb://18sarusondj:ctv1b9AhvcI7XASZ@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function debug() {
  try {
    await mongoose.connect(uri);
    const user = await User.findOne({ email: 'sarusondj321@gmail.com' });
    const shop = await Shop.findOne({ owner: user._id });
    console.log('Shop Data in DB:');
    console.log(JSON.stringify(shop, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debug();
