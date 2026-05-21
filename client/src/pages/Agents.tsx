import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { Users, Briefcase, Star, Search, Filter } from 'lucide-react';

export default function Agents() {
    const { companyId } = useConfig();
    const { data: agents, isLoading, error } = useQuery({
        queryKey: ['agentsList', companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/agents?companyId=${companyId || ''}`);
            return res.data;
        }
    });

    if (isLoading) return <div className="text-slate-500">Cargando directorio de agentes...</div>;
    if (error) return <div className="text-red-500">Error al cargar agentes</div>;

    const totalStats = agents ? {
        total: agents.length,
        active: agents.filter((a: any) => a.status === 'Activo').length,
        topPerformer: agents.reduce((prev: any, current: any) => {
            const prevClosings = prev?.lastPerformance?.closings || 0;
            const currentClosings = current?.lastPerformance?.closings || 0;
            return (prevClosings > currentClosings) ? prev : current;
        }, null)
    } : { total: 0, active: 0, topPerformer: null };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Agente de Campo</h2>
                    <p className="text-slate-500">Gestión y visualización del equipo de campo</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar agente..."
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Total Agentes</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStats.total}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <Briefcase className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Agentes Activos</p>
                        <p className="text-2xl font-bold text-slate-800">{totalStats.active}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                        <Star className="h-6 w-6 text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Mejor del Mes</p>
                        <p className="text-lg font-bold text-slate-800 truncate max-w-[150px]">
                            {totalStats.topPerformer?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400">
                            {totalStats.topPerformer?.lastPerformance?.closings || 0} cierres
                        </p>
                    </div>
                </div>
            </div>

            {/* Agents List/Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Sucursal</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-center">Cierres / Meta</th>
                                <th className="px-6 py-4 text-center">Prospectos / Meta</th>
                                <th className="px-6 py-4 text-center">Conversión / Meta</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {agents && agents.map((agent: any) => {
                                const closings = agent.lastPerformance?.closings || 0;
                                const closingGoal = agent.lastPerformance?.closingGoal || 0;
                                const prospects = agent.lastPerformance?.prospects || 0;
                                const prospectGoal = agent.lastPerformance?.prospectGoal || 0;

                                const conversionRate = prospects > 0 ? ((closings / prospects) * 100).toFixed(1) : '0.0';
                                const conversionGoal = prospectGoal > 0 ? ((closingGoal / prospectGoal) * 100).toFixed(1) : '0.0';

                                return (
                                <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                                {agent.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-900">{agent.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{agent.branch}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${agent.status === 'Activo'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {agent.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                                        {closings} <span className="text-slate-400 font-medium text-xs">/ {closingGoal}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                                        {prospects} <span className="text-slate-400 font-medium text-xs">/ {prospectGoal}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-blue-600">
                                        {conversionRate}% <span className="text-slate-400 font-medium text-xs">/ {conversionGoal}%</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                                            Ver Perfil
                                        </button>
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
