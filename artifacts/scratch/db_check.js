const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../Backend/.env') });

const Product = require('../../Backend/src/models/Product');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_db');
    console.log('Connected to DB');

    const targetId = '69c38c26f02c25112e3efe06';
    const product = await Product.findById(targetId);
    if (product) {
      console.log('Found product by target ID:', product);
    } else {
      console.log('Product NOT FOUND with ID:', targetId);
    }

    const suspectProducts = await Product.find({ imageUrl: { $regex: '/api/products/' } });
    if (suspectProducts.length > 0) {
      console.log('Found suspect products with API URLs as images:', suspectProducts);
    } else {
      console.log('No products found with API URLs as images');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
