import { PrismaClient } from '@prisma/client';
import { calculateMonthlyScore } from './src/utils/scoring';

const prisma = new PrismaClient();

async function main() {
    const names = ['Leonardo'];
    
    // Calculate their XP based ONLY on April (month 4, year 2026)
    const month = 4;
    const year = 2026;

    for (const name of names) {
        const agents = await prisma.employee.findMany({
            where: { name: { contains: name } }
        });
        
        for (const agent of agents) {
            console.log(`\nProcessing Agent: ${agent.name} (ID: ${agent.id})`);
            
            const metrics = await prisma.dailyAgentMetric.findMany({
                where: { employeeId: agent.id, month, year },
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

            // Role used in April must be CLOSER to treat them as Agente Integral
            const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1, 'CLOSER');
            
            // Their new currentXp (starting May) is exactly the score they got in April
            const newXp = Math.max(0, monthlyScore); 

            console.log(`  - April Score: ${monthlyScore}`);
            console.log(`  - Updating currentXp from ${agent.currentXp} -> ${newXp}`);

            await prisma.employee.update({
                where: { id: agent.id },
                data: { currentXp: newXp }
            });
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
