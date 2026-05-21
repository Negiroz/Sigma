import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const month = 4;
    const year = 2026;
    const companyId = 1;

    const metrics = await prisma.dailyAgentMetric.findMany({
        where: { month, year },
        include: { 
            penalizations: { include: { penalizationType: true } },
            employee: { select: { name: true } }
        }
    });

    console.log(`--- Métricas del mes ${month}/${year} ---`);
    metrics.forEach(m => {
        if (m.avoidableTickets > 0 || m.penalizations.length > 0) {
            console.log(`Fecha: ${m.date.toISOString().split('T')[0]}, Emp: ${m.employee.name}, Avoidable: ${m.avoidableTickets}, Relations: ${m.penalizations.length}`);
        }
    });
    
    if (metrics.filter(m => m.avoidableTickets > 0 || m.penalizations.length > 0).length === 0) {
        console.log('No se encontraron penalizaciones en ninguna métrica este mes.');
    }
}

main().catch(console.error);
