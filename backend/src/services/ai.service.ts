import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Load .env from the backend root directory using absolute path
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

console.log(`[AI Service] SDK Initialized. API Key status: ${API_KEY ? "LOADED (" + API_KEY.substring(0, 8) + "...)" : "MISSING"}`);

export class AIService {
  static async generateBusinessAdvice(userQuery: string, context: any, isJson: boolean = false) {
    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: isJson ? { responseMimeType: "application/json" } : undefined,
        systemInstruction: `
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
        `
      });

      const response = await model.generateContent(userQuery);
      const text = response.response.text();

      if (!text) {
        throw new Error("Empty response from Gemini SDK");
      }

      console.log(`[AI Service] SDK Response generated successfully (${text.length} chars)`);
      return text;
    } catch (error: any) {
      console.error("[AI Service SDK Error]:", error.message);
      throw error;
    }
  }
}
