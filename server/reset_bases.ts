
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetBases() {
    const result = await prisma.employee.updateMany({
        where: { role: 'CLOSER' },
        data: { 
            currentXp: 0,
            currentLevel: 'BRONZE'
        }
    });
    console.log(`Reset successful. Updated ${result.count} agents.`);
}

resetBases().finally(() => prisma.$disconnect());
