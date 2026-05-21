import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const performances = await prisma.employeePerformance.findMany({
        take: 10,
        orderBy: { id: 'desc' }
    });
    console.log(JSON.stringify(performances, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
