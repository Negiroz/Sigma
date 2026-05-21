import prisma from './src/prisma';
import { calculateDailyScore } from './src/utils/scoring';

async function main() {
    const dms = await prisma.dailyAgentMetric.findMany({
        where: { month: 2, year: 2026 },
        include: { employee: true }
    });

    const scores = dms.map(dm => {
        return {
            agent: dm.employee.name,
            date: dm.date.toISOString().split('T')[0],
            withoutVersus: calculateDailyScore(dm, false),
            withVersus: calculateDailyScore(dm, true),
        }
    });

    scores.sort((a, b) => b.withoutVersus - a.withoutVersus);
    console.log("Top scores WITHOUT versus (old backend logic):");
    console.log(scores.slice(0, 5));
}

main().catch(console.error).finally(() => prisma.$disconnect());
