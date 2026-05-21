export const calculateDailyScore = (metric: any, includeVersus = true, role: string = 'CLOSER', config?: any) => {
    if (!metric) return 0;

    let score = 0;

    // Valores por defecto - Agentes Integrales
    const supportTicketsVal = config?.supportTickets ?? 6;
    const tasksDoneVal = config?.tasksDone ?? 2;
    const paymentsVal = config?.payments ?? 0.5;
    const conversationsVal = config?.conversations ?? 0.2;
    const closingsVal = config?.closings ?? 30;
    const revenueDiv = config?.revenueDivider ?? 10;

    // Valores por defecto - Agentes de Campo (configurables)
    const agentClosingPts   = config?.agentClosingPoints      ?? 300;
    const agentProspectPts  = config?.agentProspectPoints     ?? 50;
    const agentConvPts      = config?.agentConversionPoints   ?? 50;
    const agentReactPts     = config?.agentReactivationPoints ?? 150;
    const agentEquipPts     = config?.agentEquipmentPoints    ?? 100;
    const agentPenaltyPts   = config?.agentPenaltyPoints      ?? 30;

    if (role === 'AGENT') {
        // --- FIELD AGENT DAILY ---
        const cGoal = metric.closingGoal > 0 ? metric.closingGoal : 1;
        const pGoal = metric.prospectGoal > 0 ? metric.prospectGoal : 1;
        const reactGoal = metric.reactivationGoal > 0 ? metric.reactivationGoal : 1;
        const equipGoal = metric.equipmentRemovalGoal > 0 ? metric.equipmentRemovalGoal : 1;
        const convGoal = metric.conversionGoal > 0 ? metric.conversionGoal : 0.2;

        score += ((metric.closings || 0) / cGoal) * agentClosingPts;
        score += ((metric.prospects || 0) / pGoal) * agentProspectPts;

        const currentConv = (metric.prospects || 0) > 0 ? (metric.closings || 0) / (metric.prospects || 0) : 0;
        score += (currentConv / convGoal) * agentConvPts;

        const sharedGoal = metric.reactivationGoal && metric.reactivationGoal > 0 ? metric.reactivationGoal : (metric.equipmentRemovalGoal && metric.equipmentRemovalGoal > 0 ? metric.equipmentRemovalGoal : 1);
        
        score += ((metric.reactivations || 0) / sharedGoal) * agentReactPts;
        score += ((metric.equipmentRemovals || 0) / sharedGoal) * (config?.agentEquipmentPoints ?? 100); 
        // Note: Default for Reactivations is 150 in Monthly if not set, let's keep it consistent
        // Actually, let's just make sure the division is by sharedGoal

        // Penalizaciones
        if (metric.penalizations && metric.penalizations.length > 0) {
            score -= metric.penalizations.length * agentPenaltyPts;
        } else {
            score -= ((metric.avoidableTickets || 0) * agentPenaltyPts);
        }
    } else {
        // --- CLOSER DAILY ---
        score += (metric.closings || 0) * closingsVal;
        score += Math.floor((metric.revenue || 0) / revenueDiv);
        score += (metric.supportTickets || 0) * supportTicketsVal;
        score += (metric.tasksScheduled || 0) * tasksDoneVal;
        score += (metric.tasksDone || 0) * tasksDoneVal;
        score += (metric.conversations || 0) * conversationsVal;
        score += (metric.payments || 0) * paymentsVal;
        if (includeVersus) {
            score += (metric.versusPoints || 0);
        }

        let penaltyPoints = 0;
        if (metric.penalizations && metric.penalizations.length > 0) {
            penaltyPoints = metric.penalizations.reduce((sum: number, p: any) => sum + (p.penalizationType?.pointsCost || 0), 0);
            score -= penaltyPoints;
        } else {
            score -= ((metric.avoidableTickets || 0) * 30);
        }
    }

    return Math.round(score);
};

