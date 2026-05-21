import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking employees details...");
    const employees = await prisma.employee.findMany({
        where: {
            OR: [
                { name: { contains: 'Elimaried' } },
                { name: { contains: 'Wilson' } }
            ]
        },
        include: { branch: true }
    });
    
    console.log(JSON.stringify(employees, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
