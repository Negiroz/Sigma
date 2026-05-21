import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, AlertOctagon } from 'lucide-react';

export default function PenalizationSettings() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'CLOSER' | 'AGENT'>('CLOSER');
    
    const { data: penalizations } = useQuery({
        queryKey: ['penalizationTypes', activeTab],
        queryFn: async () => (await api.get('/dashboard/admin/penalization-types', { params: { role: activeTab } })).data
    });

    const [form, setForm] = useState({ name: '', pointsCost: 0, severity: 'LOW' });
    const [editingId, setEditingId] = useState<number | null>(null);

    const createMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/dashboard/admin/penalization-types', { ...data, targetRole: activeTab }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['penalizationTypes'] });
            setForm({ name: '', pointsCost: 0, severity: 'LOW' });
            toast.success('Penalización creada');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number, data: any }) => await api.put(`/dashboard/admin/penalization-types/${id}`, { ...data, targetRole: activeTab }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['penalizationTypes'] });
            setEditingId(null);
            setForm({ name: '', pointsCost: 0, severity: 'LOW' });
            toast.success('Penalización actualizada');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/penalization-types/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['penalizationTypes'] });
            toast.success('Penalización eliminada');
        }
    });

    const handleSave = () => {
        if (!form.name || form.pointsCost === 0) return toast.error('El nombre y los puntos a deducir son requeridos (deben ser menor a 0 o mayor a 0)');
        
        // Ensure pointsCost is a negative number for display logic sanity, or positive if that's how we store it.
        // It's subtracted in backend, so storing absolute value is best.
        if (editingId) {
            updateMutation.mutate({ id: editingId, data: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const handleEdit = (p: any) => {
        setEditingId(p.id);
        setForm({ name: p.name, pointsCost: p.pointsCost, severity: p.severity });
    };

    return (
        <div className="glass-card p-6">
            <div className="flex space-x-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('CLOSER')}
                    className={`pb-2 px-2 font-medium transition-colors ${activeTab === 'CLOSER' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Agentes Integrales
                </button>
                <button
                    onClick={() => setActiveTab('AGENT')}
                    className={`pb-2 px-2 font-medium transition-colors ${activeTab === 'AGENT' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Agentes de Campo
                </button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Catálogo de Penalizaciones ({activeTab === 'CLOSER' ? 'Integrales' : 'Campo'})</h3>
                    <p className="text-sm text-slate-500">Administra las razones por las cuales se restan puntos a los agentes.</p>
                </div>
                
                <div className="flex bg-slate-50 p-2 rounded-lg border border-slate-200 mt-4 md:mt-0 gap-2 items-center">
                    <input 
                        type="text" 
                        placeholder="Nombre ej. Cita Pérdida" 
                        value={form.name} 
                        onChange={(e) => setForm({...form, name: e.target.value})} 
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm w-48" 
                    />
                    <input 
                        type="number" 
                        placeholder="Pts deducidos ej. 50" 
                        value={form.pointsCost || ''} 
                        onChange={(e) => setForm({...form, pointsCost: Number(e.target.value)})} 
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm w-32" 
                    />
                    <select 
                        value={form.severity} 
                        onChange={(e) => setForm({...form, severity: e.target.value})} 
                        className="bg-white border border-slate-300 rounded-lg px-3 py-2 outline-none text-sm"
                    >
                        <option value="LOW">Baja (LOW)</option>
                        <option value="MEDIUM">Media (MEDIUM)</option>
                        <option value="HIGH">Alta (HIGH)</option>
                        <option value="CRITICAL">Crítica (CRITICAL)</option>
                    </select>

                    <button 
                        onClick={handleSave} 
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors flex items-center justify-center"
                        title={editingId ? "Guardar Cambios" : "Agregar Penalización"}
                    >
                        {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                    </button>
                    {editingId && (
                        <button 
                            onClick={() => { setEditingId(null); setForm({ name: '', pointsCost: 0, severity: 'LOW' }); }} 
                            className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
                        >
                            <Plus size={20} className="rotate-45" />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {penalizations?.map((p: any) => (
                    <div key={p.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-red-300 transition-colors">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${p.severity === 'HIGH' || p.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : p.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                <AlertOctagon size={18} />
                            </div>
                            <div>
                                <span className="font-semibold text-slate-700 block">{p.name}</span>
                                <span className="text-xs text-red-500 font-bold">-{p.pointsCost} pts</span>
                            </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleEdit(p)}
                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                title="Modificar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm(`¿Eliminar la penalización ${p.name}? No se puede borrar si ya fue asignada.`)) {
                                        deleteMutation.mutate(p.id);
                                    }
                                }}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
