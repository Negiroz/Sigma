import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { UserCheck, Target, Award, Search } from 'lucide-react';

export default function Closers() {
    const { month, year, companyId } = useConfig();

    const { data: closers, isLoading, error } = useQuery({
        queryKey: ['closersList', month, year, companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/closers?month=${month}&year=${year}&companyId=${companyId || ''}`);
            return res.data;
        }
    });

    if (isLoading) return <div className="text-slate-500">Cargando equipo de cierre...</div>;
    if (error) return <div className="text-red-500">Error al cargar closers</div>;

    const totalStats = closers ? {
        total: closers.length,
        totalClosings: closers.reduce((acc: number, c: any) => acc + (c.performance?.closings || 0), 0),
        avgAchievement: closers.length > 0
            ? (closers.reduce((acc: number, c: any) => acc + parseFloat(c.performance?.achievement || 0), 0) / closers.length).toFixed(1)
            : 0
    } : { total: 0, totalClosings: 0, avgAchievement: 0 };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Agente AC</h2>
                    <p className="text-slate-500">Rendimiento y cumplimiento de objetivos de atención al cliente</p>
                </div>
                {/* Search removed for simplicity or can be added back */}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                        <UserCheck className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Closers</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStats.total}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                        <Target className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Cierres Totales (Mes)</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStats.totalClosings}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-teal-50 rounded-lg">
                        <Award className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Promedio Cumplimiento</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStats.avgAchievement}%</p>
                    </div>
                </div>
            </div>

            {/* Closers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {closers.map((closer: any) => (
                    <div key={closer.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                {closer.name.charAt(0)}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${closer.performance?.achievement >= 100
                                ? 'bg-green-100 text-green-700'
                                : closer.performance?.achievement >= 80
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                {closer.performance?.achievement || 0}% Meta
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">{closer.name}</h3>
                        <div className="space-y-2 mt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Cierres Realizados</span>
                                <span className="font-semibold text-slate-800">{closer.performance?.closings || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Meta Mensual</span>
                                <span className="font-semibold text-slate-800">{closer.performance?.goal || 0}</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                                <div
                                    className={`h-2 rounded-full ${closer.performance?.achievement >= 100 ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                    style={{ width: `${Math.min(closer.performance?.achievement || 0, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
