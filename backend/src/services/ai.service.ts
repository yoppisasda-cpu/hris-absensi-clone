import dotenv from "dotenv";
import path from "path";

// Load .env from the backend root directory using absolute path
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Fallback jika dotenv gagal memuat key
const API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAjuBnd3HclYPs8hPtmEzES1jAMiwqFw8c";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

console.log(`[AI Service] GEMINI_API_KEY status: ${API_KEY ? "LOADED (" + API_KEY.substring(0, 8) + "...)" : "MISSING"}`);

export class AIService {
  static async generateBusinessAdvice(userQuery: string, context: any) {
    const systemPrompt = `
      You are Aivola AI Strategic Assistant, an elite business consultant specialized in:
      1. HRIS & Absensi: Anti-fraud (face recognition), KPI, and productivity analysis.
      2. Payroll: BPJS, PPh21, and automated salary calculation.
      3. Finance (AR/AP): Accounts Receivable, Accounts Payable, and "Tukar Faktur" (Invoice Exchange) analysis.
      4. Business Intelligence: Forecasting revenue, stock burn rate, and operational efficiency.

      Your tone is professional, strategic, and highly analytical.
      
      CONTEXT DATA FROM DASHBOARD:
      ${JSON.stringify(context, null, 2)}
      
      INSTRUCTIONS:
      1. Use the provided context data to give specific, data-driven advice.
      2. Reference specific numbers, names (if any), or categories from the context.
      3. If the user asks about Tukar Faktur or Piutang (AR), provide expert-level strategic advice.
      4. Keep responses concise but impactful.
      5. Answer in the same language as the user (Indonesian preferred for this client).
    `;

    const body = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nUser Question: ${userQuery}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Service] Gemini API Error ${response.status}:`, errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    console.log(`[AI Service] Response generated successfully (${text.length} chars)`);
    return text;
  }
}
