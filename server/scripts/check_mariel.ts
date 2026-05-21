import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { username: 'mariel' }, // Assuming username is mariel
    include: { managedBranches: true }
  });
  console.log('User Mariel:', JSON.stringify(user, null, 2));

  const branchesInCompany2 = await prisma.branch.findMany({
    where: { companyId: 2 }
  });
  console.log('Branches in Company 2:', JSON.stringify(branchesInCompany2, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
