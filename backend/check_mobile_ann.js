const axios = require('axios');

const API_URL = 'https://hris-absensi-clone-production.up.railway.app/api';
const EMAIL = 'yoppi@rki.com';
const PASS = '123456'; // Assuming 123456 as default or common test pass

async function checkMobileAnnouncements() {
  try {
    console.log('Logging in as yoppi@rki.com...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: EMAIL,
      password: PASS
    });
    const token = loginRes.data.token;
    console.log('Login Success!');

    const annRes = await axios.get(`${API_URL}/announcements`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Announcements count for yoppi:', annRes.data.length);
    annRes.data.forEach(a => {
      console.log(`- ${a.title} (Created: ${a.createdAt})`);
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

checkMobileAnnouncements();
