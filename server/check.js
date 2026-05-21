
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const employees = await prisma.employee.findMany({
    where: { name: { contains: 'Greimar' } }
  });
  console.log('Greimar employees:', employees);

  const juneida = await prisma.employee.findMany({
    where: { name: { contains: 'Juneida' } }
  });
  console.log('Juneida employees:', juneida);

  const results = await prisma.versusMatch.findMany({
    where: {
      status: 'FINISHED',
      date: {
        gte: new Date('2026-03-01T00:00:00Z'),
        lte: new Date('2026-03-31T23:59:59Z')
      }
    }
  });

  const stats = {};
  results.forEach(m => {
    [m.agent1Id, m.agent2Id].forEach(id => {
      if(!id) return;
      if(!stats[id]) stats[id] = { wins: 0, draws: 0, losses: 0, played: 0 };
    });
    if(m.agent2Id) {
      stats[m.agent1Id].played++;
      stats[m.agent2Id].played++;
      if(m.winnerId === m.agent1Id) {
        stats[m.agent1Id].wins++;
        stats[m.agent2Id].losses++;
      } else if(m.winnerId === m.agent2Id) {
        stats[m.agent2Id].wins++;
        stats[m.agent1Id].losses++;
      } else {
        stats[m.agent1Id].draws++;
        stats[m.agent2Id].draws++;
      }
    }
  });
  console.log('Stats for March 2026:', stats);
}

check().catch(console.error).finally(() => prisma.$disconnect());
