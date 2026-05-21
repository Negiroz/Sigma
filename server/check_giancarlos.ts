import { PrismaClient } from '@prisma/client';
import { calculateMonthlyScore } from './src/utils/scoring';

const prisma = new PrismaClient();

async function main() {
    const agents = await prisma.employee.findMany({
        where: { name: { contains: 'Rinaldo' } }
    });

    console.log(`Found ${agents.length} agents with 'Rinaldo'`);

    for (const agent of agents) {
        console.log(`\n=== REPORTE DE XP PARA: ${agent.name} (ID: ${agent.id}, Role: ${agent.role}) ===\n`);
        console.log(`XP Histórico Acumulado Actual (currentXp): ${agent.currentXp}\n`);

        const metrics = await prisma.dailyAgentMetric.findMany({
            where: { employeeId: agent.id },
            include: { penalizations: { include: { penalizationType: true } } },
            orderBy: [{ year: 'asc' }, { month: 'asc' }, { date: 'asc' }]
        });

        const monthMap = new Map();
        metrics.forEach(m => {
            const key = `${m.month}-${m.year}`;
            if (!monthMap.has(key)) monthMap.set(key, []);
            monthMap.get(key).push(m);
        });

        let cumulativeComputedXp = 0;

        for (const [monthYear, mList] of monthMap.entries()) {
            const sum: any = {
                prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
                tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
                versusPoints: 0, avoidableTickets: 0, reactivations: 0, equipmentRemovals: 0,
                penalizations: []
            };

            const uniqueDays = new Set<string>();

            mList.forEach((dm: any) => {
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

            const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1, agent.role);
            
            console.log(`[Mes ${monthYear}] - Días Activos: ${uniqueDays.size}`);
            console.log(`  - Cierres: ${sum.closings}`);
            console.log(`  => PUNTAJE DEL MES: ${monthlyScore}\n`);

            cumulativeComputedXp += monthlyScore;
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
