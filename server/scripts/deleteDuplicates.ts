import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Deleting duplicates...');
    const toDelete = [11, 12, 13, 14, 15]; // IDs found in previous step

    // First delete dependent metrics
    await prisma.dailyAgentMetric.deleteMany({
        where: { employeeId: { in: toDelete } }
    });

    // Then delete employees
    const deleted = await prisma.employee.deleteMany({
        where: { id: { in: toDelete } }
    });

    console.log(`Deleted ${deleted.count} duplicate employees.`);
}

main().finally(() => prisma.$disconnect());
