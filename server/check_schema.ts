import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const b2 = await prisma.branchPerformance.aggregate({ where: { month: 2, year: 2026, branch: { companyId: 2 } }, _sum: { installations: true, revenue: true } });
    console.log("Branch Revenue C2: ", b2._sum.revenue);
}
main().catch(console.error).finally(() => prisma.$disconnect());
