import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const users = await prisma.user.findMany({
        include: { managedBranches: true }
    });
    console.log('Users:', JSON.stringify(users.map(u => ({ id: u.id, username: u.username, role: u.role, branches: u.managedBranches.map(b => b.name) })), null, 2));
    process.exit(0);
}

check();
