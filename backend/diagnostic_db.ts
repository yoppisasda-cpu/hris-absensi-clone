import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
    console.log("--- FETCHING DATA ---");
    const assignments = await p.assignment.findMany({
        include: { user: true, assignedBy: true }
    });
    const scores = await p.kPIScore.findMany({
        include: { indicator: true, user: true }
    });
    const indicators = await p.kPIIndicator.findMany();

    console.log("--- ASSIGNMENTS ---");
    console.log(JSON.stringify(assignments, null, 2));
    
    console.log("--- KPI SCORES ---");
    console.log(JSON.stringify(scores, null, 2));

    console.log("--- KPI INDICATORS ---");
    console.log(JSON.stringify(indicators, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(() => p.$disconnect());
