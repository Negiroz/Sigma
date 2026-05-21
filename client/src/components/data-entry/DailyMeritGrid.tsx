import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader, Calendar, ShieldAlert, HelpCircle, FileDown, FileUp, RefreshCcw } from 'lucide-react';
import ScoringRulesModal from './ScoringRulesModal';
import { exportToExcel, importFromExcel } from '../../lib/excelUtils';
import { useRef } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useConfig } from '../../contexts/ConfigContext';

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
        queryKey: ['penalizationTypes', 'CLOSER'],
        queryFn: async () => (await api.get('/dashboard/admin/penalization-types', { params: { role: 'CLOSER' } })).data
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

interface DailyMeritGridProps {
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
    supportTickets: number;
    tasksScheduled: number;
    tasksDone: number;
    conversations: number;
    payments: number;
    supervisorScore: number;
    versusPoints: number;
    avoidableTickets: number;
    penalizationTypeIds?: number[];
    penalizationReasons?: string;
    // supervisorScore removed from daily entry UI but kept in type if needed, or ignored.
}

const calculateProjectedScore = (metric: DailyMetric, config?: any, penalizations?: any[]) => {
    let score = 0;

    // Default configuration values
    const supportTicketsVal = config?.supportTickets ?? 6;
    const tasksDoneVal = config?.tasksDone ?? 2;
    const paymentsVal = config?.payments ?? 0.5;
    const conversationsVal = config?.conversations ?? 0.2;
    const closingsVal = config?.closings ?? 30;
    const revenueDivider = config?.revenueDivider ?? 10;

    // 1. Sales
    score += (metric.closings || 0) * closingsVal;

    // 2. Revenue
    score += Math.floor((metric.revenue || 0) / revenueDivider);

    // 3. Ops
    score += (metric.supportTickets || 0) * supportTicketsVal;
    score += (metric.tasksScheduled || 0) * tasksDoneVal;
    score += (metric.tasksDone || 0) * tasksDoneVal;

    // 4. Attention
    score += (metric.conversations || 0) * conversationsVal;
    score += (metric.payments || 0) * paymentsVal;

    // 5. Versus Points 
    score += (metric.versusPoints || 0);

    // 6. Penalties
    let penaltyPoints = 0;
    if (metric.penalizationTypeIds && metric.penalizationTypeIds.length > 0) {
        penaltyPoints = metric.penalizationTypeIds.reduce((sum: number, id: number) => {
            const pt = penalizations?.find((p: any) => p.id === id);
            return sum + (pt?.pointsCost || 0);
        }, 0);
        score -= penaltyPoints;
    } else {
        score -= ((metric.avoidableTickets || 0) * 30);
    }

    return Math.round(score);
};

