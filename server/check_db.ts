import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const perf = await prisma.employeePerformance.findFirst();
    console.log('First Performance Record:', perf);
    
    // Check columns
    const result = await prisma.$queryRawUnsafe(`PRAGMA table_info(EmployeePerformance);`);
    console.log('Table Info:', result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
