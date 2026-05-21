
import { Router } from 'express';
import { getDashboardSummary, getPerformanceStats, getFinancialStats, getAgentsList, getClosersList, getUsersList, getHistoricalStats, getDailyClosingsChart, getNotifications } from '../controllers/dashboardController';
import { getBranchTrends } from '../controllers/branchTrendsController';
import { updateFinancialData, updateEmployeePerformance, updateBranchPerformance, getEmployeePerformanceEntries, getBranchPerformanceEntries } from '../controllers/dataEntryController';
import { getDailyMetrics, updateDailyMetrics, updateDailyAgentSales, getLeaderboard, getTeamsPerformance, getAgentPacing, syncOdooMetrics, getMonthlyMeritAccumulated, getMeritHighlights, getVersusStandings, closeMonth, getMonthlyBonuses, saveMonthlyBonuses, getXpHistory } from '../controllers/meritController';
import { getDailyBranchMetrics, updateDailyBranchMetrics, getMonthlyBranchAccumulated } from '../controllers/dailyBranchController';
import { getVersusState, createDraw, resetVersus, finishVersus } from '../controllers/versusController';
// import { getBranches, createBranch, deleteBranch, updateBranch, getEmployees, createEmployee, updateEmployeeStatus, updateEmployee, deleteEmployee, getUsers, createUser, updateUser, deleteUser, getCompanies, createCompany, updateCompany, deleteCompany, getInstallationTeams, createInstallationTeam, updateInstallationTeam, deleteInstallationTeam, getTeams, createTeam, updateTeam, deleteTeam, upload, getKpiConfig, updateKpiConfig, getPenalizationTypes, createPenalizationType, updatePenalizationType, deletePenalizationType } from '../controllers/adminController';
import { getBranches, createBranch, deleteBranch, updateBranch, getEmployees, createEmployee, updateEmployeeStatus, updateEmployee, deleteEmployee, getUsers, createUser, updateUser, deleteUser, getCompanies, createCompany, updateCompany, deleteCompany, getInstallationTeams, createInstallationTeam, updateInstallationTeam, deleteInstallationTeam, getTeams, createTeam, updateTeam, deleteTeam, upload, getKpiConfig, updateKpiConfig, getPenalizationTypes, createPenalizationType, updatePenalizationType, deletePenalizationType } from '../controllers/adminController';

import { getCompetitors, saveCompetitor, deleteCompetitor, drawPitch, submitSimulationFeedback, getPendingFeedback, markFeedbackRead, drawEvaluation, submitEvaluation, submitFieldCoaching, getCoachingHistory, getKnowledgeBase, createKnowledgeBaseItem, updateKnowledgeBaseItem, deleteKnowledgeBaseItem, getUniversityUsers, getEvaluationHistory } from '../controllers/salesUniversityController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateToken); // Protect all dashboard routes

router.get('/summary', getDashboardSummary);
router.get('/notifications', getNotifications);
router.get('/daily-closings', getDailyClosingsChart);
router.get('/performance', getPerformanceStats);
router.get('/performance/branches-history', getBranchTrends);
router.get('/financials', getFinancialStats);
router.get('/agents', getAgentsList);
router.get('/closers', getClosersList);
router.get('/users', getUsersList);

// Data Entry Routes
// Data Entry Routes
router.get('/data-entry/employees', requireAdmin, getEmployeePerformanceEntries);

router.post('/data-entry/employees', requireAdmin, updateEmployeePerformance);

router.get('/data-entry/branches', requireAdmin, getBranchPerformanceEntries);
router.post('/data-entry/branches', requireAdmin, updateBranchPerformance);

router.get('/data-entry/branches-daily', requireAdmin, getDailyBranchMetrics);
router.post('/data-entry/branches-daily', requireAdmin, updateDailyBranchMetrics);
router.get('/data-entry/branches-monthly', requireAdmin, getMonthlyBranchAccumulated);

// Meritocracy Routes
router.get('/data-entry/daily-merit', requireAdmin, getDailyMetrics);
router.post('/data-entry/daily-merit', requireAdmin, updateDailyMetrics);
router.post('/data-entry/daily-agent-sales', requireAdmin, updateDailyAgentSales);
router.get('/data-entry/monthly-merit', requireAdmin, getMonthlyMeritAccumulated);
router.post('/data-entry/sync-odoo', requireAdmin, syncOdooMetrics);
router.post('/merit/close-month', requireAdmin, closeMonth);
router.get('/merit/leaderboard', authenticateToken, getLeaderboard); // All users can see ranking
router.get('/merit/teams-performance', authenticateToken, getTeamsPerformance);
router.get('/merit/agent/:id/pacing', authenticateToken, getAgentPacing);
router.get('/merit/xp-history', authenticateToken, getXpHistory);
router.get('/merit/highlights', authenticateToken, getMeritHighlights);
router.get('/merit/versus-standings', authenticateToken, getVersusStandings);
router.get('/merit/bonuses', authenticateToken, getMonthlyBonuses);
router.post('/merit/bonuses', requireAdmin, saveMonthlyBonuses);

