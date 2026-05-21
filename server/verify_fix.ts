import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const employeeId = 42; // Alejandro Martinez from previous test
    const month = 4;
    const year = 2026;

    console.log('--- Step 1: Initial state (setting real counters) ---');
    await prisma.employeePerformance.upsert({
        where: { employeeId_month_year: { employeeId, month, year } },
        update: { reactivations: 10, reactivationGoal: 0 },
        create: { employeeId, month, year, reactivations: 10, reactivationGoal: 0 }
    });

    let res = await prisma.employeePerformance.findUnique({ where: { employeeId_month_year: { employeeId, month, year } } });
    console.log('Before goal update:', { reactivations: res?.reactivations, reactivationGoal: res?.reactivationGoal });

    console.log('\n--- Step 2: Simulating Goal Update from Frontend (sending reactivationGoal=20, but omitting reactivations) ---');
    // Simulate what the new controller does with partial data
    const perfPayload = { employeeId, reactivationGoal: 20 };
    const dataToUpdate: any = {};
    if (perfPayload.reactivationGoal !== undefined) dataToUpdate.reactivationGoal = Number(perfPayload.reactivationGoal);
    
    await prisma.employeePerformance.update({
        where: { employeeId_month_year: { employeeId, month, year } },
        data: dataToUpdate
    });

    res = await prisma.employeePerformance.findUnique({ where: { employeeId_month_year: { employeeId, month, year } } });
    console.log('After goal update:', { reactivations: res?.reactivations, reactivationGoal: res?.reactivationGoal });

    if (res?.reactivations === 10 && res?.reactivationGoal === 20) {
        console.log('\n✅ SUCCESS: Goal was updated and actual counter was PRESERVED!');
    } else {
        console.log('\n❌ FAILURE: Data was lost or not updated correctly.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
