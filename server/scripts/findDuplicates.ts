import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const employees = await prisma.employee.findMany({
        where: { companyId: 1, active: true },
        select: { id: true, name: true }
    });

    const seen = new Map();
    const duplicates: any[] = [];

    employees.forEach(e => {
        if (seen.has(e.name)) {
            duplicates.push({ keep: seen.get(e.name), remove: e.id, name: e.name });
        } else {
            seen.set(e.name, e.id);
        }
    });

    console.log('Duplicates found:', duplicates.length);
    console.log(duplicates);
}

main().finally(() => prisma.$disconnect());
