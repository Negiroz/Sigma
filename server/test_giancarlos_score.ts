import { PrismaClient } from '@prisma/client';
import { calculateMonthlyScore } from './src/utils/scoring';

const prisma = new PrismaClient();

async function main() {
    const metrics = await prisma.dailyAgentMetric.findMany({
        where: { employeeId: 37, month: 4, year: 2026 },
        include: { penalizations: { include: { penalizationType: true } } }
    });

    const sum: any = {
        prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
        tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
        versusPoints: 0, avoidableTickets: 0, reactivations: 0, equipmentRemovals: 0,
        penalizations: []
    };
    const uniqueDays = new Set<string>();

    metrics.forEach(dm => {
        sum.prospects += Number(dm.prospects || 0);
        sum.closings += Number(dm.closings || 0);
        sum.revenue += Number(dm.revenue || 0);
        sum.supportTickets += Number(dm.supportTickets || 0);
        sum.tasksScheduled += Number(dm.tasksScheduled || 0);
        sum.tasksDone += Number(dm.tasksDone || 0);
        sum.conversations += Number(dm.conversations || 0);
        sum.payments += Number(dm.payments || 0);
        sum.reactivations += Number(dm.reactivations || 0);
        sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
        sum.versusPoints += Number(dm.versusPoints || 0);

        const eventCount = dm.penalizations?.length || 0;
        const fieldCount = Number(dm.avoidableTickets || 0);
        if (eventCount > 0) sum.avoidableTickets += eventCount;
        else sum.avoidableTickets += fieldCount;

        if (dm.penalizations) sum.penalizations.push(...dm.penalizations);
        uniqueDays.add(dm.date.toISOString());
    });

    const agent = await prisma.employee.findUnique({
        where: { id: 37 },
        include: { performance: { where: { month: 4, year: 2026 } } }
    });
    
    if (agent?.performance?.[0]) {
        const p = agent.performance[0];
        sum.closingGoal = p.closingGoal;
        sum.prospectGoal = p.prospectGoal;
        sum.reactivationGoal = p.reactivationGoal;
        sum.equipmentRemovalGoal = p.equipmentRemovalGoal;
        sum.conversionGoal = p.conversionGoal;
    }

    const config = await prisma.kpiScoreConfig.findUnique({
        where: { month_year: { month: 4, year: 2026 } }
    });

    console.log(`Closer Score: ${calculateMonthlyScore(sum, uniqueDays.size || 1, 'CLOSER', config)}`);
    console.log(`Agent Score: ${calculateMonthlyScore(sum, uniqueDays.size || 1, 'AGENT', config)}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
