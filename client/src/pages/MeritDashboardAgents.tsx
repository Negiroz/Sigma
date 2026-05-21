import { useQuery } from '@tanstack/react-query';
import { useConfig } from '../contexts/ConfigContext';
import api from '../lib/api';
import { Trophy, Medal, AlertTriangle, TrendingUp, TrendingDown, Star, HelpCircle, Crown, Save, Printer } from 'lucide-react';
import AgentPacingModal from '../components/analytics/AgentPacingModal';
import ScoringRulesModal from '../components/data-entry/ScoringRulesModal';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

export default function MeritDashboardAgents() {
    const { month, year, companyId } = useConfig();
    const [pacingAgent, setPacingAgent] = useState<{ id: number, name: string } | null>(null);
    const [rulesSection, setRulesSection] = useState<'general' | 'nivel' | 'xp' | null>(null);
    const [activeTab, setActiveTab] = useState<'ranking' | 'versus' | 'bono'>('ranking');
    const [selectedDivision, setSelectedDivision] = useState<'Primera' | 'Segunda'>('Primera');
    const [bonusPoolPrimera, setBonusPoolPrimera] = useState<string>('');
    const [bonusPoolSegunda, setBonusPoolSegunda] = useState<string>('');

    const { data: savedBonuses, refetch: refetchBonuses } = useQuery({
        queryKey: ['meritBonuses', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/bonuses', {
                params: { month, year, companyId }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
        queryKey: ['meritLeaderboard', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/leaderboard', {
                params: { month, year, companyId, role: 'AGENT', division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    const { data: leaderboardPrimera, isLoading: isLoadingLeaderboardPrimera } = useQuery({
        queryKey: ['meritLeaderboard', month, year, companyId, 'Primera'],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/leaderboard', {
                params: { month, year, companyId, role: 'AGENT', division: 'Primera' }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    const { data: leaderboardSegunda, isLoading: isLoadingLeaderboardSegunda } = useQuery({
        queryKey: ['meritLeaderboard', month, year, companyId, 'Segunda'],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/merit/leaderboard', {
                params: { month, year, companyId, role: 'AGENT', division: 'Segunda' }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    useEffect(() => {
        if (savedBonuses && savedBonuses.length > 0) {
            if (leaderboardPrimera && leaderboardPrimera.length > 0) {
                const activeIds = new Set(leaderboardPrimera.map((a: any) => a.id));
                const divisionSaved = savedBonuses.filter((b: any) => activeIds.has(b.employeeId));
                const total = divisionSaved.reduce((sum: number, b: any) => sum + b.amount, 0);
                setBonusPoolPrimera(total > 0 ? total.toString() : '');
            } else {
                setBonusPoolPrimera('');
            }
            if (leaderboardSegunda && leaderboardSegunda.length > 0) {
                const activeIds = new Set(leaderboardSegunda.map((a: any) => a.id));
                const divisionSaved = savedBonuses.filter((b: any) => activeIds.has(b.employeeId));
                const total = divisionSaved.reduce((sum: number, b: any) => sum + b.amount, 0);
                setBonusPoolSegunda(total > 0 ? total.toString() : '');
            } else {
                setBonusPoolSegunda('');
            }
        } else {
            setBonusPoolPrimera('');
            setBonusPoolSegunda('');
        }
    }, [savedBonuses, leaderboardPrimera, leaderboardSegunda]);

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

    const handleExportPDF = (calculatedBonuses: any[], poolTotalAmount: number, divisionName: string) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(40);
        doc.text('SOLICITUD DE PAGO DE BONOS - CAMPO', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.text(`Periodo: ${month}/${year} | División: ${divisionName}`, 105, 28, { align: 'center' });
        
        // Totals Box
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(40, 32, 130, 15, 3, 3, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`TOTAL DISTRIBUIDO: $${poolTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 105, 42, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        doc.line(20, 52, 190, 52);

        // Content
        let agentRank = 1;
        const tableData = calculatedBonuses.map((b) => [
            `#${agentRank++}`,
            b.name,
            b.branchName,
            b.score.toLocaleString(),
            `${b.weight.toFixed(2)}%`,
            `$${b.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: 57,
            head: [['Rank', 'Nombre', 'Sede', 'Puntaje', 'Peso (%)', 'Bono Asignado']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }, // Emerald 500
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

        doc.save(`Reporte_Bonos_Campo_${divisionName}_${month}_${year}.pdf`);
    };



    const { data: highlights, isLoading: isLoadingHighlights } = useQuery({
        queryKey: ['meritHighlights', month, year, companyId, selectedDivision],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await api.get('/dashboard/merit/highlights', {
                params: { month, year, companyId, role: 'AGENT', division: selectedDivision }
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
                params: { month, year, companyId, role: 'AGENT', division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId && activeTab === 'versus'
    });

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
                        <Trophy className="text-emerald-500" />
                        <span>Ranking Meritocrático Campo - {month}/{year}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-500">Evaluación continua de desempeño y niveles de carrera.</p>
                    </div>
                </div>
                {/* Selector de División */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setSelectedDivision('Primera')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDivision === 'Primera' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Primera División
                    </button>
                    <button
                        onClick={() => setSelectedDivision('Segunda')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedDivision === 'Segunda' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Segunda División
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
                                    <th className="p-4">Sede</th>
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
                                            <span className="font-medium text-slate-500 text-[10px] uppercase tracking-wider">{agent.branchName}</span>
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
                                <th className="p-4">Sede</th>
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
                                    <td className="p-4">
                                        <span className="font-medium text-emerald-600/70 text-[10px] uppercase tracking-wider">{record.branchName}</span>
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
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Primera División Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Primera División - Cálculo de Bono</h3>
                                <p className="text-sm text-slate-500">Distribución basada en el peso porcentual de cada agente (basado en pts &gt; 0).</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="text-sm font-bold text-slate-700">Monto del Pote ($):</label>
                                <input
                                    type="number"
                                    value={bonusPoolPrimera}
                                    onChange={(e) => setBonusPoolPrimera(e.target.value)}
                                    placeholder="Ej. 1000"
                                    className="border border-slate-300 rounded-lg px-3 py-2 w-32 text-right font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-amber-50/50 text-[10px] uppercase text-amber-700 font-black tracking-widest border-b border-amber-100">
                                <tr>
                                    <th className="p-4 w-16">Rank</th>
                                    <th className="p-4">Agente</th>
                                    <th className="p-4">Sede</th>
                                    <th className="p-4 text-right">Puntaje Total</th>
                                    <th className="p-4 text-right">Peso (%)</th>
                                    <th className="p-4 text-right bg-amber-50 font-black">Bono Asignado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingLeaderboardPrimera ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold">Cargando...</td></tr>
                                ) : !leaderboardPrimera || leaderboardPrimera.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No hay datos de ranking.</td></tr>
                                ) : (
                                    (() => {
                                        const poolTotalScore = leaderboardPrimera.reduce((sum: number, agent: any) => sum + Math.max(0, agent.monthlyScore), 0);
                                        const poolAmount = parseFloat(bonusPoolPrimera) || 0;

                                        const calculatedAgentBonuses = leaderboardPrimera.map((agent: any) => {
                                            const agentScore = Math.max(0, agent.monthlyScore);
                                            const weight = poolTotalScore > 0 ? (agentScore / poolTotalScore) * 100 : 0;
                                            const bonus = poolTotalScore > 0 ? (weight / 100) * poolAmount : 0;
                                            return {
                                                employeeId: agent.id,
                                                name: agent.name,
                                                branchName: agent.branchName,
                                                score: agentScore,
                                                weight,
                                                amount: bonus
                                            };
                                        });

                                        return (
                                            <>
                                                {calculatedAgentBonuses.map((b: any, index: number) => (
                                                    <tr key={b.employeeId} className="hover:bg-amber-50/30 transition-colors">
                                                        <td className="p-4 font-black text-slate-300 text-sm">#{index + 1}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                                    {leaderboardPrimera[index]?.photo ? (
                                                                        <img 
                                                                            src={leaderboardPrimera[index].photo.startsWith('http') ? leaderboardPrimera[index].photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${leaderboardPrimera[index].photo}`} 
                                                                            alt={b.name} 
                                                                            className="h-full w-full object-cover" 
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-400 text-[10px] font-bold">{b.name.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <span className="font-bold text-slate-700">{b.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="font-medium text-amber-700/70 text-[10px] uppercase tracking-wider">{b.branchName}</span>
                                                        </td>
                                                        <td className="p-4 text-right font-mono text-slate-600">
                                                            {b.score.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right font-mono text-slate-600">
                                                            {b.weight.toFixed(2)}%
                                                        </td>
                                                        <td className="p-4 text-right font-mono font-black text-amber-700 bg-amber-50/50 px-4">
                                                            ${b.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={6} className="p-6 bg-slate-50">
                                                        <div className="flex items-center justify-end space-x-4">
                                                            <button 
                                                                onClick={() => handleExportPDF(calculatedAgentBonuses, poolAmount, 'Primera')}
                                                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm"
                                                            >
                                                                <Printer size={18} />
                                                                Imprimir Reporte PDF
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveBonuses(calculatedAgentBonuses)}
                                                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
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

                    {/* Segunda División Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Segunda División - Cálculo de Bono</h3>
                                <p className="text-sm text-slate-500">Distribución basada en el peso porcentual de cada agente (basado en pts &gt; 0).</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <label className="text-sm font-bold text-slate-700">Monto del Pote ($):</label>
                                <input
                                    type="number"
                                    value={bonusPoolSegunda}
                                    onChange={(e) => setBonusPoolSegunda(e.target.value)}
                                    placeholder="Ej. 1000"
                                    className="border border-slate-300 rounded-lg px-3 py-2 w-32 text-right font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-amber-50/50 text-[10px] uppercase text-amber-700 font-black tracking-widest border-b border-amber-100">
                                <tr>
                                    <th className="p-4 w-16">Rank</th>
                                    <th className="p-4">Agente</th>
                                    <th className="p-4">Sede</th>
                                    <th className="p-4 text-right">Puntaje Total</th>
                                    <th className="p-4 text-right">Peso (%)</th>
                                    <th className="p-4 text-right bg-amber-50 font-black">Bono Asignado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingLeaderboardSegunda ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold">Cargando...</td></tr>
                                ) : !leaderboardSegunda || leaderboardSegunda.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic">No hay datos de ranking.</td></tr>
                                ) : (
                                    (() => {
                                        const poolTotalScore = leaderboardSegunda.reduce((sum: number, agent: any) => sum + Math.max(0, agent.monthlyScore), 0);
                                        const poolAmount = parseFloat(bonusPoolSegunda) || 0;

                                        const calculatedAgentBonuses = leaderboardSegunda.map((agent: any) => {
                                            const agentScore = Math.max(0, agent.monthlyScore);
                                            const weight = poolTotalScore > 0 ? (agentScore / poolTotalScore) * 100 : 0;
                                            const bonus = poolTotalScore > 0 ? (weight / 100) * poolAmount : 0;
                                            return {
                                                employeeId: agent.id,
                                                name: agent.name,
                                                branchName: agent.branchName,
                                                score: agentScore,
                                                weight,
                                                amount: bonus
                                            };
                                        });

                                        return (
                                            <>
                                                {calculatedAgentBonuses.map((b: any, index: number) => (
                                                    <tr key={b.employeeId} className="hover:bg-amber-50/30 transition-colors">
                                                        <td className="p-4 font-black text-slate-300 text-sm">#{index + 1}</td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                                    {leaderboardSegunda[index]?.photo ? (
                                                                        <img 
                                                                            src={leaderboardSegunda[index].photo.startsWith('http') ? leaderboardSegunda[index].photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${leaderboardSegunda[index].photo}`} 
                                                                            alt={b.name} 
                                                                            className="h-full w-full object-cover" 
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-400 text-[10px] font-bold">{b.name.charAt(0)}</span>
                                                                    )}
                                                                </div>
                                                                <span className="font-bold text-slate-700">{b.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <span className="font-medium text-amber-700/70 text-[10px] uppercase tracking-wider">{b.branchName}</span>
                                                        </td>
                                                        <td className="p-4 text-right font-mono text-slate-600">
                                                            {b.score.toLocaleString()}
                                                        </td>
                                                        <td className="p-4 text-right font-mono text-slate-600">
                                                            {b.weight.toFixed(2)}%
                                                        </td>
                                                        <td className="p-4 text-right font-mono font-black text-amber-700 bg-amber-50/50 px-4">
                                                            ${b.amount.toFixed(2)}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={6} className="p-6 bg-slate-50">
                                                        <div className="flex items-center justify-end space-x-4">
                                                            <button 
                                                                onClick={() => handleExportPDF(calculatedAgentBonuses, poolAmount, 'Segunda')}
                                                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-sm"
                                                            >
                                                                <Printer size={18} />
                                                                Imprimir Reporte PDF
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSaveBonuses(calculatedAgentBonuses)}
                                                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
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
                </div>
            )}

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
