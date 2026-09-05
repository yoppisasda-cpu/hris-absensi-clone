const fs = require('fs');
let content = fs.readFileSync('backend/server.ts', 'utf-8');

const newRoute = `
// 0. Get Active Banners (Public/Customer)
app.get('/api/customer/banners', tenantMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = Number((req as any).tenantId);
    const banners = await prisma.banner.findMany({
      where: { companyId: tenantId, isActive: true },
      orderBy: { order: 'asc' }
    });
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data banner' });
  }
});

`;

content = content.replace("app.get('/api/customers/me', tenantMiddleware, async (req: Request, res: Response) => {", newRoute + "app.get('/api/customers/me', tenantMiddleware, async (req: Request, res: Response) => {");

fs.writeFileSync('backend/server.ts', content);
