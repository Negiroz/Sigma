import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const agents = await prisma.employee.findMany({
    where: { 
        name: { in: ['Yunaldo Barrera', 'Ricardo Ferrer', 'Antoni Sivira'] }
    },
    select: { id: true, name: true, role: true, companyId: true, branchId: true }
  });
  console.log('Specific Agents:', JSON.stringify(agents, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
