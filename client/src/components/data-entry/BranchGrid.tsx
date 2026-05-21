import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Save, Loader } from 'lucide-react';

interface BranchGridProps {
    month: number;
    year: number;
    companyId: number | null;
}

interface BranchEntry {
    branchId: number;
    name: string;
    activeClients: number;
    churnRate: number;
    installationGoal: number;
    billingGoal?: number;
}

export default function BranchGrid({ month, year, companyId }: BranchGridProps) {
    const queryClient = useQueryClient();
    const [entries, setEntries] = useState<BranchEntry[]>([]);
    const [hasChanges, setHasChanges] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['branchEntries', month, year, companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await api.get('/dashboard/data-entry/branches', {
                params: { month, year, companyId }
            });
            return res.data as BranchEntry[];
        },
        enabled: !!companyId
    });

    useEffect(() => {
        if (data) {
            setEntries(data);
            setHasChanges(false);
        }
    }, [data]);

    const updatemutation = useMutation({
        mutationFn: async () => {
            if (!companyId) throw new Error('No company selected');
            await api.post('/dashboard/data-entry/branches', {
                month,
                year,
                branchData: entries
            });
        },
        onSuccess: () => {
            toast.success('Datos de sedes actualizados');
            queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
            setHasChanges(false);
        },
        onError: () => {
            toast.error('Error al guardar datos de sedes');
        }
    });

    const handleChange = (index: number, field: keyof BranchEntry, value: number) => {
        const newEntries = [...entries];
        // @ts-ignore
        newEntries[index][field] = value;
        setEntries(newEntries);
        setHasChanges(true);
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500">Cargando sedes...</div>;
    if (!companyId) return <div className="p-8 text-center text-slate-500">Seleccione una empresa</div>;
    if (entries.length === 0) return <div className="p-8 text-center text-slate-500">No hay sedes registradas para esta empresa.</div>;

    const totalInstallations = entries.reduce((sum, entry) => sum + (Number(entry.installationGoal) || 0), 0);
    const totalBilling = entries.reduce((sum, entry) => sum + (Number(entry.billingGoal) || 0), 0);
    const totalClients = entries.reduce((sum, entry) => sum + (Number(entry.activeClients) || 0), 0);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Metas Mensuales por Sede - {month}/{year}</h3>
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
                            <th className="p-4 font-semibold uppercase tracking-wider">Sede</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-40">Meta Instalaciones</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-40">Meta Facturación</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-40">Clientes Activos</th>
                            <th className="p-4 font-semibold uppercase tracking-wider w-40">Churn Rate %</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {entries.map((entry, idx) => (
                            <tr key={entry.branchId} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-800">{entry.name}</td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="-"
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right"
                                        value={Number(entry.installationGoal) === 0 ? '' : entry.installationGoal}
                                        onChange={(e) => handleChange(idx, 'installationGoal', Number(e.target.value))}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="-"
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right"
                                        // @ts-ignore
                                        value={Number(entry.billingGoal) === 0 ? '' : entry.billingGoal}
                                        // @ts-ignore
                                        onChange={(e) => handleChange(idx, 'billingGoal', Number(e.target.value))}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="-"
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right"
                                        value={Number(entry.activeClients) === 0 ? '' : entry.activeClients}
                                        onChange={(e) => handleChange(idx, 'activeClients', Number(e.target.value))}
                                    />
                                </td>
                                <td className="p-4">
                                    <input
                                        type="number"
                                        step="0.1"
                                        placeholder="-"
                                        className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 text-right"
                                        value={Number(entry.churnRate) === 0 ? '' : entry.churnRate}
                                        onChange={(e) => handleChange(idx, 'churnRate', Number(e.target.value))}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                        <tr>
                            <td className="p-4 text-right">TOTALES:</td>
                            <td className="p-4 text-right pr-6">{totalInstallations.toLocaleString('en-US')}</td>
                            <td className="p-4 text-right pr-6">{totalBilling.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                            <td className="p-4 text-right pr-6">{totalClients.toLocaleString('en-US')}</td>
                            <td className="p-4 text-center text-slate-400">-</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
