
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Matching the rules in scoring.ts
function calculateMonthlyScore(total: any) {
    let score = 0;
    score += (total.closings || 0) * 30;
    const conversion = total.prospects > 0 ? (total.closings / total.prospects) : 0;
    if (total.prospects >= 3) {
        if (conversion > 0.3) score += 150;
        else if (conversion > 0.15) score += 75;
    }
    score += Math.floor((total.revenue || 0) / 10);
    score += (total.supportTickets || 0) * 6;
    score += (total.tasksScheduled || 0) * 2;
    score += (total.tasksDone || 0) * 2;
    score += (total.conversations || 0) * 0.2;
    score += (total.payments || 0) * 0.5;
    score += (total.versusPoints || 0);
    score -= (total.avoidableTickets || 0) * 30;
    return Math.round(score);
}

async function report() {
    const agents = [
        { name: 'Jeisy Perez', start: 300 },
        { name: 'Greymar Mota', start: 1050 }
    ];

    for (const a of agents) {
        const emp = await prisma.employee.findFirst({ where: { name: a.name, currentXp: a.start } });
        if (!emp) {
            console.log(`Agent ${a.name} not found with start ${a.start}`);
            continue;
        }

        const metrics = await prisma.dailyAgentMetric.findMany({
            where: { employeeId: emp.id, month: 3, year: 2026 }
        });

        const sum = {
            prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
            tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
            versusPoints: 0, avoidableTickets: 0
        };

        for (const m of metrics) {
            sum.prospects += m.prospects || 0;
            sum.closings += m.closings || 0;
            sum.revenue += m.revenue || 0;
            sum.supportTickets += m.supportTickets || 0;
            sum.tasksScheduled += m.tasksScheduled || 0;
            sum.tasksDone += m.tasksDone || 0;
            sum.conversations += m.conversations || 0;
            sum.payments += m.payments || 0;
            sum.versusPoints += m.versusPoints || 0;
            sum.avoidableTickets += m.avoidableTickets || 0;
        }

        const monthlyScore = calculateMonthlyScore(sum);
        console.log(`\n--- ${a.name} ---`);
        console.log(`Starting XP: ${a.start}`);
        console.log(`Total Progress:`, sum);
        console.log(`Calculated Monthly Score: ${monthlyScore}`);
        console.log(`Final Projected XP: ${a.start + monthlyScore}`);
    }
}

report().finally(() => prisma.$disconnect());
