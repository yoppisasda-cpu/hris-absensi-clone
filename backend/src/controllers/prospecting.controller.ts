import { Request, Response } from "express";
import { ProspectingService } from "../services/prospecting.service";

export class ProspectingController {
  static async getCompetitors(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const competitors = await ProspectingService.getCompetitors(tenantId);
      return res.json(competitors);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async addCompetitor(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const competitor = await ProspectingService.addCompetitor(tenantId, req.body);
      return res.status(201).json(competitor);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async deleteCompetitor(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const id = Number(req.params.id);
      await ProspectingService.deleteCompetitor(tenantId, id);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getAdvice(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { clusterName } = req.body;
      const advice = await ProspectingService.getExpansionAdvice(tenantId, clusterName || "Jabodetabek");
      return res.json({ advice });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
