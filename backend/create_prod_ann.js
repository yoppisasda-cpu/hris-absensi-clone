const axios = require('axios');

const API_URL = 'https://hris-absensi-clone-production.up.railway.app/api';

async function createProdAnnouncement() {
  try {
    console.log('Logging in to PRODUCTION...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'owner@aivola.id',
      password: 'admin123'
    });
    const token = loginRes.data.token;

    console.log('Creating announcement on PRODUCTION for company 26...');
    const annRes = await axios.post(`${API_URL}/announcements`, {
      title: 'PENGUMUMAN PT. RAJO KOPI INDONESIA',
      content: 'Selamat bergabung! Ini adalah pengumuman resmi pertama untuk PT. Rajo Kopi Indonesia.',
      isPriority: true
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-tenant-id': '26' 
      }
    });

    console.log('Success!', annRes.data);
  } catch (err) {
    if (err.response) {
      console.error('Error Status:', err.response.status);
      console.error('Error Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

createProdAnnouncement();
