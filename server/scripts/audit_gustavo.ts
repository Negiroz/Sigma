import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function auditGustavo() {
    const managerName = 'Gustavo';
    const month = 5;
    const year = 2026;

    console.log(`Auditing ${managerName} for ${month}/${year}...`);

    // 1. Find branches managed by Gustavo
    const branches = await (prisma as any).branch.findMany({
        where: {
            managers: {
                some: { username: { contains: managerName } }
            }
        },
        include: {
            employees: true
        }
    });

    if (branches.length === 0) {
        console.log("No branches found for Gustavo.");
        return;
    }

    console.log(`Found ${branches.length} branches: ${branches.map((b: any) => b.name).join(', ')}`);

    let totalReact = 0;
    let totalRetiros = 0;
    let totalGoalReact = 0;
    let totalGoalRetiros = 0;

    for (const branch of branches) {
        console.log(`\nBranch: ${branch.name}`);
        const employeeIds = branch.employees.map((e: any) => e.id);

        // Actual Metrics
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
        const endOfMonth = new Date(Date.UTC(year, month - 1, 31, 23, 59, 59));

        const dailyMetrics = await prisma.dailyAgentMetric.aggregate({
            where: {
                employeeId: { in: employeeIds },
                date: { gte: startOfMonth, lte: endOfMonth }
            },
            _sum: {
                reactivations: true,
                equipmentRemovals: true
            }
        });

        const react = Number(dailyMetrics._sum.reactivations || 0);
        const retiros = Number(dailyMetrics._sum.equipmentRemovals || 0);
        
        console.log(`- Actuals: React: ${react}, Retiros: ${retiros} (Total: ${react + retiros})`);
        totalReact += react;
        totalRetiros += retiros;

        // Goals
        const goals = await prisma.employeePerformance.aggregate({
            where: {
                employeeId: { in: employeeIds },
                month,
                year
            },
            _sum: {
                reactivationGoal: true,
                equipmentRemovalGoal: true
            }
        });

        const gReact = Number(goals._sum.reactivationGoal || 0);
        const gRetiros = Number(goals._sum.equipmentRemovalGoal || 0);

        console.log(`- Goals: React Goal: ${gReact}, Retiros Goal: ${gRetiros} (Total Goal: ${gReact + gRetiros})`);
        totalGoalReact += gReact;
        totalGoalRetiros += gRetiros;

        // Breakdown by employee
        const employeeBreakdown = await Promise.all(branch.employees.map(async (e: any) => {
            const m = await prisma.dailyAgentMetric.aggregate({
                where: { employeeId: e.id, date: { gte: startOfMonth, lte: endOfMonth } },
                _sum: { reactivations: true, equipmentRemovals: true }
            });
            const g = await prisma.employeePerformance.findFirst({
                where: { employeeId: e.id, month, year }
            });
            return {
                name: e.name,
                actual: Number(m._sum.reactivations || 0) + Number(m._sum.equipmentRemovals || 0),
                goal: Number(g?.reactivationGoal || 0) + Number(g?.equipmentRemovalGoal || 0)
            };
        }));

        console.log("  Breakdown:");
        employeeBreakdown.filter((eb: any) => eb.actual > 0 || eb.goal > 0).forEach((eb: any) => {
            console.log(`    * ${eb.name}: ${eb.actual} / ${eb.goal}`);
        });
    }

    console.log("\n--- GRAND TOTAL FOR GUSTAVO ---");
    console.log(`Actual Recovery: ${totalReact + totalRetiros} (${totalReact} React + ${totalRetiros} Retiros)`);
    console.log(`Goal Recovery: ${totalGoalReact + totalGoalRetiros} (${totalGoalReact} React Goal + ${totalGoalRetiros} Retiros Goal)`);
    console.log(`Percentage: ${totalGoalReact + totalGoalRetiros > 0 ? ((totalReact + totalRetiros) / (totalGoalReact + totalGoalRetiros) * 100).toFixed(1) : '0'}%`);
}

auditGustavo().finally(() => prisma.$disconnect());
