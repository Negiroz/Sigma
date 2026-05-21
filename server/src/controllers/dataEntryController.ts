import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to get branch filter for dashboard roles
const getEmployeeBranchFilter = async (userId: number, role: string, companyId: number) => {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        return { companyId, active: true };
    }
    
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { managedBranches: true }
    });

    if (!user) return { id: -1 }; 

    if (role === 'MANAGER') {
        const branchIds = user.managedBranches.map(b => b.id);
        return { branchId: { in: branchIds }, active: true };
    }

    return { id: -1 };
};

export const updateEmployeePerformance = async (req: Request, res: Response) => {
    try {
        const { month, year, performanceData } = req.body;
        const results = [];

        for (const perf of (performanceData || [])) {
            if (!perf.employeeId) continue;

            const dataToUpdate: any = {};

            // The frontend only sends employees that were actually modified (dirty tracking),
            // so we can safely trust all incoming values including 0 (user intentionally cleared).
            if (perf.closingGoal !== undefined) dataToUpdate.closingGoal = Math.round(Number(perf.closingGoal) || 0);
            if (perf.prospectGoal !== undefined) dataToUpdate.prospectGoal = Math.round(Number(perf.prospectGoal) || 0);
            if (perf.reactivationGoal !== undefined) dataToUpdate.reactivationGoal = Math.round(Number(perf.reactivationGoal) || 0);
            if (perf.equipmentRemovalGoal !== undefined) dataToUpdate.equipmentRemovalGoal = Math.round(Number(perf.equipmentRemovalGoal) || 0);
            if (perf.conversionGoal !== undefined) dataToUpdate.conversionGoal = Number(perf.conversionGoal) || 0;

            if (perf.closings !== undefined) dataToUpdate.closings = Number(perf.closings) || 0;
            if (perf.prospects !== undefined) dataToUpdate.prospects = Number(perf.prospects) || 0;
            if (perf.reactivations !== undefined) dataToUpdate.reactivations = Number(perf.reactivations) || 0;
            if (perf.equipmentRemovals !== undefined) dataToUpdate.equipmentRemovals = Number(perf.equipmentRemovals) || 0;

            console.log(`[updateEmployeePerformance] emp ${perf.employeeId}:`, dataToUpdate);

            try {
                const result = await prisma.employeePerformance.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId: Number(perf.employeeId),
                            month: Number(month),
                            year: Number(year)
                        }
                    },
                    update: dataToUpdate,
                    create: {
                        employeeId: Number(perf.employeeId),
                        month: Number(month),
                        year: Number(year),
                        ...dataToUpdate
                    }
                });
                results.push(result);
            } catch (err: any) {
                console.error(`Error saving emp ${perf.employeeId}:`, err.message);
            }
        }

        res.json({ success: true, count: results.length });
    } catch (error) {
        console.error('Error in updateEmployeePerformance:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getEmployeePerformanceEntries = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;
        if (!companyId) throw new Error('Company ID required');

        const reqMonth = Number(month);
        const reqYear = Number(year);

        const employees = await prisma.employee.findMany({
            where: { companyId: Number(companyId), active: true },
            include: {
                performance: {
                    orderBy: [ { year: 'desc' }, { month: 'desc' } ]
                }
            },
            orderBy: { name: 'asc' }
        });

        const data = employees.map(emp => {
            const currentPerf = emp.performance.find(p => p.month === reqMonth && p.year === reqYear);
            
            // Find the most recent goals for this employee up to the requested date
            const pastAndCurrentPerfs = emp.performance.filter(p => 
                p.year < reqYear || (p.year === reqYear && p.month <= reqMonth)
            );
            
            const goalRecord = pastAndCurrentPerfs.find(p => 
                p.closingGoal > 0 || p.prospectGoal > 0 || p.reactivationGoal > 0 || p.equipmentRemovalGoal > 0
            ) || currentPerf;

            return {
                employeeId: emp.id,
                name: emp.name,
                role: emp.role,
                closings: Number(currentPerf?.closings || 0),
                prospects: Number(currentPerf?.prospects || 0),
                reactivations: Number(currentPerf?.reactivations || 0),
                equipmentRemovals: Number(currentPerf?.equipmentRemovals || 0),
                closingGoal: Number(goalRecord?.closingGoal || currentPerf?.closingGoal || 0),
                prospectGoal: Number(goalRecord?.prospectGoal || currentPerf?.prospectGoal || 0),
                reactivationGoal: Number(goalRecord?.reactivationGoal || currentPerf?.reactivationGoal || 0),
                equipmentRemovalGoal: Number(goalRecord?.equipmentRemovalGoal || currentPerf?.equipmentRemovalGoal || 0),
                conversionGoal: Number(goalRecord?.conversionGoal || currentPerf?.conversionGoal || 0),
                _is_verified_v5: true
            };
        });

        res.json(data);
    } catch (error: any) {
        console.error('getEmployeePerformanceEntries Error:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateBranchPerformance = async (req: Request, res: Response) => {
    try {
        const { month, year, branchData } = req.body;
        for (const perf of (branchData || [])) {
            await prisma.branchPerformance.upsert({
                where: {
                    branchId_month_year: {
                        branchId: Number(perf.branchId),
                        month: Number(month),
                        year: Number(year)
                    }
                },
                update: {
                    installations: Number(perf.installations) || 0,
                    activeClients: Number(perf.activeClients) || 0,
                    churnRate: Number(perf.churnRate) || 0,
                    installationGoal: Number(perf.installationGoal) || 0,
                    salesProjection: Number(perf.salesProjection) || 0,
                    billingGoal: Number(perf.billingGoal) || 0
                },
                create: {
                    branchId: Number(perf.branchId),
                    month: Number(month),
                    year: Number(year),
                    installations: Number(perf.installations) || 0,
                    activeClients: Number(perf.activeClients) || 0,
                    churnRate: Number(perf.churnRate) || 0,
                    installationGoal: Number(perf.installationGoal) || 0,
                    salesProjection: Number(perf.salesProjection) || 0,
                    billingGoal: Number(perf.billingGoal) || 0
                }
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const getBranchPerformanceEntries = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.query;
        const reqMonth = Number(month);
        const reqYear = Number(year);

        const branches = await prisma.branch.findMany({
            where: { companyId: Number(companyId) },
            include: {
                performance: {
                    orderBy: [ { year: 'desc' }, { month: 'desc' } ]
                }
            },
            orderBy: { name: 'asc' }
        });
        
        const data = branches.map(br => {
            const currentPerf = br.performance.find(p => p.month === reqMonth && p.year === reqYear);
            
            const pastAndCurrentPerfs = br.performance.filter(p => 
                p.year < reqYear || (p.year === reqYear && p.month <= reqMonth)
            );
            
            const goalRecord = pastAndCurrentPerfs.find(p => 
                p.installationGoal > 0 || Number(p.billingGoal) > 0
            ) || currentPerf;

            return {
                branchId: br.id,
                name: br.name,
                installations: currentPerf?.installations || 0,
                activeClients: currentPerf?.activeClients || 0,
                churnRate: currentPerf?.churnRate || 0,
                installationGoal: goalRecord?.installationGoal || currentPerf?.installationGoal || 0,
                salesProjection: goalRecord?.salesProjection || currentPerf?.salesProjection || 0,
                billingGoal: goalRecord?.billingGoal || currentPerf?.billingGoal || 0
            };
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

export const updateFinancialData = async (req: Request, res: Response) => {
    try {
        const { month, year, companyId } = req.body;
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
