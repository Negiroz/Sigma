import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testFetchEndpoint() {
    const month = 4;
    const year = 2026;
    const companyId = 1; // Assuming companyId 1
    
    const employees = await prisma.employee.findMany({
        where: { branches: { some: { companyId: Number(companyId) } } },
        include: {
            performance: {
                where: {
                    month: Number(month),
                    year: Number(year)
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    const data = employees.map(emp => ({
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        reactivationGoal: emp.performance[0]?.reactivationGoal || 0,
        equipmentRemovalGoal: emp.performance[0]?.equipmentRemovalGoal || 0,
        conversionGoal: emp.performance[0]?.conversionGoal || 0
    }));

    const alejandro = data.find(d => d.name === 'Alejandro Martinez');
    console.log('Alejandro Martinez Data:', JSON.stringify(alejandro, null, 2));
}

testFetchEndpoint().catch(console.error).finally(() => prisma.$disconnect());
