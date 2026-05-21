import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log("--- FEBRUARY 2026 ---");
    const perfFeb = await prisma.employeePerformance.findMany({
        where: { month: 2, year: 2026 },
        take: 3
    });
    console.log(JSON.stringify(perfFeb, null, 2));

    console.log("--- MARCH 2026 ---");
    const perfMar = await prisma.employeePerformance.findMany({
        where: { month: 3, year: 2026 },
        take: 3
    });
    console.log(JSON.stringify(perfMar, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
