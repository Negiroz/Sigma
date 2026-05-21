
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findCarlos() {
    const list = await prisma.employee.findMany({
        where: { name: { contains: 'Marin' } }
    });
    console.log('Employees matching "Marin":', list.map((e: any) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        active: e.active,
        branchId: e.branchId
    })));

    const nava = await prisma.employee.findMany({
        where: { name: { contains: 'Nava' } }
    });
    console.log('Employees matching "Nava":', nava.map((e: any) => ({
        id: e.id,
        name: e.name,
        role: e.role,
        active: e.active,
        branchId: e.branchId
    })));
}

findCarlos().finally(() => prisma.$disconnect());
