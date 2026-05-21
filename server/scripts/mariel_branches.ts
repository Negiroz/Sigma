import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mariel = await prisma.user.findUnique({
    where: { username: 'Mariel' },
    include: { managedBranches: true }
  });
  console.log('Mariel Managed Branches:', JSON.stringify(mariel?.managedBranches.map(b => b.name), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
