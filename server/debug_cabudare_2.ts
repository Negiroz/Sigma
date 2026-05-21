
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCabudare() {
    const branch = await prisma.branch.findFirst({ where: { name: 'Cabudare' } });
    const employees = await prisma.employee.findMany({
        where: { branchId: branch.id }
    });
    console.log('ALL employees in Cabudare:', employees.map((e: any) => ({ 
        id: e.id, 
        name: e.name, 
        role: e.role, 
        active: e.active 
    })));

    const now = new Date();
    const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const endOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));

    const metrics = await prisma.dailyAgentMetric.findMany({
        where: { 
            employee: { branchId: branch.id },
            date: { gte: yesterday, lte: endOfYesterday }
        },
        include: { employee: true }
    });
    console.log('Metrics found for Cabudare on the 26th:', metrics.map((m: any) => ({
        id: m.id,
        empName: m.employee.name,
        date: m.date.toISOString()
    })));
}

checkCabudare().finally(() => prisma.$disconnect());
