import mongoose from 'mongoose';
import fs from 'fs';
import 'dotenv/config';

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grocery_shop').then(async () => {
  const db = mongoose.connection;
  const items = await db.collection('masterproducts').find({}).limit(50).toArray();
  
  let csv = 'Barcode,Name,Category\n';
  items.forEach(i => {
    csv += `${i.barcode},"${i.name}","${i.category}"\n`;
  });
  
  fs.writeFileSync('C:\\GROCERY_SHOP\\test_barcodes.csv', csv);
  console.log('Created test_barcodes.csv with ' + items.length + ' items');
  process.exit(0);
}).catch(console.error);
