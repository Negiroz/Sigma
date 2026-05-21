import prisma from './src/prisma';
import { calculateDailyScore } from './src/utils/scoring';

const frontendFormula = (metric: any) => {
    let score = 0;
    score += (metric.closings || 0) * 30;
    score += Math.floor((metric.revenue || 0) / 10);
    score += (metric.supportTickets || 0) * 6;
    score += (metric.tasksScheduled || 0) * 2;
    score += (metric.tasksDone || 0) * 2;
    score += (metric.conversations || 0) * 0.2;
    score += (metric.payments || 0) * 0.5;
    score += (metric.versusPoints || 0);
    score -= ((metric.avoidableTickets || 0) * 30);
    return Math.round(score);
}

async function main() {
    const dms = await prisma.dailyAgentMetric.findMany({
        where: { month: 2, year: 2026 },
        include: { employee: true }
    });

    const scores = dms.map(dm => {
        return {
            agent: dm.employee.name,
            date: dm.date.toISOString().split('T')[0],
            score: calculateDailyScore(dm, true),
            formulaScore: frontendFormula(dm)
        }
    });

    scores.sort((a, b) => b.score - a.score);
    console.log(scores.slice(0, 10));
}

main().catch(console.error).finally(() => prisma.$disconnect());
