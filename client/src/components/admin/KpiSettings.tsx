import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Calendar, Settings as SettingsIcon, Users, MapPin } from 'lucide-react';

export default function KpiSettings() {
    const queryClient = useQueryClient();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const { data: config } = useQuery({
        queryKey: ['kpiConfig', month, year],
        queryFn: async () => (await api.get(`/dashboard/admin/kpi-config`, { params: { month, year } })).data
    });

    const [form, setForm] = useState({
        // Agentes Integrales
        supportTickets: 6,
        tasksDone: 2,
        payments: 0.5,
        conversations: 0.2,
        closings: 30,
        revenueDivider: 10,
        // Agentes de Campo
        agentClosingPoints: 300,
        agentProspectPoints: 50,
        agentConversionPoints: 50,
        agentReactivationPoints: 100,
        agentEquipmentPoints: 100,
        agentPenaltyPoints: 30,
    });

    useEffect(() => {
        if (config && config.id) {
            setForm({
                supportTickets: config.supportTickets ?? 6,
                tasksDone: config.tasksDone ?? 2,
                payments: config.payments ?? 0.5,
                conversations: config.conversations ?? 0.2,
                closings: config.closings ?? 30,
                revenueDivider: config.revenueDivider ?? 10,
                agentClosingPoints: config.agentClosingPoints ?? 300,
                agentProspectPoints: config.agentProspectPoints ?? 50,
                agentConversionPoints: config.agentConversionPoints ?? 50,
                agentReactivationPoints: config.agentReactivationPoints ?? 100,
                agentEquipmentPoints: config.agentEquipmentPoints ?? 100,
                agentPenaltyPoints: config.agentPenaltyPoints ?? 30,
            });
        }
    }, [config, month, year]);

    const saveMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/dashboard/admin/kpi-config', { ...data, month, year }),
        onSuccess: () => {
            toast.success('Configuración de KPIs guardada');
            queryClient.invalidateQueries({ queryKey: ['kpiConfig'] });
        },
        onError: () => {
            toast.error('Error al guardar la configuración');
        }
    });

    const field = (label: string, key: keyof typeof form, step = 0.1) => (
        <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            <input
                type="number"
                step={step}
                value={form[key]}
                onChange={e => setForm({ ...form, [key]: Number(e.target.value) })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
        </div>
    );

    return (
        <div className="glass-card p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Valores de KPI</h3>
                    <p className="text-sm text-slate-500">Configura los puntos otorgados por cada KPI en un periodo específico.</p>
                </div>
                <div className="flex bg-slate-50 p-2 rounded-lg border border-slate-200 mt-4 md:mt-0 gap-2">
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</option>
                        ))}
                    </select>
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none">
                        {Array.from({ length: 10 }, (_, i) => 2024 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Sección: Agentes Integrales */}
            <div className="rounded-xl border border-blue-200 overflow-hidden">
                <div className="bg-blue-50 px-4 py-3 flex items-center gap-2 border-b border-blue-200">
                    <Users size={16} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-blue-800 uppercase tracking-wide">Agentes Integrales (CLOSER)</h4>
                    <span className="text-xs text-blue-500 ml-auto">Puntos por actividad directa</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50">
                    {field('Cierres Instalados (pts c/u)', 'closings', 1)}
                    {field('Divisor de Ingresos ($X = 1 pt)', 'revenueDivider', 1)}
                    {field('Soportes Resueltos (pts c/u)', 'supportTickets', 0.1)}
                    {field('Soportes Escalados (pts c/u)', 'tasksDone', 0.1)}
                    {field('Pagos Recaudados (pts c/u)', 'payments', 0.1)}
                    {field('Conversaciones Abiertas (pts c/u)', 'conversations', 0.1)}
                </div>
            </div>

            {/* Sección: Agentes de Campo */}
            <div className="rounded-xl border border-emerald-200 overflow-hidden">
                <div className="bg-emerald-50 px-4 py-3 flex items-center gap-2 border-b border-emerald-200">
                    <MapPin size={16} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Agentes de Campo (AGENT)</h4>
                    <span className="text-xs text-emerald-500 ml-auto">Puntos base al lograr el 100% de cada meta</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50">
                    {field('Ventas / Cierres (pts al 100%)', 'agentClosingPoints', 1)}
                    {field('Prospectos (pts al 100%)', 'agentProspectPoints', 1)}
                    {field('Conversión (pts al 100%)', 'agentConversionPoints', 1)}
                    {field('Reactivaciones (pts al 100%)', 'agentReactivationPoints', 1)}
                    {field('Retiro de Equipo (pts al 100%)', 'agentEquipmentPoints', 1)}
                    <div>
                        <label className="block text-xs font-semibold text-red-600 mb-1">Penalización CRM (pts deducidos c/u)</label>
                        <input
                            type="number"
                            step={1}
                            value={form.agentPenaltyPoints}
                            onChange={e => setForm({ ...form, agentPenaltyPoints: Number(e.target.value) })}
                            className="w-full bg-white border border-red-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 text-red-700 font-bold"
                        />
                    </div>
                </div>
                <div className="px-4 py-3 bg-emerald-50/50 border-t border-emerald-100">
                    <p className="text-xs text-emerald-600 italic">
                        💡 Los puntos se calculan en base al % de la meta alcanzada. Superar el 100% de la meta otorga más puntos de manera proporcional.
                    </p>
                </div>
            </div>

            {/* Guardar */}
            <div className="flex justify-end">
                <button
                    onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                    <SettingsIcon size={18} />
                    Guardar Configuración
                </button>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                <div className="text-orange-500 mt-0.5"><Calendar size={20} /></div>
                <div className="text-sm text-orange-800">
                    <strong>¡Atención!</strong> Guardar cambios aquí modificará de forma permanente cómo se calculan los puntos de este mes específico en adelante (hasta que cambien de nuevo). Cálculos pasados ya están cerrados.
                </div>
            </div>
        </div>
    );
}
