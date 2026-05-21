import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Testing query for Company 1...');
    const employees = await prisma.employee.findMany({
        where: {
            companyId: 1,
            active: true,
            role: 'AGENT'
        }
    });
    console.log(`Found ${employees.length} agents for Company 1.`);
    employees.forEach(e => console.log(`- ${e.name} (${e.role})`));

    console.log('Testing query for Company 2...');
    const employees2 = await prisma.employee.findMany({
        where: {
            companyId: 2,
            active: true,
            role: 'AGENT'
        }
    });
    console.log(`Found ${employees2.length} agents for Company 2.`);
}

main().finally(() => prisma.$disconnect());
