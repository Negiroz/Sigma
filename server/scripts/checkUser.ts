import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Users...');
    const users = await prisma.user.findMany();
    users.forEach(u => {
        console.log(`User: ${u.username} (ID: ${u.id}, Role: ${u.role}, CompanyID: ${u.companyId})`);
    });
}

main().finally(() => prisma.$disconnect());
