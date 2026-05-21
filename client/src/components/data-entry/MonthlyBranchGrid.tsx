import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Info, Building, TrendingUp, DollarSign, CalendarCheck, ChevronDown, ChevronRight, User } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';

interface MonthlyBranchMetric {
    branchId: number;
    name: string;
    managerName: string;
    installations: number;
    invoices: number;
    revenue: number;
    installationGoal: number;
    activeClientsGoal: number;
    billingGoal: number;
    salesProjection: number;
}

interface MonthlyBranchGridProps {
    companyId: number | null;
}

export default function MonthlyBranchGrid({ companyId }: MonthlyBranchGridProps) {
    const { month, year } = useConfig();
    const [collapsedManagers, setCollapsedManagers] = useState<Set<string>>(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ['monthlyBranchMetrics', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/branches-monthly', {
                params: { month, year, companyId }
            });
            return res.data as MonthlyBranchMetric[];
        },
        enabled: !!companyId
    });

    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;

    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });

    // Grouping logic
    const groupedData = (data || []).reduce((acc, curr) => {
        const mgr = curr.managerName || 'Sin Gerente';
        if (!acc[mgr]) acc[mgr] = [];
        acc[mgr].push(curr);
        return acc;
    }, {} as Record<string, MonthlyBranchMetric[]>);

    const toggleManager = (mgr: string) => {
        const newCollapsed = new Set(collapsedManagers);
        if (newCollapsed.has(mgr)) {
            newCollapsed.delete(mgr);
        } else {
            newCollapsed.add(mgr);
        }
        setCollapsedManagers(newCollapsed);
    };

    // Totals
    const totals = (data || []).reduce((acc, curr) => ({
        installations: acc.installations + curr.installations,
        invoices: acc.invoices + curr.invoices,
        revenue: acc.revenue + curr.revenue,
        installationGoal: acc.installationGoal + curr.installationGoal,
        activeClientsGoal: acc.activeClientsGoal + (curr.activeClientsGoal || 0),
        billingGoal: acc.billingGoal + curr.billingGoal,
        salesProjection: acc.salesProjection + curr.salesProjection
    }), { installations: 0, invoices: 0, revenue: 0, installationGoal: 0, activeClientsGoal: 0, billingGoal: 0, salesProjection: 0 });

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(val);

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 text-indigo-800">
                    <Info size={18} />
                    <span className="text-sm font-medium">Acumulado Sedes: {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}</span>
                </div>
                {isLoading && <span className="text-sm text-slate-500">Cargando acumulado...</span>}
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-bold">Sede</th>
                                <th className="p-4 font-bold text-center">Instalaciones</th>
                                <th className="p-4 font-bold text-center">Facturas</th>
                                <th className="p-4 font-bold text-center">Ingresos ($)</th>
                                <th className="p-4 font-bold text-center bg-indigo-50/30">Proyección Ventas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {(!data || data.length === 0) && !isLoading && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">No hay datos registrados para este mes.</td>
                                </tr>
                            )}
                            
                            {Object.entries(groupedData).map(([manager, branches]) => {
                                const isCollapsed = collapsedManagers.has(manager);
                                
                                // Group totals
                                const groupTotals = branches.reduce((acc, curr) => ({
                                    installations: acc.installations + curr.installations,
                                    invoices: acc.invoices + curr.invoices,
                                    revenue: acc.revenue + curr.revenue,
                                    installationGoal: acc.installationGoal + curr.installationGoal,
                                    activeClientsGoal: acc.activeClientsGoal + (curr.activeClientsGoal || 0),
                                    billingGoal: acc.billingGoal + curr.billingGoal,
                                    salesProjection: acc.salesProjection + curr.salesProjection
                                }), { installations: 0, invoices: 0, revenue: 0, installationGoal: 0, activeClientsGoal: 0, billingGoal: 0, salesProjection: 0 });

                                return (
                                    <React.Fragment key={manager}>
                                        {/* Manager Header Row */}
                                        <tr 
                                            className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors border-y border-slate-200"
                                            onClick={() => toggleManager(manager)}
                                        >
                                            <td className="p-3 font-bold text-slate-700 flex items-center space-x-2">
                                                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                                <div className="flex items-center space-x-2">
                                                    <div className="p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                                                        <User size={14} />
                                                    </div>
                                                    <span className="uppercase text-xs tracking-wide">Gerente:</span>
                                                    <span className="text-indigo-800">{manager}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-slate-500">{groupTotals.installations} / {groupTotals.installationGoal}</span>
                                                    <div className="text-[10px] font-bold text-indigo-500">
                                                        {groupTotals.installationGoal > 0 ? `${Math.round((groupTotals.installations / groupTotals.installationGoal) * 100)}%` : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-slate-500">{groupTotals.invoices} / {groupTotals.activeClientsGoal}</span>
                                                    <div className="text-[10px] font-bold text-green-600">
                                                        {groupTotals.activeClientsGoal > 0 ? `${Math.round((groupTotals.invoices / groupTotals.activeClientsGoal) * 100)}%` : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-slate-500">${formatCurrency(groupTotals.revenue)}</span>
                                                    <span className="text-[10px] text-slate-400">Meta: ${new Intl.NumberFormat('en-US').format(groupTotals.billingGoal)}</span>
                                                    <div className="text-[10px] font-bold text-emerald-600">
                                                        {groupTotals.billingGoal > 0 ? `${Math.round((groupTotals.revenue / groupTotals.billingGoal) * 100)}% meta` : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center bg-indigo-50/30">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-black text-indigo-600">${formatCurrency(groupTotals.salesProjection)}</span>
                                                    <div className="text-[10px] font-bold text-indigo-400">
                                                        {groupTotals.billingGoal > 0 ? `${Math.round((groupTotals.salesProjection / groupTotals.billingGoal) * 100)}%` : '-'}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {!isCollapsed && branches.map((entry) => (
                                            <tr key={entry.branchId} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-4 pl-10">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                                            <Building size={16} />
                                                        </div>
                                                        <span className="font-bold text-slate-800">{entry.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center space-x-1">
                                                            <CalendarCheck size={14} className="text-slate-400" />
                                                            <span className="font-black text-slate-700 text-lg">{entry.installations}</span>
                                                            <span className="text-xs text-slate-400 font-normal">/ {entry.installationGoal}</span>
                                                        </div>
                                                        <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${entry.installations >= entry.installationGoal ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${Math.min(100, (entry.installations / (entry.installationGoal || 1)) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-black text-slate-700 text-lg">{entry.invoices}</span>
                                                        <span className="text-[10px] text-slate-400">Meta Activos: {entry.activeClientsGoal}</span>
                                                        <div className={`text-[10px] font-bold ${entry.invoices >= entry.activeClientsGoal ? 'text-green-600' : 'text-slate-500'}`}>
                                                            {entry.activeClientsGoal > 0 ? `${Math.round((entry.invoices / entry.activeClientsGoal) * 100)}% cumplimiento` : '-'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center space-x-1">
                                                            <DollarSign size={14} className="text-emerald-500" />
                                                            <span className="font-bold text-slate-800">
                                                                {formatCurrency(entry.revenue)}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400">Meta: ${new Intl.NumberFormat('en-US').format(entry.billingGoal)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center bg-indigo-50/10">
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-center space-x-1">
                                                            <TrendingUp size={14} className="text-indigo-500" />
                                                            <span className="font-black text-indigo-700">
                                                                ${formatCurrency(entry.salesProjection)}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-indigo-400">
                                                            {entry.billingGoal > 0 ? `${Math.round((entry.salesProjection / entry.billingGoal) * 100)}% de meta` : 'Pacing'}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        {(data || []).length > 0 && (
                            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                <tr>
                                    <td className="p-4 text-slate-500 text-right uppercase tracking-wider text-xs">Totales Generales</td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg text-slate-800">{totals.installations} <span className="text-xs text-slate-400">/ {totals.installationGoal}</span></span>
                                            <div className="text-xs font-bold text-indigo-500">
                                                {totals.installationGoal > 0 ? `${Math.round((totals.installations / totals.installationGoal) * 100)}% cumplimiento` : '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-lg text-slate-800">{totals.invoices} <span className="text-xs text-slate-400">/ {totals.activeClientsGoal}</span></span>
                                            <div className="text-xs font-bold text-green-600">
                                                {totals.activeClientsGoal > 0 ? `${Math.round((totals.invoices / totals.activeClientsGoal) * 100)}% cumplimiento` : '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-800 text-lg">${formatCurrency(totals.revenue)}</span>
                                            <span className="text-xs text-slate-400">Meta: ${new Intl.NumberFormat('en-US').format(totals.billingGoal)}</span>
                                            <div className="text-xs font-bold text-emerald-600">
                                                {totals.billingGoal > 0 ? `${Math.round((totals.revenue / totals.billingGoal) * 100)}% meta` : '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center bg-indigo-50/30">
                                        <div className="flex flex-col items-center">
                                            <span className="text-indigo-700 text-lg">${formatCurrency(totals.salesProjection)}</span>
                                            <div className="text-xs font-bold text-indigo-400">
                                                {totals.billingGoal > 0 ? `${Math.round((totals.salesProjection / totals.billingGoal) * 100)}% proyectado` : '-'}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
