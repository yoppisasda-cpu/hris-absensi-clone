import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  console.log("--- GOOGLE AI MODEL DETECTOR ---");
  console.log("API KEY:", API_KEY ? "LOADED" : "MISSING");
  
  try {
    // We'll try to list models. Note: listing models sometimes requires different permissions,
    // so if this fails, we'll try a different approach.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("\nDAFTAR MODEL YANG TERSEDIA UNTUK ANDA:");
      data.models.forEach((m: any) => {
        console.log(`- ${m.name.split('/').pop()} (Supported: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log("\nError dari Google:", JSON.stringify(data, null, 2));
    }
  } catch (error: any) {
    console.error("\nGagal mendeteksi model:", error.message);
  }
}

listModels();
