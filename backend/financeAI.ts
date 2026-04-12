
import { PrismaClient } from '@prisma/client';
import { AIService } from './src/services/ai.service';

const prisma = new PrismaClient();

export interface PredictiveResult {
    forecast: {
        next30DaysBalance: number;
        confidenceScore: number;
        trend: 'UP' | 'DOWN' | 'STABLE';
    };
    anomalies: {
        date: string;
        amount: number;
        category: string;
        reason: string;
    }[];
    strategicAdvice: string;
}

/**
 * Melakukan analisis prediktif terhadap data keuangan perusahaan
 */
export async function getFinancialForecast(tenantId: number): Promise<any> {
    try {
        // 1. Ambil data historis (Pemasukan & Pengeluaran 3 bulan terakhir)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const incomes = await prisma.income.findMany({
            where: { companyId: tenantId, date: { gte: ninetyDaysAgo } },
            orderBy: { date: 'asc' },
            select: { amount: true, date: true, category: true }
        });

        const expenses = await prisma.expense.findMany({
            where: { companyId: tenantId, date: { gte: ninetyDaysAgo } },
            orderBy: { date: 'asc' },
            select: { amount: true, date: true, category: true }
        });

        const accounts = await prisma.financialAccount.findMany({
            where: { companyId: tenantId },
            select: { balance: true, name: true }
        });

        const currentBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

        // 2. Siapkan Context untuk Gemini
        const context = {
            currentBalance,
            historicalIncomes: incomes.map(i => ({ date: i.date.toISOString().split('T')[0], amount: Number(i.amount), cat: i.category })),
            historicalExpenses: expenses.map(e => ({ date: e.date.toISOString().split('T')[0], amount: Number(e.amount), cat: e.category })),
            accountSnapshot: accounts.map(a => ({ name: a.name, balance: Number(a.balance) }))
        };

        const prompt = `
            Analyze the following financial data for a company. 
            Your task:
            1. Forecast the likely cash balance in the next 30 days based on moving averages and trends.
            2. Detect any spending anomalies (unexpected spikes) in the last 14 days.
            3. Provide 3 specific strategic actions the business owner should take to improve cashflow.

            Respond ONLY in JSON format with this structure:
            {
                "forecast": { "next30DaysBalance": number, "trend": "UP" | "DOWN" | "STABLE", "confidence": number },
                "anomalies": [ { "date": string, "amount": number, "category": string, "reason": string } ],
                "strategicAdvice": string (Markdown format)
            }
            Language: Indonesian.
        `;

        const aiResponseText = await AIService.generateBusinessAdvice(prompt, context);
        
        // Bersihkan response dari markdown code blocks jika ada
        const cleanedJson = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);

    } catch (error) {
        console.error('[Finance AI] Error:', error);
        throw error;
    }
}

/**
 * Menyusun data arus kas untuk visualisasi Sankey (Alur Keuangan)
 */
