
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkVersus() {
    const month = 3;
    const year = 2026;
    const companyId = 1; // Assuming companyId 1

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    console.log(`Checking VS for ${month}/${year}`);

    const matches = await prisma.versusMatch.findMany({
        where: {
            companyId: companyId,
            status: 'FINISHED',
            date: { gte: startDate, lte: endDate }
        }
    });

    console.log(`Found ${matches.length} matches`);

    const statsMap = new Map();
    const employeeIds = new Set();
    matches.forEach(m => {
        employeeIds.add(m.agent1Id);
        if (m.agent2Id) employeeIds.add(m.agent2Id);
    });

    const emps = await prisma.employee.findMany({
        where: { id: { in: Array.from(employeeIds) as number[] } },
        select: { id: true, name: true }
    });
    const nameMap = new Map(emps.map(e => [e.id, e.name]));

    matches.forEach(match => {
        const p1 = match.agent1Id;
        const p2 = match.agent2Id;

        if (!p2) return; // Bye

        if (!statsMap.has(p1)) statsMap.set(p1, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p1) });
        if (!statsMap.has(p2)) statsMap.set(p2, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p2) });

        if (match.winnerId === p1) {
            statsMap.get(p1).wins++;
            statsMap.get(p2).losses++;
        } else if (match.winnerId === p2) {
            statsMap.get(p2).wins++;
            statsMap.get(p1).losses++;
        } else {
            statsMap.get(p1).draws++;
            statsMap.get(p2).draws++;
        }
    });

    let champion = null;
    let maxWins = -1;
    let minPlayed = Infinity;

    console.log("Stats Map:");
    statsMap.forEach((v, k) => {
        const played = v.wins + v.draws + v.losses;
        console.log(`${v.name}: Wins ${v.wins}, Draws ${v.draws}, Losses ${v.losses}, Played ${played}`);
        if (v.wins > maxWins || (v.wins === maxWins && played < minPlayed)) {
            maxWins = v.wins;
            minPlayed = played;
            champion = { employeeId: k, ...v };
        }
    });

    console.log("\nComputed Champion:");
    console.log(champion);
}

checkVersus().catch(console.error).finally(() => prisma.$disconnect());
