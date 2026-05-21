import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkSchema() {
    try {
        const perf = await prisma.employeePerformance.findFirst();
        console.log('EmployeePerformance fields:', Object.keys(perf || {}));
    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
