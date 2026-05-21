import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testSave() {
    try {
        const perf = {
            employeeId: 42, // Ender Rivero
            month: 4,
            year: 2026,
            reactivationGoal: 5,
            equipmentRemovalGoal: 10,
            conversionGoal: 0.25
        };

        const result = await prisma.employeePerformance.upsert({
            where: {
                employeeId_month_year: {
                    employeeId: perf.employeeId,
                    month: perf.month,
                    year: perf.year
                }
            },
            update: {
                reactivationGoal: perf.reactivationGoal,
                equipmentRemovalGoal: perf.equipmentRemovalGoal,
                conversionGoal: perf.conversionGoal
            },
            create: {
                employeeId: perf.employeeId,
                month: perf.month,
                year: perf.year,
                reactivationGoal: perf.reactivationGoal,
                equipmentRemovalGoal: perf.equipmentRemovalGoal,
                conversionGoal: perf.conversionGoal
            }
        });
        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testSave();
