import { Request, Response } from 'express';
import prisma from '../prisma';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'employee-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'));
    }
});

// --- Branches ---
export const getBranches = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const { companyId } = req.query;

        let whereClause: any = {};
        if (user?.companyId) whereClause.companyId = user.companyId;
        else if (companyId) whereClause.companyId = Number(companyId);

        if (user?.role === 'MANAGER') {
            const managerWithBranches = await prisma.user.findUnique({
                where: { id: userId },
                include: { managedBranches: { include: { company: true } } }
            });
            return res.json(managerWithBranches?.managedBranches || []);
        }

        const branches = await prisma.branch.findMany({
            where: whereClause,
            include: { company: true }
        });
        res.json(branches);
    } catch (error) {
        console.error('[getBranches] Error:', error);
        res.status(500).json({ error: 'Error fetching branches' });
    }
};

export const createBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, companyId, division } = req.body;
        const userId = (req as any).user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        let targetCompanyId = user?.companyId;
        if (!targetCompanyId) {
            if (companyId) targetCompanyId = Number(companyId);
            else {
                res.status(400).json({ error: 'Company ID required' });
                return;
            }
        }

        const branch = await prisma.branch.create({
            data: { name, companyId: targetCompanyId, division: division || 'Primera' }
        });
        res.json(branch);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating branch' });
    }
};

export const deleteBranch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const branchId = Number(id);

        console.log(`[deleteBranch] Attempting to delete branch ID: ${branchId}`);

        // Remove links from employees
        await prisma.employee.updateMany({
            where: { branchId },
            data: { branchId: null }
        });

        // Remove links from installation teams
        await prisma.installationTeam.updateMany({
            where: { branchId },
            data: { branchId: null }
        });

        // Clean up performance and metrics belonging strictly to the branch
        await prisma.branchPerformance.deleteMany({ where: { branchId } });
        await prisma.dailyBranchMetric.deleteMany({ where: { branchId } });

        // Finally, delete the branch
        await prisma.branch.delete({ where: { id: branchId } });

        console.log(`[deleteBranch] Successfully deleted branch ID: ${branchId}`);
        res.json({ message: 'Branch deleted' });
    } catch (error) {
        console.error('[deleteBranch] Error:', error);
        res.status(500).json({ error: 'Error deleting branch' });
    }
};

export const updateBranch = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, division } = req.body;
        console.log(`[updateBranch] Updating branch ID: ${id} with name: ${name}, division: ${division}`);
        const branch = await prisma.branch.update({
            where: { id: Number(id) },
            data: { name, division: division || 'Primera' }
        });
        res.json(branch);
    } catch (error) {
        console.error('[updateBranch] Error:', error);
        res.status(500).json({ error: 'Error updating branch' });
    }
};

// --- Employees ---
// --- Employees ---
export const getEmployees = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ 
            where: { id: userId },
            include: { managedBranches: true }
        });
        const { companyId, role } = req.query;

        let whereClause: any = {};

        // If user is restricted to a company, force it.
        if (user?.companyId) {
            whereClause.companyId = user.companyId;
        }
        // If user is Super Admin (no companyId), allow filtering by query param
        else if (companyId) {
            whereClause.companyId = Number(companyId);
        }

        // Restriction for MANAGER role: show only agents from their branches
        if (user?.role === 'MANAGER') {
            const branchIds = user.managedBranches.map(b => b.id);
            if (branchIds.length > 0) {
                whereClause.branchId = { in: branchIds };
            } else {
                 return res.json([]); // No branches assigned, no employees visible
            }
        }

        // Optional role filter
        if (role) {
            whereClause.role = String(role);
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: { 
                branch: true, 
                company: true, 
                team: true,
                supervisedTeams: true
            }
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching employees' });
    }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, role, branchId, companyId } = req.body;
        const userId = (req as any).user.userId;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Determine target Company ID
        let targetCompanyId = user?.companyId;

        if (!targetCompanyId) {
            // If user has no company (Super Admin), use the one provided in body
            if (companyId) targetCompanyId = Number(companyId);
            else {
                res.status(400).json({ error: 'Company ID required for Super Admin' });
                return;
            }
        }

        let photoUrl = null;
        if (req.file) {
            photoUrl = `/uploads/${req.file.filename}`;
        }

        const employee = await prisma.employee.create({
            data: {
                name,
                role,
                companyId: targetCompanyId,
                branchId: branchId ? Number(branchId) : null,
                teamId: (role === 'CLOSER' && req.body.teamId) ? Number(req.body.teamId) : null,
                photo: photoUrl,
                active: true
            }
        });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Error creating employee' });
    }
};

