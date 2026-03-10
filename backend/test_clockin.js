const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';
const EMAIL = 'budi@ptmaju.com';
const PASSWORD = 'password123';
const PHOTO_PATH = 'c:\\Users\\user\\/.gemini\\antigravity\\scratch\\absensi_app\\mobile_app\\android\\app\\src\\main\\res\\mipmap-xxxhdpi\\ic_launcher.png';

async function testClockIn() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: EMAIL,
            password: PASSWORD
        });

        const token = loginRes.data.token;
        console.log('Login successful, token received.');

        const formData = new FormData();
        formData.append('lat', '-6.1754');
        formData.append('lng', '106.8272');
        formData.append('photo', fs.createReadStream(PHOTO_PATH));

        console.log('Performing clock-in with photo...');
        const clockInRes = await axios.post(`${API_URL}/attendance/clock-in`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Clock-in successful!');
        console.log(JSON.stringify(clockInRes.data, null, 2));
    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testClockIn();
