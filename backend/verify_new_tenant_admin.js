
const axios = require('axios');

async function testNewTenantAdmin() {
  const baseURL = 'https://hris-absensi-clone-production.up.railway.app/api';
  const timestamp = Date.now();
  const companyName = `Test Company ${timestamp}`;
  const adminEmail = `admin_${timestamp}@test.com`;
  const adminPassword = 'password123';

  console.log('--- Testing New Tenant Admin Creation ---');
  console.log('Company:', companyName);
  console.log('Admin Email:', adminEmail);

  try {
    // 1. Create Company + Admin
    const res = await axios.post(`${baseURL}/companies`, {
      name: companyName,
      picName: 'Test PIC',
      picPhone: '0812345678',
      contractType: 'LUMSUM',
      contractValue: 1000000,
      employeeLimit: 10,
      adminName: 'Test Admin',
      adminEmail: adminEmail,
      adminPassword: adminPassword
    });

    console.log('Create Response:', res.data.message);
    const companyId = res.data.company.id;

    // 2. Try Login with New Admin
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: adminEmail,
      password: adminPassword
    });

    console.log('Login Success! Token received.');
    console.log('User Role:', loginRes.data.user.role);
    console.log('Linked Company ID:', loginRes.data.user.companyId);

    if (loginRes.data.user.role === 'ADMIN' && loginRes.data.user.companyId === companyId) {
      console.log('✅ VERIFICATION SUCCESSFUL: Admin account created and linked correctly.');
    } else {
      console.log('❌ VERIFICATION FAILED: Data mismatch.');
    }

  } catch (error) {
    console.error('Test Failed:', error.response?.data || error.message);
  }
}

testNewTenantAdmin();
