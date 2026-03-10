
const axios = require('axios');

async function test() {
  const baseURL = 'https://hris-absensi-clone-production.up.railway.app/api';
  console.log('Testing production login at:', baseURL);
  
  try {
    const res = await axios.post(`${baseURL}/auth/login`, {
      email: 'owner@aivola.id',
      password: 'admin123'
    });
    console.log('Login Result:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('!!! LOGIN FAILED !!!');
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Response Data:', JSON.stringify(e.response.data, null, 2));
    } else {
      console.error('Error Message:', e.message);
    }
  }
}

test();