export default function DailyMeritGrid({ companyId }: DailyMeritGridProps) {
    const queryClient = useQueryClient();
    // Default to today (Local Time)
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

    const { month, year } = useConfig();
    const { data: config } = useQuery({
        queryKey: ['kpiConfig', month, year],
        queryFn: async () => (await api.get(`/dashboard/admin/kpi-config`, { params: { month, year } })).data
    });

    const { data: penalizations } = useQuery({
        queryKey: ['penalizationTypes', 'CLOSER'],
        queryFn: async () => (await api.get('/dashboard/admin/penalization-types', { params: { role: 'CLOSER' } })).data
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
            toast.success('Métricas diarias guardadas');
            queryClient.invalidateQueries({ queryKey: ['dailyMerit'] });
            queryClient.invalidateQueries({ queryKey: ['meritHighlights'] });
            queryClient.invalidateQueries({ queryKey: ['meritLeaderboard'] });
            queryClient.invalidateQueries({ queryKey: ['versusStandings'] });
            setHasChanges(false);
        },
        onError: () => {
            toast.error('Error al guardar métricas');
        }
    });

    const syncOdooMutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company selected');
            const response = await api.post('/dashboard/data-entry/sync-odoo', {
                date: selectedDate,
                companyId
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success('Sincronización con Odoo exitosa (Datos de prueba)');
            // Actualizar el estado con las métricas obtenidas
            if (data.metrics) {
                const newEntries = [...entries];
                let updatedCount = 0;

                data.metrics.forEach((syncedMetric: any) => {
                    const idx = newEntries.findIndex(e => e.employeeId === syncedMetric.employeeId);
                    if (idx !== -1) {
                        newEntries[idx] = { ...newEntries[idx], ...syncedMetric };
                        updatedCount++;
                    }
                });

                setEntries(newEntries);
                setHasChanges(true);
            }
        },
        onError: () => {
            toast.error('Error al sincronizar con Odoo');
        }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (index: number, field: keyof DailyMetric, value: number | string) => {
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
            toast.success("Penalizaciones agregadas. Recuerda guardar el día.", { icon: '⚠️' });
        }
    };

    const handleExportTemplate = () => {
        const templateData = entries
            .filter(e => e.role === 'CLOSER')
            .map(e => ({
                ID: e.employeeId,
                Agente: e.name,
                Prospectos: e.prospects || 0,
                Cierres: e.closings || 0,
                Ingresos: e.revenue || 0,
                'S Resueltos': e.supportTickets || 0,
                'S no resuelto': e.tasksScheduled || 0,
                'S escaldo': e.tasksDone || 0,
                Conversaciones: e.conversations || 0,
                Pagos: e.payments || 0,
                'Tickets Evitables': e.avoidableTickets || 0
            }));
        exportToExcel(templateData, `Plantilla_Carga_${selectedDate}`);
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        try {
            const importedData = await importFromExcel(e.target.files[0]);

            // Map imported data back to entries
            let updatedCount = 0;
            const newEntries = [...entries];

            importedData.forEach((row: any) => {
                // Find matching entry by ID or Name
                const entryIndex = newEntries.findIndex(e =>
                    e.employeeId === row.ID || e.name === row.Agente
                );

                if (entryIndex !== -1) {
                    newEntries[entryIndex] = {
                        ...newEntries[entryIndex],
                        prospects: Number(row.Prospectos) || 0,
                        closings: Number(row.Cierres) || 0,
                        revenue: Number(row.Ingresos) || 0,
                        supportTickets: Number(row['S Resueltos'] || row.Soportes) || 0,
                        tasksScheduled: Number(row['S no resuelto'] || row['Tareas Programadas']) || 0,
                        tasksDone: Number(row['S escaldo'] || row['Tareas Realizadas']) || 0,
                        conversations: Number(row.Conversaciones || row.conversaciones) || 0,
                        payments: Number(row.Pagos || row.pagos) || 0,
                        avoidableTickets: Number(row['Tickets Evitables']) || 0
                    };
                    updatedCount++;
                }
            });

            if (updatedCount > 0) {
                setEntries(newEntries);
                setHasChanges(true);
                toast.success(`Se actualizaron ${updatedCount} registros`);
            } else {
                toast.error('No se encontraron coincidencias de agentes');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al leer el archivo Excel');
        } finally {
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const gamificationAgents = [...entries]
        .filter(e => e.role === 'CLOSER')
        .sort((a, b) => a.branchName.localeCompare(b.branchName) || a.name.localeCompare(b.name));

    const totalProspects = gamificationAgents.reduce((sum, e) => sum + (Number(e.prospects) || 0), 0);
    const totalClosings = gamificationAgents.reduce((sum, e) => sum + (Number(e.closings) || 0), 0);
    const totalRevenue = gamificationAgents.reduce((sum, e) => sum + (Number(e.revenue) || 0), 0);
    const totalSupportTickets = gamificationAgents.reduce((sum, e) => sum + (Number(e.supportTickets) || 0), 0);
    const totalTasksScheduled = gamificationAgents.reduce((sum, e) => sum + (Number(e.tasksScheduled) || 0), 0);
    const totalTasksDone = gamificationAgents.reduce((sum, e) => sum + (Number(e.tasksDone) || 0), 0);
    const totalConversations = gamificationAgents.reduce((sum, e) => sum + (Number(e.conversations) || 0), 0);
    const totalPayments = gamificationAgents.reduce((sum, e) => sum + (Number(e.payments) || 0), 0);
    const totalVersusPoints = gamificationAgents.reduce((sum, e) => sum + (Number(e.versusPoints) || 0), 0);
    const totalAvoidableTickets = gamificationAgents.reduce((sum, e) => sum + (Number(e.avoidableTickets) || 0), 0);
    const totalScoreAggregate = gamificationAgents.reduce((sum, e) => sum + calculateProjectedScore(e, config, penalizations), 0);
    const totalConversion = totalProspects > 0 ? Math.round((totalClosings / totalProspects) * 100) : 0;

    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;

    return (
        <div className="space-y-4">
            {/* Header / Date Control */}
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
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportData}
                        accept=".xlsx, .xls"
                        className="hidden"
                    />

                    <button
                        onClick={handleExportTemplate}
                        className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                        title="Descargar Plantilla Excel"
                    >
                        <FileDown size={18} />
                        <span className="hidden md:inline">Plantilla</span>
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                        title="Cargar desde Excel"
                    >
                        <FileUp size={18} />
                        <span className="hidden md:inline">Cargar</span>
                    </button>

                    <button
                        onClick={() => syncOdooMutation.mutate()}
                        disabled={syncOdooMutation.isPending}
                        className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium disabled:opacity-50"
                        title="Sincronizar con Odoo"
                    >
                        {syncOdooMutation.isPending ? <Loader className="animate-spin" size={18} /> : <RefreshCcw size={18} />}
                        <span className="hidden md:inline">Odoo</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1"></div>

                    <button
                        onClick={() => setIsRulesModalOpen(true)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver Reglas de Puntuación"
                    >
                        <HelpCircle size={20} />
                    </button>

                    <button
                        onClick={() => updateMutation.mutate()}
                        disabled={!hasChanges || updateMutation.isPending}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {updateMutation.isPending ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                        <span>Guardar Día</span>
                    </button>
                </div>
            </div>

            <ScoringRulesModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <th className="p-3 sticky left-0 bg-slate-50 z-10 w-48">Sede</th>
                                <th className="p-3 bg-slate-50 z-10 w-48">Agente</th>
                                <th className="p-3 text-center border-l bg-blue-50 text-blue-800" colSpan={4}>Ventas (Grupo A)</th>
                                <th className="p-3 text-center border-l bg-emerald-50 text-emerald-800" colSpan={3}>Operaciones (Grupo B)</th>
                                <th className="p-3 text-center border-l bg-orange-50 text-orange-800" colSpan={2}>Atención (Grupo C)</th>
                                <th className="p-3 text-center border-l bg-purple-50 text-purple-800" colSpan={1}>Versus</th>
                                <th className="p-3 text-center border-l bg-red-50 text-red-800">Penalización</th>
                                <th className="p-3 text-center border-l bg-slate-100 text-slate-700">Resumen</th>
                            </tr>
                            <tr className="bg-white text-xs font-semibold text-slate-600 border-b border-slate-200">
                                <th className="p-3 sticky left-0 bg-white z-10 border-r">Sede</th>
                                <th className="p-3 bg-white z-10 border-r">Nombre</th>
                                {/* Sales */}
                                <th className="p-2 w-24 text-center">Prospectos</th>
                                <th className="p-2 w-24 text-center">Cierres</th>
                                <th className="p-2 w-20 text-center text-blue-600">% Conv</th>
                                <th className="p-2 w-28 text-center">Ingresos ($)</th>
                                {/* Ops */}
                                <th className="p-2 w-24 text-center">S Resueltos</th>
                                <th className="p-2 w-24 text-center">S no resuelto</th>
                                <th className="p-2 w-24 text-center">S escaldo</th>
                                {/* Attention */}
                                <th className="p-3 w-28 text-center border-l bg-orange-50/50">Conversaciones</th>
                                <th className="p-3 w-24 text-center bg-orange-50/50">Pagos</th>
                                {/* Versus (Replaces Quality Header) */}
                                <th className="p-2 w-24 text-center">Versus Pts</th>
                                {/* Penalty */}
                                <th className="p-2 w-28 text-center text-red-600 flex items-center justify-center space-x-1">
                                    <ShieldAlert size={14} />
                                    <span>Evitables</span>
                                </th>
                                <th className="p-2 w-24 text-center font-bold text-slate-800 border-l">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {gamificationAgents.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={14} className="p-8 text-center text-slate-400">No hay agentes configurados para evaluación.</td>
                                </tr>
                            )}
                            {gamificationAgents.map((entry) => {
                                const idx = entries.findIndex(e => e.employeeId === entry.employeeId);
                                return (
                                    <tr key={entry.employeeId} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-medium text-slate-500 sticky left-0 bg-white border-r text-xs uppercase">{entry.branchName}</td>
                                        <td className="p-3 font-medium text-slate-800 bg-white border-r">{entry.name}</td>

                                        {/* Sales Inputs */}
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1"
                                                value={Number(entry.prospects) === 0 ? '' : entry.prospects} onChange={(e) => handleChange(idx, 'prospects', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1 bg-blue-50 font-bold"
                                                value={Number(entry.closings) === 0 ? '' : entry.closings} onChange={(e) => handleChange(idx, 'closings', Number(e.target.value))} />
                                        </td>

                                        {/* Conversion (Calculated) */}
                                        <td className="p-2 bg-blue-50/30 text-center">
                                            <div className={`text-xs font-bold py-1 px-2 rounded ${(entry.prospects > 0 && (entry.closings / entry.prospects) > 0.3) ? 'bg-green-100 text-green-700 border border-green-200' :
                                                (entry.prospects > 0 && (entry.closings / entry.prospects) > 0.15) ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                    'text-slate-400'
                                                }`}>
                                                {entry.prospects > 0 ? Math.round((entry.closings / entry.prospects) * 100) : 0}%
                                            </div>
                                        </td>

                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 py-1"
                                                value={Number(entry.revenue) === 0 ? '' : entry.revenue} onChange={(e) => handleChange(idx, 'revenue', Number(e.target.value))} />
                                        </td>

                                        {/* Ops Inputs */}
                                        <td className="p-2 border-l border-slate-100">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 py-1"
                                                value={Number(entry.supportTickets) === 0 ? '' : entry.supportTickets} onChange={(e) => handleChange(idx, 'supportTickets', Number(e.target.value))} />
                                        </td>

                                        {/* Task Inputs */}
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 py-1 bg-emerald-50"
                                                value={Number(entry.tasksScheduled) === 0 ? '' : entry.tasksScheduled} onChange={(e) => handleChange(idx, 'tasksScheduled', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-slate-200 rounded focus:ring-2 focus:ring-emerald-500 py-1 font-bold"
                                                value={Number(entry.tasksDone) === 0 ? '' : entry.tasksDone} onChange={(e) => handleChange(idx, 'tasksDone', Number(e.target.value))} />
                                        </td>

                                        {/* Attention Inputs */}
                                        <td className="p-2 border-l border-slate-100 bg-orange-50/20">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 py-1"
                                                value={Number(entry.conversations) === 0 ? '' : entry.conversations} onChange={(e) => handleChange(idx, 'conversations', Number(e.target.value))} />
                                        </td>
                                        <td className="p-2 bg-orange-50/20">
                                            <input type="number" min="0" placeholder="-" className="w-full text-center border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 py-1 font-bold"
                                                value={Number(entry.payments) === 0 ? '' : entry.payments} onChange={(e) => handleChange(idx, 'payments', Number(e.target.value))} />
                                        </td>

                                        {/* Versus Inputs (ReadOnly) */}
                                        <td className="p-2 border-l border-slate-100 bg-purple-50/30">
                                            <div className="w-full text-center py-1 font-medium text-xs">
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
                                        <td className="p-2 border-l border-slate-100 bg-red-50/50 relative">
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (popupInfo?.id === entry.employeeId) setPopupInfo(null);
                                                    else setPopupInfo({ id: entry.employeeId, index: idx, name: entry.name, typeIds: entry.penalizationTypeIds || [] });
                                                }}
                                                className="w-full text-center border border-red-300 bg-red-50 rounded cursor-pointer hover:bg-red-100 py-1 text-red-700 font-bold min-h-[30px] flex items-center justify-center select-none shadow-sm"
                                            >
                                                {(entry.penalizationTypeIds && entry.penalizationTypeIds.length > 0) ? entry.penalizationTypeIds.length : (Number(entry.avoidableTickets) === 0 ? '-' : entry.avoidableTickets)}
                                            </div>

                                            {popupInfo?.id === entry.employeeId && (
                                                <div className="absolute z-[9999] right-[110%] top-0 mr-2 bg-white rounded-xl shadow-2xl border border-red-200 overflow-hidden ring-1 ring-black/5">
                                                    <InlinePenaltyEditor 
                                                        employeeName={popupInfo.name}
                                                        initialPenalizationIds={popupInfo.typeIds}
                                                        onSave={handleSavePenalizations}
                                                        onClose={() => setPopupInfo(null)}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-2 text-center font-bold text-slate-700 border-l bg-slate-50">
                                            {calculateProjectedScore(entry, config, penalizations)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {gamificationAgents.length > 0 && (
                            <tfoot className="bg-slate-50 font-bold text-slate-700 border-t-2 border-slate-200">
                                <tr>
                                    <td className="p-3 sticky left-0 bg-slate-50 border-r z-10"></td>
                                    <td className="p-3 bg-slate-50 border-r z-10 text-right">TOTALES</td>
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