export async function getFinancialFlow(tenantId: number): Promise<any> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Ambil semua data pemasukan dan pengeluaran 30 hari terakhir
        const rawIncomes = await prisma.income.findMany({
            where: { companyId: tenantId, date: { gte: thirtyDaysAgo } },
            select: { categoryId: true, amount: true }
        });

        const rawExpenses = await prisma.expense.findMany({
            where: { companyId: tenantId, date: { gte: thirtyDaysAgo } },
            select: { categoryId: true, amount: true }
        });

        // Agregasi manual (lebih stabil daripada groupBy pada beberapa env)
        const incomesMap: Record<number, number> = {};
        rawIncomes.forEach(i => {
            incomesMap[i.categoryId] = (incomesMap[i.categoryId] || 0) + Number(i.amount);
        });

        const expensesMap: Record<number, number> = {};
        rawExpenses.forEach(e => {
            expensesMap[e.categoryId] = (expensesMap[e.categoryId] || 0) + Number(e.amount);
        });

        const incomeCategoryIds = Object.keys(incomesMap).map(Number);
        const expenseCategoryIds = Object.keys(expensesMap).map(Number);

        // Fetch category names for mapping
        const incomeCats = incomeCategoryIds.length > 0 ? await prisma.incomeCategory.findMany({
            where: { id: { in: incomeCategoryIds } }
        }) : [];

        const expenseCats = expenseCategoryIds.length > 0 ? await prisma.expenseCategory.findMany({
            where: { id: { in: expenseCategoryIds } }
        }) : [];

        const nodes: any[] = [{ name: 'Kas Aivola' }];
        const links: any[] = [];

        let totalIncome = 0;
        let totalExpense = 0;

        // 1. Incomes -> Wallet
        Object.entries(incomesMap).forEach(([catIdStr, amount]) => {
            const catId = Number(catIdStr);
            if (amount > 0) {
                totalIncome += amount;
                const catName = incomeCats.find(c => c.id === catId)?.name || `Income #${catId}`;
                nodes.push({ name: catName });
                links.push({
                    source: nodes.length - 1,
                    target: 0,
                    value: amount
                });
            }
        });

        // 2. Wallet -> Expenses
        Object.entries(expensesMap).forEach(([catIdStr, amount]) => {
            const catId = Number(catIdStr);
            if (amount > 0) {
                totalExpense += amount;
                const catName = expenseCats.find(c => c.id === catId)?.name || `Expense #${catId}`;
                nodes.push({ name: catName });
                links.push({
                    source: 0,
                    target: nodes.length - 1,
                    value: amount
                });
            }
        });

        // 3. Wallet -> Profit (If any)
        const profit = totalIncome - totalExpense;
        if (profit > 0) {
            nodes.push({ name: 'Laba Bersih' });
            links.push({
                source: 0,
                target: nodes.length - 1,
                value: profit
            });
        }

        return { nodes, links };
    } catch (error) {
        console.error('[Finance Flow AI] Error:', error);
        throw error;
    }
}

/**
 * Menganalisis korelasi antara biaya gaji, omzet, dan performa karyawan (KPI/Absensi)
 */
