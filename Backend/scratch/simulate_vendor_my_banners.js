import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../src/models/User.js';

const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

async function diagnose() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  // Find a vendor
  const vendor = await User.findOne({ role: 'vendor' });
  if (!vendor) {
    console.error('No vendor found in database.');
    process.exit(1);
  }
  console.log('Found Vendor User:', vendor.email, 'ID:', vendor._id);

  // Generate JWT token
  const token = jwt.sign(
    { id: vendor._id, tokenVersion: vendor.tokenVersion },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  console.log('Generated JWT Token:', token);

  // Make request to /api/banners/my
  try {
    const res = await axios.get('http://localhost:5000/api/banners/my', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('GET /api/banners/my status:', res.status);
    console.log('GET /api/banners/my body:', res.data);
  } catch (err) {
    console.error('API Call Failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error message:', err.message);
    }
  }

  process.exit(0);
}

diagnose();
