import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking Companies and Employees...');

    const companies = await prisma.company.findMany({ include: { employees: true } });

    console.log(`Found ${companies.length} companies.`);

    companies.forEach(c => {
        console.log(`\n🏢 Company: ${c.name} (ID: ${c.id})`);
        console.log(`   Employees: ${c.employees.length}`);
        c.employees.forEach(e => {
            console.log(`   - [${e.id}] ${e.name} (Role: ${e.role}, Active: ${e.active})`);
        });
    });

    // Check for orphans or weird IDs (Prisma types might say Int, but DB might be messy)
    // Skipped null check as types enforce number.

}

main().finally(() => prisma.$disconnect());
