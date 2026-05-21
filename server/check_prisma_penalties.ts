import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const metrics = await prisma.dailyAgentMetric.findMany({
        where: { avoidableTickets: { gt: 0 } },
        orderBy: { id: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(metrics, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
