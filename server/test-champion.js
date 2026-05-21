const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const y = 2026;
    const m = 3;
    const cid = 1;
    let targetRoles = ['CLOSER', 'AGENT'];
    
    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

    const matches = await prisma.versusMatch.findMany({
        where: {
            companyId: cid,
            status: 'FINISHED',
            date: { gte: startDate, lte: endDate },
            OR: [
                { agent1: { role: { in: targetRoles } } },
                { agent2: { role: { in: targetRoles } } }
            ]
        }
    });

    const statsMap = new Map();

    const employeeIds = new Set();
    matches.forEach(m => {
        employeeIds.add(m.agent1Id);
        if (m.agent2Id) employeeIds.add(m.agent2Id);
    });

    const emps = await prisma.employee.findMany({
        where: { id: { in: Array.from(employeeIds) } },
        select: { id: true, name: true, photo: true, role: true }
    });
    const nameMap = new Map(emps.map(e => [e.id, e.name]));
    const photoMap = new Map(emps.map(e => [e.id, e.photo]));
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

    let champion = null;
    let maxWins = -1;
    let minPlayed = Infinity;

    statsMap.forEach((v, k) => {
        const agentRole = roleMap.get(k);
        if (!agentRole || !targetRoles.includes(agentRole)) return; // Only competitors of the requested role

        const played = v.wins + v.draws + v.losses;
        // Desempate: Más victorias, o mismas victorias con menos enfrentamientos (mejor ratio)
        if (v.wins > maxWins || (v.wins === maxWins && played < minPlayed)) {
            maxWins = v.wins;
            minPlayed = played;
            champion = { employeeId: k, ...v, photo: photoMap.get(k) || null };
        }
    });
    
    console.log("Champion:", champion);
}
main();