// Versus Routes
router.get('/versus/state', authenticateToken, getVersusState);
router.post('/versus/draw', requireAdmin, createDraw);
router.post('/versus/reset', authenticateToken, resetVersus);
router.post('/versus/finish', requireAdmin, finishVersus);

router.post('/data-entry/financials', requireAdmin, updateFinancialData);

// Admin Routes
router.get('/admin/branches', requireAdmin, getBranches);

router.get('/history', getHistoricalStats);
router.post('/admin/branches', requireAdmin, createBranch);
router.delete('/admin/branches/:id', requireAdmin, deleteBranch);
router.put('/admin/branches/:id', requireAdmin, updateBranch);

router.get('/admin/employees', requireAdmin, getEmployees);
router.post('/admin/employees', requireAdmin, upload.single('photo'), createEmployee);
router.patch('/admin/employees/:id/status', requireAdmin, updateEmployeeStatus);
router.put('/admin/employees/:id', requireAdmin, upload.single('photo'), updateEmployee);
router.delete('/admin/employees/:id', requireAdmin, deleteEmployee);

router.get('/admin/users', requireAdmin, getUsers);
router.post('/admin/users', requireAdmin, createUser);
router.put('/admin/users/:id', requireAdmin, updateUser);
router.delete('/admin/users/:id', requireAdmin, deleteUser);

router.get('/admin/companies', requireAdmin, getCompanies);
router.post('/admin/companies', requireAdmin, createCompany);
router.put('/admin/companies/:id', requireAdmin, updateCompany);
router.delete('/admin/companies/:id', requireAdmin, deleteCompany);

// Installation Teams
router.get('/admin/installation-teams', requireAdmin, getInstallationTeams);
router.post('/admin/installation-teams', requireAdmin, createInstallationTeam);
router.put('/admin/installation-teams/:id', requireAdmin, updateInstallationTeam);
router.delete('/admin/installation-teams/:id', requireAdmin, deleteInstallationTeam);

// Sales Teams (Integral Agents)
router.get('/admin/teams', requireAdmin, getTeams);
router.post('/admin/teams', requireAdmin, createTeam);
router.put('/admin/teams/:id', requireAdmin, updateTeam);
router.delete('/admin/teams/:id', requireAdmin, deleteTeam);

// Admin Configuration Routes
router.get('/admin/kpi-config', requireAdmin, getKpiConfig);
router.post('/admin/kpi-config', requireAdmin, updateKpiConfig);

router.get('/admin/penalization-types', requireAdmin, getPenalizationTypes);
router.post('/admin/penalization-types', requireAdmin, createPenalizationType);
router.put('/admin/penalization-types/:id', requireAdmin, updatePenalizationType);
router.delete('/admin/penalization-types/:id', requireAdmin, deletePenalizationType);

// ============================================
// Universidad de Ventas Routes
// ============================================
router.get('/university/competitors', authenticateToken, getCompetitors);
router.post('/university/competitors', authenticateToken, saveCompetitor);
router.delete('/university/competitors', authenticateToken, deleteCompetitor);

router.get('/university/draw-pitch', authenticateToken, drawPitch);
router.post('/university/submit-feedback', authenticateToken, submitSimulationFeedback);
router.get('/university/pending-feedback', authenticateToken, getPendingFeedback);
router.put('/university/feedback/:id/read', authenticateToken, markFeedbackRead);

router.get('/university/daily-evaluation', authenticateToken, drawEvaluation);
router.post('/university/submit-evaluation', authenticateToken, submitEvaluation);

router.post('/university/submit-coaching', authenticateToken, submitFieldCoaching);
router.get('/university/coaching-history', authenticateToken, getCoachingHistory);
router.get('/university/evaluation-history', authenticateToken, getEvaluationHistory);

router.get('/university/users', authenticateToken, getUniversityUsers);
router.get('/university/knowledge-base', authenticateToken, getKnowledgeBase);
router.post('/university/knowledge-base', authenticateToken, createKnowledgeBaseItem);
router.put('/university/knowledge-base/:id', authenticateToken, updateKnowledgeBaseItem);
router.delete('/university/knowledge-base/:id', authenticateToken, deleteKnowledgeBaseItem);

export default router;
