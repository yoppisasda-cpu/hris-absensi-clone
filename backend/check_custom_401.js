
const axios = require('axios');

async function checkCustom() {
  const url = 'https://api.aivola.id/api/auth/login';
  try {
    const res = await axios.post(url, { email: 'trigger@error.com', password: 'wrong' });
    console.log('Result:', res.status, res.data);
  } catch (e) {
    if (e.response) {
      console.log('Custom Status:', e.response.status);
      console.log('Custom Data:', JSON.stringify(e.response.data));
    } else {
      console.log('Failed:', e.message);
    }
  }
}

checkCustom();
