const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const perf = await prisma.employeePerformance.findFirst();
    console.log('Available fields in EmployeePerformance:', Object.keys(perf || {}));
    
    // Test update of a specific record
    if (perf) {
        const updated = await prisma.employeePerformance.update({
            where: { id: perf.id },
            data: {
                reactivationGoal: 55,
                equipmentRemovalGoal: 44,
                conversionGoal: 0.33
            }
        });
        console.log('Update success, verification:', {
            react: updated.reactivationGoal,
            equip: updated.equipmentRemovalGoal,
            conv: updated.conversionGoal
        });
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
