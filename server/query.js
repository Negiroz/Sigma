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
    employees.forEach(e => map.set(e.id, e.name));
    
    const stats = {};
    matches.forEach(m => {
        const p1 = map.get(m.agent1Id) || String(m.agent1Id);
        const p1Id = m.agent1Id;
        const p2Id = m.agent2Id;
        
        if (!p2Id) return;
        const p2 = map.get(p2Id) || String(p2Id);
        
        if (!stats[p1]) stats[p1] = { wins: 0, draws: 0, losses: 0 };
        if (!stats[p2]) stats[p2] = { wins: 0, draws: 0, losses: 0 };
        
        if (m.winnerId === p1Id) { stats[p1].wins++; stats[p2].losses++; }
        else if (m.winnerId === p2Id) { stats[p2].wins++; stats[p1].losses++; }
        else { stats[p1].draws++; stats[p2].draws++; }
    });
    
    console.log(stats);
}
main();
