import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Swords, Dices, Calendar, Check, X, Shield, Trophy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import ConfirmPasswordModal from '../components/ConfirmPasswordModal';

export default function VersusArena() {
    const { companyId } = useConfig();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Default to today (Local)
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<'CLOSER' | 'AGENT'>('CLOSER');
    const [selectedDivision, setSelectedDivision] = useState<'Primera' | 'Segunda'>('Primera');

    const { data: versusState, isLoading } = useQuery({
        queryKey: ['versusState', selectedDate, companyId, selectedRole, selectedDivision],
        queryFn: async () => {
            if (!companyId) return null;
            const res = await api.get('/dashboard/versus/state', {
                params: { date: selectedDate, companyId, role: selectedRole, division: selectedDivision }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    // Auto-select all agents when loading Draft state
    useEffect(() => {
        if (versusState?.state === 'DRAFT' && versusState.agents) {
            setSelectedAgents(versusState.agents.map((a: any) => a.id));
        }
    }, [versusState]);

    const drawMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company');
            await api.post('/dashboard/versus/draw', {
                date: selectedDate,
                companyId,
                selectedAgentIds: selectedAgents
            });
        },
        onSuccess: () => {
            toast.success('¡Sorteo Realizado!');
            queryClient.invalidateQueries({ queryKey: ['versusState'] });
        },
        onError: () => toast.error('Error al realizar el sorteo')
    });

    const finishMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company');
            await api.post('/dashboard/versus/finish', {
                date: selectedDate,
                companyId
            });
        },
        onSuccess: () => {
            toast.success('¡Versus Finalizados Exitosamente!');
            queryClient.invalidateQueries({ queryKey: ['versusState'] });
        },
        onError: () => toast.error('Error al finalizar el versus')
    });

    const resetMutation = useMutation({
        mutationFn: async (password: string) => {
            if (!companyId) throw new Error('No company');
            await api.post('/dashboard/versus/reset', {
                date: selectedDate,
                companyId,
                password,
                role: selectedRole,
                division: selectedDivision
            });
        },
        onSuccess: () => {
            toast.success('Versus Reiniciado');
            setIsResetModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ['versusState'] });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Error al reiniciar versus';
            toast.error(message);
        }
    });

    const toggleAgent = (id: number) => {
        if (selectedAgents.includes(id)) {
            setSelectedAgents(selectedAgents.filter(aid => aid !== id));
        } else {
            setSelectedAgents([...selectedAgents, id]);
        }
    };

    if (isLoading) return <div className="p-12 text-center text-slate-500">Cargando Arena...</div>;
    if (!companyId) return <div className="p-12 text-center">Seleccione una empresa</div>;

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center space-x-3">
                        <Swords className="text-indigo-600" size={32} />
                        <span>Versus Arena</span>
                    </h1>
                    <p className="text-slate-500 mt-1">Enfrentamientos diarios 1 vs 1. ¡Gana el que más puntos sume!</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <Calendar size={20} className="text-slate-400" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 font-bold text-slate-700"
                    />
                </div>
                {isAdmin && versusState?.state === 'ACTIVE' && (
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => finishMutation.mutate()}
                            disabled={finishMutation.isPending}
                            className="flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl border border-emerald-100 font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            title="Finalizar los enfrentamientos del día y aplicar XP"
                        >
                            <Check size={18} />
                            <span className="hidden sm:inline">{finishMutation.isPending ? 'Finalizando...' : 'Finalizar Versus'}</span>
                        </button>
                        <button
                            onClick={() => setIsResetModalOpen(true)}
                            className="flex items-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 font-bold hover:bg-red-100 transition-colors"
                            title="Reiniciar enfrentamientos del día"
                        >
                            <RotateCcw size={18} />
                            <span className="hidden sm:inline">Reiniciar Versus</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Filtros de Versus (Rol y División) */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 items-center justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedRole('CLOSER')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                selectedRole === 'CLOSER' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Cerradores (Closers)
                        </button>
                        <button
                            onClick={() => setSelectedRole('AGENT')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                selectedRole === 'AGENT' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Agentes de Campo
                        </button>
                    </div>

                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedDivision('Primera')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                selectedDivision === 'Primera' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Primera División
                        </button>
                        <button
                            onClick={() => setSelectedDivision('Segunda')}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                selectedDivision === 'Segunda' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Segunda División
                        </button>
                    </div>
                </div>

                <div className="text-xs text-slate-400 font-medium">
                    Filtrando enfrentamientos por rol y división.
                </div>
            </div>

            {versusState?.state === 'DRAFT' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 rounded-2xl text-white text-center shadow-lg">
                        <h2 className="text-2xl font-bold mb-4">Sorteo del Día</h2>
                        <p className="opacity-90 max-w-2xl mx-auto mb-8">
                            Selecciona los agentes disponibles para hoy. El sistema generará emparejamientos aleatorios.
                        </p>

                        {isAdmin ? (
                            <button
                                onClick={() => drawMutation.mutate()}
                                disabled={selectedAgents.length < 2 || drawMutation.isPending}
                                className="bg-white text-indigo-600 px-8 py-3 rounded-xl font-bold text-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-75 disabled:scale-100"
                            >
                                {drawMutation.isPending ? 'Sorteando...' : '🎲 Realizar Sorteo Ahora'}
                            </button>
                        ) : (
                            <div className="bg-white/20 inline-block px-6 py-2 rounded-lg backdrop-blur-sm">
                                Esperando sorteo del administrador...
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                            <span>Agentes Disponibles ({selectedAgents.length})</span>
                            <span className="text-xs font-normal text-slate-400">Desmarca los ausentes</span>
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {versusState.agents.map((agent: any) => (
                                <div
                                    key={agent.id}
                                    onClick={() => isAdmin && toggleAgent(agent.id)}
                                    className={cn(
                                        "cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center space-x-3",
                                        selectedAgents.includes(agent.id)
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-slate-100 hover:border-slate-300 opacity-50"
                                    )}
                                >
                                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                                        <div className="h-8 w-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm relative">
                                            {agent.photo ? (
                                                <img 
                                                    src={agent.photo.startsWith('http') ? agent.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${agent.photo}`} 
                                                    alt={agent.name} 
                                                    className="h-full w-full object-cover" 
                                                />
                                            ) : (
                                                <span className="text-slate-400 text-[10px] font-bold">{agent.name.charAt(0)}</span>
                                            )}
                                            <div className={cn(
                                                "absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-white p-0.5 shadow-sm border border-white",
                                                selectedAgents.includes(agent.id) ? "bg-indigo-500 scale-100" : "bg-slate-300 scale-75 opacity-50"
                                            )}>
                                                {selectedAgents.includes(agent.id) && <Check size={8} strokeWidth={4} />}
                                            </div>
                                        </div>
                                        <span className="font-semibold text-sm truncate">{agent.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {versusState?.state === 'ACTIVE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {versusState.matches.map((match: any) => (
                        <div key={match.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                            {match.status === 'FINISHED' && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                            )}

                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Versus Match</span>
                                    {match.status === 'FINISHED' ? (
                                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded font-bold">FINALIZADO</span>
                                    ) : (
                                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold animate-pulse">EN PROCESO</span>
                                    )}
                                </div>

                                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                    {/* Player 1 */}
                                    <div className={cn("text-center flex-1", match.winnerId === match.agent1Id && "text-emerald-600")}>
                                        <div className="relative inline-block">
                                            <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-2 flex items-center justify-center border-2 border-slate-100 shadow-md p-1 overflow-hidden">
                                                {match.agent1.photo ? (
                                                    <img 
                                                        src={match.agent1.photo.startsWith('http') ? match.agent1.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${match.agent1.photo}`} 
                                                        alt={match.agent1.name} 
                                                        className="h-full w-full object-cover rounded-xl" 
                                                    />
                                                ) : (
                                                    <Shield size={32} className="text-slate-200" />
                                                )}
                                            </div>
                                            {match.winnerId === match.agent1Id && (
                                                <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                                                    <Trophy size={14} fill="white" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-sm">{match.agent1.name}</h3>
                                        <p className="text-xs text-slate-400 font-medium">{match.agent1.currentLevel}</p>
                                        <p className="text-sm font-black mt-1 text-slate-700">{match.agent1Score !== undefined ? `${match.agent1Score} pts` : '-'}</p>
                                    </div>

                                    {/* VS Badge / Tie Badge */}
                                    <div className="px-4 flex flex-col items-center justify-center relative">
                                        <div className="bg-slate-900 text-white text-xl font-black italic px-3 py-1 -skew-x-12 rounded shadow-lg relative z-10">
                                            VS
                                        </div>
                                        {/* Tie Indication */}
                                        {match.status === 'FINISHED' && match.winnerId === null && match.agent2Id !== null && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-slate-800 text-amber-400 font-black px-4 py-2 rounded shadow-xl -rotate-12 border-2 border-slate-700 whitespace-nowrap">
                                                EMPATE
                                            </div>
                                        )}
                                    </div>

                                    {/* Player 2 */}
                                    <div className={cn("text-center flex-1", match.winnerId === match.agent2Id && "text-emerald-600")}>
                                        {match.agent2 ? (
                                            <>
                                                <div className="relative inline-block">
                                                    <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-2 flex items-center justify-center border-2 border-slate-100 shadow-md p-1 overflow-hidden">
                                                        {match.agent2.photo ? (
                                                            <img 
                                                                src={match.agent2.photo.startsWith('http') ? match.agent2.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${match.agent2.photo}`} 
                                                                alt={match.agent2.name} 
                                                                className="h-full w-full object-cover rounded-xl" 
                                                            />
                                                        ) : (
                                                            <Shield size={32} className="text-slate-200" />
                                                        )}
                                                    </div>
                                                    {match.winnerId === match.agent2Id && (
                                                        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 text-white rounded-full p-1.5 shadow-lg border-2 border-white">
                                                            <Trophy size={14} fill="white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-sm">{match.agent2.name}</h3>
                                                <p className="text-xs text-slate-400 font-medium">{match.agent2.currentLevel}</p>
                                                <p className="text-sm font-black mt-1 text-slate-700">{match.agent2Score !== undefined ? `${match.agent2Score} pts` : '-'}</p>
                                            </>
                                        ) : (
                                            <div className="opacity-50">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto mb-2 flex items-center justify-center">
                                                    <X className="text-slate-300" />
                                                </div>
                                                <h3 className="font-bold text-sm">Sin Oponente</h3>
                                                <p className="text-xs text-slate-400">Victoria Automática</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-4 text-center text-xs text-slate-400">
                                    El ganador obtiene +100 XP Meritocráticos
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ConfirmPasswordModal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                onConfirm={(password) => resetMutation.mutate(password)}
                title="Reiniciar Versus"
                description="¿Estás seguro de que deseas reiniciar los enfrentamientos de hoy? Esto eliminará todos los versus creados y los puntos otorgados en el ranking por estos encuentros."
                isLoading={resetMutation.isPending}
            />
        </div>
    );
}
