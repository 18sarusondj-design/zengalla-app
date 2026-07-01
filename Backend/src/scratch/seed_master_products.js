import mongoose from 'mongoose';
import fs from 'fs';
import 'dotenv/config';

// Re-define schema to insert items
const masterProductSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: String,
  mrp: Number,
  unit: String,
  description: String,
  imageUrl: String
}, { timestamps: true });

const MasterProduct = mongoose.models.MasterProduct || mongoose.model('MasterProduct', masterProductSchema);

const sampleProducts = [
  { barcode: '8901030940381', name: 'Maggi 2-Minute Noodles Masala, 70g', category: 'Noodles & Pasta', brand: 'Nestle', mrp: 14, unit: '70g' },
  { barcode: '8901058866762', name: 'Tata Salt Vacuum Evaporated Iodised Salt, 1 kg', category: 'Salt, Sugar & Jaggery', brand: 'Tata', mrp: 28, unit: '1 kg' },
  { barcode: '8901493003058', name: 'Lays Potato Chips - Classic Salted, 52g', category: 'Snacks', brand: 'Lays', mrp: 20, unit: '52g' },
  { barcode: '8901719100030', name: 'Parle-G Original Gluco Biscuits, 800g', category: 'Biscuits & Cookies', brand: 'Parle', mrp: 80, unit: '800g' },
  { barcode: '8901314010526', name: 'Amul Taaza Homogenised Toned Milk, 1L', category: 'Dairy & Eggs', brand: 'Amul', mrp: 72, unit: '1L' }
];

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/grocery_shop').then(async () => {
  try {
    console.log('Clearing existing master products...');
    await MasterProduct.deleteMany({});
    
    console.log('Inserting sample products...');
    await MasterProduct.insertMany(sampleProducts);
    
    let csv = 'Barcode,Name,Category,Brand,MRP,Unit\n';
    sampleProducts.forEach(i => {
      csv += `${i.barcode},"${i.name}","${i.category}","${i.brand}",${i.mrp},"${i.unit}"\n`;
    });
    
    fs.writeFileSync('C:\\GROCERY_SHOP\\test_barcodes.csv', csv);
    console.log('Created test_barcodes.csv with 5 sample items');
  } catch(err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}).catch(console.error);
