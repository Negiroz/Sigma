import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const metrics = await prisma.dailyAgentMetric.findMany({
        where: { year: 2025, month: 12 },
        include: { employee: true }
    });
    console.log(`Found ${metrics.length} metrics for Dec 2025.`);
    metrics.forEach(m => {
        console.log(`- ${m.date.toISOString()} | Emp: ${m.employee.name} (ID: ${m.employeeId}) | Company: ${m.employee.companyId}`);
    });
}
main().finally(() => prisma.$disconnect());
