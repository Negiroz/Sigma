import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { ClipboardCheck, Search, Calendar, User, MapPin, Award, MessageSquare, ChevronRight, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function EvaluationResults() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'evaluation' | 'feedback'>('all');
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const { data, isLoading } = useQuery({
        queryKey: ['university', 'evaluation-history', user?.companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/university/evaluation-history`, {
                params: { companyId: user?.companyId }
            });
            return res.data;
        },
        enabled: !!user
    });

    const evaluations = data?.evaluations || [];
    const feedbacks = data?.feedbacks || [];

    // Combine and normalize results
    const combinedResults = [
        ...evaluations.map((e: any) => {
            const managers = e.employee?.branch?.managers?.map((m: any) => m.username) || [];
            const managerName = managers.length > 0 ? managers.join(', ') : 'Sin Gerente';
            
            return {
                id: `eval-${e.id}`,
                type: 'evaluation',
                date: new Date(e.date),
                agentName: e.employee?.name,
                branchName: e.employee?.branch?.name || 'N/A',
                managerName: managerName,
                score: e.score,
                maxScore: 20,
                content: `Evaluación de Conocimientos`,
                details: `Puntaje: ${e.score}/20`
            };
        }),
        ...feedbacks.map((f: any) => {
            const managers = f.employee?.branch?.managers?.map((m: any) => m.username) || [];
            const managerName = managers.length > 0 ? managers.join(', ') : 'Sin Gerente';

            return {
                id: `feed-${f.id}`,
                type: 'feedback',
                date: new Date(f.date),
                agentName: f.employee?.name,
                branchName: f.employee?.branch?.name || 'N/A',
                managerName: managerName,
                content: `Feedback de Simulación`,
                details: f.notes || 'Sin observaciones generales',
                speech: f.speechObservations,
                objections: f.objectionObservations
            };
        })
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    const filteredResults = combinedResults.filter(item => {
        const matchesSearch = item.agentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             item.managerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    // Grouping by Manager
    const groupedByManager = filteredResults.reduce((acc: Record<string, typeof filteredResults>, item) => {
        const manager = item.managerName;
        if (!acc[manager]) acc[manager] = [];
        acc[manager].push(item);
        return acc;
    }, {});

    const managerNames = Object.keys(groupedByManager).sort();

    const toggleGroup = (manager: string) => {
        setCollapsedGroups(prev => ({ ...prev, [manager]: !prev[manager] }));
    };

    // Collapse all by default on first load
    useEffect(() => {
        if (managerNames.length > 0 && Object.keys(collapsedGroups).length === 0) {
            const initial: Record<string, boolean> = {};
            managerNames.forEach(name => {
                initial[name] = true;
            });
            setCollapsedGroups(initial);
        }
    }, [managerNames]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                    <ClipboardCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
                </div>
                <p className="text-slate-500 font-medium animate-pulse">Cargando historial de resultados...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                            <ClipboardCheck className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registros</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{combinedResults.length}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                            <Award className="text-emerald-600 dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluaciones</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{evaluations.length}</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                            <MessageSquare className="text-amber-600 dark:text-amber-400" size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feedbacks</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{feedbacks.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Buscar por agente, sede o gerente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl">
                    <button 
                        onClick={() => setFilterType('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'all' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilterType('evaluation')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'evaluation' ? 'bg-white dark:bg-slate-800 text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Evaluaciones
                    </button>
                    <button 
                        onClick={() => setFilterType('feedback')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === 'feedback' ? 'bg-white dark:bg-slate-800 text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Feedback
                    </button>
                </div>
            </div>

            {/* List Grouped by Manager */}
            <div className="space-y-4">
                {managerNames.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-900/50 rounded-full flex items-center justify-center mb-4">
                            <Filter className="text-slate-300" size={32} />
                        </div>
                        <h4 className="text-slate-800 dark:text-white font-bold">No se encontraron resultados</h4>
                        <p className="text-slate-500 text-sm">Prueba ajustando los filtros o la búsqueda.</p>
                    </div>
                ) : (
                    managerNames.map((manager) => (
                        <div key={manager} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                            <button 
                                onClick={() => toggleGroup(manager)}
                                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                            Gerencia: {manager}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400">{groupedByManager[manager].length} registros totales</p>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-all">
                                    {collapsedGroups[manager] ? <ChevronRight size={20} /> : <Search size={20} className="rotate-90" />}
                                </div>
                            </button>
                            
                            {!collapsedGroups[manager] && (
                                <div className="p-5 pt-0 grid grid-cols-1 gap-3 animate-fade-in border-t border-slate-50 dark:border-white/5">
                                    <div className="h-4"></div>
                                    {groupedByManager[manager].map((item) => (
                                        <div 
                                            key={item.id}
                                            className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all group"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                                {/* Date Column */}
                                                <div className="md:w-32 flex flex-row md:flex-col items-center md:items-start gap-2">
                                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-indigo-500 transition-colors">
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                            {format(item.date, 'EEEE', { locale: es })}
                                                        </p>
                                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            {format(item.date, 'dd MMM, yyyy', { locale: es })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Agent Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-slate-800 dark:text-white truncate">{item.agentName}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 bg-slate-200 dark:bg-slate-800 rounded">
                                                            <MapPin size={12} className="text-slate-400" />
                                                        </div>
                                                        <p className="text-xs text-slate-500 font-medium">{item.branchName}</p>
                                                    </div>
                                                </div>

                                                {/* Content / Details */}
                                                <div className="flex-1 md:border-l border-slate-200 dark:border-white/5 md:pl-6">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest ${
                                                            item.type === 'evaluation' 
                                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                                                            : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                                                        }`}>
                                                            {item.type === 'evaluation' ? 'Conocimientos' : 'Simulación'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                                                        {item.details}
                                                    </p>
                                                    {item.type === 'feedback' && (item.speech || item.objections) && (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {item.speech && <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded font-bold italic">Discurso ✓</span>}
                                                            {item.objections && <span className="text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded font-bold italic">Objeciones ✓</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Score / Action */}
                                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                                                    {item.type === 'evaluation' ? (
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Puntaje</p>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-2 w-16 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className={`h-full rounded-full ${item.score >= 16 ? 'bg-emerald-500' : item.score >= 12 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${(item.score / 20) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className={`text-sm font-black ${item.score >= 16 ? 'text-emerald-600' : item.score >= 12 ? 'text-amber-600' : 'text-red-600'}`}>
                                                                    {item.score}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Resultado</p>
                                                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-1 rounded">
                                                                REGISTRADO
                                                            </span>
                                                        </div>
                                                    )}
                                                    <button className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-full transition-colors text-slate-400 hover:text-indigo-600 group-hover:translate-x-1 duration-300">
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
