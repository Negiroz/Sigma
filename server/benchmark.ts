import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function measure(name: string, fn: () => Promise<any>) {
    const start = Date.now();
    await fn();
    const end = Date.now();
    console.log(`${name} took ${end - start}ms`);
}

async function run() {
    const currentMonth = 3;
    const currentYear = 2026;

    console.log(`Testing with Month: ${currentMonth}, Year: ${currentYear}`);

    await measure('getDashboardSummary equivalents', async () => {
        await prisma.financialData.aggregate({
            where: { month: currentMonth, year: currentYear },
            _sum: { billedAmount: true, collectedInvoices: true, activeClients: true },
            _avg: { churnRate: true, arpu: true }
        });
        await prisma.branchPerformance.aggregate({
            where: { month: currentMonth, year: currentYear },
            _sum: { installations: true, activeClients: true }
        });
        await prisma.installationPerformance.aggregate({
            where: { month: currentMonth, year: currentYear },
            _sum: { installations: true }
        });
        await prisma.dailyAgentMetric.aggregate({
            where: { month: currentMonth, year: currentYear },
            _sum: { closings: true, prospects: true }
        });
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const endDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        await prisma.dailyBranchMetric.aggregate({
            where: { date: { gte: startDate, lt: endDate } },
            _sum: { revenue: true }
        });
    });

    await measure('getBranchTrends equivalents', async () => {
        await prisma.branch.findMany({
            include: {
                performance: {
                    where: {
                        OR: [
                            { month: currentMonth, year: currentYear },
                            { month: 2, year: 2026 },
                            { month: 1, year: 2026 }
                        ]
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
    });

    await measure('getAgentsList / getClosersList equivalents', async () => {
        await prisma.dailyAgentMetric.groupBy({
            by: ['employeeId'],
            where: { month: currentMonth, year: currentYear, employee: { role: 'AGENT' } },
            _sum: { prospects: true, closings: true },
        });
    });

    await measure('getLeaderboard equivalents', async () => {
        await prisma.employee.findMany({
            where: { active: true },
            include: {
                dailyMetrics: {
                    where: { month: currentMonth, year: currentYear }
                }
            }
        });
    });

    // Maybe getMeritHighlights or getDailyMetrics is slow?
    await measure('getDailyMetrics equivalents', async () => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        await prisma.dailyAgentMetric.findMany({
            where: { date: today },
            include: { employee: true }
        });
    });

    await prisma.$disconnect();
}

run().catch(console.error);

    await measure('getPerformanceStats equivalents', async () => {
        const branchPerformance = await prisma.branchPerformance.findMany({
            where: { month: currentMonth, year: currentYear },
            include: { branch: true }
        });
    });

    await measure('getFinancialStats equivalents', async () => {
        const financialData = await prisma.financialData.findFirst({
            where: { month: currentMonth, year: currentYear }
        });
    });

    await measure('getHistoricalStats equivalents', async () => {
        const financialHistory = await prisma.financialData.findMany({
            orderBy: [{ year: 'asc' }, { month: 'asc' }],
            take: 6
        });

        const operationalHistory = await prisma.branchPerformance.groupBy({
            by: ['month', 'year'],
            _sum: { installations: true, activeClients: true },
            orderBy: [{ year: 'asc' }, { month: 'asc' }],
            take: 6
        });
    });
