import { Request, Response } from "express";
import { AIService } from "../services/ai.service";

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const { message, context } = req.body;
      console.log(`[AI Controller] Incoming request - message: "${message?.substring(0, 50)}..."`);

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const reply = await AIService.generateBusinessAdvice(message, context);
      console.log(`[AI Controller] Successfully generated response (${reply?.length} chars)`);
      
      return res.json({ reply });
    } catch (error: any) {
      console.error("[AI Controller Error] Stack:", error?.stack);
      console.error("[AI Controller Error] Message:", error?.message || error);
      return res.status(500).json({ 
        error: "Internal Server Error", 
        details: error?.message,
        type: error?.name
      });
    }
  }
}
