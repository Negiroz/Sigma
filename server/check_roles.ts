
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
    const roles = await prisma.employee.groupBy({
        by: ['role'],
        _count: { id: true }
    });
    console.log('Roles found in Employee table:', roles);
    
    // Also check names to see if they follow a pattern
    const agents = await prisma.employee.findMany({
        take: 20,
        select: { name: true, role: true }
    });
    console.log('Sample agents:', agents);
}

checkRoles().finally(() => prisma.$disconnect());
