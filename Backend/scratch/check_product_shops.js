import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://18sarusondj:Sarusondj1@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function checkProducts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const productSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.model('Product', productSchema);

    const distinctShops = await Product.distinct('shopId');
    console.log(`Products found from ${distinctShops.length} distinct shops:`);
    console.log(distinctShops);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkProducts();
