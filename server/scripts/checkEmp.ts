import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const emp = await prisma.employee.findUnique({
        where: { id: 6 },
        include: { company: true }
    });
    console.log('Employee 6:', emp);
}
main().finally(() => prisma.$disconnect());
