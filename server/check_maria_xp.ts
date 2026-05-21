import { PrismaClient } from '@prisma/client';
import { calculateMonthlyScore } from './src/utils/scoring';

const prisma = new PrismaClient();

async function main() {
    const maria = await prisma.employee.findFirst({
        where: { name: { contains: 'Maria Castillo' } },
        include: {
            dailyMetrics: {
                where: { month: 3, year: 2026 }
            }
        }
    });

    const sum = {
        prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
        tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
        versusPoints: 0, supervisorScore: 0, avoidableTickets: 0,
    };

    const uniqueDays = new Set<string>();

    maria!.dailyMetrics.forEach(dm => {
        console.log(`Date: ${dm.date.toISOString()} | Props: ${dm.prospects} | Closings: ${dm.closings} | Rev: ${dm.revenue} | Tcks: ${dm.supportTickets} | TasksDone: ${dm.tasksDone} | VsPts: ${dm.versusPoints}`);
        sum.prospects += dm.prospects || 0;
        sum.closings += dm.closings || 0;
        sum.revenue += dm.revenue || 0;
        sum.supportTickets += dm.supportTickets || 0;
        sum.tasksScheduled += dm.tasksScheduled || 0;
        sum.tasksDone += dm.tasksDone || 0;
        sum.conversations += dm.conversations || 0;
        sum.payments += dm.payments || 0;
        sum.versusPoints += dm.versusPoints || 0;
        sum.avoidableTickets += dm.avoidableTickets || 0;
        uniqueDays.add(dm.date.toISOString());
    });

    const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1);
    const projectedXp = Math.max(0, maria!.currentXp + monthlyScore);

    console.log(`\nTotals:`, sum);
    console.log(`Monthly Score (PTS): ${monthlyScore}`);
    console.log(`Base XP: ${maria!.currentXp}`);
    console.log(`Total XP: ${projectedXp}`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
