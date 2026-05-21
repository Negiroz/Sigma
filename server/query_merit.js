const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const y = 2026;
    const m = 3;
    const cid = 1;
    let targetRoles = ['CLOSER', 'AGENT'];
    
    // THE EXACT RANGE USED IN getMeritHighlights:
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
    matches.forEach(m => { employeeIds.add(m.agent1Id); if(m.agent2Id) employeeIds.add(m.agent2Id); });
    const emps = await prisma.employee.findMany({ where: { id: { in: Array.from(employeeIds) } } });
    const nameMap = new Map(emps.map(e => [e.id, e.name]));

    matches.forEach(match => {
        const p1 = match.agent1Id;
        const p2 = match.agent2Id;
        if (!p2) return;
        if (!statsMap.has(p1)) statsMap.set(p1, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p1) || 'Unknown' });
        if (!statsMap.has(p2)) statsMap.set(p2, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p2) || 'Unknown' });

        if (match.winnerId === p1) { statsMap.get(p1).wins++; statsMap.get(p2).losses++; }
        else if (match.winnerId === p2) { statsMap.get(p2).wins++; statsMap.get(p1).losses++; }
        else { statsMap.get(p1).draws++; statsMap.get(p2).draws++; }
    });

    for (let [k, v] of statsMap.entries()) {
        if (v.name.includes('Juneida') || v.name.includes('Greymar')) {
            console.log(v.name, v);
        }
    }
}
main();
