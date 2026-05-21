import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Meritocracy Data...');

    // 1. Get or Create Company
    const company = await prisma.company.upsert({
        where: { id: 1 },
        update: {},
        create: { name: 'Demo Company' }
    });

    // Fix Date to ensure visibility
    const today = new Date('2025-12-30T12:00:00Z');
    const month = 12; // hardcoded to match
    const year = 2025;

    // Clean previous metrics for these agents
    await prisma.dailyAgentMetric.deleteMany({
        where: {
            year: 2025,
            month: 12
        }
    });

    // 2. Define Arrays of Dummy Data
    const dummyAgents = [
        {
            name: 'Ana Platinum', role: 'AGENT', initialXp: 16000, currentLevel: 'PLATINUM',
            metrics: { prospects: 50, closings: 15, revenue: 1500, support: 2, payments: 5, quality: 9.5, versus: 20, avoidable: 0 }
        },

        {
            name: 'Juana Gold', role: 'AGENT', initialXp: 8500, currentLevel: 'GOLD',
            metrics: { prospects: 30, closings: 8, revenue: 800, support: 5, payments: 3, quality: 8.0, versus: 10, avoidable: 0 }
        },

        {
            name: 'Pedro Silver', role: 'AGENT', initialXp: 4000, currentLevel: 'SILVER',
            metrics: { prospects: 20, closings: 4, revenue: 400, support: 10, payments: 2, quality: 7.5, versus: 5, avoidable: 0 }
        },

        {
            name: 'Luis Bronze', role: 'AGENT', initialXp: 500, currentLevel: 'BRONZE',
            metrics: { prospects: 15, closings: 2, revenue: 200, support: 15, payments: 1, quality: 6.0, versus: 0, avoidable: 1 }
        },

        {
            name: 'Carlos Risk', role: 'AGENT', initialXp: 2000, currentLevel: 'BRONZE', // Should be Risk
            metrics: { prospects: 5, closings: 0, revenue: 0, support: 2, payments: 0, quality: 4.0, versus: 0, avoidable: 5 }
        } // 5 penalities = -75 pts
    ];

    for (const agentData of dummyAgents) {
        // Create Employee
        const employee = await prisma.employee.create({
            data: {
                name: agentData.name,
                role: agentData.role,
                companyId: company.id,
                currentXp: agentData.initialXp,
                currentLevel: agentData.currentLevel,
                active: true
            }
        });

        // Add Daily Metric for "Today"
        await prisma.dailyAgentMetric.create({
            data: {
                employeeId: employee.id,
                date: today,
                month,
                year,
                prospects: agentData.metrics.prospects,
                closings: agentData.metrics.closings,
                revenue: agentData.metrics.revenue,
                supportTickets: agentData.metrics.support,
                payments: agentData.metrics.payments,
                supervisorScore: agentData.metrics.quality,
                versusPoints: agentData.metrics.versus,
                avoidableTickets: agentData.metrics.avoidable
            }
        });

        console.log(`Created ${agentData.name} with metrics.`);
    }

    console.log('✅ Seeding Complete. Refresh Dashboard.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
