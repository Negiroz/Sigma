const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fromDate = new Date('2026-03-01T00:00:00Z');
    const toDate = new Date('2026-03-31T23:59:59Z');
    
    const matches = await prisma.versusMatch.findMany({
        where: { date: { gte: fromDate, lte: toDate }, status: 'FINISHED' }
    });
    console.log(matches.length, "total matches in March");
}
main();
