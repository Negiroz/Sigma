
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAgents() {
    const agents = await prisma.employee.findMany({
        where: { name: { in: ['Jeisy Perez', 'Greymar Mota'] } },
        select: { name: true, currentXp: true, currentLevel: true }
    });
    console.log(JSON.stringify(agents, null, 2));
}

checkAgents().finally(() => prisma.$disconnect());
