import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader, Calendar } from 'lucide-react';

interface DailyBranchMetric {
    branchId: number;
    name: string;
    installations: number;
    invoices: number;
    revenue: number;
}

interface DailyBranchGridProps {
    companyId: number | null;
}

export default function DailyBranchGrid({ companyId }: DailyBranchGridProps) {
    const queryClient = useQueryClient();
    // Default to today
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [entries, setEntries] = useState<DailyBranchMetric[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['dailyBranchMetrics', selectedDate, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/branches-daily', {
                params: { date: selectedDate, companyId }
            });
            return res.data as DailyBranchMetric[];
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
            await api.post('/dashboard/data-entry/branches-daily', {
                date: selectedDate,
                companyId,
                metrics: entries
            });
        },
        onSuccess: () => {
            toast.success('Métricas diarias de sedes guardadas');
            queryClient.invalidateQueries({ queryKey: ['dailyBranchMetrics'] });
            queryClient.invalidateQueries({ queryKey: ['branchEntries'] }); // Refresh monthly agg if viewing
            setHasChanges(false);
        },
        onError: () => {
            toast.error('Error al guardar métricas de sedes');
        }
    });

    const handleChange = (index: number, field: keyof DailyBranchMetric, value: number) => {
        const newEntries = [...entries];
        // @ts-ignore
        newEntries[index][field] = value;
        setEntries(newEntries);
        setHasChanges(true);
    };

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

                <button
                    onClick={() => updateMutation.mutate()}
                    disabled={!hasChanges || updateMutation.isPending}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                    {updateMutation.isPending ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>Guardar Día</span>
                </button>
            </div>

            {/* Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                                <th className="p-4 font-semibold uppercase tracking-wider">Sede</th>
                                <th className="p-4 font-semibold uppercase tracking-wider w-40 text-center">Instalaciones</th>
                                <th className="p-4 font-semibold uppercase tracking-wider w-32 text-center">Facturas</th>
                                <th className="p-4 font-semibold uppercase tracking-wider w-48 text-center">Ventas / Ingresos ($)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400">No hay sedes registradas.</td>
                                </tr>
                            )}
                            {entries.map((entry, idx) => (
                                <tr key={entry.branchId} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-slate-800">{entry.name}</td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 text-center font-bold text-slate-800"
                                            value={Number(entry.installations) === 0 ? '' : entry.installations}
                                            onChange={(e) => handleChange(idx, 'installations', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="-"
                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 text-center font-bold text-slate-800"
                                            value={Number(entry.invoices) === 0 ? '' : entry.invoices}
                                            onChange={(e) => handleChange(idx, 'invoices', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-4">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="-"
                                            className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 text-center font-mono text-slate-700"
                                            value={Number(entry.revenue) === 0 ? '' : entry.revenue}
                                            onChange={(e) => handleChange(idx, 'revenue', Number(e.target.value))}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
