import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://18sarusondj:Sarusondj1@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function listAllShops() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    const shops = await Shop.find({});
    console.log(`Total shops found: ${shops.length}`);
    shops.forEach(s => {
      console.log(`ID: ${s._id}, Name: ${s.name}, Active: ${s.isActive}, Sponsored: ${s.isSponsored}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllShops();
