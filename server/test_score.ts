import prisma from './src/prisma';
import { calculateDailyScore } from './src/utils/scoring';

async function main() {
    const dm = await prisma.dailyAgentMetric.findFirst({
        where: {
            employeeId: 23,
            date: new Date('2026-02-09T00:00:00.000Z')
        }
    });

    console.log('Metrics:', dm);
    console.log('Score with versus:', calculateDailyScore(dm, true));
    console.log('Score without versus:', calculateDailyScore(dm, false));
}

main().catch(console.error).finally(() => prisma.$disconnect());
