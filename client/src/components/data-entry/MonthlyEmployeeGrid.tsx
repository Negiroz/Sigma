import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { ShieldAlert, Info, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';

interface MonthlyMeritGridProps {
    companyId: number | null;
}

interface MonthlyMetric {
    employeeId: number;
    name: string;
    role?: string;
    prospects: number;
    closings: number;
    reactivations: number;
    equipmentRemovals: number;
    avoidableTickets: number;
    penalizationReasons?: string;
    totalScore: number;
    closingGoal?: number;
    prospectGoal?: number;
    reactivationGoal?: number;
    equipmentRemovalGoal?: number;
    conversionGoal?: number;
}

type SortField = keyof MonthlyMetric | 'conversion';
type SortDirection = 'asc' | 'desc';

export default function MonthlyEmployeeGrid({ companyId }: MonthlyMeritGridProps) {
    const { month, year } = useConfig();
    const [entries, setEntries] = useState<MonthlyMetric[]>([]);

    // Sort state
    const [sortField, setSortField] = useState<SortField>('totalScore');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const [popupInfo, setPopupInfo] = useState<{ id: number; name: string; reasons: string[] } | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setPopupInfo(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['monthlyMerit', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/monthly-merit', {
                params: { month, year, companyId }
            });
            return res.data as MonthlyMetric[];
        },
        enabled: !!companyId
    });

    useEffect(() => {
        if (data) {
            setEntries(data.filter(e => e.role === 'AGENT'));
        }
    }, [data]);

    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;

    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });

    // Projection variables
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysElapsed = isCurrentMonth ? Math.max(1, today.getDate()) : daysInMonth; 
    const projectionFactor = daysInMonth / daysElapsed;

    // Handle Sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for new fields
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-300 ml-1 inline-block" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={14} className="text-blue-600 ml-1 inline-block" />
            : <ArrowDown size={14} className="text-blue-600 ml-1 inline-block" />;
    };

    // Calculate sorted entries
    const sortedEntries = [...entries].sort((a, b) => {
        let aValue: number | string = 0;
        let bValue: number | string = 0;

        if (sortField === 'conversion') {
            aValue = a.prospects > 0 ? a.closings / a.prospects : 0;
            bValue = b.prospects > 0 ? b.closings / b.prospects : 0;
        } else if (sortField === 'prospects') {
            aValue = a.prospectGoal && a.prospectGoal > 0 ? a.prospects / a.prospectGoal : 0;
            bValue = b.prospectGoal && b.prospectGoal > 0 ? b.prospects / b.prospectGoal : 0;
        } else if (sortField === 'closings') {
            aValue = a.closingGoal && a.closingGoal > 0 ? a.closings / a.closingGoal : 0;
            bValue = b.closingGoal && b.closingGoal > 0 ? b.closings / b.closingGoal : 0;
        } else if (sortField === 'reactivations' || sortField === 'equipmentRemovals') {
            const sharedGoal = a.reactivationGoal && a.reactivationGoal > 0 ? a.reactivationGoal : (a.equipmentRemovalGoal && a.equipmentRemovalGoal > 0 ? a.equipmentRemovalGoal : 1);
            const bSharedGoal = b.reactivationGoal && b.reactivationGoal > 0 ? b.reactivationGoal : (b.equipmentRemovalGoal && b.equipmentRemovalGoal > 0 ? b.equipmentRemovalGoal : 1);
            aValue = (a.reactivations + a.equipmentRemovals) / sharedGoal;
            bValue = (b.reactivations + b.equipmentRemovals) / bSharedGoal;
        } else {
            aValue = a[sortField] as number | string;
            bValue = b[sortField] as number | string;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const totalProspects = sortedEntries.reduce((sum, e) => sum + (e.prospects || 0), 0);
    const totalClosings = sortedEntries.reduce((sum, e) => sum + (e.closings || 0), 0);
    const totalReactivations = sortedEntries.reduce((sum, e) => sum + (e.reactivations || 0), 0);
    const totalEquipmentRemovals = sortedEntries.reduce((sum, e) => sum + (e.equipmentRemovals || 0), 0);
    const totalAvoidableTickets = sortedEntries.reduce((sum, e) => sum + (e.avoidableTickets || 0), 0);
    const totalScoreAggregate = sortedEntries.reduce((sum, e) => sum + (e.totalScore || 0), 0);
    const totalConversion = totalProspects > 0 ? Math.round((totalClosings / totalProspects) * 100) : 0;
    const totalSharedGoal = sortedEntries.reduce((sum, e) => sum + (e.reactivationGoal || e.equipmentRemovalGoal || 0), 0);
    const totalProspectGoal = sortedEntries.reduce((sum, e) => sum + (e.prospectGoal || 0), 0);
    const totalClosingGoal = sortedEntries.reduce((sum, e) => sum + (e.closingGoal || 0), 0);
    const totalRecoveryCompliance = totalSharedGoal > 0 ? Math.round(((totalReactivations + totalEquipmentRemovals) / totalSharedGoal) * 100) : 0;

    // Make a wrapper component for sorted headers
    const SortableHeader = ({ field, label, widthClass = '', className = '', tooltip }: { field: SortField, label: string, widthClass?: string, className?: string, tooltip?: string }) => (
        <th
            className={`p-2 cursor-pointer hover:bg-slate-100 transition-colors select-none ${widthClass} ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center justify-center space-x-1">
                <span>{label}</span>
                {tooltip && (
                    <div title={tooltip} className="cursor-help inline-flex text-slate-400 hover:text-blue-500" onClick={(e) => e.stopPropagation()}>
                        <Info size={14} />
                    </div>
                )}
                <SortIcon field={field} />
            </div>
        </th>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-blue-800">
                    <Info size={18} />
                    <span className="text-sm font-medium">Acumulado Agentes: {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}</span>
                </div>
                {isLoading && <span className="text-sm text-slate-500">Cargando acumulado...</span>}
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto pb-4">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <th className="p-3 sticky left-0 bg-slate-50 z-20 w-12 border-r text-center">#</th>
                                <th className="p-3 sticky left-[3rem] bg-slate-50 z-20 w-48 border-r">Agente de Campo</th>
                                <th className="p-3 text-center border-l bg-blue-50 text-blue-800" colSpan={3}>Ventas</th>
                                <th className="p-3 text-center border-l bg-amber-50 text-amber-800" colSpan={3}>Recuperación (Meta Compartida)</th>
                                <th className="p-3 text-center border-l bg-red-50 text-red-800">Penalización</th>
                                <th className="p-3 text-center border-l bg-slate-100 text-slate-700">Resumen</th>
                            </tr>
                            <tr className="bg-white text-xs font-semibold text-slate-600 border-b border-slate-200">
                                <th className="p-3 sticky left-0 bg-white z-20 border-r text-center text-slate-400">#</th>
                                <th
                                    className="p-3 sticky left-[3rem] bg-white z-20 border-r cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>Nombre</span>
                                        <SortIcon field="name" />
                                    </div>
                                </th>
                                {/* Sales and new KPIs */}
                                <SortableHeader field="prospects" label="Prospectos" widthClass="w-24" />
                                <SortableHeader field="closings" label="Cierres" widthClass="w-24" />
                                <SortableHeader field="conversion" label="% Conv" widthClass="w-24" className="text-blue-600" />
                                <SortableHeader field="reactivations" label="React" widthClass="w-24" className="border-l border-amber-100 bg-amber-50/20" />
                                <SortableHeader field="equipmentRemovals" label="Retiros" widthClass="w-24" className="bg-amber-50/20" />
                                <th className="p-2 w-28 text-center bg-amber-100/40 text-amber-900 border-r border-slate-200">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] uppercase">Total</span>
                                        <span>Recup.</span>
                                    </div>
                                </th>
                                {/* Penalty */}
                                <th
                                    className="p-2 w-28 text-center text-red-600 border-l border-slate-100 cursor-pointer hover:bg-red-50 transition-colors"
                                    onClick={() => handleSort('avoidableTickets')}
                                >
                                    <div className="flex items-center justify-center space-x-1">
                                        <ShieldAlert size={14} />
                                        <span>Evitables</span>
                                        <SortIcon field="avoidableTickets" />
                                    </div>
                                </th>
                                <SortableHeader field="totalScore" label="Pts Total" widthClass="w-24" className="font-bold text-slate-800 border-l bg-slate-50" tooltip={"Cálculo:\n• Cierres: (% meta) * 300 pts\n• Prospectos: (% meta) * 50 pts\n• Conversión: (% meta) * 50 pts\n• Reactivaciones: (% meta comp.) * 150 pts\n• Retiros: (% meta comp.) * 100 pts\n• Penalizaciones: -30 pts c/u"} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {sortedEntries.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-slate-400">No hay agentes con datos en este mes.</td>
                                </tr>
                            )}
                            {sortedEntries.map((entry, idx) => (
                                <tr key={entry.employeeId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center text-slate-400 font-medium sticky left-0 bg-white border-r z-10">{idx + 1}</td>
                                    <td className="p-3 font-medium text-slate-800 sticky left-[3rem] bg-white border-r z-10">{entry.name}</td>

                                    {/* Sales */}
                                    <td className="p-2 text-center text-slate-600 align-middle">
                                        <div className="font-bold text-lg text-slate-800">{entry.prospects} <span className="text-xs text-slate-400 font-normal">/ {entry.prospectGoal || 0}</span></div>
                                        <div className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                                            <span className={`font-semibold ${(entry.prospectGoal && (entry.prospects / entry.prospectGoal) >= 1) ? 'text-green-600' : (entry.prospectGoal && (entry.prospects / entry.prospectGoal) >= 0.5) ? 'text-orange-500' : 'text-red-500'}`}>
                                                {entry.prospectGoal ? Math.round((entry.prospects / entry.prospectGoal) * 100) : 0}%
                                            </span>
                                            <span className="mx-1">|</span>
                                            <span>Proy: {Math.round(entry.prospects * projectionFactor)}</span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center bg-blue-50/50 align-middle">
                                        <div className="font-bold text-lg text-blue-700">{entry.closings} <span className="text-xs text-blue-400/70 font-normal">/ {entry.closingGoal || 0}</span></div>
                                        <div className="text-[10px] text-blue-600/70 mt-0.5 whitespace-nowrap">
                                            <span className={`font-semibold ${(entry.closingGoal && (entry.closings / entry.closingGoal) >= 1) ? 'text-green-600' : (entry.closingGoal && (entry.closings / entry.closingGoal) >= 0.5) ? 'text-orange-500' : 'text-red-500'}`}>
                                                {entry.closingGoal ? Math.round((entry.closings / entry.closingGoal) * 100) : 0}%
                                            </span>
                                            <span className="mx-1">|</span>
                                            <span>Proy: {Math.round(entry.closings * projectionFactor)}</span>
                                        </div>
                                    </td>

                                    {/* Conversion (Calculated) */}
                                    <td className="p-2 bg-blue-50/30 text-center align-middle">
                                        <div className={`inline-block text-xs font-bold py-1 px-2 rounded ${(entry.prospects > 0 && (entry.closings / entry.prospects) > 0.3) ? 'bg-green-100 text-green-700 border border-green-200' :
                                            (entry.prospects > 0 && (entry.closings / entry.prospects) > 0.15) ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {entry.prospects > 0 ? Math.round((entry.closings / entry.prospects) * 100) : 0}%
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">
                                            Meta: {entry.conversionGoal ? Math.round(entry.conversionGoal * 100) : 20}%
                                        </div>
                                    </td>

                                    <td className="p-2 text-center text-slate-600 align-middle">
                                        <div className="font-bold text-lg text-amber-700/80">{entry.reactivations}</div>
                                        <div className="text-[10px] text-amber-600/70 mt-0.5 whitespace-nowrap">
                                            <span className="font-semibold text-amber-600">
                                                {Math.round(((entry.reactivations) / (entry.reactivationGoal || entry.equipmentRemovalGoal || 1)) * 100)}% del logro
                                            </span>
                                        </div>
                                    </td>

                                    <td className="p-2 text-center text-slate-600 border-r border-slate-100 align-middle">
                                        <div className="font-bold text-lg text-purple-700/80">{entry.equipmentRemovals}</div>
                                        <div className="text-[10px] text-purple-600/70 mt-0.5 whitespace-nowrap">
                                            <span className="font-semibold text-purple-600">
                                                {Math.round(((entry.equipmentRemovals) / (entry.reactivationGoal || entry.equipmentRemovalGoal || 1)) * 100)}% del logro
                                            </span>
                                        </div>
                                    </td>

                                    <td className="p-2 text-center bg-amber-50/40 border-r border-slate-200 align-middle">
                                        <div className="font-black text-xl text-amber-900">
                                            {entry.reactivations + entry.equipmentRemovals}
                                            <span className="text-xs text-amber-500 font-normal ml-1">/ {entry.reactivationGoal || entry.equipmentRemovalGoal || 0}</span>
                                        </div>
                                        <div className={`text-[10px] font-bold mt-0.5 ${((entry.reactivations + entry.equipmentRemovals) / (entry.reactivationGoal || entry.equipmentRemovalGoal || 1)) >= 1 ? 'text-green-600' : 'text-amber-700'}`}>
                                            {Math.round(((entry.reactivations + entry.equipmentRemovals) / (entry.reactivationGoal || entry.equipmentRemovalGoal || 1)) * 100)}% Cumplimiento
                                        </div>
                                    </td>

                                    {/* Penalty Input */}
                                    <td className="p-2 border-l border-slate-100 bg-red-50/50 text-center font-bold text-red-600 relative">
                                        <div 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                let parsed = [];
                                                try { parsed = JSON.parse(entry.penalizationReasons || '[]'); } catch { parsed = []; }
                                                if (popupInfo?.id === entry.employeeId) {
                                                    setPopupInfo(null);
                                                } else {
                                                    setPopupInfo({ id: entry.employeeId, name: entry.name, reasons: parsed });
                                                }
                                            }}
                                            className="cursor-pointer hover:underline text-red-700 inline-block w-full h-full"
                                        >
                                            {Number(entry.avoidableTickets) === 0 ? '-' : entry.avoidableTickets}
                                        </div>
                                        
                                        {popupInfo?.id === entry.employeeId && popupInfo.reasons.length > 0 && (
                                            <div 
                                                className="absolute z-[9999] right-[110%] top-0 mr-2 w-72 bg-white rounded-xl shadow-2xl border border-red-200 text-left overflow-hidden ring-1 ring-black/5"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="bg-red-50 p-3 font-bold text-slate-800 text-sm border-b border-red-100 flex items-center space-x-2">
                                                    <ShieldAlert size={16} className="text-red-500" />
                                                    <span>Motivos: {entry.name}</span>
                                                </div>
                                                <ul className="p-3 space-y-2 max-h-56 overflow-y-auto w-full list-disc pl-6 custom-scrollbar">
                                                    {popupInfo.reasons.map((r, i) => (
                                                        <li key={i} className="text-xs font-medium text-slate-600 break-words leading-relaxed">{r}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-center font-bold text-slate-800 border-l bg-slate-50">
                                        {entry.totalScore}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {sortedEntries.length > 0 && (
                            <tfoot className="bg-slate-50 font-bold text-slate-700 border-t-2 border-slate-200">
                                <tr>
                                    <td className="p-3 sticky left-0 bg-slate-50 border-r z-10 text-center">-</td>
                                    <td className="p-3 sticky left-[3rem] bg-slate-50 border-r z-10 text-right">TOTALES</td>
                                    <td className="p-2 text-center text-slate-800 bg-white">
                                        <div className="flex flex-col items-center">
                                            <span>{totalProspects} <span className="text-[10px] text-slate-400 font-normal">/ {totalProspectGoal}</span></span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center text-blue-800 bg-blue-100/50">
                                        <div className="flex flex-col items-center">
                                            <span>{totalClosings} <span className="text-[10px] text-blue-400/70 font-normal">/ {totalClosingGoal}</span></span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center text-blue-700 bg-blue-50/50">{totalConversion}%</td>
                                    <td className="p-2 text-center text-slate-800 bg-amber-50/50">{totalReactivations}</td>
                                    <td className="p-2 text-center text-slate-800 bg-amber-50/50 border-r border-slate-100">{totalEquipmentRemovals}</td>
                                    <td className="p-2 text-center text-amber-900 bg-amber-100/50 border-r border-slate-200">
                                        <div className="flex flex-col items-center">
                                            <span className="font-black text-lg">{totalReactivations + totalEquipmentRemovals} <span className="text-xs text-amber-600/70 font-normal">/ {totalSharedGoal}</span></span>
                                            <span className="text-[10px] text-amber-700 font-black">{totalRecoveryCompliance}% Total</span>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center text-red-800 border-l border-slate-200 bg-red-100/50">{totalAvoidableTickets}</td>
                                    <td className="p-2 text-center text-slate-900 border-l border-slate-200 bg-slate-200/50">{totalScoreAggregate}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
