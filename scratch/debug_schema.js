
const https = require('https');

const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsYXFmeWxxb2VncmtxcnprZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NjgyNTksImV4cCI6MjA5MzQ0NDI1OX0.96e-nKPJfblmRtHmrVpTarMDSIuIdqrgb8gUArDVa0Y';

async function checkColumn(table, column) {
  return new Promise((resolve) => {
    const url = `https://xlaqfylqoegrkqrzkdbf.supabase.co/rest/v1/${table}?select=${column}&limit=1`;
    const options = {
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ exists: true });
        } else {
          resolve({ exists: false, status: res.statusCode, error: data });
        }
      });
    }).on('error', (err) => resolve({ exists: false, error: err.message }));
  });
}

async function run() {
  const res = await checkColumn('products', 'barcode');
  console.log(`products.barcode: ${res.exists ? 'EXISTS' : 'MISSING'}`);
  
  const res2 = await checkColumn('products', 'mrp');
  console.log(`products.mrp: ${res2.exists ? 'EXISTS' : 'MISSING'}`);
}

run();
