import { Request, Response } from 'express';
import prisma from '../prisma';
import { getDaysInMonth, getDate } from 'date-fns';

export const getDailyBranchMetrics = async (req: Request, res: Response) => {
    try {
        const { date, companyId } = req.query;
        if (!date || !companyId) {
            res.status(400).json({ error: 'Date and Company ID are required' });
            return;
        }

        const targetDate = new Date(String(date));
        const userId = (req as any).user.userId;

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        let branchWhere: any = { companyId: Number(companyId) };
        if (currentUser?.role === 'MANAGER') {
            branchWhere.id = { in: currentUser.managedBranches.map(b => b.id) };
        }

        // Get all branches for company
        const branches = await prisma.branch.findMany({
            where: branchWhere,
            include: {
                dailyMetrics: {
                    where: { date: targetDate }
                }
            },
            orderBy: { name: 'asc' }
        });

        const data = branches.map(br => ({
            branchId: br.id,
            name: br.name,
            installations: br.dailyMetrics[0]?.installations || 0,
            invoices: br.dailyMetrics[0]?.invoices || 0,
            revenue: Number(br.dailyMetrics[0]?.revenue || 0)
        }));

        res.json(data);
    } catch (error) {
        console.error('Error fetching daily branch metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateDailyBranchMetrics = async (req: Request, res: Response) => {
    try {
        const { date, companyId, metrics } = req.body;
        // metrics: [{ branchId, installations, invoices, revenue }]

        const targetDate = new Date(date);
        const month = targetDate.getMonth() + 1;
        const year = targetDate.getFullYear();
        const dayOfMonth = getDate(targetDate);
        const totalDaysInMonth = getDaysInMonth(targetDate);

        // 1. Upsert Daily Metrics
        await Promise.all(metrics.map(async (m: any) => {
            return prisma.dailyBranchMetric.upsert({
                where: {
                    branchId_date: {
                        branchId: Number(m.branchId),
                        date: targetDate
                    }
                },
                update: {
                    installations: Number(m.installations || 0),
                    invoices: Number(m.invoices || 0),
                    revenue: Number(m.revenue || 0)
                },
                create: {
                    branchId: Number(m.branchId),
                    date: targetDate,
                    installations: Number(m.installations || 0),
                    invoices: Number(m.invoices || 0),
                    revenue: Number(m.revenue || 0)
                }
            });
        }));

        // 2. Recalculate Monthly Aggregates & Projections
        /* 
           We need to fetch ALL daily metrics for this month for the affected branches 
           to sum them up correctly. 
        */

        for (const m of metrics) {
            const branchId = Number(m.branchId);

            // Fetch all entries for this month/year for this branch
            // Note: date filtering in prisma for SQLite can be tricky with DateTime, 
            // but we can filter by range
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of month

            const monthlyDailies = await prisma.dailyBranchMetric.findMany({
                where: {
                    branchId: branchId,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            });

            // Sum totals
            const totalInstallations = monthlyDailies.reduce((acc, curr) => acc + curr.installations, 0);
            const totalRevenue = monthlyDailies.reduce((acc, curr) => acc + Number(curr.revenue), 0);

            // Calculate Projection
            // Formula: (Total Revenue / Day of Month (current data entry date? or today?)) * Total Days
            // Using the date of entry provides a "snapshot at that point in time" logic if strictly followed,
            // but usually projections are based on "progress so far". 
            // If the user enters backdated data, using `dayOfMonth` of the entry might skew if we assume it's "today's running total".
            // However, for simplicity and consistency with standard "pacing", we'll use the progress relative to the entry date 
            // which creates a projection "as of that date". 
            // CAUTION: If user updates Day 1 metrics on Day 20, we shouldn't project Day 1 * 30.
            // BETTER APPROACH: Always project based on MAX date available or simply (Total / Max(DayOfEntries)) * TotalDays?
            // Let's stick to standard practice: (Total Accumulated / Current Day of Month of the *latest entry* or *today*).
            // Since we are inside an update for `targetDate`, let's assume `targetDate` is the anchor.

            // If dayOfMonth is 0 (impossible) prevent div/0
            const effectiveDay = Math.max(1, dayOfMonth);
            const projection = (totalRevenue / effectiveDay) * totalDaysInMonth;

            // Update BranchPerformance
            await prisma.branchPerformance.upsert({
                where: {
                    branchId_month_year: {
                        branchId,
                        month,
                        year
                    }
                },
                update: {
                    installations: totalInstallations,
                    salesProjection: projection
                },
                create: {
                    branchId,
                    month,
                    year,
                    installations: totalInstallations,
                    salesProjection: projection
                }
            });
        }

        res.json({ message: 'Métricas diarias de sede actualizadas y proyecciones recalculadas' });
    } catch (error) {
        console.error('Error updating daily branch metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getMonthlyBranchAccumulated = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;
        if (!month || !year || !companyId) {
            res.status(400).json({ error: 'Month, year and Company ID are required' });
            return;
        }

        const m = Number(month);
        const y = Number(year);
        const cid = Number(companyId);

        const startDate = new Date(y, m - 1, 1);
        const endDate = new Date(y, m, 0);

        const userId = (req as any).user.userId;
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        let branchWhere: any = { companyId: cid };
        if (currentUser?.role === 'MANAGER') {
            branchWhere.id = { in: currentUser.managedBranches.map(b => b.id) };
        }

        const branches = await prisma.branch.findMany({
            where: branchWhere,
            include: {
                dailyMetrics: {
                    where: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                },
                performance: {
                    where: { month: m, year: y }
                },
                managers: true
            },
            orderBy: { name: 'asc' }
        });

        const data = branches.map(br => {
            const installations = br.dailyMetrics.reduce((acc, curr) => acc + curr.installations, 0);
            const revenue = br.dailyMetrics.reduce((acc, curr) => acc + Number(curr.revenue), 0);
            const invoices = br.dailyMetrics.reduce((acc, curr) => acc + curr.invoices, 0);
            
            const perf = br.performance[0];
            const managerName = br.managers.length > 0 ? br.managers.map(u => u.username).join(', ') : 'Sin Gerente';

            return {
                branchId: br.id,
                name: br.name,
                managerName,
                installations,
                revenue,
                invoices,
                installationGoal: perf?.installationGoal || 0,
                activeClientsGoal: perf?.activeClients || 0,
                billingGoal: Number(perf?.billingGoal || 0),
                salesProjection: Number(perf?.salesProjection || 0)
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching monthly branch accumulated:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
