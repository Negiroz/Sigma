const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const newPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedUser = await prisma.user.update({
    where: { username },
    data: { password: hashedPassword }
  });

  console.log(`Password for user "${username}" has been reset to "${newPassword}"`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
