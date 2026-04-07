import { NextFunction, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

import * as bcrypt from 'bcryptjs';

export const checkUserDiagnostic = async (req: Request, res: Response) => {
    try {
        const { email, setPassword } = req.query;
        if (!email) return res.status(400).json({ error: "Email required" });

        const trimmedEmail = (email as string).trim();
        
        console.log("=== CHECKING USER RECORD VIA API ===");
        let exactUser = await prisma.user.findUnique({
            where: { email: trimmedEmail },
            select: { id: true, email: true, name: true, role: true, companyId: true, isActive: true }
        });
        
        // If password reset requested
        if (exactUser && setPassword) {
            const hashedPassword = await bcrypt.hash(setPassword as string, 10);
            await prisma.user.update({
                where: { id: exactUser.id },
                data: { password: hashedPassword }
            });
            return res.json({ message: `Password for ${trimmedEmail} forced reset to: ${setPassword}` });
        }

        const similarUsers = await prisma.user.findMany({
            where: { email: { contains: trimmedEmail.split('@')[0], mode: 'insensitive' } },
            select: { id: true, email: true, name: true, role: true, companyId: true, isActive: true }
        });

        res.json({
            exactMatch: exactUser,
            similarMatches: similarUsers
        });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
};
