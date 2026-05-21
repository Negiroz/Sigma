import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log('Companies:', companies);

    const users = await prisma.user.findMany();
    console.log('Users:', users);

    const employees = await prisma.employee.findMany();
    console.log('Employees Count:', employees.length);
    console.log('Sample Employees:', employees.slice(0, 3));

    const dailyMetrics = await prisma.dailyAgentMetric.findMany();
    console.log('Daily Metrics Count:', dailyMetrics.length);
    console.log('Sample Metric:', dailyMetrics[0]);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
