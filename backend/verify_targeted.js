
const axios = require('axios');

const API_URL = 'http://127.0.0.1:3000/api';

async function verifyTargetedExams() {
  try {
    console.log('--- STARTING VERIFICATION ---');

    // 1. Login as Admin
    console.log('Logging in as Admin...');
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'budi@ptmaju.com',
      password: 'password123'
    });
    const adminToken = adminLogin.data.token;
    const adminAuth = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Create Targeted SOP (for "Barista")
    console.log('Creating SOP for "Barista"...');
    const sopRes = await axios.post(`${API_URL}/learning/materials`, {
      title: 'SOP Barista Premium',
      content: 'Standard operating procedure for premium barista only.',
      category: 'SOP',
      targetJobTitle: 'Barista'
    }, adminAuth);
    console.log('SOP Created:', sopRes.data.material.title);

    // 3. Create a Barista User
    console.log('Creating Barista User...');
    try {
      await axios.post(`${API_URL}/users`, {
        name: 'Andi Barista',
        email: 'andi.barista@ptmaju.com',
        password: 'password123',
        jobTitle: 'Barista',
        role: 'EMPLOYEE'
      }, adminAuth);
    } catch (e) {
      console.log('User might already exist, continuing...');
    }

    // 4. Create a Cleaner User
    console.log('Creating Cleaner User...');
    try {
      await axios.post(`${API_URL}/users`, {
        name: 'Budi Cleaner',
        email: 'budi.cleaner@ptmaju.com',
        password: 'password123',
        jobTitle: 'Cleaner',
        role: 'EMPLOYEE'
      }, adminAuth);
    } catch (e) {
      console.log('User might already exist, continuing...');
    }

    // 5. Check as Barista
    console.log('\nChecking as Andi (Barista)...');
    const andiLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'andi.barista@ptmaju.com',
      password: 'password123'
    });
    const andiAuth = { headers: { Authorization: `Bearer ${andiLogin.data.token}` } };
    const andiExams = await axios.get(`${API_URL}/learning/exams`, andiAuth);
    const hasBaristaExam = andiExams.data.some(e => e.title.includes('SOP Barista Premium'));
    console.log('Barista see SOP?', hasBaristaExam ? 'YES (✅ CORRECT)' : 'NO (❌ FAILED)');

    // 6. Check as Cleaner
    console.log('\nChecking as Budi (Cleaner)...');
    const budiLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'budi.cleaner@ptmaju.com',
      password: 'password123'
    });
    const budiAuth = { headers: { Authorization: `Bearer ${budiLogin.data.token}` } };
    const budiExams = await axios.get(`${API_URL}/learning/exams`, budiAuth);
    const cleanerHasBaristaExam = budiExams.data.some(e => e.title.includes('SOP Barista Premium'));
    console.log('Cleaner see Barista SOP?', cleanerHasBaristaExam ? 'YES (❌ FAILED)' : 'NO (✅ CORRECT)');

  } catch (error) {
    console.error('Verification failed:', error.response ? error.response.data : error.message);
  }
}

verifyTargetedExams();
