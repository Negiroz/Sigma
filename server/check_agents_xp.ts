import { PrismaClient } from '@prisma/client';
import { calculateMonthlyScore } from './src/utils/scoring';

const prisma = new PrismaClient();

async function main() {
    const names = ['Ender', 'Duglas', 'Katherin', 'Katerin'];
    
    for (const name of names) {
        const agents = await prisma.employee.findMany({
            where: { name: { contains: name } }
        });
        
        for (const agent of agents) {
            console.log(`\nAgent: ${agent.name} (ID: ${agent.id}) | Role: ${agent.role} | Current XP: ${agent.currentXp}`);
            
            // Get metrics grouped by month
            const metrics = await prisma.dailyAgentMetric.findMany({
                where: { employeeId: agent.id },
                orderBy: [{ year: 'asc' }, { month: 'asc' }]
            });
            
            const monthMap = new Map();
            metrics.forEach(m => {
                const key = `${m.month}-${m.year}`;
                if (!monthMap.has(key)) monthMap.set(key, []);
                monthMap.get(key).push(m);
            });
            
            for (const [monthYear, mList] of monthMap.entries()) {
                let closings = 0;
                mList.forEach((m: any) => {
                    closings += m.closings || 0;
                });
                console.log(`  - ${monthYear}: ${mList.length} days active, ${closings} closings`);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
