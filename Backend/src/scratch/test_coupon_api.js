import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'sarusondj1@gmail.com'; 
const PASSWORD = 'test1234'; // Using the password I reset earlier

async function test() {
  try {
    console.log('--- STEP 1: LOGIN ---');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });
    
    const token = loginRes.data.token;
    const shopId = loginRes.data.user.shopId || loginRes.data.user._id; 
    console.log('Login Success.');

    console.log('\n--- STEP 2: FETCH CURRENT SHOP ---');
    const getRes = await axios.get(`${API_URL}/shops/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const shop = getRes.data.shop;
    console.log('Current Coupon Count:', shop.coupons?.length || 0);

    console.log('\n--- STEP 3: ADD NEW COUPON ---');
    const newCoupon = {
      code: 'API_TEST_' + Date.now().toString().slice(-4),
      discountValue: 15,
      discountType: 'percentage',
      isActive: true
    };
    
    const updatedCoupons = [...(shop.coupons || []), newCoupon];
    
    console.log('Sending PUT request with', updatedCoupons.length, 'coupons...');
    const putRes = await axios.put(`${API_URL}/shops/${shop._id}`, {
      ...shop,
      coupons: updatedCoupons
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('PUT Response Success:', putRes.data.success);

    console.log('\n--- STEP 4: VERIFY VIA FRESH GET ---');
    const verifyRes = await axios.get(`${API_URL}/shops/my`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const finalShop = verifyRes.data.shop;
    console.log('Final Verification Coupon Count:', finalShop.coupons?.length || 0);

    if (finalShop.coupons.some(c => c.code === newCoupon.code)) {
      console.log('\n✅ TEST PASSED: Coupon persisted in database.');
    } else {
      console.log('\n❌ TEST FAILED: Coupon did NOT persist.');
    }

  } catch (err) {
    console.error('TEST ERROR:', err.response?.data || err.message);
  }
}

test();
