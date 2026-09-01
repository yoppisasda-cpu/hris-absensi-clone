import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function run() {
    const chat = model.startChat({
        history: [],
        generationConfig: { maxOutputTokens: 1000 },
    });
    try {
        const result = await chat.sendMessage("halo");
        console.log(result.response.text());
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
run();
