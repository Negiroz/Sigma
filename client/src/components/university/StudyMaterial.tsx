import { useState } from 'react';
import { BookOpen, Plus, Save, Trash2, Edit, ExternalLink, FileText, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export function StudyMaterial() {
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<any | null>(null);
    
    const [form, setForm] = useState({
        type: 'MATERIAL',
        contextType: '', // Could be used for category
        content: '',     // Title or main text
        options: '',     // Link or detailed content
        active: true,
        creatorId: null as number | null
    });

    const { data: items } = useQuery({
        queryKey: ['studyMaterial', refreshNonce],
        queryFn: async () => {
             const res = await api.get('/dashboard/university/knowledge-base');
             return Array.isArray(res.data) ? res.data.filter((i: any) => i.type === 'MATERIAL') : [];
        }
    });

    const { data: users } = useQuery<any[]>({
        queryKey: ['users-list'],
        queryFn: async () => {
            const res = await api.get('/dashboard/university/users');
            return res.data;
        }
    });

    const handleSave = async () => {
        if (!form.content) return toast.error("El título/contenido es obligatorio");
        
        try {
            if (editing) {
                await api.put(`/dashboard/university/knowledge-base/${editing.id}`, form);
                toast.success("Material actualizado");
            } else {
                await api.post('/dashboard/university/knowledge-base', form);
                toast.success("Material creado");
            }
            setAdding(false);
            setEditing(null);
            setForm({ type: 'MATERIAL', contextType: '', content: '', options: '', active: true, creatorId: null });
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al guardar");
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('¿Eliminar este material de estudio?')) return;
        try {
            await api.delete(`/dashboard/university/knowledge-base/${id}`);
            toast.success("Eliminado");
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const openAdd = () => {
        setForm({ type: 'MATERIAL', contextType: '', content: '', options: '', active: true, creatorId: null });
        setEditing(null);
        setAdding(true);
    };

    const openEdit = (item: any) => {
        setForm({
            type: item.type,
            contextType: item.contextType || '',
            content: item.content || '',
            options: item.options || '',
            active: item.active,
            creatorId: item.creatorId || null
        });
        setEditing(item);
        setAdding(true);
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 rounded-xl">
                            <BookOpen className="text-amber-600 dark:text-amber-400" size={24} />
                        </div>
                        Material de Estudio
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        Gestiona los recursos que los agentes deben estudiar para las evaluaciones.
                    </p>
                </div>
                {!adding && (
                    <button 
                        onClick={openAdd}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        <Plus size={20} />
                        <span>Nuevo Material</span>
                    </button>
                )}
            </div>

            {adding && (
                <div className="glass-card border-indigo-500/30 p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-4">
                        {editing ? 'Modificar' : 'Crear'} Material de Estudio
                    </h3>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Título del Material *</label>
                                <input 
                                    type="text"
                                    value={form.content} 
                                    onChange={e => setForm({...form, content: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold"
                                    placeholder="Ej. Guía de Objeciones 2024"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Categoría / Contexto</label>
                                <select 
                                    value={form.contextType} 
                                    onChange={e => setForm({...form, contextType: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold"
                                >
                                    <option value="">General</option>
                                    <option value="TECNICO">Técnico</option>
                                    <option value="COMERCIAL">Comercial</option>
                                    <option value="PROCESOS">Procesos</option>
                                    <option value="COMPETENCIA">Competencia</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                <input 
                                    type="checkbox" 
                                    id="activeMaterial"
                                    checked={form.active} 
                                    onChange={e => setForm({...form, active: e.target.checked})}
                                    className="w-5 h-5 rounded-lg border-slate-300 bg-white dark:bg-slate-900 accent-indigo-600 transition-all"
                                />
                                <label htmlFor="activeMaterial" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Visible para Agentes</label>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Asignar Autor (Creado por)</label>
                                <select 
                                    value={form.creatorId || ''} 
                                    onChange={e => setForm({...form, creatorId: e.target.value ? parseInt(e.target.value) : null})}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="">-- Seleccionar Autor --</option>
                                    {users?.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.username} ({u.role})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Link o Contenido Detallado</label>
                            <textarea 
                                rows={6}
                                value={form.options} 
                                onChange={e => setForm({...form, options: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                placeholder="Pega un link (HTTP/HTTPS) o escribe las instrucciones detalladas aquí..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-slate-100 dark:border-white/5">
                        <button onClick={() => { setAdding(false); setEditing(null); }} className="px-6 py-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                            <Save size={20} /> <span>{editing ? 'Actualizar' : 'Guardar Material'}</span>
                        </button>
                    </div>
                </div>
            )}

            {!adding && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items?.map((item: any) => (
                        <div key={item.id} className="glass-card p-6 flex flex-col group hover:-translate-y-1 transition-all duration-300 border-indigo-500/5 hover:border-indigo-500/20">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                        item.contextType === 'TECNICO' ? 'bg-blue-500/10 text-blue-600' :
                                        item.contextType === 'COMERCIAL' ? 'bg-emerald-500/10 text-emerald-600' :
                                        item.contextType === 'PROCESOS' ? 'bg-purple-500/10 text-purple-600' :
                                        item.contextType === 'COMPETENCIA' ? 'bg-amber-500/10 text-amber-600' :
                                        'bg-slate-500/10 text-slate-600'
                                    }`}>
                                        {item.contextType || 'General'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 px-2 py-1 rounded-lg">
                                        <Calendar size={12} className="text-slate-400" />
                                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={14} /></button>
                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{item.content}</h4>
                            
                            <div className="flex-grow">
                                {item.options?.startsWith('http') ? (
                                    <a 
                                        href={item.options} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:underline"
                                    >
                                        <ExternalLink size={14} /> Abrir Recurso Externo
                                    </a>
                                ) : (
                                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 italic">
                                        {item.options || 'Sin descripción detallada.'}
                                    </p>
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                        item.active 
                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                                    }`}>
                                        {item.active ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold italic">
                                        Por: {item.creator?.username || 'Sistema'}
                                    </span>
                                </div>
                                {!item.options?.startsWith('http') && item.options && (
                                    <button 
                                        onClick={() => openEdit(item)}
                                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1"
                                    >
                                        <FileText size={12} /> Leer Más
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {items?.length === 0 && (
                        <div className="md:col-span-2 lg:col-span-3 py-20 text-center glass-card border-dashed">
                            <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                            <p className="text-slate-400 font-medium">No hay material de estudio registrado aún.</p>
                            <button onClick={openAdd} className="mt-4 text-indigo-600 font-bold hover:underline">¡Crea el primero!</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
