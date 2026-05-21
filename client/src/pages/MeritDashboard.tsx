import { useQuery } from '@tanstack/react-query';
import { useConfig } from '../contexts/ConfigContext';
import api from '../lib/api';
import { Trophy, Medal, TrendingUp, TrendingDown, Star, HelpCircle, Crown, Users } from 'lucide-react';
import AgentPacingModal from '../components/analytics/AgentPacingModal';
import ScoringRulesModal from '../components/data-entry/ScoringRulesModal';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { Save, Printer } from 'lucide-react';

export default function MeritDashboard() {
    const { month, year, companyId } = useConfig();
    const [pacingAgent, setPacingAgent] = useState<{ id: number, name: string } | null>(null);
    const [rulesSection, setRulesSection] = useState<'general' | 'nivel' | 'xp' | null>(null);
    const [activeTab, setActiveTab] = useState<'ranking' | 'versus' | 'bono' | 'xp' | 'teams'>('ranking');
    const [selectedDivision, setSelectedDivision] = useState<'all' | 'Primera' | 'Segunda'>('Primera');
    const [bonusPool, setBonusPool] = useState<string>('');
    const [supervisorBonusPool, setSupervisorBonusPool] = useState<string>('');

    const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
        queryKey: ['meritLeaderboard', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/leaderboard', {
                params: { month, year, companyId, role: 'CLOSER', division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    const { data: highlights, isLoading: isLoadingHighlights } = useQuery({
        queryKey: ['meritHighlights', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await api.get('/dashboard/merit/highlights', {
                params: { month, year, companyId, role: 'CLOSER', division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    const { data: versusStandings, isLoading: isLoadingVersus } = useQuery({
        queryKey: ['versusStandings', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/versus-standings', {
                params: { month, year, companyId, role: 'CLOSER', division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId && activeTab === 'versus'
    });

    const { data: savedBonuses, refetch: refetchBonuses } = useQuery({
        queryKey: ['meritBonuses', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/bonuses', {
                params: { month, year, companyId }
            });
            return res.data;
        },
        enabled: !!companyId && activeTab === 'bono'
    });

    const { data: xpHistory } = useQuery({
        queryKey: ['xpHistory', companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/xp-history', {
                params: { companyId }
            });
            return res.data;
        },
        enabled: !!companyId && activeTab === 'xp'
    });

    const { data: teamsPerformance } = useQuery({
        queryKey: ['teamsPerformance', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/teams-performance', {
                params: { month, year, companyId, division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId && (activeTab === 'teams' || activeTab === 'bono')
    });

    // Sync bonus pool if saved data exists
    useEffect(() => {
        if (savedBonuses && savedBonuses.length > 0 && leaderboard && teamsPerformance) {
            // Filter saved bonuses to only include those for employees in the selected division
            const activeAgentIds = new Set(leaderboard.map((a: any) => a.id));
            const activeSupervisorIds = new Set(teamsPerformance.map((t: any) => t.supervisor?.id).filter(Boolean));

            const divisionSavedBonuses = savedBonuses.filter((b: any) => {
                if (selectedDivision === 'all') return true;
                return activeAgentIds.has(b.employeeId) || activeSupervisorIds.has(b.employeeId);
            });

            // Sum up agent and supervisor bonuses separately
            const agentTotal = divisionSavedBonuses
                .filter((b: any) => activeAgentIds.has(b.employeeId))
                .reduce((sum: number, b: any) => sum + b.amount, 0);

            const supervisorTotal = divisionSavedBonuses
                .filter((b: any) => activeSupervisorIds.has(b.employeeId))
                .reduce((sum: number, b: any) => sum + b.amount, 0);

            setBonusPool(agentTotal > 0 ? agentTotal.toString() : '');
            setSupervisorBonusPool(supervisorTotal > 0 ? supervisorTotal.toString() : '');
        } else {
            setBonusPool('');
            setSupervisorBonusPool('');
        }
    }, [savedBonuses, leaderboard, teamsPerformance, selectedDivision]);

    const handleSaveBonuses = async (calculatedBonuses: any[]) => {
        try {
            await api.post('/dashboard/merit/bonuses', {
                month,
                year,
                companyId,
                bonuses: calculatedBonuses
            });
            toast.success('Bonos guardados exitosamente');
            refetchBonuses();
        } catch (error) {
            console.error('Error saving bonuses:', error);
            toast.error('No se pudieron guardar los bonos');
        }
    };

    const handleExportPDF = (calculatedBonuses: any[], poolTotalAmount: number) => {
        const doc = new jsPDF();
        
        const totalAgents = calculatedBonuses.filter(b => b.type === 'AGENT').reduce((sum, b) => sum + b.amount, 0);
        const totalSupervisors = calculatedBonuses.filter(b => b.type === 'SUPERVISOR').reduce((sum, b) => sum + b.amount, 0);

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('SOLICITUD DE PAGO DE BONOS', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Periodo: ${month}/${year}`, 105, 28, { align: 'center' });
        
        // Totals Box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(40, 32, 130, 20, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`Bono Agentes: $${totalAgents.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 38, { align: 'center' });
        doc.text(`Bono Supervisores: $${totalSupervisors.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 43, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`TOTAL DISTRIBUIDO: $${poolTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 50, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        doc.line(20, 55, 190, 55);

        // Content
        let agentRank = 1;
        const tableData = calculatedBonuses.map((b) => [
            b.type === 'SUPERVISOR' ? 'SUP' : `#${agentRank++}`,
            b.name,
            b.role,
            b.score.toLocaleString(),
            `${b.weight.toFixed(2)}%`,
            `$${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 60,
            head: [['Rank', 'Nombre', 'Rol', 'Puntaje', 'Peso (%)', 'Bono Asignado']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // Signatures
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.line(30, finalY, 80, finalY);
        doc.text('Firma Gerencia', 55, finalY + 7, { align: 'center' });
        
        doc.line(130, finalY, 180, finalY);
        doc.text('Recibido Nómina', 155, finalY + 7, { align: 'center' });

        doc.save(`Reporte_Bonos_${month}_${year}.pdf`);
    };

    if (isLoadingLeaderboard || isLoadingHighlights) return <div className="p-8 text-center text-slate-500">Cargando datos...</div>;

    const getMedalColor = (index: number) => {
        if (index === 0) return 'text-yellow-500'; // Gold
        if (index === 1) return 'text-slate-400'; // Silver
        if (index === 2) return 'text-amber-600'; // Bronze
        return 'text-slate-300';
    };

    const averageScore = leaderboard && leaderboard.length > 0
        ? leaderboard.reduce((sum: number, agent: any) => sum + agent.monthlyScore, 0) / leaderboard.length
        : 0;

    const getLevelBadge = (level: string) => {
        const updates: Record<string, string> = {
            'DIAMOND': 'bg-cyan-100 text-cyan-800 border-cyan-200',
            'PLATINUM': 'bg-slate-100 text-slate-800 border-slate-300',
            'GOLD': 'bg-yellow-50 text-yellow-700 border-yellow-200',
            'SILVER': 'bg-slate-50 text-slate-600 border-slate-200',
            'BRONZE': 'bg-orange-50 text-orange-800 border-orange-200'
        };
        return updates[level] || 'bg-slate-50';
    };

    const generalChampion = leaderboard && leaderboard.length > 0 ? leaderboard[0] : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 flex items-center space-x-2">
                        <Trophy className="text-yellow-500" />
                        <span>Ranking Meritocrático Agentes AI - {month}/{year}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500">Evaluación continua de desempeño y niveles de carrera.</p>
                    </div>
                </div>
                {/* Selector de División */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setSelectedDivision('Primera')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDivision === 'Primera' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Primera División
                    </button>
                    <button
                        onClick={() => setSelectedDivision('Segunda')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDivision === 'Segunda' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Segunda División
                    </button>
                    <button
                        onClick={() => setSelectedDivision('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDivision === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Todas
                    </button>
                </div>
            </div>

            {/* HIGHLIGHT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Campeón General */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <Crown size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-amber-100 text-[10px] text-opacity-80">
                            <Crown size={12} className="fill-current" />
                            <span>Campeón General del Mes</span>
                        </div>
                        {generalChampion ? (
                            <>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white/20 border border-white/20 shadow-inner flex items-center justify-center shrink-0">
                                        {generalChampion.photo ? (
                                            <img 
                                                src={generalChampion.photo.startsWith('http') ? generalChampion.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${generalChampion.photo}`} 
                                                alt={generalChampion.name} 
                                                className="h-full w-full object-cover" 
                                            />
                                        ) : (
                                            <span className="text-white text-2xl font-black">{generalChampion.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black truncate max-w-[150px]">{generalChampion.name}</h3>
                                        <p className="text-amber-100/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Top del Mes</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">Puntaje</span>
                                        <span className="text-xl font-black leading-tight">{generalChampion.monthlyScore}</span>
                                    </div>
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10 flex-1">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">XP Total Actual</span>
                                        <span className="text-lg font-bold leading-tight flex items-center gap-1">
                                            {generalChampion.projectedXp?.toLocaleString() || '0'} <Star size={10} className="fill-current"/>
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-amber-100/60 italic text-sm py-4">Aún no hay puntos registrados este mes.</p>
                        )}
                    </div>
                </div>

                {/* Campeón VS */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <Trophy size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-indigo-100 text-[10px] text-opacity-80">
                            <Star size={12} className="fill-current" />
                            <span>Campeón Versus del Mes</span>
                        </div>
                        {highlights?.champion ? (
                            <>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white/20 border border-white/20 shadow-inner flex items-center justify-center">
                                        {highlights.champion.photo ? (
                                            <img 
                                                src={highlights.champion.photo.startsWith('http') ? highlights.champion.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${highlights.champion.photo}`} 
                                                alt={highlights.champion.name} 
                                                className="h-full w-full object-cover" 
                                            />
                                        ) : (
                                            <span className="text-white text-2xl font-black">{highlights.champion.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black">{highlights.champion.name}</h3>
                                        <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Líder del Cuadro</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">Victorias</span>
                                        <span className="text-xl font-black leading-tight">{highlights.champion.wins}</span>
                                    </div>
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">Récord (G-E-P)</span>
                                        <span className="text-lg font-bold leading-tight">
                                            {highlights.champion.wins}-{highlights.champion.draws}-{highlights.champion.losses}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-indigo-100/60 italic text-sm py-4">Sin encuentros finalizados este mes.</p>
                        )}
                    </div>
                </div>

                {/* Highest Daily Score */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <TrendingUp size={100} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider text-emerald-100 text-[10px] text-opacity-80">
                            <Medal size={12} className="fill-current" />
                            <span>Récord de Puntaje Diario</span>
                        </div>
                        {highlights?.bestDay ? (
                            <>
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white/20 border border-white/20 shadow-inner flex items-center justify-center">
                                        {highlights.bestDay.photo ? (
                                            <img 
                                                src={highlights.bestDay.photo.startsWith('http') ? highlights.bestDay.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${highlights.bestDay.photo}`} 
                                                alt={highlights.bestDay.name} 
                                                className="h-full w-full object-cover" 
                                            />
                                        ) : (
                                            <span className="text-white text-2xl font-black">{highlights.bestDay.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black">{highlights.bestDay.name}</h3>
                                        <p className="text-emerald-100/60 text-[10px] font-bold uppercase tracking-widest mt-0.5">Puntaje Legendario</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 mt-4">
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">Máximo</span>
                                        <span className="text-xl font-black leading-tight">{highlights.bestDay.score} pts</span>
                                    </div>
                                    <div className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
                                        <span className="text-[10px] uppercase font-bold block opacity-70">Fecha</span>
                                        <span className="text-lg font-bold leading-tight">
                                            {format(new Date(highlights.bestDay.date.substring(0, 10) + 'T12:00:00Z'), "d 'de' MMM", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-emerald-100/60 italic text-sm py-4">Aún no hay puntos registrados este mes.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('ranking')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Ranking General
                </button>
                <button
                    onClick={() => setActiveTab('versus')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'versus' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Standing Versus
                </button>
                <button
                    onClick={() => setActiveTab('bono')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'bono' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Bono
                </button>
                <button
                    onClick={() => setActiveTab('xp')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'xp' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    XP
                </button>
                <button
                    onClick={() => setActiveTab('teams')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'teams' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Equipos
                </button>
            </div>

            {activeTab === 'ranking' ? (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* TOP 3 PODIUM */}
                        {leaderboard && leaderboard.slice(0, 3).map((agent: any, index: number) => (
                            <div key={agent.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setPacingAgent({ id: agent.id, name: agent.name })}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Medal size={80} className={getMedalColor(index)} />
                                </div>
                                <div className="relative z-10">
                                    <div className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mb-3 border ${getLevelBadge(agent.projectedLevel)}`}>
                                        {agent.projectedLevel}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                                            {agent.photo ? (
                                                <img 
                                                    src={agent.photo.startsWith('http') ? agent.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${agent.photo}`} 
                                                    alt={agent.name} 
                                                    className="h-full w-full object-cover" 
                                                />
                                            ) : (
                                                <span className="text-slate-400 text-lg font-bold">{agent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">{agent.name}</h3>
                                    </div>
                                    <div className="mt-3 flex items-end space-x-1">
                                        <span className={`text-3xl font-black ${index === 0 ? 'text-indigo-600' : 'text-slate-700'}`}>{agent.monthlyScore}</span>
                                        <span className="text-slate-400 text-xs mb-1 font-bold">PTS</span>
                                    </div>
                                    <div className="mt-3 flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 w-fit px-2 py-1 rounded-lg">
                                        <Star size={12} className="text-yellow-400 fill-current" />
                                        <span className="font-bold">{agent.projectedXp?.toLocaleString() || '0'}</span>
                                        <span className="opacity-60">XP</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-black tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="p-4 w-16">Rank</th>
                                    <th className="p-4">Agente</th>
                                    <th className="p-4">
                                        <div className="flex items-center gap-1">
                                            Nivel
                                            <button onClick={() => setRulesSection('nivel')} title="Ver cómo subir de nivel" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                                <HelpCircle size={12} />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            XP Total
                                            <button onClick={() => setRulesSection('xp')} title="Ver cómo se acumula XP" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                                <HelpCircle size={12} />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            Puntaje
                                            <button onClick={() => setRulesSection('general')} title="Ver reglas de cálculo" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                                                <HelpCircle size={12} />
                                            </button>
                                        </div>
                                    </th>
                                    <th className="p-4 text-center">Estado</th>
                                    <th className="p-4 text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaderboard && leaderboard.map((agent: any, index: number) => (
                                    <tr key={agent.id}
                                        onClick={() => setPacingAgent({ id: agent.id, name: agent.name })}
                                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                                    >
                                        <td className="p-4 font-black text-slate-300 text-sm">#{index + 1}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                    {agent.photo ? (
                                                        <img 
                                                            src={agent.photo.startsWith('http') ? agent.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${agent.photo}`} 
                                                            alt={agent.name} 
                                                            className="h-full w-full object-cover" 
                                                        />
                                                    ) : (
                                                        <span className="text-slate-400 text-[10px] font-bold">{agent.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="font-bold text-slate-700">{agent.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getLevelBadge(agent.projectedLevel)}`}>
                                                {agent.projectedLevel}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono font-bold text-slate-500">
                                            {agent.projectedXp?.toLocaleString() || '0'} <span className="text-[10px] opacity-60">XP</span>
                                        </td>
                                        <td className="p-4 text-right font-mono font-black text-indigo-600">
                                            {agent.monthlyScore}
                                        </td>
                                        <td className="p-4 text-center text-xs">
                                            {agent.monthlyScore >= averageScore ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100">
                                                    <TrendingUp size={16} className="mr-1" /> Supera Promedio
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold border border-amber-100">
                                                    <TrendingDown size={16} className="mr-1" /> Bajo Promedio
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-indigo-400 group-hover:translate-x-1 transition-transform inline-block font-black text-[10px]">
                                                VER →
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : activeTab === 'versus' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-emerald-50/50 text-[10px] uppercase text-emerald-600 font-black tracking-widest border-b border-emerald-100">
                            <tr>
                                <th className="p-4 w-16">Rank</th>
                                <th className="p-4">Agente</th>
                                <th className="p-4 text-center">VS</th>
                                <th className="p-4 text-center text-emerald-600">G</th>
                                <th className="p-4 text-center text-slate-400">E</th>
                                <th className="p-4 text-center text-red-500">P</th>
                                <th className="p-4 text-right bg-emerald-50 font-black">Standing</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoadingVersus ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400 font-bold">Cargando standing...</td></tr>
                            ) : versusStandings?.length === 0 ? (
                                <tr><td colSpan={7} className="p-12 text-center text-slate-400 italic">No hay Versus registrados este mes.</td></tr>
                            ) : versusStandings?.map((record: any, index: number) => (
                                <tr key={record.employeeId} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="p-4 font-black text-slate-300 text-sm">#{index + 1}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                {record.photo ? (
                                                    <img 
                                                        src={record.photo.startsWith('http') ? record.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${record.photo}`} 
                                                        alt={record.name} 
                                                        className="h-full w-full object-cover" 
                                                    />
                                                ) : (
                                                    <span className="text-slate-400 text-[10px] font-bold">{record.name.charAt(0)}</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-700">{record.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-slate-500 font-medium">{record.played}</td>
                                    <td className="p-4 text-center font-black text-emerald-600 bg-emerald-50/20">{record.wins}</td>
                                    <td className="p-4 text-center font-bold text-slate-300">{record.draws}</td>
                                    <td className="p-4 text-center font-black text-red-400/70">{record.losses}</td>
                                    <td className="p-4 text-right font-black text-emerald-700 bg-emerald-50/50">
                                        {record.points} <span className="text-[10px] opacity-60 ml-0.5">pts</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex justify-end gap-4 uppercase font-bold tracking-tight">
                        <span>G = 3 pts</span>
                        <span>E = 1 pt</span>
                        <span>P = 0 pts</span>
                    </div>
                </div>
            ) : activeTab === 'bono' ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Cálculo de Bono</h3>
                            <p className="text-sm text-slate-500">Distribución basada en el peso porcentual de cada agente y supervisor.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pote Agentes ($):</label>
                                <input
                                    type="number"
                                    value={bonusPool}
                                    onChange={(e) => setBonusPool(e.target.value)}
                                    placeholder="Ej. 1000"
                                    className="border border-slate-300 rounded-lg px-3 py-2 w-28 text-right font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Pote Supervisor ($):</label>
                                <input
                                    type="number"
                                    value={supervisorBonusPool}
                                    onChange={(e) => setSupervisorBonusPool(e.target.value)}
                                    placeholder="Ej. 500"
                                    className="border border-indigo-200 rounded-lg px-3 py-2 w-28 text-right font-mono font-bold text-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                                />
                            </div>
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-amber-50/50 text-[10px] uppercase text-amber-700 font-black tracking-widest border-b border-amber-100">
                            <tr>
                                <th className="p-4 w-16">Rank</th>
                                <th className="p-4">Persona</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4 text-right">Puntaje / Promedio</th>
                                <th className="p-4 text-right">Peso (%)</th>
                                <th className="p-4 text-right bg-amber-50 font-black">Bono Asignado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!leaderboard || leaderboard.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No hay datos de ranking.</td></tr>
                            ) : (
                                (() => {
                                    // Agent calculations
                                    const poolTotalScore = leaderboard.reduce((sum: number, agent: any) => sum + Math.max(0, agent.monthlyScore), 0);
                                    const poolAmount = parseFloat(bonusPool) || 0;

                                    const calculatedAgentBonuses = leaderboard.map((agent: any) => {
                                        const agentScore = Math.max(0, agent.monthlyScore);
                                        const weight = poolTotalScore > 0 ? (agentScore / poolTotalScore) * 100 : 0;
                                        const bonus = poolTotalScore > 0 ? (weight / 100) * poolAmount : 0;
                                        return {
                                            employeeId: agent.id,
                                            name: agent.name,
                                            role: 'Agente AI',
                                            score: agentScore,
                                            weight,
                                            amount: bonus,
                                            type: 'AGENT'
                                        };
                                    });

                                    // Supervisor calculations
                                    const supervisorPoolAmount = parseFloat(supervisorBonusPool) || 0;
                                    const totalTeamsAverage = teamsPerformance?.reduce((sum: number, t: any) => sum + (t.averageScore || 0), 0) || 0;
                                    
                                    const calculatedSupervisorBonuses = teamsPerformance?.map((t: any) => {
                                        const avgScore = t.averageScore || 0;
                                        const weight = totalTeamsAverage > 0 ? (avgScore / totalTeamsAverage) * 100 : 0;
                                        const bonus = totalTeamsAverage > 0 ? (weight / 100) * supervisorPoolAmount : 0;
                                        return {
                                            employeeId: t.supervisor?.id,
                                            name: t.supervisor?.name || 'Sin Supervisor',
                                            role: 'Supervisor AI',
                                            score: avgScore,
                                            weight,
                                            amount: bonus,
                                            type: 'SUPERVISOR',
                                            teamName: t.name
                                        };
                                    }) || [];

                                    const allBonuses = [...calculatedSupervisorBonuses, ...calculatedAgentBonuses];

                                    return (
                                        <>
                                            {allBonuses.map((b: any, index: number) => (
                                                <tr key={`${b.type}-${b.employeeId}`} className={`transition-colors ${b.type === 'SUPERVISOR' ? 'bg-indigo-50/40 hover:bg-indigo-100/50' : 'hover:bg-amber-50/30'}`}>
                                                    <td className="p-4 font-black text-slate-300 text-sm">
                                                        {b.type === 'SUPERVISOR' ? 'SUP' : `#${index + 1 - calculatedSupervisorBonuses.length}`}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`h-8 w-8 rounded-lg overflow-hidden border flex items-center justify-center shrink-0 ${b.type === 'SUPERVISOR' ? 'bg-indigo-100 border-indigo-200' : 'bg-slate-100 border-slate-200'}`}>
                                                                <span className={`${b.type === 'SUPERVISOR' ? 'text-indigo-500' : 'text-slate-400'} text-[10px] font-bold`}>{b.name.charAt(0)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-slate-700">{b.name}</span>
                                                                {b.teamName && <p className="text-[9px] uppercase font-bold text-indigo-400">Equipo {b.teamName}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${b.type === 'SUPERVISOR' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {b.role}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right font-mono font-bold text-slate-500">{b.score.toLocaleString()}</td>
                                                    <td className="p-4 text-right font-mono font-bold text-slate-400">{b.weight.toFixed(2)}%</td>
                                                    <td className={`p-4 text-right font-mono font-black ${b.type === 'SUPERVISOR' ? 'text-indigo-700 bg-indigo-50/50' : 'text-amber-700 bg-amber-50/30'}`}>
                                                        ${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr>
                                                <td colSpan={6} className="p-6 bg-slate-50">
                                                    <div className="flex items-center justify-end space-x-4">
                                                        <button 
                                                            onClick={() => handleExportPDF(allBonuses, poolAmount + supervisorPoolAmount)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm"
                                                        >
                                                            <Printer size={18} />
                                                            Imprimir Reporte PDF
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSaveBonuses(allBonuses)}
                                                            className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-sm shadow-amber-200"
                                                        >
                                                            <Save size={18} />
                                                            Guardar para Nómina
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        </>
                                    );
                                })()
                            )}
                        </tbody>
                    </table>
                </div>
            ) : activeTab === 'teams' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {teamsPerformance?.map((team: any, index: number) => (
                            <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:border-rose-300 transition-colors">
                                <div className={`p-1 bg-gradient-to-r ${index === 0 ? 'from-rose-500 to-orange-500' : 'from-slate-200 to-slate-300'}`} />
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-black text-xl ${index === 0 ? 'bg-rose-500' : 'bg-slate-400'}`}>
                                                {team.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800">{team.name}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Supervisor:</span>
                                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{team.supervisor?.name || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Puntaje Promedio</div>
                                            <div className={`text-3xl font-black ${index === 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                                {team.averageScore}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-50">
                                            <span>Miembro</span>
                                            <span>Puntaje Individual</span>
                                        </div>
                                        {team.members.map((member: any) => (
                                            <div key={member.id} className="flex justify-between items-center group/member">
                                                <span className="text-sm font-bold text-slate-600 group-hover/member:text-rose-600 transition-colors">{member.name}</span>
                                                <span className="font-mono font-black text-slate-400 group-hover/member:text-slate-800 transition-colors">{member.score}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400">{team.memberCount} integrantes</span>
                                        </div>
                                        <div className="bg-rose-50 px-3 py-1 rounded-lg">
                                            <span className="text-[10px] font-black text-rose-600 uppercase">Eficiencia Total: {team.totalScore} pts</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {teamsPerformance?.length === 0 && (
                        <div className="bg-white p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
                            <Users size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-slate-400 font-bold italic">No hay equipos configurados para esta empresa.</p>
                            <p className="text-slate-300 text-xs mt-1">Configura los equipos en la sección de Administración.</p>
                        </div>
                    )}
                </div>
            ) : null}

            <AgentPacingModal
                isOpen={!!pacingAgent}
                onClose={() => setPacingAgent(null)}
                agentId={pacingAgent?.id || null}
                agentName={pacingAgent?.name || ''}
            />

            <ScoringRulesModal isOpen={!!rulesSection} onClose={() => setRulesSection(null)} section={rulesSection || 'general'} />
        </div>
    );
}
