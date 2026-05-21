
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCabudare() {
    const now = new Date();
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const endOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));
    
    console.log('Server logic YESTERDAY range:', { yesterday: yesterday.toISOString(), endOfYesterday: endOfYesterday.toISOString() });

    const branch = await prisma.branch.findFirst({ where: { name: 'Cabudare' } });
    if (!branch) {
        console.log('Branch Cabudare not found');
        return;
    }
    console.log('Branch found:', branch);

    const branchMetric = await prisma.dailyBranchMetric.findFirst({
        where: {
            branchId: branch.id,
            date: { gte: yesterday, lte: endOfYesterday }
        }
    });
    console.log('BranchMetric for yesterday:', branchMetric ? { id: branchMetric.id, date: branchMetric.date, revenue: branchMetric.revenue } : 'NONE FOUND');

    // Check all metrics for the branch on the 26th to see if there's any offset
    const allBranchMetrics = await prisma.dailyBranchMetric.findMany({
        where: { branchId: branch.id },
        orderBy: { date: 'desc' },
        take: 5
    });
    console.log('Recent BranchMetrics:', allBranchMetrics.map((m: any) => ({ date: m.date.toISOString(), val: m.revenue })));

    const agents = await prisma.employee.findMany({
        where: { branchId: branch.id, role: 'AGENT', active: true }
    });
    console.log('Active Agents in Cabudare:', agents.map((a: any) => a.name));

    const agentMetrics = await prisma.dailyAgentMetric.findMany({
        where: {
            employee: { branchId: branch.id, role: 'AGENT' },
            date: { gte: yesterday, lte: endOfYesterday }
        },
        include: { employee: true }
    });
    console.log('Agents WITH metrics for yesterday:', agentMetrics.map((m: any) => m.employee.name));
}

checkCabudare().finally(() => prisma.$disconnect()).catch(console.error);
