import prisma from '../src/prisma';

async function checkFinancials() {
    const month = 12;
    const year = 2025;
    const companyId = 1;

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const branchRevenue = await prisma.dailyBranchMetric.aggregate({
        where: {
            date: {
                gte: startDate,
                lt: endDate
            },
            branch: { companyId: companyId }
        },
        _sum: {
            revenue: true,
            invoices: true
        }
    });

    const financialCheck = await prisma.financialData.findFirst({
        where: {
            month: month,
            year: year,
            companyId: companyId
        }
    });

    console.log('--- Results for Dec 2025 ---');
    console.log('Daily Branch Metrics Sum (Revenue):', Number(branchRevenue._sum.revenue || 0));
    console.log('Daily Branch Metrics Sum (Invoices):', branchRevenue._sum.invoices || 0);
    console.log('FinancialData Manual Entry (BilledAmount):', Number(financialCheck?.billedAmount || 0));
    console.log('FinancialData Manual Entry (CollectedInvoices):', financialCheck?.collectedInvoices || 0);
}

checkFinancials().catch(console.error);
