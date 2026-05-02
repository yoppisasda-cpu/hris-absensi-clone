import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function directTest() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

    console.log("Testing Direct Fetch (v1)...");
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hello, generate a 1-question JSON array for test." }] }]
        });
        console.log("SUCCESS!");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        console.error("FAILED DIRECT FETCH:", err.response?.data || err.message);
    }
}

directTest();
