
const axios = require('axios');

async function checkDeploy() {
  const url = 'https://api.aivola.id/api/auth/login';
  try {
    // Send invalid payload to trigger a catch block
    const res = await axios.post(url, { email: 'trigger@error.com', password: 'wrong' });
  } catch (e) {
    if (e.response) {
      console.log('Status:', e.response.status);
      console.log('Keys in Response:', Object.keys(e.response.data));
      console.log('Error Message:', e.response.data.error);
      if (e.response.data.details) {
          console.log('✅ BACKEND IS UPDATED (details field found)');
      } else {
          console.log('❌ BACKEND IS NOT UPDATED (details field missing)');
      }
    } else {
      console.log('Failed to connect:', e.message);
    }
  }
}

checkDeploy();
