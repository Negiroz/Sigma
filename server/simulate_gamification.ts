import prisma from './src/prisma';
import { calculateMonthlyScore } from './src/utils/scoring';
import * as fs from 'fs';

const LEVELS = {
    DIAMOND: 30000,
    PLATINUM: 15000,
    GOLD: 7000,
    SILVER: 2500,
    BRONZE: 0
};

const DECAY = {
    DIAMOND: 2000,
    PLATINUM: 1000,
    GOLD: 300,
    SILVER: 0,
    BRONZE: 0
};

function getLevel(xp: number) {
    if (xp >= LEVELS.DIAMOND) return 'DIAMOND';
    if (xp >= LEVELS.PLATINUM) return 'PLATINUM';
    if (xp >= LEVELS.GOLD) return 'GOLD';
    if (xp >= LEVELS.SILVER) return 'SILVER';
    return 'BRONZE';
}

async function runSimulation() {
    console.log("--- INICIANDO SIMULACION 6 MESES ---");
    // Get agents and their current metrics to establish a baseline monthly score
    const employees = await prisma.employee.findMany({
        where: { active: true, role: { in: ['AGENT', 'CLOSER'] } },
        include: {
            dailyMetrics: true
        }
    });

    const agents = employees.map(emp => {
        // Calculate average monthly score from all existing data
        const uniqueMonths = new Set(emp.dailyMetrics.map(dm => `${dm.month}-${dm.year}`)).size || 1;
        const uniqueDays = new Set(emp.dailyMetrics.map(dm => dm.date.toISOString())).size || 1;

        const sum = {
            prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
            tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
            versusPoints: 0, avoidableTickets: 0, supervisorScore: 0
        };

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
            sum.avoidableTickets += dm.avoidableTickets || 0;
        });

        // average score for ONE month
        const baselineMonthlyScore = calculateMonthlyScore(sum, uniqueDays) / uniqueMonths;

        return {
            id: emp.id,
            name: emp.name,
            baselineXp: emp.currentXp,
            currentXp: emp.currentXp,
            baselineMonthlyScore: isNaN(baselineMonthlyScore) ? 0 : Math.round(baselineMonthlyScore),
            history: [] as any[] // track XP month by month
        };
    });

    console.log("=== LÍNEA BASE (Mes 0) ===");
    agents.sort((a, b) => b.currentXp - a.currentXp).forEach(a => {
        console.log(`${a.name} | Nivel: ${getLevel(a.currentXp)} | XP: ${a.currentXp} | Promedio Mensual Est.: +${a.baselineMonthlyScore} pts`);
    });

    // Simulate 6 months
    for (let month = 1; month <= 6; month++) {
        // VS Match simulation (zero sum XP exchange)
        // Assume agents randomly face each other 4 times a month.
        // Winner steals 150 XP, Loser loses 150 XP.
        const vsExchanges = new Map();
        agents.forEach(a => vsExchanges.set(a.id, 0));

        // Random simple VS simulation (each agent plays ~4 matches against random opponents)
        for (let i = 0; i < agents.length * 2; i++) {
            const p1 = agents[Math.floor(Math.random() * agents.length)];
            let p2 = agents[Math.floor(Math.random() * agents.length)];
            while (p1.id === p2.id && agents.length > 1) {
                p2 = agents[Math.floor(Math.random() * agents.length)];
            }
            // 40% p1 wins, 40% p2 wins, 20% draw
            const roll = Math.random();
            if (roll < 0.4) {
                vsExchanges.set(p1.id, vsExchanges.get(p1.id) + 150);
                vsExchanges.set(p2.id, vsExchanges.get(p2.id) - 150);
            } else if (roll < 0.8) {
                vsExchanges.set(p2.id, vsExchanges.get(p2.id) + 150);
                vsExchanges.set(p1.id, vsExchanges.get(p1.id) - 150);
            }
        }

        agents.forEach(agent => {
            const level = getLevel(agent.currentXp);
            const decay = DECAY[level as keyof typeof DECAY];

            // Apply monthly score (with some random variance +/- 20%)
            const variance = 0.8 + (Math.random() * 0.4);
            const monthlyScore = Math.round(agent.baselineMonthlyScore * variance);

            const vsNet = vsExchanges.get(agent.id);

            // Calculate new XP
            const previousXp = agent.currentXp;
            agent.currentXp = Math.max(0, agent.currentXp + monthlyScore - decay + vsNet);

            agent.history.push({
                month,
                startingXp: previousXp,
                monthlyScore,
                decay,
                vsNet,
                endingXp: agent.currentXp,
                level: getLevel(agent.currentXp)
            });
        });
    }

    console.log("\n=== RESULTADO FINAL DESPUÉS DE 6 MESES ===");
    agents.sort((a, b) => b.currentXp - a.currentXp).forEach(a => {
        const h = a.history[5];
        const gainLoss = a.currentXp - a.baselineXp;
        console.log(`${a.name} | ${getLevel(a.currentXp)} | XP Final: ${a.currentXp} (Cambio: ${gainLoss > 0 ? '+' : ''}${gainLoss})`);
    });

    // Write to a local file for the agent to read fully
    fs.writeFileSync('/home/ramiro/kpi-dashboard/modern-dashboard/server/simulation_results.json', JSON.stringify(agents, null, 2));

    console.log("Simulación completada. JSON guardado.");
}

runSimulation()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
