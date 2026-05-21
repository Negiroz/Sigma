import { Request, Response } from 'express';
import prisma from '../prisma';

export const getBranchTrends = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;

        if (!month || !year) {
            res.status(400).json({ error: 'Month and year are required' });
            return;
        }

        const currentMonth = Number(month);
        const currentYear = Number(year);

        // Calculate previous 2 months
        const getPreviousMonth = (m: number, y: number, offset: number) => {
            let newMonth = m - offset;
            let newYear = y;
            while (newMonth <= 0) {
                newMonth += 12;
                newYear -= 1;
            }
            return { month: newMonth, year: newYear };
        };

        const monthMinus1Data = getPreviousMonth(currentMonth, currentYear, 1);
        const monthMinus2Data = getPreviousMonth(currentMonth, currentYear, 2);

        const currentMonthName = new Date(currentYear, currentMonth - 1).toLocaleString('es-VE', { month: 'short' });
        const monthMinus1Name = new Date(monthMinus1Data.year, monthMinus1Data.month - 1).toLocaleString('es-VE', { month: 'short' });
        const monthMinus2Name = new Date(monthMinus2Data.year, monthMinus2Data.month - 1).toLocaleString('es-VE', { month: 'short' });

        const userId = (req as any).user.userId;
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        let branchWhere: any = companyId ? { companyId: Number(companyId) } : {};
        if (currentUser?.role === 'MANAGER') {
            branchWhere.id = { in: currentUser.managedBranches.map(b => b.id) };
        }

        // Fetch branches with performance for these 3 months
        const branches = await prisma.branch.findMany({
            where: branchWhere,
            include: {
                performance: {
                    where: {
                        OR: [
                            { month: currentMonth, year: currentYear },
                            { month: monthMinus1Data.month, year: monthMinus1Data.year },
                            { month: monthMinus2Data.month, year: monthMinus2Data.year }
                        ]
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === currentYear;
        const totalDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const elapsedDays = isCurrentMonth ? today.getDate() : totalDaysInMonth;

        const data = branches.map(br => {
            const currentPerf = br.performance.find(p => p.month === currentMonth && p.year === currentYear);
            const prev1Perf = br.performance.find(p => p.month === monthMinus1Data.month && p.year === monthMinus1Data.year);
            const prev2Perf = br.performance.find(p => p.month === monthMinus2Data.month && p.year === monthMinus2Data.year);

            const accumulated = currentPerf?.installations || 0;
            const goal = currentPerf?.installationGoal || 0;

            // Simple installation projection based on linear run rate
            const installationProjection = elapsedDays > 0 
                ? Math.round((accumulated / elapsedDays) * totalDaysInMonth) 
                : 0;

            return {
                branchId: br.id,
                branchName: br.name,
                monthMinus2: prev2Perf?.installations || 0,
                monthMinus1: prev1Perf?.installations || 0,
                currentMonthAccumulated: accumulated,
                currentMonthGoal: goal,
                salesProjection: currentPerf?.salesProjection || 0,
                installationProjection,
                compliance: goal > 0 ? (accumulated / goal) * 100 : 0,
                labels: [monthMinus2Name, monthMinus1Name, currentMonthName]
            };
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching branch trends:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
