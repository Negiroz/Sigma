import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const carlos = await prisma.employee.findUnique({
    where: { id: 73 },
    include: { branch: true }
  });
  console.log('Carlos Branch:', JSON.stringify(carlos?.branch, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
