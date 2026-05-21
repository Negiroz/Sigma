import { PrismaClient } from '@prisma/client';
import { calculateDailyScore } from './src/utils/scoring.js';

const prisma = new PrismaClient();

async function main() {
    const agents = await prisma.employee.findMany({
        where: { name: { in: ['Rosemary Colman', 'Angeles Cabrera', 'Rosemary Colmenares'] } },
        include: { dailyMetrics: true }
    });

    for (const emp of agents) {
        console.log(`\nAgent: ${emp.name}`);
        let totalScoreMonth = 0;
        const sums = { prospects: 0, closings: 0, revenue: 0, supportTickets: 0, tasksScheduled: 0, tasksDone: 0, supervisorScore: 0, versusPoints: 0, avoidableTickets: 0 };
        for (const dm of emp.dailyMetrics) {
            sums.prospects += dm.prospects;
            sums.closings += dm.closings;
            sums.revenue += dm.revenue;
            sums.supportTickets += dm.supportTickets;
            sums.tasksScheduled += dm.tasksScheduled;
            sums.tasksDone += dm.tasksDone;
            sums.supervisorScore += dm.supervisorScore;
            sums.versusPoints += dm.versusPoints;
            sums.avoidableTickets += dm.avoidableTickets;
            totalScoreMonth += calculateDailyScore(dm);
        }
        console.log('Sums (raw sum from all days):', sums);
        console.log(`Total Score calculated by summing daily scores: ${totalScoreMonth}`);
    }
}
main().finally(() => prisma.$disconnect());
