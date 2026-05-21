import { Request, Response } from 'express';
import prisma from '../prisma';
import { getDate } from 'date-fns';
import { getBranchFilter, getEmployeeBranchFilter } from '../utils/authUtils';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month, year, companyId } = req.query;

        const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;

        const branchFilter = await getBranchFilter(userId, userRole, companyIdNum);
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, companyIdNum);

        // Fetch Financial Data - Financial data is company-wide usually, 
        // but if the user is a manager, we might want to aggregate based on branches if possible.
        // However, FinancialData model is tied to Company. 
        // If the user is a manager, they should probably ONLY see financials if they have access to all branches?
        // Or we just show company financials. The request says "cargar datos que correspondan a las sedes asignadas".
        // FinancialData is Company level in the schema.
        
        const financialData = await prisma.financialData.aggregate({
            where: { month: currentMonth, year: currentYear, ...(companyIdNum && { companyId: companyIdNum }) },
            _sum: {
                billedAmount: true,
                collectedInvoices: true,
                activeClients: true
            },
            _avg: {
                churnRate: true,
                arpu: true
            }
        });

        // Fetch Branch Performance (Total Installations and Active Clients)
        const branchPerformance = await prisma.branchPerformance.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                branch: branchFilter
            },
            _sum: {
                installations: true,
                activeClients: true,
                billingGoal: true
            }
        });

        // Fetch Outsourcing Performance -> Renamed to Installation Team Performance
        const externalInstallationPerformance = await prisma.installationPerformance.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                ...(companyIdNum && { team: { companyId: companyIdNum } })
            },
            _sum: {
                installations: true
            }
        });

        // Fetch Employee Performance (Total Closings)
        const employeePerformance = await prisma.dailyAgentMetric.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                employee: employeeFilter
            },
            _sum: {
                closings: true,
                prospects: true,
            }
        });

        // Fetch Branch Revenue (Total Facturado from daily entries)
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const endDate = new Date(Date.UTC(currentYear, currentMonth, 1));
        const branchRevenueInfo = await prisma.dailyBranchMetric.aggregate({
            where: {
                date: { gte: startDate, lt: endDate },
                branch: branchFilter
            },
            _sum: {
                revenue: true,
                invoices: true
            }
        });

        // Calculate days for prorating
        const now = new Date();
        const isCurrentMonth = currentMonth === (now.getMonth() + 1) && currentYear === now.getFullYear();
        const today = isCurrentMonth ? now.getDate() : new Date(currentYear, currentMonth, 0).getDate();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        const currentRevenue = Number(branchRevenueInfo._sum.revenue || 0);
        const revenueGoal = Number(branchPerformance._sum.billingGoal || 0);
        
        // Prorated Goal calculation
        const proratedGoal = (revenueGoal * today) / daysInMonth;

        // Previous Month Data for comparison (Prorated to same day)
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const prevStartDate = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
        const prevEndDateToSameDay = new Date(Date.UTC(prevYear, prevMonth - 1, today, 23, 59, 59));

        const prevBranchRevenueInfo = await prisma.dailyBranchMetric.aggregate({
            where: {
                date: { gte: prevStartDate, lte: prevEndDateToSameDay },
                branch: branchFilter
            },
            _sum: {
                revenue: true,
                invoices: true
            }
        });

        const prevRevenueProrated = Number(prevBranchRevenueInfo._sum.revenue || 0);

        // Calculate differences based on prorated values
        const revenueDiffVsPrev = prevRevenueProrated > 0 ? ((currentRevenue - prevRevenueProrated) / prevRevenueProrated) * 100 : 0;
        const revenueDiffVsGoal = proratedGoal > 0 ? ((currentRevenue - proratedGoal) / proratedGoal) * 100 : 0;

        // Previous month active clients and churn rate
        const prevBranchPerformance = await prisma.branchPerformance.aggregate({
            where: { month: prevMonth, year: prevYear, branch: branchFilter },
            _sum: { activeClients: true, installations: true }
        });
        const currentActiveClientsGoal = branchPerformance._sum.activeClients || 0;
        const activeClientsGoalProrated = (currentActiveClientsGoal * today) / daysInMonth;
        const currentInvoices = branchRevenueInfo._sum.invoices || 0;
        const prevInvoices = prevBranchRevenueInfo._sum.invoices || 0;
        
        const activeClientsDiffGoal = activeClientsGoalProrated > 0 ? ((currentInvoices - activeClientsGoalProrated) / activeClientsGoalProrated) * 100 : 0;

        const prevFinancialData = await prisma.financialData.aggregate({
            where: { month: prevMonth, year: prevYear, ...(companyIdNum && { companyId: companyIdNum }) },
            _avg: { churnRate: true }
        });
        const prevChurnRate = Number(prevFinancialData._avg.churnRate || 0);
        const currentChurnRate = Number(financialData._avg.churnRate || 0);
        // For churn rate, a negative diff is actually good, but mathematically it's (current - prev) / prev
        const churnRateDiffPrev = prevChurnRate > 0 ? ((currentChurnRate - prevChurnRate) / prevChurnRate) * 100 : 0;

        // Previous month prorated installations
        const prevExternalInstallationPerformance = await prisma.installationPerformance.aggregate({
            where: { month: prevMonth, year: prevYear, ...(companyIdNum && { team: { companyId: companyIdNum } }) },
            _sum: { installations: true }
        });
        const prevTotalInstallations = (prevBranchPerformance._sum.installations || 0) + (prevExternalInstallationPerformance._sum.installations || 0);
        const prevInstallationsProrated = (prevTotalInstallations / daysInMonth) * today;
        const currentTotalInstallations = (branchPerformance._sum.installations || 0) + (externalInstallationPerformance._sum.installations || 0);
        const installationsDiffPrev = prevInstallationsProrated > 0 ? ((currentTotalInstallations - prevInstallationsProrated) / prevInstallationsProrated) * 100 : 0;

        // Previous month prorated closings
        const prevEmployeePerformance = await prisma.dailyAgentMetric.aggregate({
            where: {
                date: { gte: prevStartDate, lte: prevEndDateToSameDay },
                employee: employeeFilter
            },
            _sum: { closings: true }
        });
        const prevClosingsProrated = prevEmployeePerformance._sum.closings || 0;
        const currentClosings = employeePerformance._sum.closings || 0;
        const closingsDiffPrev = prevClosingsProrated > 0 ? ((currentClosings - prevClosingsProrated) / prevClosingsProrated) * 100 : 0;

        // Current and previous month asset recovery (Reactivations + Equipment Removals)
        const currentRecoveryAgg = await prisma.dailyAgentMetric.aggregate({
            where: {
                date: { gte: startDate, lt: endDate },
                employee: employeeFilter
            },
            _sum: { reactivations: true, equipmentRemovals: true }
        });
        const currentRecovery = Number(currentRecoveryAgg._sum.reactivations || 0) + Number(currentRecoveryAgg._sum.equipmentRemovals || 0);

        const prevRecoveryAgg = await prisma.dailyAgentMetric.aggregate({
            where: {
                date: { gte: prevStartDate, lte: prevEndDateToSameDay },
                employee: employeeFilter
            },
            _sum: { reactivations: true, equipmentRemovals: true }
        });
        const prevRecoveryProrated = Number(prevRecoveryAgg._sum.reactivations || 0) + Number(prevRecoveryAgg._sum.equipmentRemovals || 0);
        const recoveryDiffPrev = prevRecoveryProrated > 0 ? ((currentRecovery - prevRecoveryProrated) / prevRecoveryProrated) * 100 : 0;

        const recoveryGoalAgg = await prisma.employeePerformance.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                employee: employeeFilter
            },
            _sum: { reactivationGoal: true, equipmentRemovalGoal: true }
        });
        const currentRecoveryGoal = Number(recoveryGoalAgg._sum.reactivationGoal || 0) + Number(recoveryGoalAgg._sum.equipmentRemovalGoal || 0);
        const recoveryGoalProrated = (currentRecoveryGoal * today) / daysInMonth;
        const recoveryDiffGoal = recoveryGoalProrated > 0 ? ((currentRecovery - recoveryGoalProrated) / recoveryGoalProrated) * 100 : 0;

        res.json({
            period: { month: currentMonth, year: currentYear },
            financials: {
                billed: currentRevenue,
                billedPrevMonthProrated: prevRevenueProrated,
                billedGoalProrated: proratedGoal,
                billedDiffPrev: revenueDiffVsPrev,
                billedDiffGoal: revenueDiffVsGoal,
                collectedCount: currentInvoices,
                activeClients: currentInvoices,
                activeClientsPrev: prevInvoices,
                activeClientsGoal: currentActiveClientsGoal,
                activeClientsGoalProrated: activeClientsGoalProrated,
                activeClientsDiffGoal: activeClientsDiffGoal,
                churnRate: currentChurnRate,
                churnRatePrev: prevChurnRate,
                churnRateDiffPrev,
                arpu: financialData._avg.arpu || 0,
            },
            operational: {
                installationsInternal: branchPerformance._sum.installations || 0,
                installationsExternal: externalInstallationPerformance._sum.installations || 0,
                totalInstallations: currentTotalInstallations,
                installationsPrevProrated: prevInstallationsProrated,
                installationsDiffPrev,
                closings: currentClosings,
                closingsPrevProrated: prevClosingsProrated,
                closingsDiffPrev,
                prospects: employeePerformance._sum.prospects || 0,
                recovery: currentRecovery,
                recoveryPrevProrated: prevRecoveryProrated,
                recoveryDiffPrev: recoveryDiffPrev,
                recoveryGoalProrated: recoveryGoalProrated,
                recoveryDiffGoal: recoveryDiffGoal
            }
        });
    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getDailyClosingsChart = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month, year, companyId } = req.query;
        const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        // Fetch daily metrics for the given month and year
        // We'll query raw or use employee include since I misremembered DailyMetric casing.
        // Prisma models are usually PascalCase, so it's prisma.dailyMetric
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, companyIdNum);

        // Fetch daily metrics for the given month and year
        const dailyData = await prisma.dailyAgentMetric.groupBy({
            by: ['date'],
            where: {
                month: currentMonth,
                year: currentYear,
                employee: employeeFilter
            },
            _sum: {
                closings: true
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Format data for frontend (e.g., "1 Feb", "2 Feb")
        const formattedData = dailyData.map((entry: any) => {
            const dayNumber = getDate(new Date(entry.date)); // Extract day from date
            return {
                day: dayNumber.toString(),
                closings: entry._sum.closings || 0
            };
        });

        res.json(formattedData);
    } catch (error) {
        console.error('Daily closings chart error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPerformanceStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month, year, companyId } = req.query;
        const now = new Date();
        const currentMonth = month ? parseInt(month as string) : now.getMonth() + 1;
        const currentYear = year ? parseInt(year as string) : now.getFullYear();
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const branchFilter = await getBranchFilter(userId, userRole, companyIdNum);
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, companyIdNum);

        // Calculate days for prorating
        // If it's a past month, we use the full month. If it's current, we use today.
        const isCurrentMonth = currentMonth === (now.getMonth() + 1) && currentYear === now.getFullYear();
        const today = isCurrentMonth ? now.getDate() : new Date(currentYear, currentMonth, 0).getDate();
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        // Branch/Management Performance
        const branches = await prisma.branch.findMany({
            where: branchFilter,
            include: {
                performance: {
                    where: { month: currentMonth, year: currentYear }
                },
                managers: {
                    select: { username: true }
                }
            }
        });

        const branchStats = await Promise.all(branches.map(async (branch) => {
            const perf = branch.performance[0];
            const billingGoal = Number(perf?.billingGoal || 0);
            const proratedGoal = (billingGoal * today) / daysInMonth;
            const installationGoal = Number(perf?.installationGoal || 0);
            const churnRate = Number(perf?.churnRate || 0);

            // Current month accumulated until today (or end of month if past)
            const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
            const endOfPeriod = new Date(Date.UTC(currentYear, currentMonth - 1, today, 23, 59, 59));

            const currentAgg = await prisma.dailyBranchMetric.aggregate({
                where: {
                    branchId: branch.id,
                    date: { gte: startOfMonth, lte: endOfPeriod }
                },
                _sum: { revenue: true, installations: true, invoices: true }
            });

            // Previous month accumulated until the same day
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth - 1, 1));
            const endOfPrevPeriod = new Date(Date.UTC(prevYear, prevMonth - 1, today, 23, 59, 59));

            const prevAgg = await prisma.dailyBranchMetric.aggregate({
                where: {
                    branchId: branch.id,
                    date: { gte: startOfPrevMonth, lte: endOfPrevPeriod }
                },
                _sum: { revenue: true }
            });

            // Asset Recovery Metrics (Reactivations + Removals)
            const recoveryActualAgg = await prisma.dailyAgentMetric.aggregate({
                where: {
                    employee: { branchId: branch.id },
                    date: { gte: startOfMonth, lte: endOfPeriod }
                },
                _sum: { 
                    reactivations: true, 
                    equipmentRemovals: true
                }
            });

            const recoveryGoalAgg = await prisma.employeePerformance.aggregate({
                where: {
                    employee: { branchId: branch.id },
                    month: currentMonth,
                    year: currentYear
                },
                _sum: { 
                    reactivationGoal: true
                }
            });

            return {
                branchName: branch.name,
                managerName: branch.managers && branch.managers.length > 0 ? branch.managers[0].username : 'Sin Gerente',
                billed: Math.floor(Number(currentAgg._sum.revenue || 0)),
                installations: Number(currentAgg._sum.installations || 0),
                target: Math.floor(proratedGoal),
                previous: Math.floor(Number(prevAgg._sum.revenue || 0)),
                revenueGoal: billingGoal,
                installationGoal: installationGoal,
                // Asset Recovery (Recuperación de Activos)
                recoveryActual: Number(recoveryActualAgg._sum.reactivations || 0) + Number(recoveryActualAgg._sum.equipmentRemovals || 0),
                recoveryGoal: Number(recoveryGoalAgg._sum.reactivationGoal || 0),
                churnRate: churnRate
            };
        }));

        const managerStatsMap = new Map<string, { 
            name: string, 
            billed: number, 
            target: number, 
            previous: number,
            revenueGoal: number,
            installations: number,
            installationGoal: number,
            recoveryActual: number,
            recoveryGoal: number,
            churnRate: number,
            count: number,
            branches: any[]
        }>();
        
        branchStats.forEach(stat => {
            if (!managerStatsMap.has(stat.managerName)) {
                managerStatsMap.set(stat.managerName, { 
                    name: stat.managerName, 
                    billed: 0, 
                    target: 0, 
                    previous: 0,
                    revenueGoal: 0,
                    installations: 0,
                    installationGoal: 0,
                    recoveryActual: 0,
                    recoveryGoal: 0,
                    churnRate: 0,
                    count: 0,
                    branches: []
                });
            }
            const existing = managerStatsMap.get(stat.managerName)!;
            existing.billed += stat.billed;
            existing.target += stat.target;
            existing.previous += stat.previous;
            existing.revenueGoal += stat.revenueGoal;
            existing.installations += stat.installations;
            existing.installationGoal += stat.installationGoal;
            existing.recoveryActual += stat.recoveryActual;
            existing.recoveryGoal += stat.recoveryGoal;
            existing.churnRate += stat.churnRate;
            existing.count += 1;
            existing.branches.push({
                name: stat.branchName,
                billed: stat.billed,
                target: stat.target,
                previous: stat.previous,
                revenueGoal: stat.revenueGoal,
                installations: stat.installations,
                installationGoal: stat.installationGoal,
                recoveryActual: stat.recoveryActual,
                recoveryGoal: stat.recoveryGoal,
                churnRate: stat.churnRate
            });
        });

        const byManagement = Array.from(managerStatsMap.values()).map(m => ({
            ...m,
            churnRate: m.count > 0 ? m.churnRate / m.count : 0 // Average churn rate for the management
        }));
        
        const byBranch = branchStats.map(stat => ({
            branch: stat.branchName,
            installations: stat.installations
        })).sort((a, b) => b.installations - a.installations);

        // Agent Performance (Top Performers using DailyAgentMetric)
        const dailyMetrics = await prisma.dailyAgentMetric.groupBy({
            by: ['employeeId'],
            where: {
                month: currentMonth,
                year: currentYear,
                employee: {
                    ...employeeFilter,
                    role: 'AGENT'
                }
            },
            _sum: {
                closings: true,
                prospects: true
            }
        });

        const employeeIds = dailyMetrics.map(d => d.employeeId);
        const employees = await prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            include: { branch: true }
        });

        const agentPerformance = dailyMetrics.map(dm => {
            const emp = employees.find(e => e.id === dm.employeeId);
            const prospects = dm._sum.prospects || 0;
            const closings = dm._sum.closings || 0;
            return {
                agent: emp?.name || 'Inactivo',
                branch: emp?.branch?.name || 'N/A',
                closings: closings,
                prospects: prospects,
                conversionRate: prospects > 0 ? ((closings / prospects) * 100).toFixed(1) : 0
            };
        }).sort((a, b: any) => b.closings - a.closings);

        res.json({
            period: { month: currentMonth, year: currentYear },
            byManagement,
            byBranch,
            byAgent: agentPerformance
        });
    } catch (error) {
        console.error('Performance stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getFinancialStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month, year, companyId } = req.query;
        console.log(`[DEBUG] getFinancialStats: month=${month}, year=${year}, companyId=${companyId}`);
        const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const branchFilter = await getBranchFilter(userId, userRole, companyIdNum);

        const financialCheck = await prisma.financialData.findFirst({
            where: {
                month: currentMonth,
                year: currentYear,
                ...(companyIdNum && { companyId: companyIdNum })
            }
        });

        // Fetch actual revenue from daily branch metrics for the given month
        const startDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
        const endDate = new Date(Date.UTC(currentYear, currentMonth, 1));

        const branchRevenue = await prisma.dailyBranchMetric.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lt: endDate
                },
                branch: branchFilter
            },
            _sum: {
                revenue: true,
                invoices: true
            }
        });

        const totalBilled = Number(branchRevenue._sum.revenue || 0);
        const totalInvoices = branchRevenue._sum.invoices || 0;

        // Also fetch activeClients from branch performances
        const branchPerformance = await prisma.branchPerformance.aggregate({
            where: {
                month: currentMonth,
                year: currentYear,
                branch: branchFilter
            },
            _sum: {
                activeClients: true
            }
        });

        res.json({
            period: { month: currentMonth, year: currentYear },
            summary: {
                totalBilled: totalBilled,
                collectedCount: totalInvoices,
                pendingAmount: totalBilled * 0.15, // Mock 15% pending
                churnRate: financialCheck?.churnRate || 0,
                arpu: financialCheck?.arpu || 0,
                activeClients: branchPerformance._sum.activeClients || 0
            },
            recentTransactions: [
                { id: 1, client: 'Empresa A', amount: totalBilled * 0.2, status: 'Pagado', date: '2025-12-05' },
                { id: 2, client: 'Cliente B', amount: totalBilled * 0.1, status: 'Pendiente', date: '2025-12-10' },
                { id: 3, client: 'Corporación C', amount: totalBilled * 0.3, status: 'Pagado', date: '2025-12-12' },
                { id: 4, client: 'Negocio D', amount: totalBilled * 0.05, status: 'Pagado', date: '2025-12-15' },
                { id: 5, client: 'Grupo E', amount: totalBilled * 0.15, status: 'Vencido', date: '2025-12-20' },
            ]
        });
    } catch (error) {
        console.error('Financial stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getAgentsList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyId } = req.query;
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;
        console.log(`[getAgentsList] Requested for companyId: ${companyIdNum}`);

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const agents = await prisma.employee.findMany({
            where: {
                role: 'AGENT',
                ...(companyIdNum && { companyId: companyIdNum })
            },
            include: {
                branch: true,
                performance: {
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    take: 1
                }
            }
        });
        console.log(`[getAgentsList] Found ${agents.length} agents`);

        const responseData = await Promise.all(agents.map(async (agent) => {
            const lastPerf = agent.performance[0];
            const targetMonth = lastPerf ? lastPerf.month : currentMonth;
            const targetYear = lastPerf ? lastPerf.year : currentYear;

            // Fetch actual totals from daily metrics to ensure real-time accuracy
            const dailyAgg = await prisma.dailyAgentMetric.aggregate({
                where: {
                    employeeId: agent.id,
                    month: targetMonth,
                    year: targetYear
                },
                _sum: {
                    closings: true,
                    prospects: true
                }
            });

            return {
                id: agent.id,
                name: agent.name,
                branch: agent.branch?.name || 'N/A',
                status: agent.active ? 'Activo' : 'Inactivo',
                lastPerformance: {
                    month: targetMonth,
                    year: targetYear,
                    closings: dailyAgg._sum.closings || 0,
                    prospects: dailyAgg._sum.prospects || 0,
                    closingGoal: lastPerf?.closingGoal || 0,
                    prospectGoal: lastPerf?.prospectGoal || 0
                }
            };
        }));

        res.json(responseData);
    } catch (error) {
        console.error('Agents list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getClosersList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { month, year, companyId } = req.query;
        const currentMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;
        const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        const closers = await prisma.employee.findMany({
            where: {
                role: 'CLOSER',
                ...(companyIdNum && { companyId: companyIdNum })
            },
            include: {
                performance: {
                    where: { month: currentMonth, year: currentYear },
                    take: 1
                }
            }
        });

        res.json(closers.map(closer => ({
            id: closer.id,
            name: closer.name,
            performance: closer.performance[0] ? {
                month: closer.performance[0].month,
                closings: closer.performance[0].closings,
                goal: closer.performance[0].closingGoal,
                achievement: closer.performance[0].closingGoal > 0
                    ? ((closer.performance[0].closings / closer.performance[0].closingGoal) * 100).toFixed(1)
                    : 0
            } : null
        })));
    } catch (error) {
        console.error('Closers list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getHistoricalStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyId } = req.query;
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        const history = [];
        const now = new Date();

        // Calculate last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();

            const startDate = new Date(Date.UTC(y, m - 1, 1));
            const endDate = new Date(Date.UTC(y, m, 1));

            // Aggregate revenue from daily branch metrics
            const revenueAgg = await prisma.dailyBranchMetric.aggregate({
                where: {
                    date: { gte: startDate, lt: endDate },
                    ...(companyIdNum && { branch: { companyId: companyIdNum } })
                },
                _sum: {
                    revenue: true
                }
            });

            // Aggregate performance data (installations, clients, churn)
            const performanceAgg = await prisma.branchPerformance.aggregate({
                where: {
                    month: m,
                    year: y,
                    ...(companyIdNum && { branch: { companyId: companyIdNum } })
                },
                _sum: {
                    installations: true,
                    activeClients: true
                },
                _avg: {
                    churnRate: true
                }
            });

            const monthName = d.toLocaleString('es-VE', { month: 'short' });
            const billedValue = Number(revenueAgg._sum.revenue || 0);
            
            console.log(`[DEBUG] Historical Stats: ${monthName} ${y} -> billed=${billedValue}`);

            history.push({
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                fullDate: `${m}/${y}`,
                billed: Math.floor(billedValue),
                installations: performanceAgg._sum.installations || 0,
                activeClients: performanceAgg._sum.activeClients || 0,
                churnRate: Number(performanceAgg._avg.churnRate || 0)
            });
        }

        res.json(history);

    } catch (error) {
        console.error('Historical stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getUsersList = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        res.json(users);
    } catch (error) {
        console.error('Users list error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const { companyId } = req.query;
        const companyIdNum = companyId ? parseInt(companyId as string) : undefined;

        // Use standard filters to know WHICH branches and agents to check
        const branchFilterRaw = await getBranchFilter(userId, userRole, companyIdNum);
        const employeeFilterRaw = await getEmployeeBranchFilter(userId, userRole, companyIdNum);

        // If user has a company assigned but filter is empty (e.g. admin without query param), enforce companyId
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const branchFilter = { ...branchFilterRaw };
        const employeeFilter = { ...employeeFilterRaw };

        if (Object.keys(branchFilter).length === 0 && user?.companyId) {
            (branchFilter as any).companyId = user.companyId;
            (employeeFilter as any).companyId = user.companyId;
        }

        const now = new Date();
        const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
        const endOfYesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59, 999));

        // 1. Get all relevant branches and active agents
        const allBranches = await prisma.branch.findMany({
            where: branchFilter,
            select: { id: true, name: true }
        });

        const activeEmployees = await prisma.employee.findMany({
            where: {
                ...employeeFilter,
                active: true,
                role: 'AGENT'
            },
            select: { id: true, name: true, branchId: true }
        });

        if (allBranches.length === 0) {
            res.json({ notifications: [] });
            return;
        }

        // 2. Who HAS metrics for yesterday? (Presence of record means not empty, even if values are 0)
        const agentsWithMetrics = await prisma.dailyAgentMetric.findMany({
            where: {
                date: { gte: yesterday, lte: endOfYesterday },
                employee: {
                    ...employeeFilter,
                    role: 'AGENT'
                }
            },
            select: { employeeId: true }
        });
        const agentIdsWithMetrics = new Set(agentsWithMetrics.map(m => m.employeeId));

        const branchMetrics = await prisma.dailyBranchMetric.findMany({
            where: {
                date: { gte: yesterday, lte: endOfYesterday },
                branch: branchFilter
            },
            select: { branchId: true }
        });
        const branchIdsWithMetrics = new Set(branchMetrics.map(m => m.branchId));

        // 3. Identify missing stuff
        const missingBranchNames = allBranches
            .filter(b => !branchIdsWithMetrics.has(b.id))
            .map(b => b.name);

        const missingAgents = activeEmployees
            .filter(e => !agentIdsWithMetrics.has(e.id));
        
        // Group missing agents by branch
        const missingAgentsByBranch: Record<string, string[]> = {};
        for (const agent of missingAgents) {
            const branchName = allBranches.find(b => b.id === agent.branchId)?.name || 'Sin sede asignada';
            if (!missingAgentsByBranch[branchName]) missingAgentsByBranch[branchName] = [];
            missingAgentsByBranch[branchName].push(agent.name);
        }

        const notifications = [];

        // Notification for missing branch-level totals
        if (missingBranchNames.length > 0) {
            notifications.push({
                id: 'missing-branch-data-' + yesterday.toISOString(),
                type: 'warning',
                message: `Falta información de ventas generales en: ${missingBranchNames.join(', ')}`,
                timestamp: new Date()
            });
        }

        // Notification for missing agent reports
        const branchesWithMissingAgents = Object.keys(missingAgentsByBranch);
        if (branchesWithMissingAgents.length > 0) {
            const summary = branchesWithMissingAgents
                .map(b => `${b}: ${missingAgentsByBranch[b].join(', ')}`)
                .join(' | ');
            notifications.push({
                id: 'missing-agent-data-' + yesterday.toISOString(),
                type: 'warning',
                message: `Agentes sin reporte: ${summary}`,
                timestamp: new Date()
            });
        }

        res.json({ notifications });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

