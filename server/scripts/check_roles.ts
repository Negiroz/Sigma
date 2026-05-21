import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: { id: { gte: 70 } },
    select: { id: true, name: true, role: true, companyId: true, active: true }
  });
  console.log('Employees >= 70:', JSON.stringify(employees, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
