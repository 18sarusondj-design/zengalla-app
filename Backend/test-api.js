import 'dotenv/config';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'sarusondj321@gmail.com',
      password: 'sarusondj@1'
    });
    const { token, user } = loginRes.data;
    console.log('Login successful! Role:', user.role);

    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching my shop...');
    const shopRes = await axios.get(`${API_URL}/shops/my`, { headers });
    console.log('Get Shop Response:', shopRes.data);

    if (shopRes.data.shop) {
      const shopId = shopRes.data.shop._id;
      console.log('Updating shop details...');
      const updateRes = await axios.put(`${API_URL}/shops/${shopId}`, {
        name: 'Sagar Supermarket',
        phone: '8888888888',
        gstin: '29AAAAA0000A1Z5',
        fssai: '12345678901234'
      }, { headers });
      console.log('Update Shop Response:', updateRes.data);

      console.log('Re-fetching shop to verify...');
      const verifyRes = await axios.get(`${API_URL}/shops/my`, { headers });
      console.log('Verified Shop in DB:', verifyRes.data.shop);
    }
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
