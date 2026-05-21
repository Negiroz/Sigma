import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { MapPin, TrendingUp, AlertCircle, ChevronUp, ChevronDown, ArrowUpDown, Target } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

interface BranchTrend {
    branchId: number;
    branchName: string;
    monthMinus2: number;
    monthMinus1: number;
    currentMonthAccumulated: number;
    currentMonthGoal: number;
    salesProjection: number;
    installationProjection: number;
    compliance: number;
    labels: string[];
}

type SortConfig = {
    key: keyof BranchTrend;
    direction: 'asc' | 'desc';
} | null;

export default function BranchInstallationsTable() {
    const { month, year, companyId } = useConfig();
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'compliance', direction: 'desc' });

    const { data, isLoading } = useQuery({
        queryKey: ['branchTrends', month, year, companyId],
        queryFn: async () => (await api.get(`/dashboard/performance/branches-history?month=${month}&year=${year}&companyId=${companyId || ''}`)).data
    });

    const sortedData = useMemo(() => {
        if (!data) return [];
        const items = (data as BranchTrend[]).map(branch => ({
            ...branch,
            salesProjection: Number(branch.salesProjection) || 0,
            compliance: branch.currentMonthGoal > 0 ? (branch.installationProjection / branch.currentMonthGoal) * 100 : 0
        }));
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [data, sortConfig]);

    const totals = useMemo(() => {
        if (!data) return null;
        const items = data as BranchTrend[];
        const monthMinus1 = items.reduce((acc, curr) => acc + curr.monthMinus1, 0);
        const accumulated = items.reduce((acc, curr) => acc + curr.currentMonthAccumulated, 0);
        const goal = items.reduce((acc, curr) => acc + curr.currentMonthGoal, 0);
        const installationProj = items.reduce((acc, curr) => acc + curr.installationProjection, 0);
        const salesProj = items.reduce((acc, curr) => acc + (Number(curr.salesProjection) || 0), 0);
        const compliance = goal > 0 ? (installationProj / goal) * 100 : 0;
        
        return { monthMinus1, accumulated, goal, installationProj, salesProj, compliance };
    }, [data]);

    const handleSort = (key: keyof BranchTrend) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'desc' };
        });
    };

    const SortIcon = ({ columnKey }: { columnKey: keyof BranchTrend }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 text-slate-300" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 text-blue-500" /> : <ChevronDown className="h-3 w-3 ml-1 text-blue-500" />;
    };

    if (isLoading) return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-slate-500">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Cargando tendencias por sucursal...</span>
            </div>
        </div>
    );

    if (!data || data.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        <span>Tendencia de Instalaciones</span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Comparativa de los últimos 3 meses y cumplimiento de metas</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                        <tr>
                            <th onClick={() => handleSort('branchName')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center">Sucursal <SortIcon columnKey="branchName" /></div>
                            </th>
                            <th className="px-6 py-4 text-center w-32">Histórico (3m)</th>
                            <th onClick={() => handleSort('monthMinus1')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-end">Mes Ant. <SortIcon columnKey="monthMinus1" /></div>
                            </th>
                            <th onClick={() => handleSort('currentMonthAccumulated')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-end">Acumulado <SortIcon columnKey="currentMonthAccumulated" /></div>
                            </th>
                            <th onClick={() => handleSort('installationProjection')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-end">Proy. Instal <SortIcon columnKey="installationProjection" /></div>
                            </th>
                            <th onClick={() => handleSort('compliance')} className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-end">% Logro <SortIcon columnKey="compliance" /></div>
                            </th>
                            <th onClick={() => handleSort('salesProjection')} className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="flex items-center justify-end">Proy. Ventas <SortIcon columnKey="salesProjection" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 bg-white">
                        {sortedData.map((branch) => {
                            const trendData = [
                                { val: branch.monthMinus2, label: branch.labels?.[0] || 'm-2' },
                                { val: branch.monthMinus1, label: branch.labels?.[1] || 'm-1' },
                                { val: branch.currentMonthAccumulated, label: branch.labels?.[2] || 'Actual' }
                            ];

                            const isExceeding = branch.installationProjection >= branch.currentMonthGoal && branch.currentMonthGoal > 0;
                            const isProjectedOk = branch.installationProjection >= branch.currentMonthGoal;

                            return (
                                <tr key={branch.branchId} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-white transition-colors">
                                                <MapPin className="h-4 w-4 text-indigo-500" />
                                            </div>
                                            <span className="font-bold text-slate-800">{branch.branchName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2">
                                        <div className="h-10 w-28 mx-auto">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={trendData}>
                                                    <defs>
                                                        <linearGradient id={`grad-${branch.branchId}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={isExceeding ? "#10b981" : "#6366f1"} stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor={isExceeding ? "#10b981" : "#6366f1"} stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <Tooltip 
                                                        content={({active, payload}) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg border border-slate-700">
                                                                        {payload[0].payload.label}: {payload[0].value}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="val" 
                                                        stroke={isExceeding ? "#10b981" : "#6366f1"} 
                                                        strokeWidth={2}
                                                        fillOpacity={1} 
                                                        fill={`url(#grad-${branch.branchId})`} 
                                                        animationDuration={1500}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-lg font-bold text-slate-500">{branch.monthMinus1}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-lg font-black text-slate-900">{branch.currentMonthAccumulated}</span>
                                            {(() => {
                                                const diff = branch.currentMonthAccumulated - branch.monthMinus1;
                                                const percent = branch.monthMinus1 > 0 ? (diff / branch.monthMinus1) * 100 : branch.currentMonthAccumulated > 0 ? 100 : 0;
                                                const isPositive = diff > 0;
                                                const isNeutral = diff === 0;
                                                return (
                                                    <span className={`text-[10px] font-bold flex items-center ${isPositive ? 'text-emerald-500' : isNeutral ? 'text-slate-400' : 'text-rose-500'}`}>
                                                        {isPositive ? <ChevronUp className="h-3 w-3" /> : !isNeutral ? <ChevronDown className="h-3 w-3" /> : null}
                                                        {isNeutral ? '=' : `${Math.abs(Math.round(percent))}%`}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`flex flex-col items-end ${isProjectedOk ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <span className="text-base font-black flex items-center">
                                                {branch.installationProjection}
                                                {isProjectedOk && <ChevronUp className="h-4 w-4 ml-0.5" />}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-tighter opacity-70">Instalaciones</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="w-full max-w-[120px] ml-auto space-y-1.5">
                                            <div className="flex justify-between items-center text-[10px] font-bold">
                                                <span className={isExceeding ? "text-emerald-600" : "text-indigo-600"}>
                                                    {Math.round(branch.compliance)}%
                                                </span>
                                                {isExceeding && <AlertCircle className="h-3 w-3 text-emerald-500" />}
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                                        isExceeding ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-indigo-500'
                                                    }`}
                                                    style={{ width: `${Math.min(branch.compliance, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-base font-black text-slate-800">
                                                ${Number(branch.salesProjection).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-tighter text-slate-400">Facturación</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    {totals && (
                        <tfoot className="bg-slate-50/80 font-bold border-t-2 border-slate-200">
                            <tr className="border-b-4 border-transparent">
                                <td className="px-6 py-4 text-slate-800">
                                    <div className="flex items-center space-x-2">
                                        <span className="uppercase tracking-widest text-sm text-indigo-900 border-b-2 border-indigo-200">Total General</span>
                                    </div>
                                </td>
                                <td className="px-4 py-2"></td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-lg text-slate-600">{totals.monthMinus1}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-black text-indigo-900">{totals.accumulated}</span>
                                        {(() => {
                                            const diff = totals.accumulated - totals.monthMinus1;
                                            const percent = totals.monthMinus1 > 0 ? (diff / totals.monthMinus1) * 100 : totals.accumulated > 0 ? 100 : 0;
                                            const isPositive = diff > 0;
                                            const isNeutral = diff === 0;
                                            return (
                                                <span className={`text-[10px] flex items-center ${isPositive ? 'text-emerald-500' : isNeutral ? 'text-slate-400' : 'text-rose-500'}`}>
                                                    {isPositive ? <ChevronUp className="h-3 w-3" /> : !isNeutral ? <ChevronDown className="h-3 w-3" /> : null}
                                                    {isNeutral ? '=' : `${Math.abs(Math.round(percent))}%`}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className={`flex flex-col items-end ${totals.installationProj >= totals.goal ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        <span className="text-base font-black flex items-center">
                                            {totals.installationProj}
                                            {totals.installationProj >= totals.goal && <ChevronUp className="h-4 w-4 ml-0.5" />}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-full max-w-[120px] ml-auto space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className={totals.installationProj >= totals.goal && totals.goal > 0 ? "text-emerald-600" : "text-indigo-600"}>
                                                {Math.round(totals.compliance)}%
                                            </span>
                                            {totals.installationProj >= totals.goal && totals.goal > 0 && <AlertCircle className="h-3 w-3 text-emerald-500" />}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-base font-black text-slate-800">
                                        ${Number(totals.salesProj).toLocaleString()}
                                    </span>
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            
            <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex items-center justify-center space-x-6">
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Meta Cumplida</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En Progreso</span>
                </div>
                <div className="flex items-center space-x-2">
                    <Target className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proyección Basada en Run-Rate</span>
                </div>
            </div>
        </div>
    );
}
