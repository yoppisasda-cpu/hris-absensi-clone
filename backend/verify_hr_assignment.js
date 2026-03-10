
const axios = require('axios');

const API_URL = 'http://127.0.0.1:3000/api';

async function verifyHRAssignedObjective() {
  try {
    console.log('--- STARTING HR ASSIGNMENT VERIFICATION ---');

    // 1. Login as Admin
    console.log('Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'budi@ptmaju.com',
      password: 'password123'
    });
    const adminToken = adminLogin.data.token;
    const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Get a User ID (Andi Barista)
    console.log('Fetching users list...');
    const usersRes = await axios.get(`${API_URL}/users`, adminAuth);
    const andi = usersRes.data.find(u => u.name.includes('Andi'));
    
    if (!andi) {
        console.log('Andi not found, using first user.');
        return;
    }

    // 3. Admin Assigns Objective to Andi
    console.log(`Admin assigning objective to ${andi.name} (ID: ${andi.id})...`);
    const objRes = await axios.post(`${API_URL}/learning/objectives`, {
      title: 'Mastering V60 Brewing',
      description: 'Learn how to brew coffee using V60 method perfectly.',
      category: 'Technical',
      targetUserId: andi.id
    }, adminAuth);
    console.log('Objective Assigned:', objRes.data.title);

    // 4. Login as Andi to Verify
    console.log(`\nLogging in as ${andi.name} to verify...`);
    const andiLogin = await axios.post(`${API_URL}/auth/login`, {
      email: andi.email,
      password: 'password123'
    });
    const andiAuth = { headers: { Authorization: `Bearer ${andiLogin.data.token}` } };
    const andiObjectives = await axios.get(`${API_URL}/learning/objectives`, andiAuth);
    
    const hasTarget = andiObjectives.data.some(o => o.title === 'Mastering V60 Brewing');
    console.log('Does Andi see the assigned target?', hasTarget ? 'YES (✅ SUCCESS)' : 'NO (❌ FAILED)');

  } catch (error) {
    console.error('Verification failed:', error.response ? error.response.data : error.message);
  }
}

verifyHRAssignedObjective();
