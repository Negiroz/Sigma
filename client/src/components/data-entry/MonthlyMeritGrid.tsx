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
    prospects: number;
    closings: number;
    revenue: number;
    supportTickets: number;
    tasksScheduled: number;
    tasksDone: number;
    conversations: number;
    payments: number;
    versusPoints: number;
    avoidableTickets: number;
    penalizationReasons?: string;
    totalScore: number;
}

type SortField = keyof MonthlyMetric | 'conversion';
type SortDirection = 'asc' | 'desc';

export default function MonthlyMeritGrid({ companyId }: MonthlyMeritGridProps) {
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
            console.log('[DEBUG] MonthlyMeritGrid data received:', data);
            setEntries(data.filter((e: any) => e.role === 'CLOSER'));
        }
    }, [data]);

    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;

    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'long' });

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
    const totalRevenue = sortedEntries.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const totalSupportTickets = sortedEntries.reduce((sum, e) => sum + (e.supportTickets || 0), 0);
    const totalTasksScheduled = sortedEntries.reduce((sum, e) => sum + (e.tasksScheduled || 0), 0);
    const totalTasksDone = sortedEntries.reduce((sum, e) => sum + (e.tasksDone || 0), 0);
    const totalConversations = sortedEntries.reduce((sum, e) => sum + (e.conversations || 0), 0);
    const totalPayments = sortedEntries.reduce((sum, e) => sum + (e.payments || 0), 0);
    const totalVersusPoints = sortedEntries.reduce((sum, e) => sum + (e.versusPoints || 0), 0);
    const totalAvoidableTickets = sortedEntries.reduce((sum, e) => sum + (e.avoidableTickets || 0), 0);
    const totalScoreAggregate = sortedEntries.reduce((sum, e) => sum + (e.totalScore || 0), 0);
    const totalConversion = totalProspects > 0 ? Math.round((totalClosings / totalProspects) * 100) : 0;

    // Make a wrapper component for sorted headers
    const SortableHeader = ({ field, label, widthClass = '', className = '' }: { field: SortField, label: string, widthClass?: string, className?: string }) => (
        <th
            className={`p-2 cursor-pointer hover:bg-slate-100 transition-colors select-none ${widthClass} ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center justify-center">
                <span>{label}</span>
                <SortIcon field={field} />
            </div>
        </th>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-blue-800">
                    <Info size={18} />
                    <span className="text-sm font-medium">Acumulado General: {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}</span>
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
                                <th className="p-3 sticky left-[3rem] bg-slate-50 z-20 w-48 border-r">Agente</th>
                                <th className="p-3 text-center border-l bg-blue-50 text-blue-800" colSpan={4}>Ventas (Grupo A)</th>
                                <th className="p-3 text-center border-l bg-emerald-50 text-emerald-800" colSpan={3}>Operaciones (Grupo B)</th>
                                <th className="p-3 text-center border-l bg-orange-50 text-orange-800" colSpan={2}>Atención (Grupo C)</th>
                                <th className="p-3 text-center border-l bg-purple-50 text-purple-800" colSpan={1}>Versus</th>
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
                                {/* Sales */}
                                <SortableHeader field="prospects" label="Prospectos" widthClass="w-24" />
                                <SortableHeader field="closings" label="Cierres" widthClass="w-24" />
                                <SortableHeader field="conversion" label="% Conv" widthClass="w-24" className="text-blue-600" />
                                <SortableHeader field="revenue" label="Ingresos ($)" widthClass="w-28" />
                                {/* Ops */}
                                <SortableHeader field="supportTickets" label="S Resueltos" widthClass="w-24" className="border-l border-slate-100" />
                                <SortableHeader field="tasksScheduled" label="S no resuelto" widthClass="w-24" />
                                <SortableHeader field="tasksDone" label="S escaldo" widthClass="w-24" />
                                {/* Attention */}
                                <SortableHeader field="conversations" label="Conversaciones" widthClass="w-28" className="border-l border-slate-100 bg-orange-50/50" />
                                <SortableHeader field="payments" label="Pagos" widthClass="w-24" className="bg-orange-50/50" />
                                {/* Versus */}
                                <SortableHeader field="versusPoints" label="Versus Pts" widthClass="w-24" className="border-l border-slate-100" />
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
                                <SortableHeader field="totalScore" label="Pts Total" widthClass="w-24" className="font-bold text-slate-800 border-l bg-slate-50" />
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
                                    <td className="p-2 text-center text-slate-600">{entry.prospects}</td>
                                    <td className="p-2 text-center font-bold text-blue-700 bg-blue-50/50">{entry.closings}</td>

                                    {/* Conversion (Calculated) */}
                                    <td className="p-2 bg-blue-50/30 text-center">
                                        <div className={`inline-block text-xs font-bold py-1 px-2 rounded ${(entry.prospects > 0 && (entry.closings / entry.prospects) > 0.3) ? 'bg-green-100 text-green-700 border border-green-200' :
                                            (entry.prospects > 0 && (entry.closings / entry.prospects) > 0.15) ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                            {entry.prospects > 0 ? Math.round((entry.closings / entry.prospects) * 100) : 0}%
                                        </div>
                                    </td>

                                    <td className="p-2 text-center text-slate-600">${entry.revenue}</td>

                                    {/* Ops */}
                                    <td className="p-2 border-l border-slate-100 text-center text-slate-600">{entry.supportTickets}</td>
                                    <td className="p-2 text-center bg-emerald-50/50 text-emerald-700">{entry.tasksScheduled}</td>
                                    <td className="p-2 text-center font-bold text-emerald-700">{entry.tasksDone}</td>

                                    {/* Attention */}
                                    <td className="p-2 border-l border-slate-100 text-center text-slate-600 bg-orange-50/10">{entry.conversations}</td>
                                    <td className="p-2 text-center font-bold text-orange-700 bg-orange-50/10">{entry.payments}</td>

                                    {/* Versus */}
                                    <td className="p-2 border-l border-slate-100 bg-purple-50/30">
                                        <div className="w-full text-center font-medium text-xs">
                                            {entry.versusPoints > 0 ? (
                                                <span className="text-purple-600 font-bold">+{entry.versusPoints}</span>
                                            ) : entry.versusPoints < 0 ? (
                                                <span className="text-red-500 font-bold">{entry.versusPoints}</span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
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
                                    <td className="p-2 text-center text-slate-800 bg-white">{totalProspects}</td>
                                    <td className="p-2 text-center text-blue-800 bg-blue-100/50">{totalClosings}</td>
                                    <td className="p-2 text-center text-blue-700 bg-blue-50/50">{totalConversion}%</td>
                                    <td className="p-2 text-center text-slate-800 bg-white">${totalRevenue}</td>
                                    <td className="p-2 text-center text-slate-800 border-l border-slate-200 bg-white">{totalSupportTickets}</td>
                                    <td className="p-2 text-center text-emerald-800 bg-emerald-100/50">{totalTasksScheduled}</td>
                                    <td className="p-2 text-center text-emerald-800 bg-emerald-100/50">{totalTasksDone}</td>
                                    <td className="p-2 text-center text-orange-800 border-l border-slate-200 bg-orange-100/50">{totalConversations}</td>
                                    <td className="p-2 text-center text-orange-800 bg-orange-100/50">{totalPayments}</td>
                                    <td className="p-2 text-center text-purple-800 border-l border-slate-200 bg-purple-100/50">{totalVersusPoints > 0 ? `+${totalVersusPoints}` : totalVersusPoints}</td>
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
