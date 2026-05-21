import prisma from './src/prisma';
async function run() {
    const data = await prisma.dailyAgentMetric.groupBy({
        by: ['date'],
        where: { month: 2, year: 2026 },
        _sum: { closings: true }
    });
    console.log("Grouped data:", data);

    const count = await prisma.dailyAgentMetric.count({ where: { month: 2, year: 2026 } });
    console.log("Total entries:", count);

    const first = await prisma.dailyAgentMetric.findFirst();
    console.log("First entry:", first);
}
run();