export const updateEmployeeStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { active } = req.body;
        const employee = await prisma.employee.update({
            where: { id: Number(id) },
            data: { active }
        });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Error updating employee status' });
    }
};

export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, role, branchId } = req.body;
        let data: any = {
            name,
            role,
            branchId: branchId ? Number(branchId) : null,
            teamId: (role === 'CLOSER' && req.body.teamId) ? Number(req.body.teamId) : null
        };

        if (req.file) {
            data.photo = `/uploads/${req.file.filename}`;
        }

        const employee = await prisma.employee.update({
            where: { id: Number(id) },
            data
        });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ error: 'Error updating employee' });
    }
};

export const deleteEmployee = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Clean up relations first
        await prisma.employeePerformance.deleteMany({ where: { employeeId: Number(id) } });
        await prisma.dailyAgentMetric.deleteMany({ where: { employeeId: Number(id) } });
        await prisma.versusMatch.deleteMany({ where: { agent1Id: Number(id) } });
        // Handle cases where the employee is Player 2
        await prisma.versusMatch.deleteMany({ where: { agent2Id: Number(id) } });
        // Clean up newly added modules and bonuses
        await prisma.monthlyBonus.deleteMany({ where: { employeeId: Number(id) } });
        await prisma.salesSimulationFeedback.deleteMany({ where: { employeeId: Number(id) } });
        await prisma.knowledgeEvaluation.deleteMany({ where: { employeeId: Number(id) } });
        await prisma.fieldCoaching.deleteMany({ where: { employeeId: Number(id) } });

        // Delete the employee
        await prisma.employee.delete({ where: { id: Number(id) } });

        res.json({ message: 'Employee deleted' });
    } catch (error) {
        console.error('[deleteEmployee] Error:', error);
        res.status(500).json({ error: 'Error deleting employee' });
    }
};

// --- System Users ---
export const getUsers = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const whereClause = user?.companyId ? { companyId: user.companyId } : {};

        const users = await prisma.user.findMany({
            where: whereClause,
            select: { id: true, username: true, role: true, companyId: true, managedBranches: { select: { id: true, name: true } } } // Don't return passwords
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching users' });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password, role, companyId, branchIds } = req.body;
        const userId = (req as any).user.userId;
        const currentUser = await prisma.user.findUnique({ where: { id: userId } });

        let targetCompanyId = currentUser?.companyId;

        if (!targetCompanyId) {
            if (companyId) targetCompanyId = Number(companyId);
            else {
                res.status(400).json({ error: 'Company ID required' });
                return;
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || 'USER',
                companyId: targetCompanyId,
                managedBranches: branchIds ? {
                    connect: branchIds.map((bid: number) => ({ id: bid }))
                } : undefined
            },
            include: { managedBranches: true }
        });

        // @ts-ignore
        delete newUser.password;
        res.json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating user' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { username, password, role, branchIds } = req.body;

        const data: any = { username, role };
        if (password && password.trim() !== '') {
            data.password = await bcrypt.hash(password, 10);
        }

        // Handle branch assignments
        if (branchIds) {
            data.managedBranches = {
                set: branchIds.map((bid: number) => ({ id: bid }))
            };
        } else if (role === 'ADMIN' || role === 'SUPERADMIN') {
            // Admins don't need restricted branches, but let's keep it clear
            data.managedBranches = { set: [] };
        }

        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data,
            include: { managedBranches: true }
        });

        // @ts-ignore
        delete updatedUser.password;
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.userId;

        if (Number(id) === Number(userId)) {
            // @ts-ignore
            return res.status(400).json({ error: 'Cannot delete yourself' });
        }

        await prisma.user.delete({ where: { id: Number(id) } });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting user' });
    }
};

