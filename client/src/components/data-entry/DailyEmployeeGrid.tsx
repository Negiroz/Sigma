import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader, Calendar, ShieldAlert, Plus, Trash2, X, TrendingUp, HelpCircle } from 'lucide-react';
import ScoringRulesModal from './ScoringRulesModal';

interface DailyEmployeeGridProps {
    companyId: number | null;
}

interface DailyMetric {
    employeeId: number;
    name: string;
    branchName: string;
    role?: string;
    prospects: number;
    closings: number;
    revenue: number;
    avoidableTickets: number;
    penalizationTypeIds?: number[];
    penalizationReasons?: string;
    closingGoal?: number;
    prospectGoal?: number;
    reactivations?: number;
    equipmentRemovals?: number;
    reactivationGoal?: number;
    equipmentRemovalGoal?: number;
    conversionGoal?: number;
}

function InlinePenaltyEditor({ 
    employeeName, 
    initialPenalizationIds, 
    onSave, 
    onClose 
}: { 
    employeeName: string; 
    initialPenalizationIds: number[]; 
    onSave: (typeIds: number[], count: number) => void;
    onClose: () => void;
}) {
    const { data: penalizations, isLoading } = useQuery({
        queryKey: ['penalizationTypes', 'AGENT'],
        queryFn: async () => (await api.get('/dashboard/admin/penalization-types', { params: { role: 'AGENT' } })).data
    });

    const [selectedIds, setSelectedIds] = useState<number[]>(initialPenalizationIds || []);

    const handleSave = () => {
        onSave(selectedIds, selectedIds.length);
        onClose();
    };

    const addId = (id: number) => {
        setSelectedIds([...selectedIds, id]);
    };

    const removeId = (id: number) => {
        const index = selectedIds.indexOf(id);
        if (index > -1) {
            const newIds = [...selectedIds];
            newIds.splice(index, 1);
            setSelectedIds(newIds);
        }
    };

    return (
        <div className="relative text-left w-80" onClick={e => e.stopPropagation()}>
            <div className="bg-red-50 p-2 font-bold text-slate-800 text-sm border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <ShieldAlert size={16} className="text-red-500" />
                    <span>Penalizaciones: {employeeName}</span>
                </div>
                <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                    <X size={16} />
                </button>
            </div>
            <div className="p-3 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                {isLoading && <div className="text-center text-slate-500 text-xs py-2">Cargando catálogo...</div>}
                {!isLoading && penalizations?.length === 0 && <div className="text-center text-slate-500 text-xs py-2">No hay penalizaciones configuradas</div>}
                {!isLoading && penalizations?.map((p: any) => {
                    const count = selectedIds.filter(id => id === p.id).length;
                    return (
                        <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100 transition-colors">
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-700 leading-tight">{p.name}</div>
                                <div className="text-xs text-red-500 font-bold">-{p.pointsCost} pts</div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button 
                                    onClick={() => removeId(p.id)} 
                                    disabled={count === 0}
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    -
                                </button>
                                <span className="text-sm font-bold text-slate-700 w-4 text-center">{count}</span>
                                <button 
                                    onClick={() => addId(p.id)} 
                                    className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-2 border-t border-red-100 flex justify-end">
                <button onClick={handleSave} className="bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm transition-colors">
                    Aplicar Penalizaciones
                </button>
            </div>
        </div>
    );
}

// Logic for Field Agent Scoring - uses configurable KPI values
const calculateProjectedScore = (metric: DailyMetric, config?: any, penalizations?: any[]) => {
    let score = 0;

    // Use configured values, fallback to defaults
    const agentClosingPts   = config?.agentClosingPoints      ?? 300;
    const agentProspectPts  = config?.agentProspectPoints     ?? 50;
    const agentConvPts      = config?.agentConversionPoints   ?? 50;
    const agentEquipPts     = config?.agentEquipmentPoints    ?? 100;
    const agentPenaltyPts   = config?.agentPenaltyPoints      ?? 30;

    const cGoal    = metric.closingGoal          && metric.closingGoal > 0          ? metric.closingGoal          : 1;
    const pGoal    = metric.prospectGoal         && metric.prospectGoal > 0         ? metric.prospectGoal         : 1;
    const convGoal  = metric.conversionGoal      && metric.conversionGoal > 0      ? metric.conversionGoal       : 0.2;

    score += ((metric.closings || 0) / cGoal) * agentClosingPts;
    score += ((metric.prospects || 0) / pGoal) * agentProspectPts;

    const currentConv = (metric.prospects || 0) > 0 ? (metric.closings || 0) / (metric.prospects || 0) : 0;
    score += (currentConv / convGoal) * agentConvPts;

    const sharedGoal = metric.reactivationGoal && metric.reactivationGoal > 0 ? metric.reactivationGoal : (metric.equipmentRemovalGoal && metric.equipmentRemovalGoal > 0 ? metric.equipmentRemovalGoal : 1);

    score += ((metric.reactivations || 0) / sharedGoal) * (config?.agentReactivationPoints ?? 150);
    score += ((metric.equipmentRemovals || 0) / sharedGoal) * agentEquipPts;

    let penaltyPoints = 0;
    if (metric.penalizationTypeIds && metric.penalizationTypeIds.length > 0) {
        penaltyPoints = metric.penalizationTypeIds.reduce((sum: number, id: number) => {
            const pt = penalizations?.find((p: any) => p.id === id);
            return sum + (pt?.pointsCost || 0);
        }, 0);
        score -= penaltyPoints;
    } else {
        score -= ((metric.avoidableTickets || 0) * agentPenaltyPts);
    }

    return Math.round(score);
};

export default function DailyEmployeeGrid({ companyId }: DailyEmployeeGridProps) {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [entries, setEntries] = useState<DailyMetric[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [popupInfo, setPopupInfo] = useState<{ id: number, index: number, name: string, typeIds: number[] } | null>(null);

    // Derive month/year from selected date to fetch correct KPI config
    const selectedMonth = parseInt(selectedDate.split('-')[1], 10);
    const selectedYear = parseInt(selectedDate.split('-')[0], 10);

    // Fetch the KPI config for the selected month/year
    const { data: kpiConfig } = useQuery({
        queryKey: ['kpiConfig', selectedMonth, selectedYear],
        queryFn: async () => (await api.get('/dashboard/admin/kpi-config', {
            params: { month: selectedMonth, year: selectedYear }
        })).data,
    });

    const { data: penalizations } = useQuery({
        queryKey: ['penalizationTypes', 'AGENT'],
        queryFn: async () => (await api.get('/dashboard/admin/penalization-types', { params: { role: 'AGENT' } })).data
    });

    useEffect(() => {
        const handleClickOutside = () => setPopupInfo(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const { data, isLoading } = useQuery({
        queryKey: ['dailyMerit', selectedDate, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/daily-merit', {
                params: { date: selectedDate, companyId }
            });
            return res.data as DailyMetric[];
        },
        enabled: !!companyId
    });

    useEffect(() => {
        if (data) {
            setEntries(data);
            setHasChanges(false);
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company selected');

            const sanitizedEntries = entries.map(e => ({
                ...e,
                avoidableTickets: (e.penalizationTypeIds && e.penalizationTypeIds.length > 0) ? 0 : Number(e.avoidableTickets || 0)
            }));

            await api.post('/dashboard/data-entry/daily-merit', {
                date: selectedDate,
                companyId,
                metrics: sanitizedEntries
            });
        },
        onSuccess: () => {
            toast.success('Rendimiento diario guardado');
            queryClient.invalidateQueries({ queryKey: ['dailyMerit'] });
            setHasChanges(false);
        },
        onError: () => {
            toast.error('Error al guardar datos');
        }
    });

    const handleChange = (index: number, field: keyof DailyMetric, value: any) => {
        const newEntries = [...entries];
        // @ts-ignore
        newEntries[index][field] = value;
        setEntries(newEntries);
        setHasChanges(true);
    };

    const handleSavePenalizations = (typeIds: number[], count: number) => {
        if (popupInfo && popupInfo.index !== -1) {
            const idx = popupInfo.index;
            const newEntries = [...entries];
            newEntries[idx].penalizationTypeIds = typeIds;
            newEntries[idx].avoidableTickets = count; // Legacy mapping
            setEntries(newEntries);
            setHasChanges(true);
            toast.success("Penalizaciones aplicadas.", { icon: '⚠️' });
        }
    };

    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;

    const fieldAgents = [...entries]
        .filter(e => e.role === 'AGENT')
        .sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));

    const totalProspects = fieldAgents.reduce((sum, e) => sum + (Number(e.prospects) || 0), 0);
    const totalClosings = fieldAgents.reduce((sum, e) => sum + (Number(e.closings) || 0), 0);
    const totalReactivations = fieldAgents.reduce((sum, e) => sum + (Number(e.reactivations) || 0), 0);
    const totalEquipmentRemovals = fieldAgents.reduce((sum, e) => sum + (Number(e.equipmentRemovals) || 0), 0);
    const totalAvoidable = fieldAgents.reduce((sum, e) => sum + (Number(e.avoidableTickets) || 0), 0);
    const totalScoreAggregate = fieldAgents.reduce((sum, e) => sum + calculateProjectedScore(e, kpiConfig, penalizations), 0);
    const totalConversion = totalProspects > 0 ? Math.round((totalClosings / totalProspects) * 100) : 0;

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <Calendar size={18} className="text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Fecha de Registro:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-slate-800 font-bold"
                        />
                    </div>
                    {isLoading && <span className="text-xs text-slate-400">Cargando datos...</span>}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => updateMutation.mutate()}
                        disabled={!hasChanges || updateMutation.isPending}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {updateMutation.isPending ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                        <span>Guardar Rendimiento Diario</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-black">
                                <th className="p-3 sticky left-0 bg-slate-50 z-10 w-48 font-black">Sede</th>
                                <th className="p-3 bg-slate-50 z-10 w-48 font-black">Agente de Campo</th>
                                <th className="p-3 text-center border-l bg-blue-50 text-blue-800" colSpan={2}>Ventas</th>
                                <th className="p-3 text-center border-l bg-amber-50 text-amber-800" colSpan={2}>Recuperación</th>
                                <th className="p-3 text-center border-l bg-red-50 text-red-800">Penalización</th>
                                <th className="p-3 text-center border-l bg-slate-100 text-slate-700">Resumen</th>
                            </tr>
                            <tr className="bg-white text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                                <th className="p-3 sticky left-0 bg-white z-10 border-r">Sede</th>
                                <th className="p-3 bg-white z-10 border-r">Nombre</th>
                                <th className="p-2 w-20 text-center bg-blue-50/20">Prosp</th>
                                <th className="p-2 w-20 text-center bg-blue-50/20">Cierres</th>
                                <th className="p-2 w-20 text-center bg-amber-50/30">React</th>
                                <th className="p-2 w-20 text-center bg-amber-50/30">Retiros</th>
                                <th className="p-2 w-20 text-center text-blue-600">% Conv</th>
                                <th className="p-2 w-32 text-center text-red-600 flex items-center justify-center space-x-1">
                                    <ShieldAlert size={14} />
                                    <span>Penalización CRM</span>
                                </th>
                                <th className="p-2 w-24 text-center font-bold text-slate-800 border-l relative">
                                    <div className="flex items-center justify-center space-x-1 cursor-help group" onClick={() => setIsRulesModalOpen(true)}>
                                        <span>Puntos Día</span>
                                        <HelpCircle size={14} className="text-blue-400 hover:text-blue-600" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {fieldAgents.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-400 italics">No hay agentes de campo configurados hoy.</td>
                                </tr>
                            )}
                            {fieldAgents.map((entry) => {
                                const idx = entries.findIndex(e => e.employeeId === entry.employeeId);
                                return (
                                    <tr key={entry.employeeId} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-3 font-bold text-slate-500 sticky left-0 bg-white border-r text-xs uppercase">{entry.branchName}</td>
                                        <td className="p-3 font-bold text-slate-700 bg-white border-r">{entry.name}</td>

                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1"
                                                value={Number(entry.prospects) === 0 ? '' : entry.prospects} onChange={(e) => handleChange(idx, 'prospects', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1 bg-blue-50 font-black text-blue-700"
                                                value={Number(entry.closings) === 0 ? '' : entry.closings} onChange={(e) => handleChange(idx, 'closings', Number(e.target.value))} />
                                        </td>

                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1"
                                                value={Number(entry.reactivations) === 0 ? '' : entry.reactivations} onChange={(e) => handleChange(idx, 'reactivations', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1"
                                                value={Number(entry.equipmentRemovals) === 0 ? '' : entry.equipmentRemovals} onChange={(e) => handleChange(idx, 'equipmentRemovals', Number(e.target.value))} />
                                        </td>

                                        <td className="p-2 bg-blue-50/30 text-center">
                                            <div className={`text-[10px] font-black py-1 px-2 rounded-lg border ${(entry.prospects > 0 && (entry.closings / entry.prospects) > 0.2) ? 'bg-green-50 text-green-700 border-green-200' :
                                                (entry.prospects > 0 && (entry.closings / entry.prospects) > 0.1) ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'text-slate-400 border-transparent'
                                                }`}>
                                                {entry.prospects > 0 ? Math.round((entry.closings / entry.prospects) * 100) : 0}%
                                            </div>
                                        </td>

                                        <td className="p-2 border-l border-slate-100 bg-red-50/20 relative">
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (popupInfo?.id === entry.employeeId) setPopupInfo(null);
                                                    else setPopupInfo({ id: entry.employeeId, index: idx, name: entry.name, typeIds: entry.penalizationTypeIds || [] });
                                                }}
                                                className="w-full text-center border border-red-200 bg-white rounded cursor-pointer hover:bg-red-50 py-1 text-red-600 font-black min-h-[30px] flex items-center justify-center select-none"
                                            >
                                                {(entry.penalizationTypeIds && entry.penalizationTypeIds.length > 0) ? entry.penalizationTypeIds.length : (Number(entry.avoidableTickets) === 0 ? '-' : entry.avoidableTickets)}
                                            </div>

                                            {popupInfo?.id === entry.employeeId && (
                                                <div className="absolute z-[9999] right-[105%] top-0 w-80 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in duration-200">
                                                    <InlinePenaltyEditor 
                                                        employeeName={popupInfo.name}
                                                        initialPenalizationIds={popupInfo.typeIds}
                                                        onSave={handleSavePenalizations}
                                                        onClose={() => setPopupInfo(null)}
                                                    />
                                                </div>
                                            )}
                                        </td>

                                        <td className="p-2 text-center font-black text-blue-600 border-l bg-slate-50/50">
                                            {calculateProjectedScore(entry, kpiConfig, penalizations)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {fieldAgents.length > 0 && (
                            <tfoot className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200 uppercase text-[10px] tracking-tight">
                                <tr>
                                    <td className="p-3 sticky left-0 bg-slate-50 border-r z-10"></td>
                                    <td className="p-3 bg-slate-50 border-r z-10 text-right">TOTALES</td>
                                    <td className="p-2 text-center bg-white">{totalProspects}</td>
                                    <td className="p-2 text-center text-blue-700 bg-blue-50">{totalClosings}</td>
                                    <td className="p-2 text-center bg-white">{totalReactivations}</td>
                                    <td className="p-2 text-center bg-white">{totalEquipmentRemovals}</td>
                                    <td className="p-2 text-center text-blue-600 font-black">{totalConversion}%</td>
                                    <td className="p-2 text-center text-red-600 bg-red-50/50">{totalAvoidable}</td>
                                    <td className="p-2 text-center text-blue-800 bg-blue-100/30 font-black">{totalScoreAggregate} pts</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-4 shadow-sm">
                <div className="bg-white p-2 rounded-lg border border-blue-200 shadow-inner">
                    <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-blue-800 uppercase tracking-tight">Sistema de Puntuación: Agente de Campo</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                        <p className="text-xs text-blue-600/80 flex justify-between"><span>• Ventas (100% Meta):</span> <span className="font-black">{kpiConfig?.agentClosingPoints ?? 300} pts</span></p>
                        <p className="text-xs text-blue-600/80 flex justify-between"><span>• Retiro Eq. (100% Meta):</span> <span className="font-black">{kpiConfig?.agentEquipmentPoints ?? 100} pts</span></p>
                        <p className="text-xs text-blue-600/80 flex justify-between"><span>• Prospectos (100% Meta):</span> <span className="font-black">{kpiConfig?.agentProspectPoints ?? 50} pts</span></p>
                        <p className="text-xs text-blue-600/80 flex justify-between"><span>• Reactivación (100% Meta):</span> <span className="font-black">{kpiConfig?.agentReactivationPoints ?? 150} pts</span></p>
                        <p className="text-xs text-blue-600/80 flex justify-between"><span>• Conversión (100% Meta):</span> <span className="font-black">{kpiConfig?.agentConversionPoints ?? 50} pts</span></p>
                        <p className="text-xs text-red-600/80 flex justify-between font-bold"><span>• Mala Ejecución CRM (c/u):</span> <span>-{kpiConfig?.agentPenaltyPoints ?? 30} pts</span></p>
                    </div>
                    <p className="text-[10px] mt-2 text-blue-500 italic">* Los puntos se calculan basados en el porcentaje alcanzado de la meta mensual. Si un agente supera el 100%, obtiene más de los puntos base correspondientes. No hay topes.</p>
                </div>
            </div>
            <ScoringRulesModal 
                isOpen={isRulesModalOpen} 
                onClose={() => setIsRulesModalOpen(false)} 
                section="agent"
            />
        </div>
    );
}
