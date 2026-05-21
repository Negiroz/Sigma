import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, TrendingUp, Users, MapPin } from 'lucide-react';
import BranchInstallationsTable from '../components/analytics/BranchInstallationsTable';
import { useConfig } from '../contexts/ConfigContext';

export default function Performance() {
    const { month, year, companyId } = useConfig();

    const getMonthName = (m: number) => {
        return new Date(2000, m - 1).toLocaleString('es-VE', { month: 'long' });
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['performanceStats', month, year, companyId],
        queryFn: async () => {
            const res = await api.get('/dashboard/performance', {
                params: { month, year, companyId }
            });
            return res.data;
        },
        enabled: !!companyId
    });

    if (isLoading) return <div className="text-slate-500">Loading performance data...</div>;
    if (error) return <div className="text-red-500">Error loading performance data</div>;

    const { byBranch, byAgent } = data;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Métricas de Rendimiento</h2>
                <p className="text-slate-500 capitalize">Desglose detallado por sucursal y agente para {getMonthName(Number(month))} {year}</p>
            </div>

            {/* Top Performers Highlight */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                        <Trophy className="h-6 w-6 text-yellow-300" />
                        <h3 className="font-semibold text-lg">Mejor Sucursal</h3>
                    </div>
                    <p className="text-3xl font-bold">{byBranch[0]?.branch || 'N/A'}</p>
                    <p className="text-indigo-100 text-sm mt-1">{byBranch[0]?.installations || 0} Instalaciones</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                        <Users className="h-6 w-6 text-white" />
                        <h3 className="font-semibold text-lg">Mejor Agente</h3>
                    </div>
                    <p className="text-3xl font-bold">{byAgent[0]?.agent || 'N/A'}</p>
                    <p className="text-blue-100 text-sm mt-1">{byAgent[0]?.closings || 0} Cierres</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center space-x-3 mb-4">
                        <TrendingUp className="h-6 w-6 text-white" />
                        <h3 className="font-semibold text-lg">Conversión Prom.</h3>
                    </div>
                    <p className="text-3xl font-bold">
                        {byAgent.length > 0
                            ? (byAgent.reduce((acc: number, curr: any) => acc + parseFloat(curr.conversionRate), 0) / byAgent.length).toFixed(1)
                            : 0}%
                    </p>
                    <p className="text-emerald-100 text-sm mt-1">En todos los agentes</p>
                </div>
            </div>

            {/* Branch Trends Table */}
            <BranchInstallationsTable />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Branch Performance Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-indigo-500" />
                            <span>Instalaciones por Sucursal</span>
                        </h3>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={byBranch} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="branch" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="installations" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Agent Performance Table */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <span>Tabla de Líderes (Agentes)</span>
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Agente</th>
                                    <th className="px-4 py-3">Sucursal</th>
                                    <th className="px-4 py-3 text-right">Cierres</th>
                                    <th className="px-4 py-3 text-right">Tasa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {byAgent.slice(0, 5).map((agent: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{agent.agent}</td>
                                        <td className="px-4 py-3">{agent.branch}</td>
                                        <td className="px-4 py-3 text-right font-bold text-blue-600">{agent.closings}</td>
                                        <td className="px-4 py-3 text-right text-slate-500">{agent.conversionRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