// --- Companies (Super Admin) ---
export const getCompanies = async (req: Request, res: Response) => {
    console.log('GET /admin/companies hit');
    try {
        // ideally check if user is SUPERADMIN
        const companies = await prisma.company.findMany({
            include: {
                users: {
                    where: { role: 'ADMIN' },
                    select: { username: true }
                }
            }
        });
        console.log('getCompanies returning:', companies);
        res.json(companies);
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ error: 'Error fetching companies' });
    }
};

export const createCompany = async (req: Request, res: Response) => {
    console.log('POST /admin/companies hit with body:', req.body);
    try {
        const { companyName, adminUsername, adminPassword } = req.body;

        if (!companyName || !adminUsername || !adminPassword) {
            console.error('Missing fields in createCompany');
            // @ts-ignore
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Transaction to ensure both Company and Admin User are created or fail together
        const result = await prisma.$transaction(async (prisma) => {
            console.log('Starting transaction to create company:', companyName);
            const newCompany = await prisma.company.create({
                data: { name: companyName }
            });
            console.log('Company created:', newCompany);

            const newAdmin = await prisma.user.create({
                data: {
                    username: adminUsername,
                    password: hashedPassword,
                    role: 'ADMIN',
                    companyId: newCompany.id
                }
            });
            console.log('Admin created:', newAdmin);

            return { company: newCompany, admin: newAdmin };
        });

        console.log('createCompany transaction successful:', result);
        res.json(result);
    } catch (error: any) {
        console.error('Error creating company:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'El nombre de usuario del administrador ya está en uso' });
        }
        res.status(500).json({ error: error.message || 'Error creating company' });
    }
};

export const updateCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const updatedCompany = await prisma.company.update({
            where: { id: Number(id) },
            data: { name }
        });

        res.json(updatedCompany);
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ error: 'Error updating company' });
    }
};

export const deleteCompany = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const companyId = Number(id);

        console.log(`[deleteCompany] Full cleanup starting for Company ID: ${companyId}`);

        // 1. Delete all metrics and performance linked to employees of this company
        const companyEmployees = await prisma.employee.findMany({
            where: { companyId },
            select: { id: true }
        });
        const employeeIds = companyEmployees.map(e => e.id);

        if (employeeIds.length > 0) {
            await prisma.dailyAgentMetric.deleteMany({ where: { employeeId: { in: employeeIds } } });
            await prisma.employeePerformance.deleteMany({ where: { employeeId: { in: employeeIds } } });
            await prisma.versusMatch.deleteMany({ 
                where: { 
                    OR: [
                        { agent1Id: { in: employeeIds } },
                        { agent2Id: { in: employeeIds } }
                    ]
                } 
            });
        }

        // 2. Delete all metrics and performance linked to branches of this company
        const companyBranches = await prisma.branch.findMany({
            where: { companyId },
            select: { id: true }
        });
        const branchIds = companyBranches.map(b => b.id);

        if (branchIds.length > 0) {
            await prisma.dailyBranchMetric.deleteMany({ where: { branchId: { in: branchIds } } });
            await prisma.branchPerformance.deleteMany({ where: { branchId: { in: branchIds } } });
            // Clean up installation teams as well
            const teamIds = (await prisma.installationTeam.findMany({
                where: { branchId: { in: branchIds } },
                select: { id: true }
            })).map(t => t.id);
            
            if (teamIds.length > 0) {
                await prisma.installationPerformance.deleteMany({ where: { teamId: { in: teamIds } } });
            }
        }

        // 3. Delete company-level data
        await prisma.financialData.deleteMany({ where: { companyId } });
        await prisma.generalGoal.deleteMany({ where: { companyId } });
        await prisma.installationTeam.deleteMany({ where: { companyId } });
        await prisma.user.deleteMany({ where: { companyId } });
        await prisma.employee.deleteMany({ where: { companyId } });
        await prisma.branch.deleteMany({ where: { companyId } });

        // 4. Finally, delete the company
        await prisma.company.delete({ where: { id: companyId } });

        console.log(`[deleteCompany] Success deleting Company ID: ${companyId}`);
        res.json({ message: 'Company and all related data deleted successfully' });
    } catch (error) {
        console.error('[deleteCompany] Error:', error);
        res.status(500).json({ error: 'Error deleting company: Possibly due to linked data constraints' });
    }
};

