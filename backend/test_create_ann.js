const axios = require('axios');

const API_URL = 'http://localhost:5005/api'; // Use local for debugging

async function testCreateAnnouncement() {
  try {
    // 1. Login to get token for yoppi
    // I don't know the password, but I'm SUPERADMIN as owner@aivola.id
    console.log('Logging in as owner...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'owner@aivola.id',
      password: 'admin123'
    });
    const token = loginRes.data.token;

    // 2. Create announcement for company 26
    // Note: tenantMiddleware might restrict this if owner is not in tenant 26 field
    // But SuperAdmin logic in tenantMiddleware usually allows everything
    console.log('Creating announcement for company 26...');
    const annRes = await axios.post(`${API_URL}/announcements`, {
      title: 'TEST ANNOUNCEMENT GEMINI',
      content: 'Hello, this is a test announcement from the AI agent.',
      isPriority: true
    }, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-tenant-id': '26' // If middleware supports override via header
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

testCreateAnnouncement();
