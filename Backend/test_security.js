import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testSecurity() {
  console.log('--- Starting API RBAC Verification ---');
  let successCount = 0;
  let failCount = 0;

  // Login as Customer
  const customerRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'sarusondj@gmail.com',
    password: 'sarusondj@1',
    role: 'customer'
  });
  const customerToken = customerRes.data.token;
  const customerId = customerRes.data.user._id;

  // Login as Admin
  const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: '18sarusondj@gmail.com',
    password: 'sarusondj@1',
    role: 'admin'
  });
  const adminToken = adminRes.data.token;

  const test = async (name, fn, expectedFail = false) => {
    try {
      await fn();
      if (expectedFail) {
        console.error(`[FAIL] ${name} (Expected it to fail, but it succeeded!)`);
        failCount++;
      } else {
        console.log(`[PASS] ${name}`);
        successCount++;
      }
    } catch (err) {
      if (expectedFail && (err.response?.status === 403 || err.response?.status === 401 || err.response?.status === 404)) {
        console.log(`[PASS] ${name} (Blocked as expected with ${err.response?.status})`);
        successCount++;
      } else {
        console.error(`[FAIL] ${name}`, err?.response?.data || err.message);
        failCount++;
      }
    }
  };

  // Test 1: Customer trying to access admin users list
  await test('Customer -> Admin Users Route', async () => {
    await axios.get(`${BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${customerToken}` } });
  }, true); // Expected to fail with 403

  // Test 2: Admin trying to access admin users list
  await test('Admin -> Admin Users Route', async () => {
    await axios.get(`${BASE_URL}/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
  }); // Expected to pass

  // Test 3: Customer trying to update a random shop (IDOR check on shops)
  await test('Customer -> Update Random Shop', async () => {
    // Generate random mongo id
    const randomId = '609b1b8b8b8b8b8b8b8b8b8b';
    await axios.put(`${BASE_URL}/shops/${randomId}`, {}, { headers: { Authorization: `Bearer ${customerToken}` } });
  }, true);

  console.log(`\n--- Test Complete ---`);
  console.log(`Passed: ${successCount}, Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

testSecurity();
