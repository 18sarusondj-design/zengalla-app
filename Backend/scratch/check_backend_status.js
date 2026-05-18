import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  validateStatus: () => true
});

async function runDiagnostics() {
  console.log('--- RUNNING SINGLE BANNER DIAGNOSTICS ---');
  try {
    const bannerRes = await api.get('/banners/6a0a8a07a76ba66e1a2318ba');
    console.log('GET /api/banners/6a0a8a07a76ba66e1a2318ba status:', bannerRes.status, bannerRes.data);
  } catch (err) {
    console.error('Diagnostic error:', err.message);
  }
}

runDiagnostics();
