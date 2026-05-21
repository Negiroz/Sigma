import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting to copy KPI goals from April to May 2026...");
    
    const prevMonth = 4;
    const prevYear = 2026;
    const currMonth = 5;
    const currYear = 2026;

    // 1. EmployeePerformance
    const prevEmpPerfs = await prisma.employeePerformance.findMany({
        where: { month: prevMonth, year: prevYear }
    });

    for (const p of prevEmpPerfs) {
        await prisma.employeePerformance.upsert({
            where: {
                employeeId_month_year: {
                    employeeId: p.employeeId,
                    month: currMonth,
                    year: currYear
                }
            },
            update: {
                // Only update if they are currently 0 or missing, to not overwrite manual changes
                closingGoal: p.closingGoal,
                prospectGoal: p.prospectGoal,
                reactivationGoal: p.reactivationGoal,
                equipmentRemovalGoal: p.equipmentRemovalGoal,
                conversionGoal: p.conversionGoal
            },
            create: {
                employeeId: p.employeeId,
                month: currMonth,
                year: currYear,
                closings: 0,
                prospects: 0,
                reactivations: 0,
                equipmentRemovals: 0,
                closingGoal: p.closingGoal,
                prospectGoal: p.prospectGoal,
                reactivationGoal: p.reactivationGoal,
                equipmentRemovalGoal: p.equipmentRemovalGoal,
                conversionGoal: p.conversionGoal
            }
        });
    }

    // 2. BranchPerformance
    const prevBranchPerfs = await prisma.branchPerformance.findMany({
        where: { month: prevMonth, year: prevYear }
    });

    for (const b of prevBranchPerfs) {
        await prisma.branchPerformance.upsert({
            where: {
                branchId_month_year: {
                    branchId: b.branchId,
                    month: currMonth,
                    year: currYear
                }
            },
            update: {
                installationGoal: b.installationGoal,
                salesProjection: b.salesProjection,
                billingGoal: b.billingGoal
            },
            create: {
                branchId: b.branchId,
                month: currMonth,
                year: currYear,
                installations: 0,
                activeClients: 0,
                churnRate: 0,
                installationGoal: b.installationGoal,
                salesProjection: b.salesProjection,
                billingGoal: b.billingGoal
            }
        });
    }

    console.log("Goals copied successfully.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
