import mongoose from 'mongoose';

const MONGO_URI = 'mongodb://18sarusondj:Sarusondj1@ac-lyaxq8g-shard-00-00.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-01.gflholb.mongodb.net:27017,ac-lyaxq8g-shard-00-02.gflholb.mongodb.net:27017/test?ssl=true&replicaSet=atlas-r0os8d-shard-0&authSource=admin&appName=Cluster0';

async function restoreShop() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const shopSchema = new mongoose.Schema({}, { strict: false });
    const Shop = mongoose.model('Shop', shopSchema);

    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.model('User', userSchema);

    const shopId = '6a07123f9775edf407a4aff5';
    
    // Check if it exists
    const existing = await Shop.findById(shopId);
    if (existing) {
      console.log('Shop already exists!');
      process.exit(0);
    }

    // Create the shop
    const newShop = new Shop({
      _id: shopId,
      name: 'pune',
      ownerId: '6a07123e9775edf407a4aff3', // ID from the user sarusondj1234@gmail.com
      email: 'sarusondj1234@gmail.com',
      isActive: true,
      isSponsored: true,
      status: 'active',
      location: {
        type: 'Point',
        coordinates: [73.8567, 18.5204] // Pune coordinates
      },
      category: 'Grocery',
      description: 'Fresh groceries from Pune'
    });

    await newShop.save();
    console.log('Shop restored successfully!');

    // Ensure the user is linked
    await User.findByIdAndUpdate('6a07123e9775edf407a4aff3', { shopId: new mongoose.Types.ObjectId(shopId), status: 'active' });
    console.log('User linked to shop successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

restoreShop();
