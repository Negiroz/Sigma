import prisma from './src/prisma';

async function main() {
    const dms = await prisma.dailyAgentMetric.findMany({
        where: { month: 2, year: 2026 },
        include: { employee: true }
    });

    const scores = dms.map(dm => {
        let score = 0;
        score += (dm.closings || 0) * 30;
        score += Math.floor((dm.revenue || 0) / 10);
        score += (dm.supportTickets || 0) * 6;
        score += (dm.tasksScheduled || 0) * 2;
        score += (dm.tasksDone || 0) * 2;
        score += (dm.conversations || 0) * 0.2;
        score += (dm.payments || 0) * 0.5;
        score += (dm.supervisorScore || 0); // OLD LOGIC
        score -= ((dm.avoidableTickets || 0) * 30);

        return {
            agent: dm.employee.name,
            date: dm.date.toISOString().split('T')[0],
            oldScore: Math.round(score),
            supervisor: dm.supervisorScore
        }
    });

    scores.sort((a, b) => b.oldScore - a.oldScore);
    console.log("Top scores with OLD logic (supervisorScore + NO versus):");
    console.log(scores.slice(0, 5));
}

main().catch(console.error).finally(() => prisma.$disconnect());
