const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const month = 4;
  const year = 2026;
  const companyId = 1;

  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: Number(companyId), active: true },
      include: {
        performance: {
          where: { month: Number(month), year: Number(year) }
        }
      }
    });

    const alejandro = employees.find(e => e.name === 'Alejandro Martinez');
    console.log('Alejandro Martinez Backend View:', JSON.stringify(alejandro.performance[0], null, 2));
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
