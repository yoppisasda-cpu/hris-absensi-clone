
const axios = require('axios');

async function checkDeploy() {
  const url = 'https://hris-absensi-clone-production.up.railway.app/api/auth/login';
  try {
    const res = await axios.post(url, { email: 'trigger@error.com', password: 'wrong' });
  } catch (e) {
    if (e.response) {
      console.log('Direct Status:', e.response.status);
      console.log('Keys:', Object.keys(e.response.data));
      if (e.response.data.details) {
          console.log('✅ DIRECT BACKEND IS UPDATED');
      } else {
          console.log('❌ DIRECT BACKEND IS NOT UPDATED');
      }
    } else {
      console.log('Failed:', e.message);
    }
  }
}

checkDeploy();
