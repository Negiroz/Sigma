import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Financials() {
    const { month, year, companyId } = useConfig();

    const { data: performance, isLoading: isPerfLoading, error: perfError } = useQuery({
        queryKey: ['performanceStats', month, year, companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/performance?month=${month}&year=${year}&companyId=${companyId || ''}`);
            return res.data;
        }
    });

    if (isPerfLoading) return <div className="text-slate-500 p-8">Cargando datos de gerencias...</div>;
    if (perfError) return <div className="text-red-500 p-8">Error al cargar datos de gerencias</div>;

    const { byManagement } = performance;

    const monthName = new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' });
    const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const now = new Date();
    const isCurrentMonth = month === (now.getMonth() + 1) && year === now.getFullYear();
    const today = isCurrentMonth ? now.getDate() : new Date(year, month, 0).getDate();
    const daysInMonth = new Date(year, month, 0).getDate();
    const targetPct = (today / daysInMonth) * 100;

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Gerencias</h2>
                <p className="text-slate-500">Resumen de facturación y cobranza - {formattedMonth} {year}</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Management Performance Table */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Indicadores por Gerencia</h3>
                            <p className="text-sm text-slate-500">Rendimiento detallado de ingresos, recuperación e instalaciones</p>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                            <Activity className="h-3.5 w-3.5 text-blue-500" />
                            <span>Datos en tiempo real</span>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Gerencia</th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                                        <div>Ingresos vs Meta</div>
                                        <div className="text-[10px] text-indigo-500 font-bold normal-case tracking-normal mt-1">(Meta P. {targetPct.toFixed(1)}%)</div>
                                    </th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Recuperación vs Meta</th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                                        <div>Instalación vs Meta</div>
                                        <div className="text-[10px] text-indigo-500 font-bold normal-case tracking-normal mt-1">(Meta P. {targetPct.toFixed(1)}%)</div>
                                    </th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">% Churn</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {byManagement.map((m: any) => {
                                    const revenueAch = m.revenueGoal > 0 ? (m.billed / m.revenueGoal) * 100 : 0;
                                    const recoveryAch = m.recoveryGoal > 0 ? (m.recoveryActual / m.recoveryGoal) * 100 : 0;
                                    const installationAch = m.installationGoal > 0 ? (m.installations / m.installationGoal) * 100 : 0;

                                    return (
                                        <tr key={m.name} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                        {m.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-base">{m.name}</p>
                                                        <p className="text-xs text-slate-400">Gerencia Regional</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`text-sm font-bold w-12 ${revenueAch >= targetPct ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {revenueAch.toFixed(1)}%
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${revenueAch >= targetPct ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                                                style={{ width: `${Math.min(revenueAch, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pl-[60px]">
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                                            ${m.billed.toLocaleString()} / ${m.revenueGoal.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`text-sm font-bold w-12 ${recoveryAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                            {recoveryAch.toFixed(1)}%
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${recoveryAch >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                                style={{ width: `${Math.min(recoveryAch, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pl-[60px]">
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{m.recoveryActual} de {m.recoveryGoal} (React + Retiros)</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`text-sm font-bold w-12 ${installationAch >= targetPct ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {installationAch.toFixed(1)}%
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${installationAch >= targetPct ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                                                style={{ width: `${Math.min(installationAch, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pl-[60px]">
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{m.installations} / {m.installationGoal} equipos</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${Number(m.churnRate) > 2 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        <span className="text-xs font-bold">{Number(m.churnRate).toFixed(1)}%</span>
                                                        {Number(m.churnRate) > 2 ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
