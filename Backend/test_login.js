import mongoose from 'mongoose';
import User from './src/models/User.js';
import Order from './src/models/Order.js';
import Shop from './src/models/Shop.js';

async function runTests() {
  await mongoose.connect('mongodb://localhost:27017/Grocery_Shop');
  console.log('Connected to DB');

  // Seed Admin if not exists
  let admin = await User.findOne({ email: '18sarusondj@gmail.com' });
  if (!admin) {
    admin = await User.create({
      name: 'Super Admin',
      email: '18sarusondj@gmail.com',
      password: 'sarusondj@1',
      role: 'admin',
      isVerified: true
    });
    console.log('Created Super Admin');
  } else {
    admin.password = 'sarusondj@1';
    await admin.save();
    console.log('Reset Admin Password');
  }

  // Ensure other users exist
  const usersToTest = [
    { email: 'sarusondj@gmail.com', role: 'customer' },
    { email: 'sarusondj321@gmail.com', role: 'vendor' },
    { email: 'sarusondj1234@gmail.com', role: 'vendor' },
    { phone: '6364563283', role: 'delivery' }
  ];

  for (const u of usersToTest) {
    const query = u.email ? { email: u.email } : { phone: u.phone };
    let user = await User.findOne(query);
    if (!user) {
      user = await User.create({
        name: `Test ${u.role}`,
        email: u.email || `${u.phone}@test.com`,
        phone: u.phone || '',
        password: 'sarusondj@1',
        role: u.role,
        isVerified: true
      });
      console.log(`Created ${u.role}: ${u.email || u.phone}`);
    } else {
      user.password = 'sarusondj@1';
      await user.save();
      console.log(`Reset password for ${u.role}: ${u.email || u.phone}`);
    }
  }

  // Test some queries to ensure .lean() didn't break them
  try {
    const shops = await Shop.find().lean();
    console.log(`Found ${shops.length} shops with .lean()`);
    
    const orders = await Order.find().limit(5).lean();
    console.log(`Found ${orders.length} orders with .lean()`);
    
    console.log('API queries executed successfully!');
  } catch (err) {
    console.error('API query failed:', err);
  }

  process.exit(0);
}

runTests();
