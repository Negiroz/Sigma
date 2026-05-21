import { useQuery } from "@tanstack/react-query";
import { useConfig } from "../../contexts/ConfigContext";
import api from "../../lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Line } from 'recharts';
import { TrendingUp, Target, Award, X } from 'lucide-react';
import { cn } from "../../lib/utils";

interface AgentPacingModalProps {
    isOpen: boolean;
    onClose: () => void;
    agentId: number | null;
    agentName: string;
}

export default function AgentPacingModal({ isOpen, onClose, agentId, agentName }: AgentPacingModalProps) {
    const { month, year } = useConfig();

    const { data: pacingData, isLoading } = useQuery({
        queryKey: ['agentPacing', agentId, month, year],
        queryFn: async () => {
            if (!agentId) return null;
            const res = await api.get(`/dashboard/merit/agent/${agentId}/pacing`, {
                params: { month, year }
            });
            return res.data;
        },
        enabled: !!agentId && isOpen
    });

    if (!isOpen || !agentId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-2xl font-bold flex items-center space-x-2 text-slate-800">
                        <TrendingUp className="text-indigo-600" />
                        <span>Progreso Diario: {agentName}</span>
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isLoading ? (
                        <div className="h-64 flex items-center justify-center text-slate-400">
                            Cargando análisis...
                        </div>
                    ) : pacingData && (
                        <div className="space-y-8">
                            {/* KPI SUMMARIES */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-xs text-slate-500 uppercase font-bold flex items-center mb-2">
                                        <Award size={14} className="mr-1" /> Acumulado Actual
                                    </span>
                                    <div className="text-3xl font-black text-slate-800">
                                        {pacingData.currentAccumulated} <span className="text-sm font-medium text-slate-400">ventas</span>
                                    </div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <span className="text-xs text-slate-500 uppercase font-bold flex items-center mb-2">
                                        <Target size={14} className="mr-1" /> Promedio General
                                    </span>
                                    <div className="text-3xl font-black text-indigo-600">
                                        {pacingData.goal} <span className="text-sm font-medium text-slate-400">ventas</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "p-4 rounded-xl border",
                                    pacingData.currentAccumulated >= (pacingData.history.find((d: any) => d.day === new Date().getDate())?.target || 0)
                                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        : "bg-red-50 border-red-100 text-red-700"
                                )}>
                                    <span className="text-xs uppercase font-bold flex items-center mb-2">
                                        Status vs Promedio
                                    </span>
                                    <div className="text-lg font-bold leading-tight">
                                        {pacingData.currentAccumulated >= (pacingData.history.find((d: any) => d.day === new Date().getDate())?.target || 0)
                                            ? "🔥 Superando el Promedio"
                                            : "⚠️ Por debajo del Promedio"
                                        }
                                    </div>
                                </div>
                            </div>

                            {/* CHART */}
                            <div className="h-80 w-full border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                                <h4 className="text-sm font-semibold text-slate-500 mb-4 flex justify-between">
                                    <span>La Carrera Mensual (Ventas Acumuladas)</span>
                                    <span className="text-xs font-normal">Línea Punteada = Meta Ideal</span>
                                </h4>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={pacingData.history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />

                                        {/* Ideal Line (Target) */}
                                        <Line
                                            type="monotone"
                                            dataKey="target"
                                            stroke="#cbd5e1"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            name="Promedio Ideal"
                                            dot={false}
                                        />

                                        {/* Actual Progress */}
                                        <Area
                                            type="monotone"
                                            dataKey="accumulated"
                                            stroke="#4f46e5"
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                            strokeWidth={3}
                                            name="Ventas Reales"
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
