import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.employee.groupBy({
    by: ['role', 'companyId', 'active'],
    _count: { _all: true }
  });
  console.log('Employee Counts:', JSON.stringify(counts, null, 2));

  const sample = await prisma.employee.findMany({
    take: 5,
    select: { id: true, name: true, role: true, companyId: true, branchId: true }
  });
  console.log('Sample Employees:', JSON.stringify(sample, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