// --- Sales Teams (Admin) ---
export const getTeams = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const { companyId } = req.query;

        let whereClause: any = {};
        if (user?.companyId) whereClause.companyId = user.companyId;
        else if (companyId) whereClause.companyId = Number(companyId);

        const teams = await prisma.team.findMany({
            where: whereClause,
            include: { 
                supervisor: true, 
                _count: { select: { members: true } },
                members: { select: { name: true } }
            }
        });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ error: 'Error fetching teams' });
    }
};

export const createTeam = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, companyId, supervisorId } = req.body;
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let targetCompanyId = user?.companyId;
        if (!targetCompanyId) {
            if (companyId) targetCompanyId = Number(companyId);
            else {
                res.status(400).json({ error: 'Company ID required' });
                return;
            }
        }

        const newTeam = await prisma.team.create({
            data: {
                name,
                companyId: targetCompanyId,
                supervisorId: Number(supervisorId)
            }
        });
        res.json(newTeam);
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Error creating team' });
    }
};

export const updateTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, supervisorId } = req.body;

        const updatedTeam = await prisma.team.update({
            where: { id: Number(id) },
            data: {
                name,
                supervisorId: supervisorId ? Number(supervisorId) : undefined
            }
        });
        res.json(updatedTeam);
    } catch (error) {
        console.error('Error updating team:', error);
        res.status(500).json({ error: 'Error updating team' });
    }
};

export const deleteTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // Unlink members first
        await prisma.employee.updateMany({
            where: { teamId: Number(id) },
            data: { teamId: null }
        });

        await prisma.team.delete({ where: { id: Number(id) } });
        res.json({ message: 'Team deleted' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Error deleting team' });
    }
};
// --- Installation Teams ---
export const getInstallationTeams = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const { companyId } = req.query;

        let whereClause: any = {};
        if (user?.companyId) whereClause.companyId = user.companyId;
        else if (companyId) whereClause.companyId = Number(companyId);

        const teams = await prisma.installationTeam.findMany({
            where: whereClause,
            include: { branch: true }
        });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching installation teams:', error);
        res.status(500).json({ error: 'Error fetching installation teams' });
    }
};

export const createInstallationTeam = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, branchId, companyId } = req.body;
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        let targetCompanyId = user?.companyId;
        if (!targetCompanyId) {
            if (companyId) targetCompanyId = Number(companyId);
            else {
                res.status(400).json({ error: 'Company ID required' });
                return;
            }
        }

        const team = await prisma.installationTeam.create({
            data: {
                name,
                companyId: targetCompanyId,
                branchId: branchId ? Number(branchId) : null
            }
        });
        res.json(team);
    } catch (error) {
        console.error('Error creating installation team:', error);
        res.status(500).json({ error: 'Error creating installation team' });
    }
};

export const updateInstallationTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, branchId } = req.body;

        const team = await prisma.installationTeam.update({
            where: { id: Number(id) },
            data: {
                name,
                branchId: branchId ? Number(branchId) : null
            }
        });
        res.json(team);
    } catch (error) {
        console.error('Error updating installation team:', error);
        res.status(500).json({ error: 'Error updating installation team' });
    }
};

export const deleteInstallationTeam = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.installationPerformance.deleteMany({ where: { teamId: Number(id) } });
        await prisma.installationTeam.delete({ where: { id: Number(id) } });
        res.json({ message: 'Installation team deleted' });
    } catch (error) {
        console.error('Error deleting installation team:', error);
        res.status(500).json({ error: 'Error deleting installation team' });
    }
};


