const axios = require('axios');

const API_URL = 'https://hris-absensi-clone-production.up.railway.app/api';

async function checkProdNotifications() {
  try {
    console.log('Logging in to PRODUCTION...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'owner@aivola.id',
      password: 'admin123'
    });
    const token = loginRes.data.token;

    console.log('Fetching notifications for company 26 from PRODUCTION...');
    // We can't fetch notifications for a specific company easily unless we are ADMIN or wait...
    // The endpoint /notifications usually returns notifications for the LOGGED IN user.
    // If I want to see ALL notifications, I need to check the DB.
    
    // I'll use the DB script instead.
  } catch (err) {
    console.error(err);
  }
}

// I'll just use Prisma script to check the DB since I have the credentials in .env
