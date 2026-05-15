import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://18sarusondj:Sarusondj1@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function listUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    const users = await User.find({ role: 'vendor' });
    console.log(`Total shop owners found: ${users.length}`);
    users.forEach(u => {
      console.log(`ID: ${u._id}, Email: ${u.email}, ShopId: ${u.shopId}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listUsers();
