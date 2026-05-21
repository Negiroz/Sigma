import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const matches = await prisma.versusMatch.findMany({
        where: { date: new Date('2026-03-03T00:00:00Z') },
        include: { agent1: true, agent2: true }
    });
    for (const m of matches) {
        console.log(`${m.agent1?.name} vs ${m.agent2?.name} -> Winner ID: ${m.winnerId}`);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
