import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://18sarusondj:Sarusondj1@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function deletePuneShop() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    // Delete "pune's Store"
    const result1 = await Shop.deleteOne({ _id: '6a07057d0b615dff0250a4b6' });
    console.log(`Deleted 'pune's Store': ${result1.deletedCount}`);

    // Delete "pune" (the other one found)
    const result2 = await Shop.deleteOne({ _id: '6a07123f9775edf407a4aff5' });
    console.log(`Deleted 'pune': ${result2.deletedCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deletePuneShop();
