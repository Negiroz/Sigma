import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const b1 = await prisma.branchPerformance.aggregate({ where: { month: 2, year: 2026, branch: { companyId: 1 } }, _sum: { installations: true } });
    const e1 = await prisma.installationPerformance.aggregate({ where: { month: 2, year: 2026, team: { companyId: 1 } }, _sum: { installations: true } });
    console.log("C1: ", (b1._sum.installations || 0) + (e1._sum.installations || 0));

    const b2 = await prisma.branchPerformance.aggregate({ where: { month: 2, year: 2026, branch: { companyId: 2 } }, _sum: { installations: true } });
    const e2 = await prisma.installationPerformance.aggregate({ where: { month: 2, year: 2026, team: { companyId: 2 } }, _sum: { installations: true } });
    console.log("C2: ", (b2._sum.installations || 0) + (e2._sum.installations || 0));
}
main().catch(console.error).finally(() => prisma.$disconnect());
