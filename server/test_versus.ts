import prisma from './src/prisma';

async function main() {
    const matches = await prisma.versusMatch.findMany({
        where: {
            OR: [
                { agent1Id: 23 },
                { agent2Id: 23 }
            ],
            date: new Date('2026-02-09T00:00:00.000Z')
        }
    });

    console.log('Versus Matches on Feb 9th for Angeles:', matches);
}

main().catch(console.error).finally(() => prisma.$disconnect());
