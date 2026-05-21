const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const usersToReset = ['admin', 'Mariel', 'Jhaina', 'waoo123', 'Jeison'];
  const newPassword = 'password123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  for (const username of usersToReset) {
    try {
      await prisma.user.update({
        where: { username },
        data: { password: hashedPassword }
      });
      console.log(`Password for user "${username}" has been reset to "${newPassword}"`);
    } catch (e) {
      console.log(`User "${username}" not found or error.`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
