
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listAllBases() {
    const agents = await prisma.employee.findMany({
        where: { active: true, role: 'CLOSER' },
        select: { name: true, currentXp: true, currentLevel: true },
        orderBy: { name: 'asc' }
    });
    console.log(JSON.stringify(agents, null, 2));
}

listAllBases().finally(() => prisma.$disconnect());
