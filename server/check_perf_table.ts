import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const perf = await prisma.employeePerformance.findMany({
        where: { month: 3, year: 2026 },
        take: 5
    });
    console.log("Employee Performance Examples (March):", JSON.stringify(perf, null, 2));
    
    const count = await prisma.employeePerformance.count({
        where: { month: 3, year: 2026 }
    });
    console.log("Total records for March:", count);

    const nonZero = await prisma.employeePerformance.count({
        where: { month: 3, year: 2026, OR: [{ closings: { gt: 0 } }, { prospects: { gt: 0 } }] }
    });
    console.log("Non-zero records for March:", nonZero);
}
main().catch(console.error).finally(() => prisma.$disconnect());
