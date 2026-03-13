const axios = require('axios');

const API_URL = 'https://hris-absensi-clone-production.up.railway.app/api';

async function checkProductionAnnouncements() {
  try {
    console.log('Logging in to PRODUCTION as owner@aivola.id...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'owner@aivola.id',
      password: 'admin123'
    });
    const token = loginRes.data.token;
    console.log('Login Success!');

    console.log('Fetching announcements for company 26 from PRODUCTION...');
    const annRes = await axios.get(`${API_URL}/announcements`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-tenant-id': '26' 
      }
    });

    console.log(`Announcements found on PRODUCTION: ${annRes.data.length}`);
    annRes.data.forEach(a => {
      console.log(`- ${a.title} (ID: ${a.id}, Created: ${a.createdAt})`);
    });

  } catch (err) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      console.error('Error Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

checkProductionAnnouncements();
