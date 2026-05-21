import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader } from 'lucide-react';

interface EmployeeGridProps {
    month: number;
    year: number;
    companyId: number | null;
}

interface EmployeeEntry {
    employeeId: number;
    name: string;
    role: string;
    closings: number;
    prospects: number;
    reactivations: number;
    equipmentRemovals: number;
    closingGoal: number;
    prospectGoal: number;
    reactivationGoal: number;
    equipmentRemovalGoal: number;
    conversionGoal: number;
}

export default function EmployeeGrid({ month, year, companyId }: EmployeeGridProps) {
    const queryClient = useQueryClient();
    const [entries, setEntries] = useState<EmployeeEntry[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    // Track which employee IDs were actually modified by the user
    const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());

    const { data, isLoading } = useQuery({
        queryKey: ['employeeEntries', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/employees', {
                params: { month, year, companyId }
            });
            return res.data as EmployeeEntry[];
        },
        enabled: !!companyId
    });

    useEffect(() => {
        if (data) {
            setEntries(data.filter((e: EmployeeEntry) => e.role === 'AGENT'));
            setHasChanges(false);
            setDirtyIds(new Set()); // Reset dirty tracking on fresh data
        }
    }, [data]);

    const updatemutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company selected');
            // CRITICAL FIX: Only send entries that were actually modified by the user.
            // This prevents zero-value overwrites on untouched records.
            const changedEntries = entries.filter(e => dirtyIds.has(e.employeeId));

            if (changedEntries.length === 0) {
                toast('No hay cambios para guardar', { icon: 'ℹ️' });
                return;
            }

            console.log('Sending Performance Data (dirty only):', {
                companyId,
                month: Number(month),
                year: Number(year),
                performanceData: changedEntries
            });
            await api.post('/dashboard/data-entry/employees', {
                month,
                year,
                performanceData: changedEntries
            });
        },
        onSuccess: () => {
            toast.success('Datos de rendimiento actualizados');
            queryClient.invalidateQueries({ queryKey: ['employeeEntries', month, year, companyId] });
            queryClient.invalidateQueries({ queryKey: ['dailyMerit'] });
            queryClient.invalidateQueries({ queryKey: ['monthlyMerit'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            queryClient.refetchQueries({ queryKey: ['employeeEntries', month, year, companyId] });
            setHasChanges(false);
            setDirtyIds(new Set());
        },
        onError: () => {
            toast.error('Error al guardar datos');
        }
    });

    const handleChange = (index: number, field: keyof EmployeeEntry, value: number) => {
        const newEntries = [...entries];
        // @ts-ignore
        newEntries[index][field] = value;
        setEntries(newEntries);
        setHasChanges(true);
        // Mark this employee as dirty (modified)
        const employeeId = newEntries[index].employeeId;
        setDirtyIds(prev => new Set(prev).add(employeeId));
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando empleados...</div>;
    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;
    if (entries.length === 0) return <div className="p-8 text-center text-slate-500">No hay empleados activos en esta empresa.</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Rendimiento de Equipo - {month}/{year}</h3>
                <button
                    onClick={() => updatemutation.mutate()}
                    disabled={!hasChanges || updatemutation.isPending}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                    {updatemutation.isPending ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>Guardar Cambios</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                            <th className="p-4 font-semibold uppercase tracking-wider">Empleado</th>
                            <th className="p-4 font-semibold uppercase tracking-wider">Rol</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-32">Meta Cierres</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-32">Meta Prosp</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-32">Meta Recuperación</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-32">Meta Conv (%)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.map((entry) => {
                            const idx = entries.findIndex(e => e.employeeId === entry.employeeId);
                            const isDirty = dirtyIds.has(entry.employeeId);
                            return (
                                <tr key={entry.employeeId} className={`hover:bg-slate-50 transition-colors ${isDirty ? 'bg-blue-50/30' : ''}`}>
                                    <td className="p-4 font-medium text-slate-800 flex items-center gap-2">
                                        {entry.name}
                                        {isDirty && <span className="text-[10px] text-blue-500 font-bold uppercase bg-blue-100 px-1.5 py-0.5 rounded">Modificado</span>}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                            Agente de Campo
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white"
                                            value={Number(entry.closingGoal) === 0 ? '' : entry.closingGoal}
                                            onChange={(e) => handleChange(idx, 'closingGoal', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right bg-white"
                                            value={Number(entry.prospectGoal) === 0 ? '' : entry.prospectGoal}
                                            onChange={(e) => handleChange(idx, 'prospectGoal', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            className="w-full p-2 border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 text-right bg-blue-50/20 font-bold text-blue-800"
                                            value={!entry.reactivationGoal && !entry.equipmentRemovalGoal ? '' : (entry.reactivationGoal || entry.equipmentRemovalGoal || 0)}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                handleChange(idx, 'reactivationGoal', val);
                                                handleChange(idx, 'equipmentRemovalGoal', val);
                                            }}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="ej. 20"
                                                className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right pr-6 bg-white"
                                                value={!entry.conversionGoal ? '' : Math.round(Number(entry.conversionGoal) * 100)}
                                                onChange={(e) => handleChange(idx, 'conversionGoal', Number(e.target.value) / 100)}
                                            />
                                            <span className="absolute right-2 top-2 text-slate-400 text-xs">%</span>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
