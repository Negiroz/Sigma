import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const now = new Date();
    console.log('Current Date:', now);

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        const startDate = new Date(Date.UTC(y, m - 1, 1));
        const endDate = new Date(Date.UTC(y, m, 1));

        const revenueAgg = await prisma.dailyBranchMetric.aggregate({
            where: {
                date: { gte: startDate, lt: endDate }
            },
            _sum: { revenue: true }
        });

        console.log(`Month ${m}/${y}:`, revenueAgg._sum.revenue);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
