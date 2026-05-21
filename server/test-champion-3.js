const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fromDate = new Date('2026-03-01T00:00:00Z');
    const toDate = new Date('2026-03-31T23:59:59Z');
    const matches = await prisma.versusMatch.findMany({
        where: { date: { gte: fromDate, lte: toDate }, status: 'FINISHED' }
    });
    
    const employees = await prisma.employee.findMany();
    const map = new Map();
    const roleMap = new Map();
    employees.forEach(e => { map.set(e.id, e.name); roleMap.set(e.id, e.role); });
    
    const stats = {};
    matches.forEach(m => {
        const p1Id = m.agent1Id;
        const p2Id = m.agent2Id;
        
        if (!p2Id) return;
        
        if (!stats[p1Id]) stats[p1Id] = { wins: 0, draws: 0, losses: 0, name: map.get(p1Id) };
        if (!stats[p2Id]) stats[p2Id] = { wins: 0, draws: 0, losses: 0, name: map.get(p2Id) };
        
        if (m.winnerId === p1Id) { stats[p1Id].wins++; stats[p2Id].losses++; }
        else if (m.winnerId === p2Id) { stats[p2Id].wins++; stats[p1Id].losses++; }
        else { stats[p1Id].draws++; stats[p2Id].draws++; }
    });
    
    let champion = null;
    let maxWins = -1;
    let minPlayed = Infinity;
    const targetRoles = ['CLOSER', 'AGENT'];

    Object.keys(stats).forEach(k => {
        const v = stats[k];
        const agentRole = roleMap.get(Number(k));
        if (!agentRole || !targetRoles.includes(agentRole)) {
            console.log(`Skipping ${v.name} due to role: '${agentRole}'`);
            return;
        }

        const played = v.wins + v.draws + v.losses;
        if (v.wins > maxWins || (v.wins === maxWins && played < minPlayed)) {
            maxWins = v.wins;
            minPlayed = played;
            champion = { employeeId: k, ...v };
        }
    });

    console.log("Champion:", champion);
}
main();
