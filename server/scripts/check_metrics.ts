import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const metrics = await prisma.dailyAgentMetric.groupBy({
    by: ['employeeId', 'month', 'year'],
    _count: { _all: true }
  });
  console.log('Metric Groups:', JSON.stringify(metrics, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
