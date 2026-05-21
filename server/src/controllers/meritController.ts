import { Request, Response } from 'express';
import prisma from '../prisma';
import { resolveDailyVersus } from './versusController';
import { calculateDailyScore, calculateMonthlyScore } from '../utils/scoring';
import { startOfMonth, endOfMonth, getDaysInMonth, getDate } from 'date-fns';
import { getEmployeeBranchFilter } from '../utils/authUtils';

export const getXpHistory = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.query;
        if (!companyId) return res.status(400).json({ error: 'Company ID required' });

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, Number(companyId));

        const agents = await prisma.employee.findMany({
            where: {
                ...employeeFilter,
                role: 'CLOSER',
                active: true
            },
            include: {
                dailyMetrics: {
                    include: { penalizations: { include: { penalizationType: true } } },
                    orderBy: [{ year: 'asc' }, { month: 'asc' }]
                }
            },
            orderBy: { currentXp: 'desc' }
        });

        const configs = await prisma.kpiScoreConfig.findMany({});
        const configMap = new Map();
        configs.forEach(c => configMap.set(`${c.month}-${c.year}`, c));

        const data = agents.map(agent => {
            const monthMap = new Map();
            agent.dailyMetrics.forEach(m => {
                const key = `${m.month}-${m.year}`;
                if (!monthMap.has(key)) monthMap.set(key, []);
                monthMap.get(key).push(m);
            });

            const history: any[] = [];

            for (const [key, mList] of monthMap.entries()) {
                const [month, year] = key.split('-');
                
                const sum: any = {
                    prospects: 0, closings: 0, revenue: 0, supportTickets: 0,
                    tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
                    versusPoints: 0, avoidableTickets: 0, reactivations: 0, equipmentRemovals: 0,
                    penalizations: []
                };

                const uniqueDays = new Set<string>();

                mList.forEach((dm: any) => {
                    sum.prospects += Number(dm.prospects || 0);
                    sum.closings += Number(dm.closings || 0);
                    sum.revenue += Number(dm.revenue || 0);
                    sum.supportTickets += Number(dm.supportTickets || 0);
                    sum.tasksScheduled += Number(dm.tasksScheduled || 0);
                    sum.tasksDone += Number(dm.tasksDone || 0);
                    sum.conversations += Number(dm.conversations || 0);
                    sum.payments += Number(dm.payments || 0);
                    sum.reactivations += Number(dm.reactivations || 0);
                    sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
                    sum.versusPoints += Number(dm.versusPoints || 0);

                    const eventCount = dm.penalizations?.length || 0;
                    const fieldCount = Number(dm.avoidableTickets || 0);
                    if (eventCount > 0) sum.avoidableTickets += eventCount;
                    else sum.avoidableTickets += fieldCount;

                    if (dm.penalizations) sum.penalizations.push(...dm.penalizations);
                    uniqueDays.add(dm.date.toISOString());
                });

                const cfg = configMap.get(`${month}-${year}`);
                const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1, agent.role, cfg);

                history.push({
                    month: Number(month),
                    year: Number(year),
                    score: monthlyScore
                });
            }

            return {
                id: agent.id,
                name: agent.name,
                photo: agent.photo,
                currentXp: agent.currentXp,
                history
            };
        });

        res.json(data);

    } catch (error) {
        console.error('getXpHistory error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const syncOdooMetrics = async (req: Request, res: Response) => {
    try {
        const { date, companyId } = req.body;
        console.log('Synchronizing with Odoo for date:', date);

        if (!date || !companyId) return res.status(400).json({ error: 'Date and Company ID required' });

        // TODO: MOCK DATA FOR NOW.
        // Implement real Odoo fetch using xmlrpc or fetch/axios depending on your Odoo setup.
        /* 
        Example with real Odoo XML-RPC:
        const odooResponse = await fetchOdooData(process.env.ODOO_URL, process.env.ODOO_DB, ...);
        */

        const employees = await prisma.employee.findMany({
            where: { companyId: Number(companyId), active: true, role: 'CLOSER' }
        });

        // Simulating matching and generating synced metrics
        const syncedMetrics = employees.map(emp => ({
            employeeId: emp.id,
            name: emp.name,
            prospects: Math.floor(Math.random() * 5),
            closings: Math.floor(Math.random() * 3),
            revenue: Math.floor(Math.random() * 50),
            supportTickets: Math.floor(Math.random() * 4),
            tasksScheduled: Math.floor(Math.random() * 5),
            tasksDone: Math.floor(Math.random() * 5),
            avoidableTickets: 0
        }));

        res.json({ message: 'Synchronized with Odoo successfully', metrics: syncedMetrics });
    } catch (error) {
        console.error('syncOdooMetrics error:', error);
        res.status(500).json({ error: 'Server error pulling from Odoo' });
    }
};

export const getDailyMetrics = async (req: Request, res: Response) => {
    try {
        const { date, companyId } = req.query;
        console.log('getDailyMetrics Request:', { date, companyId });

        if (!date || !companyId) return res.status(400).json({ error: 'Date and Company ID required' });

        const [year, month, day] = (date as string).split('-').map(Number);
        const searchDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0));

        console.log('Query Date Range:', { searchDate: searchDate.toISOString(), nextDate: nextDate.toISOString() });

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, Number(companyId));
        
        // Use UTC components to avoid timezone shifts on the server
        const mPart = month;
        const yPart = year;

        console.log(`[DEBUG] getDailyMetrics for date: ${date}, companyId: ${companyId}, calculated Month: ${mPart}, Year: ${yPart}`);

        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: mPart, year: yPart } }
        });

        const employees = await prisma.employee.findMany({
            where: {
                ...employeeFilter,
                active: true,
                role: { in: ['CLOSER', 'AGENT'] } // Both Atención and Field agents needed here
            },
            include: {
                branch: { select: { name: true } },
                dailyMetrics: {
                    where: {
                        date: {
                            gte: searchDate,
                            lt: nextDate
                        }
                    },
                    include: { penalizations: { include: { penalizationType: true } } }
                },
                performance: {
                    where: {
                        month: mPart,
                        year: yPart
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const data = employees.map(emp => {
            const m = emp.dailyMetrics[0];
            const p = emp.performance?.[0];

            // Build a metrics object that includes goals for the scoring engine
            const metricWithGoals = {
                ...(m || {}),
                closingGoal: p?.closingGoal || 0,
                prospectGoal: p?.prospectGoal || 0,
                reactivationGoal: p?.reactivationGoal || 0,
                equipmentRemovalGoal: p?.equipmentRemovalGoal || 0,
                conversionGoal: p?.conversionGoal || 0,
                // Ensure achievements from daily metrics are present too
                reactivations: m?.reactivations || 0,
                equipmentRemovals: m?.equipmentRemovals || 0
            };

            return {
                employeeId: emp.id,
                name: emp.name,
                branchName: emp.branch?.name || 'Sin sede',
                role: emp.role,
                prospects: m?.prospects || 0,
                closings: m?.closings || 0,
                revenue: m?.revenue || 0,
                supportTickets: m?.supportTickets || 0,
                tasksScheduled: m?.tasksScheduled || 0,
                tasksDone: m?.tasksDone || 0,
                conversations: m?.conversations || 0,
                payments: m?.payments || 0,
                supervisorScore: m?.supervisorScore || 0,
                versusPoints: m?.versusPoints || 0,
                avoidableTickets: (m?.penalizations && m.penalizations.length > 0) ? m.penalizations.length : (m?.avoidableTickets || 0),
                penalizations: m?.penalizations || [],
                penalizationTypeIds: (m?.penalizations || []).map((p: any) => p.penalizationTypeId),
                closingGoal: p?.closingGoal || 0,
                prospectGoal: p?.prospectGoal || 0,
                reactivationGoal: p?.reactivationGoal || 0,
                equipmentRemovalGoal: p?.equipmentRemovalGoal || 0,
                conversionGoal: p?.conversionGoal || 0,
                reactivations: m?.reactivations || 0,
                equipmentRemovals: m?.equipmentRemovals || 0,
                dailyScore: calculateDailyScore(metricWithGoals, true, emp.role, config)
            };
        });

        res.json(data);
    } catch (error) {
        console.error('getDailyMetrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateDailyMetrics = async (req: Request, res: Response) => {
    try {
        const { date, companyId, metrics } = req.body;
        // metrics is array of { employeeId, prospects, ... }

        const [yPart, mPart, dPart] = date.split('-').map(Number);
        const month = mPart;
        const year = yPart;
        const txDate = new Date(Date.UTC(yPart, mPart - 1, dPart, 0, 0, 0)); 
        const userId = (req as any).user.userId;

        const updates = await Promise.all(metrics.map(async (m: any) => {
            console.log(`[DEBUG] Updating Daily Metric for Emp ${m.employeeId} on ${date}:`, {
                reactivations: m.reactivations,
                equipmentRemovals: m.equipmentRemovals
            });

            const upsertResult = await prisma.dailyAgentMetric.upsert({
                where: {
                    employeeId_date: {
                        employeeId: m.employeeId,
                        date: txDate
                    }
                },
                update: {
                    prospects: Number(m.prospects ?? 0),
                    closings: Number(m.closings ?? 0),
                    revenue: Number(m.revenue ?? 0),
                    supportTickets: Number(m.supportTickets ?? 0),
                    tasksScheduled: Number(m.tasksScheduled ?? 0),
                    tasksDone: Number(m.tasksDone ?? 0),
                    conversations: Number(m.conversations ?? 0),
                    payments: Number(m.payments ?? 0),
                    reactivations: Number(m.reactivations ?? 0),
                    equipmentRemovals: Number(m.equipmentRemovals ?? 0),
                    supervisorScore: Number(m.supervisorScore ?? 0),
                    versusPoints: Number(m.versusPoints ?? 0),
                    avoidableTickets: Number(m.avoidableTickets ?? 0),
                    penalizationReasons: m.penalizationReasons ?? null,
                    month,
                    year
                },
                create: {
                    employeeId: m.employeeId,
                    date: txDate,
                    month,
                    year,
                    prospects: Number(m.prospects ?? 0),
                    closings: Number(m.closings ?? 0),
                    revenue: Number(m.revenue ?? 0),
                    supportTickets: Number(m.supportTickets ?? 0),
                    tasksScheduled: Number(m.tasksScheduled ?? 0),
                    tasksDone: Number(m.tasksDone ?? 0),
                    conversations: Number(m.conversations ?? 0),
                    payments: Number(m.payments ?? 0),
                    reactivations: Number(m.reactivations ?? 0),
                    equipmentRemovals: Number(m.equipmentRemovals ?? 0),
                    supervisorScore: Number(m.supervisorScore ?? 0),
                    versusPoints: Number(m.versusPoints ?? 0),
                    avoidableTickets: Number(m.avoidableTickets ?? 0),
                    penalizationReasons: m.penalizationReasons ?? null
                }
            });

            // Update Penalization Events
            if (m.penalizationTypeIds && Array.isArray(m.penalizationTypeIds)) {
                // Delete existing ones for this day to completely replace
                await prisma.agentPenalizationEvent.deleteMany({
                    where: { dailyAgentMetricId: upsertResult.id }
                });

                if (m.penalizationTypeIds.length > 0) {
                    await prisma.agentPenalizationEvent.createMany({
                        data: m.penalizationTypeIds.map((typeId: number) => ({
                            dailyAgentMetricId: upsertResult.id,
                            penalizationTypeId: typeId,
                            assignedByUserId: userId
                        }))
                    });
                }
            }

            return upsertResult;
        }));

        res.json({ message: 'Daily metrics updated', count: updates.length });
    } catch (error) {
        console.error('updateDailyMetrics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateDailyAgentSales = async (req: Request, res: Response) => {
    try {
        const { date, companyId, metrics } = req.body;

        const [y, m, d] = date.split('-').map(Number);
        const txDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
        const month = m;
        const year = y;

        const updates = await Promise.all(metrics.map(async (m: any) => {
            return prisma.dailyAgentMetric.upsert({
                where: {
                    employeeId_date: {
                        employeeId: m.employeeId,
                        date: txDate
                    }
                },
                update: {
                    prospects: m.prospects !== undefined ? Number(m.prospects) : undefined,
                    closings: m.closings !== undefined ? Number(m.closings) : undefined,
                    revenue: m.revenue !== undefined ? Number(m.revenue) : undefined,
                },
                create: {
                    employeeId: m.employeeId,
                    date: txDate,
                    month,
                    year,
                    prospects: Number(m.prospects || 0),
                    closings: Number(m.closings || 0),
                    revenue: Number(m.revenue || 0)
                }
            });
        }));

        // Versus resolution now happens via manual trigger in Versus Arena

        res.json({ message: 'Daily sales metrics updated', count: updates.length });
    } catch (error) {
        console.error('updateDailyAgentSales error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Scoring Engine Helper removed (using utils/scoring now)

export const getMonthlyMeritAccumulated = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: Number(month), year: Number(year) } }
        });

        const employees = await prisma.employee.findMany({
            where: {
                role: { in: ['CLOSER', 'AGENT'] },
                active: true,
                ...(companyId && companyId !== 'undefined' && companyId !== 'null' ? { companyId: Number(companyId) } : {})
            },
            include: {
                dailyMetrics: {
                    where: { month: Number(month), year: Number(year) },
                    include: { penalizations: { include: { penalizationType: true } } }
                },
                performance: {
                    where: { month: Number(month), year: Number(year) }
                }
            },
            orderBy: { name: 'asc' }
        });

        const data = employees.map(emp => {
            const p = emp.performance?.[0];
            const sum: any = {
                employeeId: emp.id,
                name: emp.name,
                role: emp.role,
                closingGoal: p?.closingGoal || 0,
                prospectGoal: p?.prospectGoal || 0,
                reactivationGoal: p?.reactivationGoal || 0,
                equipmentRemovalGoal: p?.equipmentRemovalGoal || 0,
                conversionGoal: p?.conversionGoal || 0,
                prospects: 0,
                closings: 0,
                reactivations: 0,
                equipmentRemovals: 0,
                revenue: 0,
                supportTickets: 0,
                tasksScheduled: 0,
                tasksDone: 0,
                conversations: 0,
                payments: 0,
                versusPoints: 0,
                avoidableTickets: 0,
                totalScore: 0,
                reasonsList: [] as string[],
                penalizations: [] as any[]
            };

            for (const dm of emp.dailyMetrics) {
                // Standard Metrics Aggregation
                sum.prospects += Number(dm.prospects || 0);
                sum.closings += Number(dm.closings || 0);
                sum.reactivations += Number(dm.reactivations || 0);
                sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
                sum.revenue += Number(dm.revenue || 0);
                sum.supportTickets += Number(dm.supportTickets || 0);
                sum.tasksScheduled += Number(dm.tasksScheduled || 0);
                sum.tasksDone += Number(dm.tasksDone || 0);
                sum.conversations += Number(dm.conversations || 0);
                sum.payments += Number(dm.payments || 0);
                sum.versusPoints += Number(dm.versusPoints || 0);
                
                // Penalties: Sum up both the legacy count field and the new event-based records
                // We ensure no double-counting if both are used, but typically one will be 0
                const eventCount = dm.penalizations?.length || 0;
                const fieldCount = Number(dm.avoidableTickets || 0);
                
                // If we have event records, they take priority as the source of truth for count
                if (eventCount > 0) {
                    sum.avoidableTickets += eventCount;
                } else {
                    sum.avoidableTickets += fieldCount;
                }
                
                const formattedDate = dm.date.toISOString().split('T')[0];

                // Collect reasons from relative events
                if (dm.penalizations && dm.penalizations.length > 0) {
                    for (const pen of dm.penalizations) {
                        const typeName = pen.penalizationType?.name || 'Infracción';
                        const assignedBy = pen.assignedByUserId ? ` (Asignado por: ${pen.assignedByUserId})` : '';
                        sum.reasonsList.push(`[${formattedDate}] ${typeName}${assignedBy}`);
                        sum.penalizations.push(pen);
                    }
                }
                
                const pReasons = dm.penalizationReasons;
                if (pReasons) {
                    try {
                        const parsed = JSON.parse(pReasons);
                        if (Array.isArray(parsed)) {
                            sum.reasonsList.push(...parsed.map(r => `[${formattedDate}] ${r}`));
                        }
                        else sum.reasonsList.push(`[${formattedDate}] ${pReasons}`);
                    } catch(e) {
                        sum.reasonsList.push(`[${formattedDate}] ${pReasons}`);
                    }
                }
            }

            // Guardrail: if we have reasons but count is 0, sync them
            if (sum.reasonsList.length > 0 && sum.avoidableTickets === 0) {
                sum.avoidableTickets = sum.reasonsList.length;
            }

            const totalActiveDays = new Set(emp.dailyMetrics.map(dm => dm.date.toISOString())).size || 1;
            sum.totalScore = calculateMonthlyScore(sum as any, totalActiveDays, emp.role, config);

            return {
                employeeId: sum.employeeId,
                name: sum.name,
                role: sum.role,
                prospects: sum.prospects,
                closings: sum.closings,
                reactivations: sum.reactivations,
                equipmentRemovals: sum.equipmentRemovals,
                revenue: sum.revenue,
                supportTickets: sum.supportTickets,
                tasksScheduled: sum.tasksScheduled,
                tasksDone: sum.tasksDone,
                conversations: sum.conversations,
                payments: sum.payments,
                versusPoints: sum.versusPoints,
                avoidableTickets: sum.avoidableTickets,
                totalScore: sum.totalScore,
                closingGoal: sum.closingGoal,
                prospectGoal: sum.prospectGoal,
                reactivationGoal: sum.reactivationGoal,
                equipmentRemovalGoal: sum.equipmentRemovalGoal,
                conversionGoal: sum.conversionGoal,
                penalizationReasons: JSON.stringify(sum.reasonsList)
            };
        });

        // Ordenar del que tiene más puntos al que menos
        data.sort((a, b) => b.totalScore - a.totalScore);

        res.json(data);
    } catch (error) {
        console.error('getMonthlyMeritAccumulated error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId, role, division } = req.query;
        
        // This report is national level, so we filter by companyId rather than restricted branches
        let employeeFilter: any = { active: true };
        if (companyId && companyId !== 'undefined' && companyId !== 'null') {
            employeeFilter.companyId = Number(companyId);
        }

        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            employeeFilter.branch = { division: String(division) };
        }
        
        let targetRoles = ['CLOSER', 'AGENT'];
        if (role === 'CLOSER') targetRoles = ['CLOSER'];
        if (role === 'AGENT') targetRoles = ['AGENT'];
        
        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: Number(month), year: Number(year) } }
        });

        console.log('Leaderboard Params:', { month, year, companyId, role, division });
        console.log('Employee Filter:', JSON.stringify(employeeFilter, null, 2));

        // Fetch employees and their monthly metrics
        const employees = await prisma.employee.findMany({
            where: {
                ...employeeFilter,
                active: true,
                role: { in: targetRoles }
            },
            include: {
                branch: { select: { name: true, division: true } },
                dailyMetrics: {
                    where: { month: Number(month), year: Number(year) },
                    include: { penalizations: { include: { penalizationType: true } } }
                },
                performance: {
                    where: { month: Number(month), year: Number(year) }
                }
            }
        });

        console.log('Employees found:', employees.length);
        if (employees.length > 0) {
            console.log('First 3 employees:', employees.slice(0, 3).map(e => e.name));
        }

        const ranking = employees.map(emp => {
            // Aggregate totals to get real monthly score
            const p = emp.performance?.[0];
            const sum = {
                closingGoal: p?.closingGoal || 0,
                prospectGoal: p?.prospectGoal || 0,
                reactivationGoal: p?.reactivationGoal || 0,
                equipmentRemovalGoal: p?.equipmentRemovalGoal || 0,
                conversionGoal: p?.conversionGoal || 0,
                prospects: 0,
                closings: 0,
                reactivations: 0,
                equipmentRemovals: 0,
                revenue: 0,
                supportTickets: 0,
                tasksScheduled: 0,
                tasksDone: 0,
                conversations: 0, // Added
                payments: 0,      // Added
                versusPoints: 0,
                supervisorScore: 0, // In case it's manually set somewhere
                avoidableTickets: 0,
                penalizations: [] as any[]
            };

            const uniqueDays = new Set<string>();

            emp.dailyMetrics.forEach(dm => {
                sum.prospects += Number(dm.prospects || 0);
                sum.closings += Number(dm.closings || 0);
                sum.reactivations += Number(dm.reactivations || 0);
                sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
                sum.revenue += Number(dm.revenue || 0);
                sum.supportTickets += Number(dm.supportTickets || 0);
                sum.tasksScheduled += Number(dm.tasksScheduled || 0);
                sum.tasksDone += Number(dm.tasksDone || 0);
                sum.conversations += Number(dm.conversations || 0);
                sum.payments += Number(dm.payments || 0);
                sum.versusPoints += Number(dm.versusPoints || 0);

                // Replicate penalty sum logic from accumulate
                const eventCount = dm.penalizations?.length || 0;
                const fieldCount = Number(dm.avoidableTickets || 0);
                if (eventCount > 0) {
                    sum.avoidableTickets += eventCount;
                } else {
                    sum.avoidableTickets += fieldCount;
                }

                if (dm.penalizations) sum.penalizations.push(...dm.penalizations);
                uniqueDays.add(dm.date.toISOString());
            });

            const monthlyScore = calculateMonthlyScore(sum as any, uniqueDays.size || 1, emp.role, config);

            // Current level before this month's score to determine decay
            let currentLevel = 'BRONZE';
            if (emp.currentXp >= 30000) currentLevel = 'DIAMOND';
            else if (emp.currentXp >= 15000) currentLevel = 'PLATINUM';
            else if (emp.currentXp >= 7000) currentLevel = 'GOLD';
            else if (emp.currentXp >= 2500) currentLevel = 'SILVER';

            let decay = 0;
            if (currentLevel === 'DIAMOND') decay = 2000;
            else if (currentLevel === 'PLATINUM') decay = 1000;
            else if (currentLevel === 'GOLD') decay = 300;

            const projectedXp = Math.max(0, emp.currentXp + monthlyScore - decay);

            // Determine projected Level based on projected XP
            let projectedLevel = 'BRONZE';
            if (projectedXp >= 30000) projectedLevel = 'DIAMOND';
            else if (projectedXp >= 15000) projectedLevel = 'PLATINUM';
            else if (projectedXp >= 7000) projectedLevel = 'GOLD';
            else if (projectedXp >= 2500) projectedLevel = 'SILVER';

            return {
                id: emp.id,
                name: emp.name,
                branchName: emp.branch?.name || 'N/A',
                branchDivision: emp.branch?.division || 'Primera',
                photo: emp.photo,
                currentXp: emp.currentXp,
                projectedXp,
                monthlyScore,
                projectedLevel,
                risk: monthlyScore < 400 // Alert flag
            };
        });

        ranking.sort((a, b) => b.monthlyScore - a.monthlyScore);

        console.log('--- LEADERBOARD READY WITH', ranking.length, 'ITEMS ---');
        res.json(ranking);

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const closeMonth = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.body;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        const userId = (req as any).user.userId;
        const userRole = (req as any).user.role;
        const employeeFilter = await getEmployeeBranchFilter(userId, userRole, Number(companyId));
        
        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: Number(month), year: Number(year) } }
        });

        // Fetch employees and their monthly metrics
        const employees = await prisma.employee.findMany({
            where: {
                ...employeeFilter,
                active: true,
                role: { in: ['CLOSER', 'AGENT'] }
            },
            include: {
                dailyMetrics: {
                    where: { month: Number(month), year: Number(year) },
                    include: { penalizations: { include: { penalizationType: true } } }
                },
                performance: {
                    where: { month: Number(month), year: Number(year) }
                }
            }
        });

        let updatedCount = 0;

        for (const emp of employees) {
            const p = emp.performance?.[0];
            const sum: any = {
                closingGoal: p?.closingGoal || 0,
                prospectGoal: p?.prospectGoal || 0,
                reactivationGoal: p?.reactivationGoal || 0,
                equipmentRemovalGoal: p?.equipmentRemovalGoal || 0,
                conversionGoal: p?.conversionGoal || 0,
                prospects: 0, closings: 0, 
                reactivations: 0, equipmentRemovals: 0,
                revenue: 0, supportTickets: 0,
                tasksScheduled: 0, tasksDone: 0, conversations: 0, payments: 0,
                versusPoints: 0, supervisorScore: 0, avoidableTickets: 0,
                penalizations: [] as any[]
            };

            const uniqueDays = new Set<string>();

            emp.dailyMetrics.forEach(dm => {
                // Metrics
                sum.prospects += Number(dm.prospects || 0);
                sum.closings += Number(dm.closings || 0);
                sum.revenue += Number(dm.revenue || 0);
                sum.supportTickets += Number(dm.supportTickets || 0);
                sum.tasksScheduled += Number(dm.tasksScheduled || 0);
                sum.tasksDone += Number(dm.tasksDone || 0);
                sum.conversations += Number(dm.conversations || 0);
                sum.payments += Number(dm.payments || 0);
                sum.reactivations += Number(dm.reactivations || 0);
                sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
                sum.versusPoints += Number(dm.versusPoints || 0);

                // Replicate penalty sum logic from accumulate
                const eventCount = dm.penalizations?.length || 0;
                const fieldCount = Number(dm.avoidableTickets || 0);
                if (eventCount > 0) {
                    sum.avoidableTickets += eventCount;
                } else {
                    sum.avoidableTickets += fieldCount;
                }

                if (dm.penalizations) sum.penalizations.push(...dm.penalizations);
                uniqueDays.add(dm.date.toISOString());
            });

            const monthlyScore = calculateMonthlyScore(sum, uniqueDays.size || 1, emp.role, config);

            let currentLevel = 'BRONZE';
            if (emp.currentXp >= 30000) currentLevel = 'DIAMOND';
            else if (emp.currentXp >= 15000) currentLevel = 'PLATINUM';
            else if (emp.currentXp >= 7000) currentLevel = 'GOLD';
            else if (emp.currentXp >= 2500) currentLevel = 'SILVER';

            let decay = 0;
            if (currentLevel === 'DIAMOND') decay = 2000;
            else if (currentLevel === 'PLATINUM') decay = 1000;
            else if (currentLevel === 'GOLD') decay = 300;

            const newXp = Math.max(0, emp.currentXp + monthlyScore - decay);

            if (newXp !== emp.currentXp) {
                await prisma.employee.update({
                    where: { id: emp.id },
                    data: { currentXp: newXp }
                });
                updatedCount++;
            }
        }

        res.json({ message: 'Month closed successfully. XP levels updated permanently.', count: updatedCount });

    } catch (error) {
        console.error('closeMonth error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getTeamsPerformance = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId, division } = req.query;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        let teamFilter: any = { companyId: Number(companyId) };
        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            teamFilter.supervisor = { branch: { division: String(division) } };
        }

        const teams = await prisma.team.findMany({
            where: teamFilter,
            include: {
                supervisor: { include: { branch: true } },
                members: {
                    where: { active: true },
                    include: {
                        dailyMetrics: {
                            where: { month: Number(month), year: Number(year) },
                            include: { penalizations: { include: { penalizationType: true } } }
                        },
                        performance: {
                            where: { month: Number(month), year: Number(year) }
                        }
                    }
                }
            }
        });

        const config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: Number(month), year: Number(year) } }
        });

        const performanceData = teams.map((team: any) => {
            let totalTeamScore = 0;
            const memberCount = team.members.length;

            const membersPerformance = team.members.map((member: any) => {
                const sum: any = {
                    closingGoal: member.performance?.[0]?.closingGoal || 0,
                    prospectGoal: member.performance?.[0]?.prospectGoal || 0,
                    reactivationGoal: member.performance?.[0]?.reactivationGoal || 0,
                    equipmentRemovalGoal: member.performance?.[0]?.equipmentRemovalGoal || 0,
                    conversionGoal: member.performance?.[0]?.conversionGoal || 0,
                    prospects: 0, closings: 0, reactivations: 0, equipmentRemovals: 0,
                    revenue: 0, supportTickets: 0, tasksScheduled: 0, tasksDone: 0,
                    conversations: 0, payments: 0, versusPoints: 0, avoidableTickets: 0,
                    penalizations: []
                };

                const uniqueDays = new Set<string>();
                member.dailyMetrics.forEach((dm: any) => {
                    sum.prospects += Number(dm.prospects || 0);
                    sum.closings += Number(dm.closings || 0);
                    sum.revenue += Number(dm.revenue || 0);
                    sum.supportTickets += Number(dm.supportTickets || 0);
                    sum.tasksScheduled += Number(dm.tasksScheduled || 0);
                    sum.tasksDone += Number(dm.tasksDone || 0);
                    sum.conversations += Number(dm.conversations || 0);
                    sum.payments += Number(dm.payments || 0);
                    sum.reactivations += Number(dm.reactivations || 0);
                    sum.equipmentRemovals += Number(dm.equipmentRemovals || 0);
                    sum.versusPoints += Number(dm.versusPoints || 0);
                    
                    const eventCount = dm.penalizations?.length || 0;
                    if (eventCount > 0) sum.avoidableTickets += eventCount;
                    else sum.avoidableTickets += Number(dm.avoidableTickets || 0);
                    
                    if (dm.penalizations) sum.penalizations.push(...dm.penalizations);
                    uniqueDays.add(dm.date.toISOString());
                });

                const memberScore = calculateMonthlyScore(sum, uniqueDays.size || 1, member.role, config);
                totalTeamScore += memberScore;

                return {
                    id: member.id,
                    name: member.name,
                    score: memberScore
                };
            });

            const teamAverage = memberCount > 0 ? Math.round(totalTeamScore / memberCount) : 0;

            return {
                id: team.id,
                name: team.name,
                supervisor: {
                    id: team.supervisor.id,
                    name: team.supervisor.name,
                    photo: team.supervisor.photo
                },
                totalScore: totalTeamScore,
                averageScore: teamAverage,
                memberCount,
                members: membersPerformance
            };
        });

        performanceData.sort((a: any, b: any) => b.averageScore - a.averageScore);

        res.json(performanceData);
    } catch (error) {
        console.error('getTeamsPerformance error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getAgentPacing = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;

        const m = Number(month);
        const y = Number(year);
        const empId = Number(id);

        // 1. Get Agent and Company Info
        const agent = await prisma.employee.findUnique({
            where: { id: empId },
            select: { companyId: true }
        });

        if (!agent) return res.status(404).json({ error: 'Agent not found' });

        // 2. Calculate General Average for ALL Agents/Closers in this company/month/year
        const employees = await prisma.employee.findMany({
            where: {
                companyId: agent.companyId,
                active: true,
                role: 'CLOSER'
            },
            include: {
                dailyMetrics: {
                    where: {
                        month: m,
                        year: y
                    },
                    select: {
                        closings: true
                    }
                }
            }
        });

        let totalCompanySales = 0;
        employees.forEach(emp => {
            emp.dailyMetrics.forEach(dm => {
                totalCompanySales += dm.closings || 0;
            });
        });

        const activeAgentsCount = employees.length || 1;
        const averageGoal = Math.round((totalCompanySales / activeAgentsCount) * 10) / 10;

        // 3. Get Daily Metrics for the SPECIFIC agent
        const metrics = await prisma.dailyAgentMetric.findMany({
            where: {
                employeeId: empId,
                month: m,
                year: y
            },
            orderBy: { date: 'asc' }
        });

        // 4. Build Pacing Data
        const daysInMonth = getDaysInMonth(new Date(y, m - 1));
        const history = [];
        let accumulatedSales = 0;

        const metricsByDay = new Map();
        metrics.forEach(met => {
            const day = getDate(met.date);
            metricsByDay.set(day, met);
        });

        const today = new Date();
        const currentDay = today.getDate();
        const isCurrentMonth = today.getMonth() + 1 === m && today.getFullYear() === y;

        const dailyRateRequired = averageGoal / daysInMonth;

        for (let d = 1; d <= daysInMonth; d++) {
            const hasData = metricsByDay.has(d);
            const salesToday = hasData ? metricsByDay.get(d).closings : 0;
            const isPastOrToday = !isCurrentMonth || d <= currentDay;

            if (isPastOrToday) {
                accumulatedSales += salesToday;
            }

            history.push({
                day: d,
                sales: salesToday,
                accumulated: isPastOrToday ? accumulatedSales : null,
                target: Math.round(dailyRateRequired * d * 10) / 10
            });
        }

        res.json({
            goal: averageGoal,
            currentAccumulated: accumulatedSales,
            history
        });

    } catch (error) {
        console.error('getAgentPacing error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMeritHighlights = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId, role, division } = req.query;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        const m = Number(month);
        const y = Number(year);
        const cid = Number(companyId);

        let targetRoles = ['CLOSER', 'AGENT'];
        if (role === 'CLOSER') targetRoles = ['CLOSER'];
        if (role === 'AGENT') targetRoles = ['AGENT'];

        console.log(`[getMeritHighlights] Params: month=${m}, year=${y}, cid=${cid}, division=${division}`);

        // Use UTC for consistent range regardless of server timezone
        const startDate = new Date(Date.UTC(y, m - 1, 1));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        
        // Fetch Config
        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: m, year: y } }
        });

        console.log(`[getMeritHighlights] Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        // 1. Champion VS
        const matchFilter: any = {
            companyId: cid,
            status: 'FINISHED',
            date: { gte: startDate, lte: endDate }
        };

        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            matchFilter.OR = [
                { agent1: { role: { in: targetRoles }, branch: { division: String(division) } } },
                { agent2: { role: { in: targetRoles }, branch: { division: String(division) } } }
            ];
        } else {
            matchFilter.OR = [
                { agent1: { role: { in: targetRoles } } },
                { agent2: { role: { in: targetRoles } } }
            ];
        }

        const matches = await prisma.versusMatch.findMany({
            where: matchFilter
        });

        console.log(`[getMeritHighlights] Found ${matches.length} matches`);

        const statsMap = new Map<number, { wins: number, draws: number, losses: number, name: string }>();

        // We need names, let's fetch employees involved
        const employeeIds = new Set<number>();
        matches.forEach(m => {
            employeeIds.add(m.agent1Id);
            if (m.agent2Id) employeeIds.add(m.agent2Id);
        });

        const emps = await prisma.employee.findMany({
            where: { id: { in: Array.from(employeeIds) } },
            select: { id: true, name: true, photo: true, role: true }
        });
        const nameMap = new Map(emps.map(e => [e.id, e.name]));
        const photoMap = new Map(emps.map(e => [e.id, e.photo]));
        const roleMap = new Map(emps.map(e => [e.id, e.role]));

        matches.forEach(match => {
            const p1 = match.agent1Id;
            const p2 = match.agent2Id;

            if (!p2) return; // Bye

            if (!statsMap.has(p1)) statsMap.set(p1, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p1) || 'Unknown' });
            if (!statsMap.has(p2)) statsMap.set(p2, { wins: 0, draws: 0, losses: 0, name: nameMap.get(p2) || 'Unknown' });

            if (match.winnerId === p1) {
                statsMap.get(p1)!.wins++;
                statsMap.get(p2)!.losses++;
            } else if (match.winnerId === p2) {
                statsMap.get(p2)!.wins++;
                statsMap.get(p1)!.losses++;
            } else {
                statsMap.get(p1)!.draws++;
                statsMap.get(p2)!.draws++;
            }
        });

        let champion: any = null;
        let maxWins = -1;
        let minPlayed = Infinity;

        statsMap.forEach((v, k) => {
            const agentRole = roleMap.get(k);
            if (!agentRole || !targetRoles.includes(agentRole)) return; // Only competitors of the requested role

            const played = v.wins + v.draws + v.losses;
            // Desempate: Más victorias, o mismas victorias con menos enfrentamientos (mejor ratio)
            if (v.wins > maxWins || (v.wins === maxWins && played < minPlayed)) {
                maxWins = v.wins;
                minPlayed = played;
                champion = { employeeId: k, ...v, photo: photoMap.get(k) || null };
            }
        });

        // 2. Highest Daily Score
        const dailyFilter: any = {
            month: m,
            year: y,
            employee: { 
                companyId: cid,
                role: { in: targetRoles }
            }
        };

        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            dailyFilter.employee.branch = { division: String(division) };
        }

        const dailyMetrics = await prisma.dailyAgentMetric.findMany({
            where: dailyFilter,
            include: { employee: { include: { branch: true } }, penalizations: { include: { penalizationType: true } } }
        });

        console.log(`[getMeritHighlights] Found ${dailyMetrics.length} daily metrics`);

        let maxScore = -1;
        let bestDayRecord = null;

        dailyMetrics.forEach(dm => {
            const score = calculateDailyScore(dm, true, dm.employee.role, config);
            if (score > maxScore) {
                maxScore = score;
                bestDayRecord = {
                    employeeId: dm.employeeId,
                    name: dm.employee.name,
                    photo: dm.employee.photo,
                    score,
                    date: dm.date
                };
            }
        });

        res.json({
            champion,
            bestDay: bestDayRecord
        });

    } catch (error) {
        console.error('getMeritHighlights error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getVersusStandings = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId, role, division } = req.query;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        const m = Number(month);
        const y = Number(year);
        const cid = Number(companyId);

        let targetRoles = ['CLOSER', 'AGENT'];
        if (role === 'CLOSER') targetRoles = ['CLOSER'];
        if (role === 'AGENT') targetRoles = ['AGENT'];

        console.log(`[getVersusStandings] Params: month=${m}, year=${y}, cid=${cid}, division=${division}`);

        const startDate = new Date(Date.UTC(y, m - 1, 1));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));

        const matchFilter: any = {
            companyId: cid,
            status: 'FINISHED',
            date: { gte: startDate, lte: endDate }
        };

        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            matchFilter.OR = [
                { agent1: { role: { in: targetRoles }, branch: { division: String(division) } } },
                { agent2: { role: { in: targetRoles }, branch: { division: String(division) } } }
            ];
        } else {
            matchFilter.OR = [
                { agent1: { role: { in: targetRoles } } },
                { agent2: { role: { in: targetRoles } } }
            ];
        }

        const matches = await prisma.versusMatch.findMany({
            where: matchFilter
        });

        console.log(`[getVersusStandings] Found ${matches.length} matches`);

        const empFilter: any = { companyId: cid, active: true, role: { in: targetRoles } };
        if (division && division !== 'undefined' && division !== 'null' && division !== 'all') {
            empFilter.branch = { division: String(division) };
        }

        const employees = await prisma.employee.findMany({
            where: empFilter,
            include: { branch: { select: { name: true } } }
        });

        const standings = employees.map(emp => {
            const record = {
                employeeId: emp.id,
                name: emp.name,
                branchName: emp.branch?.name || 'N/A',
                photo: emp.photo,
                played: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                points: 0
            };

            matches.forEach(match => {
                if (match.agent1Id === emp.id || match.agent2Id === emp.id) {
                    if (!match.agent2Id) return; // Ignore solo matches for standings

                    record.played++;
                    if (match.winnerId === emp.id) {
                        record.wins++;
                        record.points += 3;
                    } else if (match.winnerId === null) {
                        record.draws++;
                        record.points += 1;
                    } else {
                        record.losses++;
                    }
                }
            });

            return record;
        });

        // Se ordena por:
        // 1. Puntos totales (3 por victoria, 1 por empate)
        // 2. Mayor número de victorias
        // 3. Menor número de enfrentamientos (mejor ratio)
        standings.sort((a, b) => b.points - a.points || b.wins - a.wins || a.played - b.played);

        res.json(standings);

    } catch (error) {
        console.error('getVersusStandings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getMonthlyBonuses = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;
        if (!month || !year || !companyId) return res.status(400).json({ error: 'Month, year and Company ID required' });

        const bonuses = await prisma.monthlyBonus.findMany({
            where: {
                month: Number(month),
                year: Number(year),
                companyId: Number(companyId)
            }
        });

        res.json(bonuses);
    } catch (error) {
        console.error('getMonthlyBonuses error:', error);
        res.status(500).json({ error: 'Server error retrieving bonuses' });
    }
};

export const saveMonthlyBonuses = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId, bonuses } = req.body;
        // bonuses is an array of { employeeId, amount, score, weight }

        const cid = Number(companyId);
        const m = Number(month);
        const y = Number(year);

        const updates = await Promise.all(bonuses.map((b: any) => 
            prisma.monthlyBonus.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId: b.employeeId,
                        month: m,
                        year: y
                    }
                },
                update: {
                    amount: Number(b.amount),
                    score: Number(b.score),
                    weight: Number(b.weight),
                },
                create: {
                    employeeId: b.employeeId,
                    month: m,
                    year: y,
                    companyId: cid,
                    amount: Number(b.amount),
                    score: Number(b.score),
                    weight: Number(b.weight),
                }
            })
        ));

        res.json({ message: 'Bonuses saved successfully', count: updates.length });
    } catch (error) {
        console.error('saveMonthlyBonuses error:', error);
        res.status(500).json({ error: 'Server error saving bonuses' });
    }
};