export const calculateMonthlyScore = (metricTotal: any, totalActiveDays: number = 1, role: string = 'CLOSER', config?: any) => {
    if (!metricTotal) return 0;

    let score = 0;

    // Valores por defecto - Agentes Integrales
    const supportTicketsVal = config?.supportTickets ?? 6;
    const tasksDoneVal = config?.tasksDone ?? 2;
    const paymentsVal = config?.payments ?? 0.5;
    const conversationsVal = config?.conversations ?? 0.2;
    const closingsVal = config?.closings ?? 30;
    const revenueDiv = config?.revenueDivider ?? 10;

    // Valores por defecto - Agentes de Campo (configurables)
    const agentClosingPts   = config?.agentClosingPoints      ?? 300;
    const agentProspectPts  = config?.agentProspectPoints     ?? 50;
    const agentConvPts      = config?.agentConversionPoints   ?? 50;
    const agentReactPts     = config?.agentReactivationPoints ?? 150;
    const agentEquipPts     = config?.agentEquipmentPoints    ?? 100;
    const agentPenaltyPts   = config?.agentPenaltyPoints      ?? 30;

    if (role === 'AGENT') {
        // --- FIELD AGENT MONTHLY ---
        const cGoal = metricTotal.closingGoal > 0 ? metricTotal.closingGoal : 1;
        const pGoal = metricTotal.prospectGoal > 0 ? metricTotal.prospectGoal : 1;
        const reactGoal = metricTotal.reactivationGoal > 0 ? metricTotal.reactivationGoal : 1;
        const equipGoal = metricTotal.equipmentRemovalGoal > 0 ? metricTotal.equipmentRemovalGoal : 1;
        const convGoal = metricTotal.conversionGoal > 0 ? metricTotal.conversionGoal : 0.2;
        
        const closings = metricTotal.closings || 0;
        score += (closings / cGoal) * agentClosingPts;

        const prospects = metricTotal.prospects || 0;
        score += (prospects / pGoal) * agentProspectPts;

        const realConv = prospects > 0 ? (closings / prospects) : 0;
        score += (realConv / convGoal) * agentConvPts;

        const sharedGoal = metricTotal.reactivationGoal && metricTotal.reactivationGoal > 0 ? metricTotal.reactivationGoal : (metricTotal.equipmentRemovalGoal && metricTotal.equipmentRemovalGoal > 0 ? metricTotal.equipmentRemovalGoal : 1);

        const reactivations = metricTotal.reactivations || 0;
        score += (reactivations / sharedGoal) * (config?.agentReactivationPoints ?? 150); // Weighted higher

        const equipmentRemovals = metricTotal.equipmentRemovals || 0;
        score += (equipmentRemovals / sharedGoal) * (config?.agentEquipmentPoints ?? 100);

        // Penalizaciones
        if (metricTotal.penalizations && metricTotal.penalizations.length > 0) {
            score -= metricTotal.penalizations.length * agentPenaltyPts;
        } else {
            score -= ((metricTotal.avoidableTickets || 0) * agentPenaltyPts);
        }

    } else {
        // --- CLOSER MONTHLY ---
        score += (metricTotal.closings || 0) * closingsVal;

        const prospects = metricTotal.prospects || 0;
        const closings = metricTotal.closings || 0;
        const conversion = prospects > 0 ? (closings / prospects) : 0;

        if (prospects >= 3) {
            if (conversion > 0.3) score += 150;
            else if (conversion > 0.15) score += 75;
        }

        score += Math.floor((metricTotal.revenue || 0) / revenueDiv);
        score += (metricTotal.supportTickets || 0) * supportTicketsVal;
        score += (metricTotal.tasksScheduled || 0) * tasksDoneVal;
        score += (metricTotal.tasksDone || 0) * tasksDoneVal;
        score += (metricTotal.conversations || 0) * conversationsVal;
        score += (metricTotal.payments || 0) * paymentsVal;
        score += (metricTotal.versusPoints || 0);

        let penaltyPoints = 0;
        if (metricTotal.penalizations && metricTotal.penalizations.length > 0) {
            penaltyPoints = metricTotal.penalizations.reduce((sum: number, p: any) => sum + (p.penalizationType?.pointsCost || 0), 0);
            score -= penaltyPoints;
        } else {
            score -= ((metricTotal.avoidableTickets || 0) * 30);
        }
    }

    return Math.round(score);
};
