import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const p1 = await prisma.dailyBranchMetric.aggregate({
        where: { date: { gte: new Date("2026-02-01"), lt: new Date("2026-03-01") }, branch: { companyId: 1 } },
        _sum: { revenue: true }
    });
    console.log("Branch Revenue C1: ", p1._sum);

    const p2 = await prisma.dailyBranchMetric.aggregate({
        where: { date: { gte: new Date("2026-02-01"), lt: new Date("2026-03-01") }, branch: { companyId: 2 } },
        _sum: { revenue: true }
    });
    console.log("Branch Revenue C2: ", p2._sum);
}
main().catch(console.error).finally(() => prisma.$disconnect());
