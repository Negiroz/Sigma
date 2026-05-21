import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testUpsert() {
    try {
        const empId = 42;
        const month = 4;
        const year = 2026;
        
        const result = await prisma.employeePerformance.upsert({
            where: {
                employeeId_month_year: {
                    employeeId: empId,
                    month: month,
                    year: year
                }
            },
            update: {
                reactivationGoal: 99,
                equipmentRemovalGoal: 88,
                conversionGoal: 0.77
            },
            create: {
                employeeId: empId,
                month: month,
                year: year,
                reactivationGoal: 99,
                equipmentRemovalGoal: 88,
                conversionGoal: 0.77
            }
        });
        console.log('Upsert Success:', result);
    } catch (e: any) {
        console.error('Upsert Error:', e.message);
    }
}

testUpsert().finally(() => prisma.$disconnect());
