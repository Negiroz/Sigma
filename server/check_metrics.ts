
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkMetrics() {
    const jeisy = await prisma.employee.findFirst({ where: { name: 'Jeisy Perez' } });
    const greymar = await prisma.employee.findFirst({ where: { name: 'Greymar Mota', currentXp: 1050 } });

    if (jeisy) {
        const metrics = await prisma.dailyAgentMetric.findMany({
            where: { employeeId: jeisy.id, month: 3, year: 2026 }
        });
        console.log('Jeisy Metrics:', JSON.stringify(metrics, null, 2));
    }
    if (greymar) {
        const metrics = await prisma.dailyAgentMetric.findMany({
            where: { employeeId: greymar.id, month: 3, year: 2026 }
        });
        console.log('Greymar Metrics:', JSON.stringify(metrics, null, 2));
    }
}

checkMetrics().finally(() => prisma.$disconnect());
