const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const y = 2026;
    const m = 3;
    const cid = 1;

    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const matches = await prisma.versusMatch.findMany({
        where: {
            companyId: cid,
            status: 'FINISHED',
            date: { gte: startDate, lte: endDate }
        }
    });

    const statsMap = new Map();
    const emps = await prisma.employee.findMany();
    const nameMap = new Map(emps.map(e => [e.id, e.name]));
    const roleMap = new Map(emps.map(e => [e.id, e.role]));

    matches.forEach(match => {
        const p1 = match.agent1Id;
        const p2 = match.agent2Id;

        if (!p2) return; // Bye

        if (!statsMap.has(p1)) statsMap.set(p1, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p1) || 'Unknown' });
        if (!statsMap.has(p2)) statsMap.set(p2, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p2) || 'Unknown' });

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

    console.log("StatsMap:");
    let champion = null;
    let maxWins = -1;
    let minPlayed = Infinity;
    const targetRoles = ['CLOSER', 'AGENT'];

    statsMap.forEach((v, k) => {
        const agentRole = roleMap.get(k);
        if (!agentRole || !targetRoles.includes(agentRole)) return;
        const played = v.wins + v.draws + v.losses;
        console.log(`Evaluating ${v.name}: wins=${v.wins}, played=${played}`);
        if (v.wins > maxWins || (v.wins === maxWins && played < minPlayed)) {
            maxWins = v.wins;
            minPlayed = played;
            champion = { employeeId: k, ...v };
        }
    });
    
    console.log("Champion:", champion);
}
main();
