const axios = require('axios');

const API_URL = 'http://localhost:5005/api'; 

const OWNER_EMAIL = 'owner@aivola.id';
const OWNER_PASS = 'admin123';

async function testDeletion() {
    console.log('--- Starting Deletion Verification ---');

    try {
        // 1. Login as Owner
        console.log('Logging in as Owner...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: OWNER_EMAIL,
            password: OWNER_PASS
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('Login Success!');

        // 2. Create Dummy Tenant
        console.log('Creating Dummy Tenant for deletion test...');
        const tenantName = 'DeleteMe_' + Date.now();
        const createRes = await axios.post(`${API_URL}/companies`, {
            name: tenantName,
            picName: 'PIC Delete',
            adminEmail: `tmp_admin_${Date.now()}@test.com`,
            adminPassword: 'password123'
        }, config);
        const tenantId = createRes.data.company.id;
        const adminEmail = createRes.data.admin.email;
        console.log(`Tenant created with ID: ${tenantId}`);

        // 3. Create Dummy Employee in that tenant
        console.log('Creating Dummy Employee in that tenant...');
        const empRes = await axios.post(`${API_URL}/users`, {
            name: 'Emp To Delete',
            email: `tmp_emp_${Date.now()}@test.com`,
            password: 'password123',
            role: 'EMPLOYEE',
            companyId: tenantId
        }, { headers: { ...config.headers, 'x-tenant-id': tenantId.toString() } });
        const empId = empRes.data.user.id;
        console.log(`Employee created with ID: ${empId}`);

        // 4. Delete Employee
        console.log('Deleting Employee...');
        const delEmpRes = await axios.delete(`${API_URL}/users/${empId}`, config);
        console.log('Response:', delEmpRes.data.message);

        // 5. Delete Tenant (Company)
        console.log('Deleting Tenant...');
        const delTenantRes = await axios.delete(`${API_URL}/companies/${tenantId}`, config);
        console.log('Response:', delTenantRes.data.message);

        console.log('\n--- VERIFICATION SUCCESSFUL ---');
    } catch (error) {
        console.error('VERIFICATION FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

testDeletion();
