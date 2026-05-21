import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const employees = await prisma.employee.findMany({
        include: {
            performance: {
                where: { month: 4, year: 2026 }
            }
        }
    });

    const report = employees.map(e => ({
        id: e.id,
        name: e.name,
        performance: e.performance[0] || 'NONE'
    }));

    console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
