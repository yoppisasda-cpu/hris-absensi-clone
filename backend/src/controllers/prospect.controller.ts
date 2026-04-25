import { Request, Response } from 'express';
import { PrismaClient, ProspectStatus } from '@prisma/client';
import { GoogleMapsService } from '../services/google_maps.service';

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
      res.status(500).json({ error: error.message });
    }
  },

  // Update prospect status (Contacted, Interested, etc.)
  updateStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const prospectId = parseInt(id);

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
        where: { id: parseInt(id) }
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
            where: { id: parseInt(id) },
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
          where: { id: parseInt(id) },
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

  // Delete a prospect
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.prospect.delete({ where: { id: parseInt(id) } });
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
  }
};
