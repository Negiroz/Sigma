import { PrismaClient } from '@prisma/client';
import { resolveDailyVersus } from './src/controllers/versusController';

const prisma = new PrismaClient();

async function main() {
    const d = new Date('2026-03-03T00:00:00.000Z');
    const companies = await prisma.company.findMany();
    for (const company of companies) {
        console.log(`Resolving for company ${company.id} on date ${d.toISOString()}`);
        await resolveDailyVersus(d, company.id);
    }
    console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