export async function getPayrollProductivityInsights(tenantIdInput: any): Promise<any> {
    try {
        const tenantId = Number(tenantIdInput);
        if (isNaN(tenantId)) {
            throw new Error('Invalid Tenant ID');
        }

        const monthsRange = 6;
        const now = new Date();
        const startOfAnalysis = new Date(now.getFullYear(), now.getMonth() - monthsRange, 1);

        // 1. Data Payroll (Biaya Gaji & Bonus)
        const payrolls = await prisma.payroll.findMany({
            where: { 
                companyId: tenantId, 
                OR: [
                    { year: now.getFullYear(), month: { lte: now.getMonth() + 1 } },
                    { year: { gte: startOfAnalysis.getFullYear(), lt: now.getFullYear() } }
                ]
            },
            select: { month: true, year: true, netSalary: true, bonusPay: true, overtimePay: true }
        });

        // 2. Data Penjualan (Omzet)
        const sales = await prisma.sale.findMany({
            where: { companyId: tenantId, date: { gte: startOfAnalysis } },
            select: { date: true, totalAmount: true }
        });

        // 3. Data KPI (Performa)
        const kpiScores = await prisma.kPIScore.findMany({
            where: { 
                companyId: tenantId,
                OR: [
                    { year: now.getFullYear(), month: { lte: now.getMonth() + 1 } },
                    { year: { gte: startOfAnalysis.getFullYear(), lt: now.getFullYear() } }
                ]
            },
            select: { month: true, year: true, score: true }
        });

        // 4. Data Absensi (Kedisiplinan)
        const attendances = await prisma.attendance.findMany({
            where: { companyId: tenantId, clockIn: { gte: startOfAnalysis } },
            select: { clockIn: true, status: true }
        });

        // Agregasi Bulanan untuk Context AI
        const monthlyData: Record<string, any> = {};

        for (let i = monthsRange; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            monthlyData[key] = {
                payrollCost: 0,
                bonusPaid: 0,
                overtimePaid: 0,
                totalRevenue: 0,
                avgKPIScore: 0,
                attendanceRate: 0,
                kpiCount: 0,
                attCount: 0,
                attPresent: 0
            };
        }

        payrolls.forEach(p => {
            const key = `${p.year}-${p.month.toString().padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].payrollCost += p.netSalary;
                monthlyData[key].bonusPaid += p.bonusPay;
                monthlyData[key].overtimePaid += p.overtimePay;
            }
        });

        sales.forEach(s => {
            const key = `${s.date.getFullYear()}-${(s.date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (monthlyData[key]) monthlyData[key].totalRevenue += s.totalAmount;
        });

        kpiScores.forEach(k => {
            const key = `${k.year}-${k.month.toString().padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].avgKPIScore += k.score;
                monthlyData[key].kpiCount += 1;
            }
        });

        attendances.forEach(a => {
            const key = `${a.clockIn.getFullYear()}-${(a.clockIn.getMonth() + 1).toString().padStart(2, '0')}`;
            if (monthlyData[key]) {
                monthlyData[key].attCount += 1;
                if (a.status === 'PRESENT' || a.status === 'LATE') monthlyData[key].attPresent += 1;
            }
        });

        // Finalize averages
        const finalContext = Object.entries(monthlyData).map(([period, data]) => ({
            period,
            revenue: data.totalRevenue,
            payroll: data.payrollCost,
            bonus: data.bonusPaid,
            overtime: data.overtimePaid,
            avgKPI: data.kpiCount > 0 ? data.avgKPIScore / data.kpiCount : 0,
            attendanceRate: data.attCount > 0 ? (data.attPresent / data.attCount) * 100 : 0
        }));

        const prompt = `
            Analyze the relationship between Payroll Costs, Employee Performance (KPI/Attendance), and Business Productivity (Revenue).
            
            Task:
            1. Calculate the 'Human Capital ROI' (Revenue per Salary Rupiah) and its trend.
            2. Evaluate 'Bonus Effectiveness': Did higher bonus periods correlate with higher revenue or KPI scores?
            3. Identify efficiency leaks (e.g., high overtime without revenue growth).
            4. Provide 3 high-impact strategic recommendations for the CEO.

            Respond only in JSON:
            {
                "productivityScore": number (0-100),
                "productivityTrend": "IMPROVING" | "DECLINING" | "STABLE",
                "roiValue": number (Revenue/Payroll ratio),
                "insights": [
                    { "title": string, "description": string, "impact": "HIGH" | "MEDIUM" | "LOW" }
                ],
                "recommendations": [ string ],
                "performanceVsCostAnalysis": string (Markdown summary)
            }
            Language: Indonesian.
        `;

        const aiResponseText = await AIService.generateBusinessAdvice(prompt, finalContext, true);
        
        try {
            return JSON.parse(aiResponseText);
        } catch (jsonErr) {
            console.error('[AI Parser Error] Raw Response:', aiResponseText);
            // Return a safe fallback instead of throwing
            return {
                productivityScore: 0,
                productivityTrend: "STABLE",
                roiValue: 0,
                insights: [{ title: "Analisis Tertunda", description: "AI memberikan respon dalam format yang tidak didukung. Mohon coba sesaat lagi.", impact: "LOW" }],
                recommendations: ["Mohon muat ulang halaman untuk mencoba analisis kembali."],
                performanceVsCostAnalysis: "Terjadi kesalahan teknis saat memproses format data AI."
            };
        }

    } catch (error) {
        console.error('[Payroll AI Insight Global Error]:', error);
        return {
            productivityScore: 0,
            productivityTrend: "STABLE",
            roiValue: 0,
            insights: [{ title: "Layanan Sibuk", description: "Sistem membutuhkan waktu lebih lama untuk menganalisis data Anda. Mohon tunggu sejenak.", impact: "LOW" }],
            recommendations: ["Refresh halaman dalam beberapa saat."],
            performanceVsCostAnalysis: "Koneksi ke otak AI sedang dioptimalisasi."
        };
    }
}

/**
 * Menganalisis skor kesehatan keuangan perusahaan secara menyeluruh
 */
export async function getFinancialHealthScore(tenantIdInput: any): Promise<any> {
    try {
        const tenantId = Number(tenantIdInput);
        if (isNaN(tenantId)) throw new Error('Invalid Tenant ID');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Data Likuiditas (Saldo Kas & Bank)
        const accounts = await prisma.financialAccount.findMany({
            where: { companyId: tenantId },
            select: { balance: true, name: true }
        });
        const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

        // 2. Data Penjualan & Pendapatan (Bulan Ini)
        const [sales, incomes] = await Promise.all([
            prisma.sale.findMany({
                where: { companyId: tenantId, date: { gte: startOfMonth } },
                select: { totalAmount: true }
            }),
            prisma.income.findMany({
                where: { companyId: tenantId, date: { gte: startOfMonth } },
                select: { amount: true }
            })
        ]);
        const monthlyRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0) + incomes.reduce((sum, i) => sum + i.amount, 0);

        // 3. Data Pengeluaran (Bulan Ini)
        const expenses = await prisma.expense.findMany({
            where: { companyId: tenantId, date: { gte: startOfMonth } },
            select: { amount: true, status: true }
        });
        const paidExpenses = expenses.filter(e => e.status === 'PAID').reduce((sum, e) => sum + e.amount, 0);
        const pendingExpenses = expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0); // Account Payables

        // 4. Data Piutang (Status Unpaid Sales)
        const unpaidSales = await prisma.sale.findMany({
            where: { companyId: tenantId, status: 'UNPAID' },
            select: { totalAmount: true }
        });
        const totalReceivables = unpaidSales.reduce((sum, s) => sum + s.totalAmount, 0);

        // 5. Informasi Modal Perusahaan
        const company = await prisma.company.findUnique({
            where: { id: tenantId },
            select: { authorizedCapital: true, name: true }
        });

        // 6. Prompt untuk AI
        const finalContext = {
            companyName: company?.name || "Perusahaan",
            liquidity: {
                totalCash: totalBalance,
                accounts: accounts.map(a => ({ name: a.name, balance: a.balance }))
            },
            performance: {
                revenueThisMonth: monthlyRevenue,
                expensesPaidThisMonth: paidExpenses
            },
            liabilities: {
                pendingPayables: pendingExpenses,
                totalReceivables: totalReceivables
            },
            capital: {
                authorizedCapital: company?.authorizedCapital || 0
            }
        };

        const prompt = `
            Analyze the financial health of ${finalContext.companyName} based on the following metrics:
            - Net Liquidity: ${finalContext.liquidity.totalCash}
            - Monthly Revenue: ${finalContext.performance.revenueThisMonth}
            - Monthly Expenses: ${finalContext.performance.expensesPaidThisMonth}
            - Accounts Payable (Outstanding Bills): ${finalContext.liabilities.pendingPayables}
            - Accounts Receivable (Uncollected Revenue): ${finalContext.liabilities.totalReceivables}
            - Authorized Capital: ${finalContext.capital.authorizedCapital}

            Return a detailed financial health report in JSON format:
            {
                "overallScore": number (0-100),
                "status": "EXCELLENT" | "GOOD" | "STABLE" | "WARNING" | "CRITICAL",
                "ratios": {
                    "liquidityRatio": number,
                    "profitMargin": number,
                    "debtToRevenue": number
                },
                "analysis": "A concise executive summary of why the score is what it is.",
                "redFlags": ["List of urgent financial risks if any"],
                "opportunities": ["List of potential areas for improvement or investment"],
                "recommendation": "Strategic advice for the next 30 days."
            }
            Language: Indonesian.
        `;

        const aiResponseText = await AIService.generateBusinessAdvice(prompt, finalContext, true);
        
        try {
            return JSON.parse(aiResponseText);
        } catch (jsonErr) {
            console.error('[Health Score Parser Error]:', aiResponseText);
            return {
                overallScore: 50,
                status: "STABLE",
                ratios: { liquidityRatio: 0, profitMargin: 0, debtToRevenue: 0 },
                analysis: "Analisis kesehatan keuangan saat ini sedang diproses ulang.",
                redFlags: [],
                opportunities: [],
                recommendation: "Mohon tunggu sejenak untuk pembaharuan data AI."
            };
        }

    } catch (error) {
        console.error('[Financial Health AI Error]:', error);
        return {
            overallScore: 0,
            status: "WARNING",
            ratios: { liquidityRatio: 0, profitMargin: 0, debtToRevenue: 0 },
            analysis: "Gagal menghubungkan ke layanan intelijen keuangan.",
            redFlags: ["Koneksi Database/AI Terputus"],
            opportunities: [],
            recommendation: "Coba muat ulang dashboard."
        };
    }
}
