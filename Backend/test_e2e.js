import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testWorkflow() {
  console.log('--- Starting API E2E Verification ---');
  let successCount = 0;
  let failCount = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      successCount++;
    } catch (err) {
      console.error(`[FAIL] ${name}`, err?.response?.data || err.message);
      failCount++;
    }
  };

  // 1. Test Customer Login
  let customerToken;
  await test('Customer Login', async () => {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sarusondj@gmail.com',
      password: 'sarusondj@1',
      role: 'customer'
    });
    if (!res.data.token) throw new Error('No token returned');
    customerToken = res.data.token;
  });

  // 2. Test Vendor Login
  let vendorToken;
  await test('Vendor Login', async () => {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sarusondj321@gmail.com',
      password: 'sarusondj@1',
      role: 'vendor'
    });
    vendorToken = res.data.token;
  });

  // 3. Test Admin Login
  let adminToken;
  await test('Admin Login', async () => {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      email: '18sarusondj@gmail.com',
      password: 'sarusondj@1',
      role: 'admin'
    });
    adminToken = res.data.token;
  });

  // 4. Test Delivery Login
  let deliveryToken;
  await test('Delivery Login', async () => {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
      phone: '6364563283',
      password: 'sarusondj@1',
      role: 'delivery'
    });
    deliveryToken = res.data.token;
  });

  // 5. Test Shop Retrieval (Customer) - Heavily optimized with .lean()
  await test('Fetch Shops (Customer View)', async () => {
    const res = await axios.get(`${BASE_URL}/shops`);
    if (!Array.isArray(res.data.shops)) throw new Error('Invalid shops array');
  });

  // 6. Test Products Retrieval (Customer) - Heavily optimized with .lean()
  await test('Fetch Products (Customer View)', async () => {
    const res = await axios.get(`${BASE_URL}/products`);
    if (!Array.isArray(res.data.products)) throw new Error('Invalid products array');
  });

  console.log(`\n--- Test Complete ---`);
  console.log(`Passed: ${successCount}, Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

testWorkflow();
