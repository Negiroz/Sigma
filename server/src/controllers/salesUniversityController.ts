import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// MODULE 3: COMPETITION MATRIX
// ============================================

export const getCompetitors = async (req: Request, res: Response) => {
    try {
        const { companyId, onlyActive } = req.query;
        const userId = (req as any).user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        let whereClause: any = {};
        if (onlyActive === 'true') whereClause.active = true;

        if (user.role === 'MANAGER') {
            const branchIds = user.managedBranches.map(b => b.id);
            whereClause.branchId = { in: branchIds };
        } else if (companyId && companyId !== 'undefined' && companyId !== 'null') {
            whereClause.branch = { companyId: Number(companyId) };
        }

        const competitors = await prisma.competitor.findMany({
            where: whereClause,
            include: { 
                branch: true,
                offers: true 
            }
        });
        
        res.json(competitors);
    } catch (error) {
        console.error('Error fetching competitors:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const saveCompetitor = async (req: Request, res: Response) => {
    try {
        const { name, branchIds, active, offers, installPrice, equipment, promo } = req.body;
        
        let targetCompanyId: number | null = null;

        if (branchIds && Array.isArray(branchIds) && branchIds.length > 0) {
            // Find company context to perform safe deletion of removed branches
            const firstBranch = await prisma.branch.findUnique({ where: { id: Number(branchIds[0]) } });
            if (firstBranch) targetCompanyId = firstBranch.companyId;

            for (const branchId of branchIds) {
                const competitor = await prisma.competitor.upsert({
                    where: { name_branchId: { name, branchId: Number(branchId) } },
                    update: { active },
                    create: { name, branchId: Number(branchId), active },
                });

                // Overwrite offers completely
                await prisma.competitorOffer.deleteMany({ where: { competitorId: competitor.id } });
                
                if (offers && Array.isArray(offers)) {
                    await prisma.competitorOffer.createMany({
                        data: offers.map((o: any) => ({
                            competitorId: competitor.id,
                            bandwidth: o.bandwidth,
                            price: Number(o.price || 0),
                            installPrice: Number(installPrice || 0),
                            equipment: equipment,
                            promo: promo
                        }))
                    });
                }
            }

            // Cleanup branches that were unselected
            if (targetCompanyId) {
                await prisma.competitor.deleteMany({
                    where: {
                        name,
                        branch: { companyId: targetCompanyId },
                        branchId: { notIn: branchIds.map((id: any) => Number(id)) }
                    }
                });
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving competitor:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// MODULE 1: DAILY TRAINING (PITCH)
// ============================================

export const drawPitch = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        if (!user) return res.status(401).json({ error: 'User not found' });

        const { companyId, branchId, targetAgentId } = req.query;

        let whereClause: any = { role: 'AGENT', active: true };
        
        // Filter by company
        if (user.companyId) {
            whereClause.companyId = user.companyId;
        } else if (companyId && companyId !== 'undefined' && companyId !== 'null') {
             whereClause.companyId = Number(companyId);
        }

        // Restriction for MANAGER role
        if (user.role === 'MANAGER') {
            const managedBranchIds = user.managedBranches.map(b => b.id);
            if (managedBranchIds.length === 0) {
                return res.status(400).json({ error: 'No tienes sedes asignadas para realizar el sorteo.' });
            }

            if (branchId && branchId !== 'undefined') {
                const bId = Number(branchId);
                if (!managedBranchIds.includes(bId)) {
                    return res.status(403).json({ error: 'No tienes acceso a esta sede.' });
                }
                whereClause.branchId = bId;
            } else {
                whereClause.branchId = { in: managedBranchIds };
            }
        } else if (branchId && branchId !== 'undefined') {
            whereClause.branchId = Number(branchId);
        }

        // Select agents
        const agents = await prisma.employee.findMany({
            where: whereClause
        });

        if (agents.length < 2) {
            return res.status(400).json({ error: 'Not enough field agents to run a simulation.' });
        }

        let seller, client, evaluatedAgent;

        if (targetAgentId && targetAgentId !== 'undefined') {
            const targetId = Number(targetAgentId);
            const target = agents.find(a => a.id === targetId);
            
            if (!target) {
                return res.status(404).json({ error: 'El agente seleccionado no pertenece a la sede o empresa actual.' });
            }

            // The target is ALWAYS the evaluatedAgent
            evaluatedAgent = target;
            // Pick others from remaining
            const others = agents.filter(a => a.id !== targetId).sort(() => 0.5 - Math.random());
            seller = others[0];
            client = others.length > 1 ? others[1] : target; // Fallback to evaluated if only 2 agents total
        } else {
            // Full random
            const shuffled = agents.sort(() => 0.5 - Math.random());
            seller = shuffled[0];
            client = shuffled[1];
            evaluatedAgent = shuffled.length >= 3 ? shuffled[2] : shuffled[0];
        }

        // Determine Case and Context from Knowledge Base
        const allCases = await prisma.knowledgeBaseItem.findMany({
            where: { type: 'CASE', active: true }
        });

        if (allCases.length === 0) {
            return res.status(400).json({ error: 'No hay escenarios registrados en el módulo de Conocimiento.' });
        }

        // Filter cases based on user's authorized competitors
        let filteredCases = allCases;
        
        // Find relevant competitors for the scenario context
        const compWhere: any = { active: true };
        if (whereClause.branchId) {
             compWhere.branchId = whereClause.branchId;
        }

        const myCompetitors = await prisma.competitor.findMany({
            where: compWhere
        });
        const myCompetitorNames = new Set(myCompetitors.map(c => c.name));

        filteredCases = allCases.filter(c => {
            if (!c.contextType || c.contextType === "CLIENTE NUEVO") return true;
            if (c.contextType.startsWith("CLIENTE DE COMPETIDOR: ")) {
                const compName = c.contextType.replace("CLIENTE DE COMPETIDOR: ", "");
                return myCompetitorNames.has(compName);
            }
            return true;
        });

        if (filteredCases.length === 0) {
            return res.status(400).json({ error: 'No hay escenarios registrados válidos para la sede seleccionada.' });
        }

        const selectedCase = filteredCases[Math.floor(Math.random() * filteredCases.length)];
        const contextType = selectedCase.contextType || "CLIENTE NUEVO";

        // Fetch last feedback for the seller
        const lastFeedback = await prisma.salesSimulationFeedback.findFirst({
            where: { employeeId: seller.id },
            orderBy: { date: 'desc' }
        });

        res.json({
            seller,
            client,
            evaluatedAgent,
            contextType,
            case: selectedCase,
            lastFeedback
        });
    } catch (error) {
        console.error('Error in drawPitch:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const submitSimulationFeedback = async (req: Request, res: Response) => {
    try {
        const { employeeId, notes, speechObservations, objectionObservations } = req.body;
        const feedback = await prisma.salesSimulationFeedback.create({
            data: {
                employeeId: Number(employeeId),
                notes: notes || null,
                speechObservations: speechObservations || null,
                objectionObservations: objectionObservations || null
            }
        });
        res.json({ success: true, feedback });
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getPendingFeedback = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });

        const feedbacks = await prisma.salesSimulationFeedback.findMany({
            where: { employeeId: Number(employeeId), isRead: false },
            orderBy: { date: 'desc' }
        });

        res.json(feedbacks);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const markFeedbackRead = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.salesSimulationFeedback.update({
            where: { id: Number(id) },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// MODULE 1: DAILY TRAINING (QUESTIONS)
// ============================================

export const drawEvaluation = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        const { companyId, branchId } = req.query;
        let branchIds: number[] = [];
        let targetCompanyId = user.companyId || (companyId && companyId !== 'undefined' ? Number(companyId) : null);

        if (branchId && branchId !== 'undefined') {
            branchIds = [Number(branchId)];
        } else if (user.role === 'MANAGER') {
            branchIds = user.managedBranches.map(b => b.id);
        }

        // 1. Get standard questions
        const dbQuestions = await prisma.knowledgeBaseItem.findMany({
            where: { type: 'QUESTION', active: true },
            select: { id: true, content: true, options: true }
        });

        // 2. Get competitors to generate dynamic questions
        let compWhere: any = { active: true };
        if (branchIds.length > 0) {
            compWhere.branchId = { in: branchIds };
        } else if (targetCompanyId) {
            compWhere.branch = { companyId: targetCompanyId };
        }

        const competitors = await prisma.competitor.findMany({
            where: compWhere,
            include: { 
                offers: { take: 1, orderBy: { updatedAt: 'desc' } }
            }
        });

        // Generate dynamic questions from competitors
        const competitorQuestions: any[] = [];
        competitors.forEach(c => {
            const lastOffer = c.offers[0];
            if (lastOffer) {
                if (lastOffer.promo) {
                    competitorQuestions.push({
                        id: `comp-promo-${c.id}`,
                        content: `¿Mencione cual es la promoción actual del competidor ${c.name}?`,
                        options: lastOffer.promo
                    });
                }
                if (Number(lastOffer.installPrice) > 0) {
                    competitorQuestions.push({
                        id: `comp-install-${c.id}`,
                        content: `¿Cuál es el costo de instalación de ${c.name}?`,
                        options: `$${lastOffer.installPrice}`
                    });
                }
                if (lastOffer.equipment) {
                    competitorQuestions.push({
                        id: `comp-equip-${c.id}`,
                        content: `¿Qué equipos/tecnología está instalando ${c.name} actualmente?`,
                        options: lastOffer.equipment
                    });
                }
            }
        });

        // Combine and Filter Duplicates by Content
        const allPossible = [...dbQuestions, ...competitorQuestions];
        const uniqueQuestions: any[] = [];
        const seenContent = new Set<string>();

        // We use a Fisher-Yates shuffle or a simple sort then unique?
        // Better: shuffle everything first, then pick unique until we have 5.
        const randomizedAll = allPossible.sort(() => 0.5 - Math.random());

        for (const q of randomizedAll) {
            if (uniqueQuestions.length >= 5) break;
            const normalizedContent = q.content.trim().toLowerCase();
            if (!seenContent.has(normalizedContent)) {
                uniqueQuestions.push(q);
                seenContent.add(normalizedContent);
            }
        }

        // If no questions in DB or competitors, return some defaults
        if (uniqueQuestions.length === 0) {
            return res.json([
                { id: -1, content: '¿Cuál es la promoción principal de instalación del mes?', options: 'Consultar cartelera de precios actual.' },
                { id: -2, content: 'Nombre al menos 3 ventajas de la Fibra Óptica.', options: 'Velocidad simétrica, baja latencia, sin interferencias.' },
                { id: -3, content: 'Menciona los tiempos de respuesta del soporte técnico.', options: 'Máximo 24 a 48 horas según zona.' },
                { id: -4, content: '¿Cuál es el proceso correcto para retirar un equipo Domiciliario?', options: 'Validar solvencia, generar orden de retiro, recuperar ONU y transformador.' },
                { id: -5, content: 'Resume el script de abordaje en calle en 3 pasos.', options: 'Saludo empático, detección de necesidad, oferta de valor.' }
            ]);
        }

        res.json(uniqueQuestions);
    } catch (error) {
        console.error('Error drawing evaluation:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const submitEvaluation = async (req: Request, res: Response) => {
    try {
        const { employeeId, answers } = req.body; 
        // Answers expected: { questionId: string, rating: 'BUENA'|'REGULAR'|'MALA' }[]
        // BUENA = 4, REGULAR = 2, MALA = 0.
        
        let totalScore = 0;
        if (Array.isArray(answers)) {
            answers.forEach(a => {
                if (a.rating === 'BUENA') totalScore += 4;
                if (a.rating === 'REGULAR') totalScore += 2;
            });
        }

        const evaluation = await prisma.knowledgeEvaluation.create({
            data: {
                employeeId: Number(employeeId),
                score: totalScore
            }
        });

        res.json({ success: true, score: totalScore, evaluation });
    } catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// MODULE 2: FIELD COACHING
// ============================================

export const submitFieldCoaching = async (req: Request, res: Response) => {
    try {
        const { employeeId, supervisorId, primary, clients, conclusions, improvements } = req.body;
        
        // Final score calculation base 20.
        // Primary counts 20%, each client is averaged for the remaining 80%.
        
        const calcValue = (val: string) => val === 'BUENO' ? 1 : val === 'REGULAR' ? 0.5 : 0;
        
        const primaryScore = (calcValue(primary.presence) + calcValue(primary.routeKnowledge) + calcValue(primary.crmUpdate)) / 3;
        
        let clientScoreSum = 0;
        if (clients && clients.length > 0) {
            clients.forEach((c: any) => {
                let metrics = [c.tone, c.speed, c.pitch, c.listening, c.objections, c.tools, c.time];
                let sum = metrics.reduce((acc, m) => acc + calcValue(m), 0);
                clientScoreSum += (sum / metrics.length);
            });
        }
        
        const avgClientScore = clients.length > 0 ? (clientScoreSum / clients.length) : 0;
        
        // 20% primary, 80% clients
        const finalScore = ((primaryScore * 0.2) + (avgClientScore * 0.8)) * 20;

        const coaching = await prisma.fieldCoaching.create({
            data: {
                employeeId: Number(employeeId),
                supervisorId: Number(supervisorId),
                presence: primary.presence,
                routeKnowledge: primary.routeKnowledge,
                crmUpdate: primary.crmUpdate,
                conclusions,
                improvements,
                finalScore,
                clients: {
                    create: clients.map((c: any) => ({
                        tone: c.tone,
                        speed: c.speed,
                        pitch: c.pitch,
                        listening: c.listening,
                        objections: c.objections,
                        tools: c.tools,
                        time: c.time,
                        prospectCall: c.prospectCall,
                        reactivationCall: c.reactivationCall,
                        removalCall: c.removalCall
                    }))
                }
            }
        });

        res.json({ success: true, finalScore, coaching });

    } catch (error) {
        console.error('Error submitting field coaching:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getCoachingHistory = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) return res.status(400).json({ error: 'Employee ID required' });

        const history = await prisma.fieldCoaching.findMany({
            where: { employeeId: Number(employeeId) },
            include: { supervisor: true, clients: true },
            orderBy: { date: 'desc' }
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching coaching history:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ============================================
// MODULE: KNOWLEDGE BASE CRUD
// ============================================

export const getKnowledgeBase = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        let whereClause: any = {};
        
        // If user is a MANAGER, only show their own records FOR SIMULATIONS (CASE)
        // Questions and Materials remain shared
        if (user.role === 'MANAGER') {
            whereClause.OR = [
                { creatorId: user.id },
                { type: { not: 'CASE' } }
            ];
        }

        const items = await prisma.knowledgeBaseItem.findMany({
            where: whereClause,
            include: {
                creator: {
                    select: { username: true }
                }
            },
            orderBy: { id: 'desc' }
        });
        res.json(items);
    } catch (error) {
        console.error('Error fetching knowledge base:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const createKnowledgeBaseItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { type, content, contextType, options, active } = req.body;
        const item = await prisma.knowledgeBaseItem.create({
            data: { 
                type, 
                content, 
                contextType, 
                options, 
                active,
                creatorId: userId
            }
        });
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error creating knowledge base item:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const updateKnowledgeBaseItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { type, content, contextType, options, active, creatorId } = req.body;
        const item = await prisma.knowledgeBaseItem.update({
            where: { id: parseInt(id) },
            data: { type, content, contextType, options, active, creatorId }
        });
        res.json({ success: true, item });
    } catch (error) {
        console.error('Error updating knowledge base item:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getUniversityUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, username: true, role: true }
        });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const deleteKnowledgeBaseItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.knowledgeBaseItem.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting knowledge base item:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
export const deleteCompetitor = async (req: Request, res: Response) => {
    try {
        const { name } = req.query;
        const { companyId } = req.query;

        if (!name || !companyId) {
            return res.status(400).json({ error: 'Faltan parámetros: name y companyId son requeridos' });
        }

        // Delete all competitors with this name in branches of this company
        await prisma.competitor.deleteMany({
            where: {
                name: String(name),
                branch: {
                    companyId: Number(companyId)
                }
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting competitor:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

export const getEvaluationHistory = async (req: Request, res: Response) => {
    try {
        const { companyId, branchId } = req.query;
        const userId = (req as any).user.userId;

        console.log('Fetching evaluation history for user:', userId, 'query:', { companyId, branchId });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { managedBranches: true }
        });

        if (!user) return res.status(401).json({ error: 'Unauthorized' });

        let employeeWhere: any = {};
        if (user.role === 'MANAGER') {
            const branchIds = user.managedBranches.map(b => b.id);
            console.log('Manager branchIds:', branchIds);
            employeeWhere.branchId = { in: branchIds };
        } else if (branchId && branchId !== 'undefined' && branchId !== 'null') {
            employeeWhere.branchId = Number(branchId);
        } else if (companyId && companyId !== 'undefined' && companyId !== 'null') {
            employeeWhere.companyId = Number(companyId);
        }

        console.log('employeeWhere clause:', employeeWhere);

        const evaluations = await prisma.knowledgeEvaluation.findMany({
            where: {
                employee: employeeWhere
            },
            include: {
                employee: {
                    include: {
                        branch: {
                            include: {
                                managers: {
                                    select: { username: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        const feedbacks = await prisma.salesSimulationFeedback.findMany({
            where: {
                employee: employeeWhere
            },
            include: {
                employee: {
                    include: {
                        branch: {
                            include: {
                                managers: {
                                    select: { username: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { date: 'desc' }
        });

        console.log(`Found ${evaluations.length} evaluations and ${feedbacks.length} feedbacks`);

        res.json({ evaluations, feedbacks });
    } catch (error) {
        console.error('Error fetching evaluation history:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
