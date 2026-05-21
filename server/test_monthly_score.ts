import prisma from './src/prisma';
import { calculateMonthlyScore } from './src/utils/scoring';

async function main() {
    const month = 2;
    const year = 2026;
    const companyId = 1;

    const employees = await prisma.employee.findMany({
        where: {
            companyId: Number(companyId),
            active: true,
            role: { in: ['AGENT', 'CLOSER'] }
        },
        include: {
            dailyMetrics: {
                where: { month: Number(month), year: Number(year) }
            }
        }
    });

    const ranking = employees.map(emp => {
        const sum = {
            prospects: 0,
            closings: 0,
            revenue: 0,
            supportTickets: 0,
            tasksScheduled: 0,
            tasksDone: 0,
            conversations: 0,
            payments: 0,
            versusPoints: 0,
            supervisorScore: 0,
            avoidableTickets: 0,
        };

        const uniqueDays = new Set<string>();

        emp.dailyMetrics.forEach(dm => {
            sum.prospects += dm.prospects || 0;
            sum.closings += dm.closings || 0;
            sum.revenue += dm.revenue || 0;
            sum.supportTickets += dm.supportTickets || 0;
            sum.tasksScheduled += dm.tasksScheduled || 0;
            sum.tasksDone += dm.tasksDone || 0;
            sum.conversations += dm.conversations || 0;
            sum.payments += dm.payments || 0;
            sum.versusPoints += dm.versusPoints || 0;
            sum.supervisorScore += dm.supervisorScore || 0;
            sum.avoidableTickets += dm.avoidableTickets || 0;
            uniqueDays.add(dm.date.toISOString());
        });

        const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1);

        return {
            name: emp.name,
            score: monthlyScore,
            metricsSum: sum
        };
    });

    ranking.sort((a, b) => b.score - a.score);
    console.log(ranking.slice(0, 3));
}

main().catch(console.error).finally(() => prisma.$disconnect());
