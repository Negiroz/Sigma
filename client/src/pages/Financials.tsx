import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { DollarSign, FileText, ArrowUpRight, ArrowDownRight, CreditCard, Activity, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Financials() {
    const { month, year, companyId } = useConfig();

    const { data: financials, isLoading: isFinLoading, error: finError } = useQuery({
        queryKey: ['financialStats', month, year, companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/financials?month=${month}&year=${year}&companyId=${companyId || ''}`);
            return res.data;
        }
    });

    const { data: performance, isLoading: isPerfLoading, error: perfError } = useQuery({
        queryKey: ['performanceStats', month, year, companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/performance?month=${month}&year=${year}&companyId=${companyId || ''}`);
            return res.data;
        }
    });

    if (isFinLoading || isPerfLoading) return <div className="text-slate-500 p-8">Cargando datos de gerencias...</div>;
    if (finError || perfError) return <div className="text-red-500 p-8">Error al cargar datos de gerencias</div>;

    const { summary } = financials;
    const { byManagement } = performance;

    const monthName = new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' });
    const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    // Dummy trend data
    const trendData = [
        { day: '01', amount: 4000 },
        { day: '05', amount: 3000 },
        { day: '10', amount: 5000 },
        { day: '15', amount: 2780 },
        { day: '20', amount: 1890 },
        { day: '25', amount: 2390 },
        { day: '30', amount: 3490 },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Gerencias</h2>
                <p className="text-slate-500">Resumen de facturación y cobranza - {formattedMonth} {year}</p>
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <DollarSign className="h-6 w-6 text-green-500" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +12.5%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Facturación Total</p>
                    <p className="text-3xl font-bold text-slate-800">${summary.totalBilled.toLocaleString()}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-500" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +3.2%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Facturas Cobradas</p>
                    <p className="text-3xl font-bold text-slate-800">{summary.collectedCount}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-50 rounded-lg">
                            <CreditCard className="h-6 w-6 text-orange-500" />
                        </div>
                        <span className="flex items-center text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-full">
                            <ArrowDownRight className="h-3 w-3 mr-1" /> +1.2%
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Monto Pendiente</p>
                    <p className="text-3xl font-bold text-slate-800">${summary.pendingAmount.toLocaleString()}</p>
                </div>
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
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Ingresos vs Meta</th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Recuperación vs Meta</th>
                                    <th className="pb-5 font-bold text-slate-500 text-xs uppercase tracking-wider">Instalación vs Meta</th>
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
                                                        <span className={`text-sm font-bold w-12 ${revenueAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                            {revenueAch.toFixed(1)}%
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${revenueAch >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                                                style={{ width: `${Math.min(revenueAch, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pl-[60px]">
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">${m.billed.toLocaleString()} / ${m.revenueGoal.toLocaleString()}</span>
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
                                                        <span className={`text-sm font-bold w-12 ${installationAch >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>
                                                            {installationAch.toFixed(1)}%
                                                        </span>
                                                        <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${installationAch >= 100 ? 'bg-fuchsia-500' : 'bg-indigo-400'}`} 
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
