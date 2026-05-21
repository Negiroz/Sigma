import { PrismaClient } from '@prisma/client';
import { getDaysInMonth, getDate } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    const empId = 6; // Ana Platinum from seeding usually gets ID 6 or similar. Let's find first agent.

    const agent = await prisma.employee.findFirst({ where: { name: { contains: 'Platinum' } } });
    if (!agent) {
        console.log('No agents found');
        return;
    }

    console.log(`Checking Pacing for Agent: ${agent.name} (ID: ${agent.id})`);

    // Config (Assume today)
    const today = new Date();
    const m = today.getMonth() + 1;
    const y = today.getFullYear();

    console.log(`Querying Month: ${m}, Year: ${y}`);

    // 1. Get Monthly Goal
    const perf = await prisma.employeePerformance.findUnique({
        where: {
            employeeId_month_year: {
                employeeId: agent.id,
                month: m,
                year: y
            }
        }
    });
    console.log('Performance Goal:', perf);

    // 2. Get Daily Metrics
    const metrics = await prisma.dailyAgentMetric.findMany({
        where: {
            employeeId: agent.id,
            month: m,
            year: y
        },
        orderBy: { date: 'asc' }
    });
    console.log(`Found ${metrics.length} metrics.`);
    metrics.forEach(met => {
        console.log(` - Date: ${met.date.toISOString()} | Closings: ${met.closings}`);
    });

    // 3. Logic Check
    const history = [];
    let accumulatedSales = 0;
    const metricsByDay = new Map();
    metrics.forEach(met => {
        const day = getDate(met.date);
        metricsByDay.set(day, met);
    });

    console.log('Metrics parsed by day:', Array.from(metricsByDay.keys()));

    const daysInMonth = getDaysInMonth(new Date(y, m - 1));
    const currentDay = today.getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const hasData = metricsByDay.has(d);
        const salesToday = hasData ? metricsByDay.get(d).closings : 0;
        const isPastOrToday = d <= currentDay; // Simplified for debug

        if (isPastOrToday) {
            accumulatedSales += salesToday;
        }

        if (hasData || d === currentDay) {
            console.log(`Day ${d}: Sales=${salesToday}, Accum=${accumulatedSales}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
