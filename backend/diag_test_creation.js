
const axios = require('axios');

async function diag() {
  const baseURL = 'https://hris-absensi-clone-production.up.railway.app/api';
  try {
    const res = await axios.get(`${baseURL}/companies`);
    const testCompanies = res.data.filter(c => c.name.includes('Test Company'));
    console.log('Found Test Companies:', testCompanies.length);
    if (testCompanies.length > 0) {
        console.log('Latest Test Company:', testCompanies[testCompanies.length - 1]);
    }
  } catch (e) {
    console.error('Diag failed:', e.message);
  }
}

diag();
