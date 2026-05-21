import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const month = 4;
    const year = 2026;
    const companyId = 2;
    const role = 'AGENT';

    let employeeFilter: any = { active: true };
    if (companyId) {
        employeeFilter.companyId = Number(companyId);
    }
    
    let targetRoles = ['CLOSER', 'AGENT'];
    if (role === 'CLOSER') targetRoles = ['CLOSER'];
    if (role === 'AGENT') targetRoles = ['AGENT'];

    console.log('Query Start');
    const employees = await prisma.employee.findMany({
        where: {
            ...employeeFilter,
            active: true,
            role: { in: targetRoles }
        },
        include: {
            dailyMetrics: {
                where: { month, year }
            }
        }
    });

    console.log('Total Employees Found:', employees.length);
    console.log('Employee Names:', employees.map(e => e.name).join(', '));
}

main().catch(console.error).finally(() => prisma.$disconnect());
