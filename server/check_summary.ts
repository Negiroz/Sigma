import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const p = await prisma.dailyAgentMetric.aggregate({
        where: { month: 2, year: 2026 },
        _sum: { closings: true, prospects: true, revenue: true }
    });
    console.log("Febrero: ", p._sum);

    const m3 = await prisma.dailyAgentMetric.aggregate({
        where: { month: 3, year: 2026 },
        _sum: { closings: true, prospects: true, revenue: true }
    });
    console.log("Marzo: ", m3._sum);
}
main().catch(console.error).finally(() => prisma.$disconnect());
