
const axios = require('axios');

async function compare() {
  const directURL = 'https://hris-absensi-clone-production.up.railway.app/api/auth/login';
  const customURL = 'https://api.aivola.id/api/auth/login';
  const payload = { email: 'owner@aivola.id', password: 'admin123' };

  console.log('--- TESTING DIRECT RAILWAY URL ---');
  try {
    const res1 = await axios.post(directURL, payload);
    console.log('Direct Result:', res1.status, JSON.stringify(res1.data).substring(0, 100));
  } catch (e) {
    console.log('Direct Failed:', e.response ? e.response.status : e.message);
    if (e.response) console.log('Data:', JSON.stringify(e.response.data));
  }

  console.log('\n--- TESTING CUSTOM DOMAIN URL ---');
  try {
    const res2 = await axios.post(customURL, payload);
    console.log('Custom Result:', res2.status, JSON.stringify(res2.data).substring(0, 100));
  } catch (e) {
    console.log('Custom Failed:', e.response ? e.response.status : e.message);
    if (e.response) console.log('Data:', JSON.stringify(e.response.data));
  }
}

compare();