// --- KPI Configuration ---
export const getKpiConfig = async (req: Request, res: Response) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) return res.status(400).json({ error: 'Month and year required' });
        
        let config = await prisma.kpiScoreConfig.findUnique({
            where: {
                month_year: {
                    month: Number(month),
                    year: Number(year)
                }
            }
        });
        
        // Return default if not found
        if (!config) {
            config = {
                id: 0,
                month: Number(month),
                year: Number(year),
                // Agentes Integrales
                supportTickets: 6,
                tasksDone: 2,
                payments: 0.5,
                conversations: 0.2,
                closings: 30,
                revenueDivider: 10,
                // Agentes de Campo
                agentClosingPoints: 300,
                agentProspectPoints: 50,
                agentConversionPoints: 50,
                agentReactivationPoints: 100,
                agentEquipmentPoints: 100,
                agentPenaltyPoints: 30,
                createdAt: new Date(),
                updatedAt: new Date()
            } as any;
        }
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching KPI config' });
    }
};

export const updateKpiConfig = async (req: Request, res: Response) => {
    try {
        const {
            month, year,
            // Agentes Integrales
            supportTickets, tasksDone, payments, conversations, closings, revenueDivider,
            // Agentes de Campo
            agentClosingPoints, agentProspectPoints, agentConversionPoints,
            agentReactivationPoints, agentEquipmentPoints, agentPenaltyPoints
        } = req.body;
        
        const agentData = {
            agentClosingPoints: Number(agentClosingPoints ?? 300),
            agentProspectPoints: Number(agentProspectPoints ?? 50),
            agentConversionPoints: Number(agentConversionPoints ?? 50),
            agentReactivationPoints: Number(agentReactivationPoints ?? 100),
            agentEquipmentPoints: Number(agentEquipmentPoints ?? 100),
            agentPenaltyPoints: Number(agentPenaltyPoints ?? 30)
        };

        const config = await prisma.kpiScoreConfig.upsert({
            where: {
                month_year: {
                    month: Number(month),
                    year: Number(year)
                }
            },
            update: {
                supportTickets: Number(supportTickets),
                tasksDone: Number(tasksDone),
                payments: Number(payments),
                conversations: Number(conversations),
                closings: Number(closings),
                revenueDivider: Number(revenueDivider),
                ...agentData
            },
            create: {
                month: Number(month),
                year: Number(year),
                supportTickets: Number(supportTickets),
                tasksDone: Number(tasksDone),
                payments: Number(payments),
                conversations: Number(conversations),
                closings: Number(closings),
                revenueDivider: Number(revenueDivider),
                ...agentData
            }
        });
        
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Error updating KPI config' });
    }
};

// --- Penalizations ---
export const getPenalizationTypes = async (req: Request, res: Response) => {
    try {
        const { role } = req.query;
        let whereClause = {};
        if (role) {
            whereClause = { targetRole: String(role) };
        }
        const types = await prisma.penalizationType.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching penalization types' });
    }
};

export const createPenalizationType = async (req: Request, res: Response) => {
    try {
        const { name, pointsCost, targetRole } = req.body;
        const type = await prisma.penalizationType.create({
            data: {
                name,
                pointsCost: Number(pointsCost),
                targetRole: targetRole || 'CLOSER'
            }
        });
        res.json(type);
    } catch (error) {
        res.status(500).json({ error: 'Error creating penalization type' });
    }
};

export const updatePenalizationType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, pointsCost, active, targetRole } = req.body;
        const type = await prisma.penalizationType.update({
            where: { id: Number(id) },
            data: {
                name,
                pointsCost: Number(pointsCost),
                targetRole: targetRole || 'CLOSER',
                active
            }
        });
        res.json(type);
    } catch (error) {
        res.status(500).json({ error: 'Error updating penalization type' });
    }
};

export const deletePenalizationType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // Verify if it's used
        const usedCount = await prisma.agentPenalizationEvent.count({ where: { penalizationTypeId: Number(id) } });
        if (usedCount > 0) {
            // Soft delete
            await prisma.penalizationType.update({
                where: { id: Number(id) },
                data: { active: false }
            });
            return res.json({ message: 'Penalization type disabled as it is in use' });
        }
        await prisma.penalizationType.delete({ where: { id: Number(id) } });
        res.json({ message: 'Penalization type deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting penalization type' });
    }
};
