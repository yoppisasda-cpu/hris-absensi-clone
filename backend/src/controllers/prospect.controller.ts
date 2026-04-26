import { Request, Response } from 'express';
import { PrismaClient, ProspectStatus } from '@prisma/client';
import { GoogleMapsService } from '../services/google_maps.service';
import { sendWhatsAppMessage } from '../../whatsappAPI';
import { GoogleGenerativeAI } from '@google/generative-ai';

const prisma = new PrismaClient();

export const ProspectController = {
  // Save a new prospect from Google Maps scan
  create: async (req: Request, res: Response) => {
    try {
      console.log('📥 [PROSPECT] Creating new prospect...');
      const tenantId = req.headers['x-tenant-id'];
      const companyId = parseInt(Array.isArray(tenantId) ? tenantId[0] : (tenantId as string || '0'));
      if (!companyId || companyId === 0) return res.status(400).json({ error: 'Missing x-tenant-id' });

      const { name, phone, email, address, category, website, instagram, latitude, longitude, aiScore } = req.body;

      const prospect = await prisma.prospect.create({
        data: {
          companyId,
          name,
          phone,
          email,
          address,
          category,
          website,
          instagram,
          latitude,
          longitude,
          aiScore,
          status: 'NEW'
        }
      });

      res.status(201).json(prospect);
    } catch (error: any) {
      console.error('Error creating prospect:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get all prospects for a company
  getAll: async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const companyId = parseInt(Array.isArray(tenantId) ? tenantId[0] : (tenantId as string || '0'));
      if (!companyId || companyId === 0) return res.status(400).json({ error: 'Missing x-tenant-id' });

      const prospects = await prisma.prospect.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' }
      });

      res.json(prospects);
    } catch (error: any) {
      console.error('❌ [PROSPECT GET ALL ERROR]:', error);
      res.status(500).json({ 
        error: 'Gagal mengambil data prospek dari database.',
        details: error.message 
      });
    }
  },

  // Update prospect status (Contacted, Interested, etc.)
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const prospectId = parseInt(id as string);

      // 1. Get the prospect first to check data
      const prospectData = await prisma.prospect.findUnique({
        where: { id: prospectId }
      });

      if (!prospectData) return res.status(404).json({ error: 'Prospect not found' });

      // 2. If status is DEAL, ensure customer record exists
      if (status === 'DEAL') {
        console.log(`✨ [PROSPECT] Ensuring ${prospectData.name} is a Customer...`);
        
        // Check if customer already exists for this phone to avoid duplication error
        const existingCustomer = prospectData.phone 
          ? await prisma.customer.findUnique({
              where: { 
                companyId_phone: { 
                  companyId: prospectData.companyId, 
                  phone: prospectData.phone 
                } 
              }
            })
          : null;

        if (!existingCustomer) {
          await prisma.customer.create({
            data: {
              companyId: prospectData.companyId,
              name: prospectData.name,
              phone: prospectData.phone,
              email: prospectData.email,
              address: prospectData.address,
              isMember: true
            }
          });
        }
      }

      // 3. Update the prospect status/notes
      const updatedProspect = await prisma.prospect.update({
        where: { id: prospectId },
        data: { 
          status: status as ProspectStatus,
          notes: notes !== undefined ? notes : prospectData.notes
        }
      });

      res.json(updatedProspect);
    } catch (error: any) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // CONVERT PROSPECT TO CUSTOMER (The magic part!)
  convertToCustomer: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // 1. Get the prospect data
      const prospect = await prisma.prospect.findUnique({
        where: { id: parseInt(id as string) }
      });

      if (!prospect) return res.status(404).json({ error: 'Prospect not found' });

      // 2. Create customer record with Idempotency check
      const result = await prisma.$transaction(async (tx) => {
        // Check if customer already exists for this phone
        const existingCustomer = prospect.phone 
          ? await tx.customer.findUnique({
              where: { 
                companyId_phone: { 
                  companyId: prospect.companyId, 
                  phone: prospect.phone 
                } 
              }
            })
          : null;

        if (existingCustomer) {
          // If exists, just update it to ensure address/name are fresh
          const updatedCustomer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              name: prospect.name,
              address: prospect.address,
              email: prospect.email || existingCustomer.email
            }
          });

          // Also make sure prospect is DEAL
          await tx.prospect.update({
            where: { id: parseInt(id as string) },
            data: { status: 'DEAL' }
          });

          return updatedCustomer;
        }

        const customer = await tx.customer.create({
          data: {
            companyId: prospect.companyId,
            name: prospect.name,
            phone: prospect.phone,
            email: prospect.email,
            address: prospect.address,
            isMember: true 
          }
        });

        // 3. Mark prospect as converted
        await tx.prospect.update({
          where: { id: parseInt(id as string) },
          data: { status: 'DEAL' }
        });

        return customer;
      });

      res.json({ message: 'Successfully converted to customer', customer: result });
    } catch (error: any) {
      console.error('Error converting prospect:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // BROADCAST MESSAGE VIA WABLAS (The automatic outreach!)
  broadcast: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      // 1. Get prospect
      const prospect = await prisma.prospect.findUnique({
        where: { id: parseInt(id as string) }
      });

      if (!prospect || !prospect.phone) {
        return res.status(404).json({ error: 'Prospek tidak ditemukan atau tidak memiliki nomor HP' });
      }

      // 2. Get Company for template
      const company = await prisma.company.findUnique({
        where: { id: prospect.companyId },
        select: { waProspectTemplate: true, name: true }
      });

      // 3. Generate message (Prefer company template, then fallback)
      let finalMessage = company?.waProspectTemplate || `Halo *{{name}}*,\n\nKami dari *Aivola* (Sistem Manajemen & POS Digital) tertarik untuk membantu mengoptimalkan bisnis Anda.\n\nApakah Anda ada waktu sebentar untuk berdiskusi mengenai solusi digital untuk operasional Anda?\n\nTerima kasih!`;

      // Replace placeholders
      finalMessage = finalMessage.replace(/{{name}}/g, prospect.name);

      console.log(`📡 [PROSPECT] Sending Auto-Broadcast to ${prospect.phone}...`);
      
      // 4. Send via central Wablas (passing undefined for custom credentials to use .env)
      const result = await sendWhatsAppMessage(prospect.phone, finalMessage);

      if (result?.status) {
        // Update status to contacted
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: { status: 'CONTACTED' }
        });
      }

      res.json({ message: 'Pesan otomatis berhasil dikirim', result });
    } catch (error: any) {
      console.error('Error broadcasting prospect:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Delete a prospect
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.prospect.delete({ where: { id: parseInt(id as string) } });
      res.json({ message: 'Prospect deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  // SCAN LIVE FROM GOOGLE MAPS
  scan: async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const companyId = parseInt(Array.isArray(tenantId) ? tenantId[0] : (tenantId as string || '0'));
      const { latitude, longitude, radius, category } = req.body;

      if (!companyId || isNaN(companyId)) {
        return res.status(401).json({ error: 'Sesi anda berakhir atau ID Perusahaan tidak ditemukan. Silakan login ulang.' });
      }

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and Longitude are required' });
      }

      // Security: Check if company has permission for Prospecting AI
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { addons: true }
      });

      const hasAccess = company?.addons.includes('PROSPECTING_AI');

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access Denied', 
          message: 'Fitur Prospecting AI belum aktif. Silakan hubungi Admin untuk aktivasi modul Add-on ini.' 
        });
      }

      const basicResults = await GoogleMapsService.nearbySearch(
        parseFloat(latitude),
        parseFloat(longitude),
        parseInt(radius) || 1000,
        category || 'Restoran'
      );

      console.log(`📡 [PROSPECT] Found ${basicResults.length} basic results. Fetching details...`);

      // Enhance with details (phone, website)
      const results = await Promise.all(basicResults.map(async (item: any) => {
        try {
          const details = await GoogleMapsService.getPlaceDetails(item.placeId);
          return {
            ...item,
            phone: details.formatted_phone_number || details.international_phone_number || null,
            website: details.website || details.url || null
          };
        } catch (e) {
          return item;
        }
      }));

      res.json(results);
    } catch (error: any) {
      console.error('Scan Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // ANALYZE MARKET INSIGHTS USING GEMINI AI
  analyzeMarket: async (req: Request, res: Response) => {
    try {
      const tenantId = req.headers['x-tenant-id'];
      const companyId = parseInt(Array.isArray(tenantId) ? tenantId[0] : (tenantId as string || '0'));
      const { prospects: liveProspects } = req.body;
      
      let prospectsToAnalyze = [];

      if (liveProspects && Array.isArray(liveProspects) && liveProspects.length > 0) {
        // Use live data from radar scan
        const ts = new Date().toLocaleTimeString();
        console.log(`🧠 [AI ANALYZER - ${ts}] Analyzing LIVE data (${liveProspects.length} points) for Company #${companyId}...`);
        prospectsToAnalyze = liveProspects;
      } else {
        // Fallback to database leads
        console.log(`🧠 [AI ANALYZER] Analyzing DATABASE leads for Company #${companyId}...`);
        prospectsToAnalyze = await prisma.prospect.findMany({
          where: { companyId }
        });
      }

      if (prospectsToAnalyze.length === 0) {
        return res.status(400).json({ error: 'Belum ada data prospek/radar untuk dianalisa. Silakan lakukan scan radar terlebih dahulu.' });
      }

      // Initialize Gemini
      const apiKey = process.env.GEMINI_API_KEY;
      console.log(`🔑 [DEBUG] GEMINI_API_KEY present: ${!!apiKey} (Starts with: ${apiKey?.substring(0, 5)}...)`);
      
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY tidak ditemukan di environment variables backend.' });
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = 'gemini-1.0-pro';
      console.log(`🤖 [DEBUG] Requesting Gemini Model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Calculate some basic stats
      const avgRating = prospectsToAnalyze.reduce((acc, p) => acc + (p.aiScore || p.rating || 0), 0) / prospectsToAnalyze.length;
      const topCompetitors = [...prospectsToAnalyze]
        .sort((a, b) => (b.aiScore || b.rating || 0) - (a.aiScore || a.rating || 0))
        .slice(0, 5)
        .map(p => `- ${p.name} (Rating: ${p.aiScore || p.rating}, Alamat: ${p.address})`)
        .join('\n');

      const prompt = `
        Anda adalah Konsultan Strategi Bisnis Senior untuk Aivola (Sistem Manajemen & POS Digital).
        Anda diberikan data hasil "Scan Radar" kompetitor di sekitar lokasi bisnis klien.

        STATISTIK DATA:
        - Total Kompetitor Ditemukan: ${prospectsToAnalyze.length}
        - Rata-rata Rating Kompetitor: ${avgRating.toFixed(1)} / 5.0
        
        5 KOMPETITOR TERKUAT (BERDASARKAN RATING):
        ${topCompetitors}

        TUGAS ANDA:
        Berikan laporan analisa pasar yang mendalam, profesional, dan persuasif dalam Bahasa Indonesia.
        Laporan harus mencakup:
        1. **Kepadatan Pasar**: Analisa seberapa ketat persaingan di area tersebut.
        2. **Kekuatan Kompetitor**: Apa yang membuat kompetitor teratas unggul berdasarkan data tersebut.
        3. **Celah Peluang (Market Gap)**: Identifikasi peluang yang bisa diambil (misal: area yang belum tercover, atau memanfaatkan kelemahan kompetitor dengan rating rendah).
        4. **Strategi Pemenangan**: Berikan 3-5 langkah konkrit agar klien kami bisa mendominasi area tersebut menggunakan solusi digital Aivola.
        
        Gunakan format Markdown yang sangat rapi dan estetik. Tambahkan emoji yang relevan agar menarik dibaca oleh Owner bisnis.
      `;

      const result = await model.generateContent(prompt);
      const analysis = result.response.text();

      res.json({ analysis });
    } catch (error: any) {
      console.error('❌ [AI ANALYZER ERROR]:', error);
      res.status(500).json({ 
        error: '❌ AI ERROR [V4] - Gagal melakukan analisa AI. Pastikan GEMINI_API_KEY sudah terpasang dengan benar.',
        details: error.message 
      });
    }
  }
};
