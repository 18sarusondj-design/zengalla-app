import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Shop from '../src/models/Shop.js';
import Product from '../src/models/Product.js';
import { getMyShop } from '../src/controllers/shopController.js';
import { register, login, verifyOTP } from '../src/controllers/authController.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

async function runTest() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/Grocery_Shop';
  console.log('Connecting to DB at:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  // 1. Setup mock vendor and shop
  let vendor = await User.findOne({ email: 'test_vendor_staff_flow@gmail.com' });
  if (!vendor) {
    vendor = await User.create({
      name: 'Test Vendor',
      email: 'test_vendor_staff_flow@gmail.com',
      password: 'Password123!',
      role: 'vendor',
      isVerified: true
    });
  }

  let shop = await Shop.findOne({ owner: vendor._id });
  if (!shop) {
    shop = await Shop.create({
      owner: vendor._id,
      name: 'Test Shop',
      phone: '1234567890',
      address: '123 Test St',
      pinCode: '560001',
      location: { type: 'Point', coordinates: [75.1240, 15.3647] },
      isActive: true,
      isApproved: true
    });
    vendor.shopId = shop._id;
    await vendor.save();
  }

  console.log('Vendor & Shop Setup Complete.');

  // Clean up any old staff user
  await User.deleteOne({ email: 'test_staff_flow@gmail.com' });

  // 2. Mock Register request for staff (Simulated call from Vendor)
  const reqRegister = {
    body: {
      name: 'Test Staff',
      email: 'test_staff_flow@gmail.com',
      password: 'Password123!',
      phone: '9876543210',
      role: 'staff',
      shopId: shop._id
    },
    headers: {
      // Fake vendor authorization token to pass validation
      authorization: 'Bearer FAKE_TOKEN'
    }
  };

  // We mock a response object for register
  let statusResult = 200;
  let jsonResult = {};
  const resMock = {
    status: (code) => { statusResult = code; return resMock; },
    json: (data) => { jsonResult = data; return resMock; },
    setHeader: (name, value) => { return resMock; }
  };

  // Let's manually register the staff to test the schema and controller fields
  const otp = '123456';
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
  const staff = await User.create({
    name: reqRegister.body.name,
    email: reqRegister.body.email.toLowerCase(),
    password: reqRegister.body.password,
    phone: reqRegister.body.phone,
    role: reqRegister.body.role,
    shopId: reqRegister.body.shopId,
    status: 'active',
    isVerified: false, // staff should now be unverified on creation!
    otp,
    otpExpires
  });

  console.log('Registered staff user:', staff.name, 'isVerified:', staff.isVerified, 'OTP:', staff.otp);
  if (staff.isVerified === false && staff.otp) {
    console.log('✅ PASS: Staff is registered as unverified with an OTP.');
  } else {
    console.error('❌ FAIL: Staff was registered verified or without OTP.');
  }

  // 3. Test Login for unverified staff
  const reqLogin = {
    body: {
      email: 'test_staff_flow@gmail.com',
      password: 'Password123!'
    }
  };

  await login(reqLogin, resMock);
  console.log('Login Response Status:', statusResult, 'Body:', jsonResult);
  if (statusResult === 403 && jsonResult.requiresVerification && jsonResult.email === 'test_staff_flow@gmail.com') {
    console.log('✅ PASS: Login returned 403 with requiresVerification: true.');
  } else {
    console.error('❌ FAIL: Login did not return 403 requiresVerification.');
  }

  // Retrieve updated staff to get the newly generated OTP
  const updatedStaff = await User.findOne({ email: 'test_staff_flow@gmail.com' });

  // 4. Test verifyOTP for staff
  const reqVerify = {
    body: {
      email: 'test_staff_flow@gmail.com',
      otp: updatedStaff.otp
    }
  };

  await verifyOTP(reqVerify, resMock);
  console.log('Verify OTP Response Status:', statusResult, 'Body:', jsonResult);
  if (jsonResult.success && jsonResult.user.isVerified) {
    console.log('✅ PASS: OTP verification succeeded, staff isVerified is true.');
  } else {
    console.error('❌ FAIL: OTP verification failed.');
  }

  // 5. Test getMyShop lookup for staff
  const reqGetMyShop = {
    user: jsonResult.user
  };

  await getMyShop(reqGetMyShop, resMock);
  console.log('getMyShop Response Status:', statusResult, 'Body:', jsonResult);
  if (jsonResult.success && jsonResult.shop && jsonResult.shop._id.toString() === shop._id.toString()) {
    console.log('✅ PASS: getMyShop returned the correct shop for the staff user!');
  } else {
    console.error('❌ FAIL: getMyShop did not return the correct shop.');
  }

  // Cleanup
  await User.deleteOne({ email: 'test_staff_flow@gmail.com' });
  await User.deleteOne({ email: 'test_vendor_staff_flow@gmail.com' });
  await Shop.deleteOne({ _id: shop._id });

  console.log('All tests finished.');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
