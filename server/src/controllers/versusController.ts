import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import { calculateDailyScore } from '../utils/scoring';

export const getVersusState = async (req: Request, res: Response) => {
    try {
        const { date, companyId, role, division } = req.query;
        if (!date || !companyId) return res.status(400).json({ error: 'Data required' });

        const searchDate = new Date(date as string);
        const nextDate = new Date(searchDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const targetRole = role ? String(role) : 'CLOSER';
        const targetDivision = division ? String(division) : 'Primera';

        // Check if matches exist
        const matches = await prisma.versusMatch.findMany({
            where: {
                companyId: Number(companyId),
                date: {
                    gte: searchDate,
                    lt: nextDate
                },
                agent1: {
                    role: targetRole,
                    branch: {
                        division: targetDivision
                    }
                }
            },
            include: {
                agent1: true,
                agent2: true
            }
        });
        
        let config = await prisma.kpiScoreConfig.findUnique({
            where: { month_year: { month: searchDate.getMonth() + 1, year: searchDate.getFullYear() } }
        });

        if (matches.length > 0) {
            // Enrich matches with scores
            const enrichedMatches = await Promise.all(matches.map(async (match) => {
                let agent1Score = 0;
                let agent2Score = 0;

                const m1 = await prisma.dailyAgentMetric.findFirst({
                    where: { employeeId: match.agent1Id, date: { gte: searchDate, lt: nextDate } },
                    include: { penalizations: { include: { penalizationType: true } } }
                });
                if (m1) agent1Score = calculateDailyScore(m1, false, match.agent1.role, config);

                if (match.agent2Id) {
                    const m2 = await prisma.dailyAgentMetric.findFirst({
                        where: { employeeId: match.agent2Id, date: { gte: searchDate, lt: nextDate } },
                        include: { penalizations: { include: { penalizationType: true } } }
                    });
                    if (m2) agent2Score = calculateDailyScore(m2, false, match.agent2?.role || 'CLOSER', config);
                }

                return {
                    ...match,
                    agent1Score,
                    agent2Score
                };
            }));

            // Return existing matches enriched with daily scores
            return res.json({ state: 'ACTIVE', matches: enrichedMatches });
        }

        // If no matches, return available agents for drafting
        const agents = await prisma.employee.findMany({
            where: {
                companyId: Number(companyId),
                active: true,
                role: targetRole,
                branch: {
                    division: targetDivision
                }
            }
        });

        return res.json({ state: 'DRAFT', agents });

    } catch (error) {
        console.error('getVersusState error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createDraw = async (req: Request, res: Response) => {
    try {
        const { date, companyId, selectedAgentIds } = req.body;
        // selectedAgentIds is array of numbers

        const agentIds: number[] = [...selectedAgentIds];

        // Shuffle (Fisher-Yates)
        for (let i = agentIds.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [agentIds[i], agentIds[j]] = [agentIds[j], agentIds[i]];
        }

        const matchesToCreate = [];
        const drawDate = new Date(date);

        while (agentIds.length > 0) {
            const p1 = agentIds.shift();
            const p2 = agentIds.shift() || null; // Could be null if odd

            if (p1) {
                matchesToCreate.push({
                    date: drawDate,
                    companyId: Number(companyId),
                    agent1Id: p1,
                    agent2Id: p2,
                    status: 'PENDING'
                });
            }
        }

        await prisma.$transaction(
            matchesToCreate.map(m => prisma.versusMatch.create({ data: m }))
        );

        // Resolution is now manual via finishVersus endpoint
        // (Wait for admin to explicitly finish the matches at the end of the day)

        res.json({ message: 'Draw created', count: matchesToCreate.length });

    } catch (error) {
        console.error('createDraw error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const finishVersus = async (req: Request, res: Response) => {
    try {
        const { date, companyId } = req.body;
        if (!date || !companyId) return res.status(400).json({ error: 'Data required' });

        const finishDate = new Date(date);
        await resolveDailyVersus(finishDate, Number(companyId));

        res.json({ message: 'Versus Finalizados de forma exitosa.' });
    } catch (error) {
        console.error('finishVersus error:', error);
        res.status(500).json({ error: 'Server error al finalizar versus' });
    }
};

export const resolveDailyVersus = async (date: Date, companyId: number) => {
    // 1. Get ALL Matches for the day to allow recalculation if points change
    const matches = await prisma.versusMatch.findMany({
        where: {
            date: date,
            companyId: companyId
        }
    });
    const searchDate = new Date(date);
    let config = await prisma.kpiScoreConfig.findUnique({
        where: { month_year: { month: searchDate.getMonth() + 1, year: searchDate.getFullYear() } }
    });

    if (matches.length === 0) return;

    // 2. Resolve each match
    for (const match of matches) {
        const m1 = await prisma.dailyAgentMetric.findUnique({
            where: { employeeId_date: { employeeId: match.agent1Id, date } },
            include: { penalizations: { include: { penalizationType: true } }, employee: true }
        });

        // Handle Bye/Solo (Agent 2 null)
        if (!match.agent2Id) {
            if (m1 && match.status !== 'FINISHED') {
                await prisma.versusMatch.update({
                    where: { id: match.id },
                    data: { status: 'FINISHED', winnerId: null } // No winner
                });
                await prisma.dailyAgentMetric.update({
                    where: { id: m1.id },
                    data: { versusPoints: 0 } // No points
                });
            }
            continue;
        }

        const m2 = await prisma.dailyAgentMetric.findUnique({
            where: { employeeId_date: { employeeId: match.agent2Id, date } },
            include: { penalizations: { include: { penalizationType: true } }, employee: true }
        });

        // Only resolve if BOTH have data
        if (m1 && m2) {
            const s1 = calculateDailyScore(m1, false, m1.employee.role, config);
            const s2 = calculateDailyScore(m2, false, m2.employee.role, config);

            let newWinnerId = null;

            if (s1 === s2) {
                newWinnerId = null;
            } else {
                if (s1 > s2) newWinnerId = match.agent1Id;
                else newWinnerId = match.agent2Id;
            }

            // Check if outcome has changed. If not, do nothing.
            if (match.status === 'FINISHED' && match.winnerId === newWinnerId) {
                continue;
            }

            // If we are changing the outcome of an already finished match, REVERT previous XP first
            if (match.status === 'FINISHED' && match.winnerId !== null) {
                const oldWinnerId = match.winnerId;
                const oldLoserId = (oldWinnerId === match.agent1Id) ? match.agent2Id : match.agent1Id;

                const STEAL_AMOUNT = 150;
                const oldWinnerObj = await prisma.employee.findUnique({ where: { id: oldWinnerId }, select: { currentXp: true } });
                const oldLoserObj = await prisma.employee.findUnique({ where: { id: oldLoserId }, select: { currentXp: true } });

                if (oldWinnerObj && oldLoserObj) {
                    await prisma.employee.update({
                        where: { id: oldWinnerId },
                        data: { currentXp: Math.max(0, oldWinnerObj.currentXp - STEAL_AMOUNT) }
                    });
                    await prisma.employee.update({
                        where: { id: oldLoserId },
                        data: { currentXp: oldLoserObj.currentXp + STEAL_AMOUNT }
                    });
                }
            }

            // NOW APPLY NEW OUTCOME
            if (newWinnerId === null) {
                // TIE - No points for anyone
                await prisma.versusMatch.update({
                    where: { id: match.id },
                    data: { status: 'FINISHED', winnerId: null }
                });
                // Reset/Ensure 0 points
                await prisma.dailyAgentMetric.update({
                    where: { employeeId_date: { employeeId: match.agent1Id, date } },
                    data: { versusPoints: 0 }
                });
                await prisma.dailyAgentMetric.update({
                    where: { employeeId_date: { employeeId: match.agent2Id, date } },
                    data: { versusPoints: 0 }
                });
            } else {
                // Decisive Winner
                await prisma.versusMatch.update({
                    where: { id: match.id },
                    data: { status: 'FINISHED', winnerId: newWinnerId }
                });

                // Award Points (Daily Metric)
                await prisma.dailyAgentMetric.update({
                    where: { employeeId_date: { employeeId: newWinnerId, date } },
                    data: { versusPoints: 30 }
                });

                // Penalize Loser (Daily Metric)
                const newLoserId = (newWinnerId === match.agent1Id) ? match.agent2Id : match.agent1Id;
                await prisma.dailyAgentMetric.update({
                    where: { employeeId_date: { employeeId: newLoserId, date } },
                    data: { versusPoints: -30 }
                });

                // Direct XP Stealing Mechanism
                const STEAL_AMOUNT = 150;

                const winnerObj = await prisma.employee.findUnique({ where: { id: newWinnerId }, select: { currentXp: true } });
                const loserObj = await prisma.employee.findUnique({ where: { id: newLoserId }, select: { currentXp: true } });

                if (winnerObj && loserObj) {
                    await prisma.employee.update({
                        where: { id: newWinnerId },
                        data: { currentXp: winnerObj.currentXp + STEAL_AMOUNT }
                    });

                    const newLoserXp = Math.max(0, loserObj.currentXp - STEAL_AMOUNT);
                    await prisma.employee.update({
                        where: { id: newLoserId },
                        data: { currentXp: newLoserXp }
                    });
                }
            }
        }
    }
};

export const resetVersus = async (req: Request, res: Response) => {
    try {
        const { date, companyId, password, role, division } = req.body;
        const userId = (req as any).user.userId;

        if (!date || !companyId || !password) {
            return res.status(400).json({ error: 'Data and password required' });
        }

        // 1. Verify user password
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta' });

        const searchDate = new Date(date);
        const nextDate = new Date(searchDate);
        nextDate.setDate(nextDate.getDate() + 1);

        const targetRole = role ? String(role) : 'CLOSER';
        const targetDivision = division ? String(division) : 'Primera';

        // 2. Transaction to clean up
        await prisma.$transaction(async (tx) => {
            // Delete matches
            await tx.versusMatch.deleteMany({
                where: {
                    companyId: Number(companyId),
                    date: { gte: searchDate, lt: nextDate },
                    agent1: {
                        role: targetRole,
                        branch: {
                            division: targetDivision
                        }
                    }
                }
            });

            // Reset versusPoints for all agents in this company/date, filtered by role and division
            await tx.dailyAgentMetric.updateMany({
                where: {
                    date: { gte: searchDate, lt: nextDate },
                    employee: {
                        companyId: Number(companyId),
                        role: targetRole,
                        branch: {
                            division: targetDivision
                        }
                    }
                },
                data: {
                    versusPoints: 0
                }
            });
        });

        res.json({ message: 'Versus reiniciado correctamente' });

    } catch (error) {
        console.error('resetVersus error:', error);
        res.status(500).json({ error: 'Error al reiniciar versus' });
    }
};
