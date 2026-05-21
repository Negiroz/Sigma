const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const empId = 76; // Alejandro Martinez
  const month = 4;
  const year = 2026;

  try {
    const upserted = await prisma.employeePerformance.upsert({
      where: {
        employeeId_month_year: {
          employeeId: empId,
          month: month,
          year: year
        }
      },
      update: {
        reactivationGoal: 77,
        equipmentRemovalGoal: 66,
        conversionGoal: 0.88
      },
      create: {
        employeeId: empId,
        month: month,
        year: year,
        reactivationGoal: 77,
        equipmentRemovalGoal: 66,
        conversionGoal: 0.88
      }
    });
    console.log('Upsert result for Alejandro:', JSON.stringify(upserted, null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
