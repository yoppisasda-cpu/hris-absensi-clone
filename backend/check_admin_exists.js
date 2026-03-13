
const axios = require('axios');

async function checkUser() {
  const baseURL = 'https://hris-absensi-clone-production.up.railway.app/api';
  const email = 'admin_1773190010574@test.com';
  try {
    // There is no /users/search, so I'll try to find any existing test users in the whole list
    // This is safe since this is my own test data
    const res = await axios.get(`${baseURL}/users`);
    const found = res.data.find(u => u.email === email);
    console.log('Admin User Found:', found ? 'YES' : 'NO');
    if (found) console.log('User Data:', found);
  } catch (e) {
    console.error('User check failed:', e.message);
  }
}

checkUser();
