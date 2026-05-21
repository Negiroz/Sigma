import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Promoting Admin (ID: 1) to Super Admin...');

    // Set companyId to NULL for user ID 1
    const updated = await prisma.user.update({
        where: { id: 1 },
        data: { companyId: null, role: 'SUPERADMIN' }
    });

    console.log(`✅ User ${updated.username} updated.`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   CompanyID: ${updated.companyId}`);
}

main().finally(() => prisma.$disconnect());
