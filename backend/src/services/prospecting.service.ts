import { PrismaClient } from "@prisma/client";
import { AIService } from "./ai.service";

const prisma = new PrismaClient();

export class ProspectingService {
  static async getCompetitors(companyId: number) {
    return prisma.competitor.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async addCompetitor(companyId: number, data: {
    name: string;
    brand?: string;
    lat: number;
    lng: number;
    category?: string;
    strength?: number;
    notes?: string;
  }) {
    return prisma.competitor.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  static async deleteCompetitor(companyId: number, id: number) {
    return prisma.competitor.deleteMany({
      where: { id, companyId }
    });
  }

  static async getExpansionAdvice(companyId: number, clusterName: string) {
    const competitors = await prisma.competitor.findMany({
      where: { companyId }
    });

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { latitude: true, longitude: true, name: true }
    });

    const context = {
      clusterName,
      competitorCount: competitors.length,
      competitors: competitors.map(c => ({
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        strength: c.strength
      })),
      currentLocation: company ? { lat: company.latitude, lng: company.longitude } : null
    };

    const prompt = `
      You are Aivola Expansion Scout. Based on the provided competitor map data in the "${clusterName}" cluster, 
      provide a professional strategic recommendation for opening a new business outlet.
      
      Analyze:
      1. Competitor Density: Where are the clusters of competitors?
      2. White Space: Where are the gaps in the market?
      3. Strategic Fit: Which area is most promising for ${company?.name || 'our company'}?

      Format your response in Indonesian. Provide:
      - Market Saturation Score (0-100)
      - Top 2 Recommended Expansion Zones (with lat/lng hints if possible)
      - Strategic justification for each.
    `;

    return AIService.generateBusinessAdvice(prompt, context);
  }
}
