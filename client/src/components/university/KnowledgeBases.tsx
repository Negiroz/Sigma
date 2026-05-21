import { useState } from 'react';
import { Database, Plus, Save, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export function KnowledgeBases() {
    const { user } = useAuth();
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [adding, setAdding] = useState<'CASE' | 'QUESTION' | null>(null);
    const [editing, setEditing] = useState<any | null>(null);
    
    const [form, setForm] = useState({
        type: 'CASE',
        contextType: '',
        content: '',
        options: '',
        active: true,
        creatorId: null as number | null
    });

    const { data: items } = useQuery({
        queryKey: ['knowledgeBase', refreshNonce],
        queryFn: async () => {
             const res = await api.get('/dashboard/university/knowledge-base');
             return res.data;
        }
    });

    const { data: competitorsData } = useQuery<string[]>({
        queryKey: ['competitors-list', user?.companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/university/competitors?onlyActive=true&companyId=${user?.companyId || ''}`);
            const names = Array.from(new Set(res.data.map((c: any) => c.name))) as string[];
            return names;
        }
    });

    const { data: users } = useQuery<any[]>({
        queryKey: ['users-list'],
        queryFn: async () => {
            const res = await api.get('/dashboard/university/users');
            return res.data;
        }
    });

    const cases = Array.isArray(items) ? items.filter((i: any) => i.type === 'CASE') : [];
    const questions = Array.isArray(items) ? items.filter((i: any) => i.type === 'QUESTION') : [];

    if (items && !Array.isArray(items)) {
        console.error("Knowledge base items fetched but not an array:", items);
    }

    const handleSave = async () => {
        if (!form.content) return toast.error("El contenido es obligatorio");
        
        try {
            if (editing) {
                await api.put(`/dashboard/university/knowledge-base/${editing.id}`, form);
                toast.success("Actualizado");
            } else {
                await api.post('/dashboard/university/knowledge-base', form);
                toast.success("Creado");
            }
            setAdding(null);
            setEditing(null);
            setForm({ type: 'CASE', contextType: '', content: '', options: '', active: true, creatorId: null });
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al guardar");
        }
    };

    const handleDelete = async (id: number) => {
        if(!confirm('¿Eliminar este registro?')) return;
        try {
            await api.delete(`/dashboard/university/knowledge-base/${id}`);
            toast.success("Eliminado");
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al eliminar");
        }
    };

    const openAdd = (type: 'CASE' | 'QUESTION') => {
        setForm({ type, contextType: '', content: '', options: '', active: true, creatorId: user?.id || null });
        setEditing(null);
        setAdding(type);
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
        setAdding(item.type);
    };

    const currentList = adding === 'CASE' ? cases : questions;
    const currentIndex = editing ? currentList.findIndex((i: any) => i.id === editing.id) : -1;

    const navigateRecords = (direction: 'prev' | 'next') => {
        if (!editing) return;
        let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= 0 && nextIndex < currentList.length) {
            openEdit(currentList[nextIndex]);
        }
    };

    const renderTable = (data: any[], title: string, type: 'CASE' | 'QUESTION') => {
        // Group data by creator
        const grouped = data.reduce((acc: any, item: any) => {
            const creatorName = item.creator?.username || 'Sistema';
            if (!acc[creatorName]) acc[creatorName] = [];
            acc[creatorName].push(item);
            return acc;
        }, {});

        return (
            <div className="glass-card overflow-hidden transition-all duration-300 hover:border-indigo-500/30 group">
                <div className="bg-white/50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                            <Database className="text-indigo-600 dark:text-indigo-400" size={18} />
                        </div>
                        {title}
                        <span className="ml-1 text-sm bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
                            {data.length}
                        </span>
                    </h3>
                    <button onClick={() => openAdd(type)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                        <Plus size={16} /> <span>Añadir</span>
                    </button>
                </div>
                <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-none relative">
                    <table className="w-full text-sm text-left min-w-[600px]">
                        <thead className="text-[10px] text-slate-500 dark:text-slate-500 bg-slate-50/95 dark:bg-slate-950/95 font-black uppercase tracking-[0.2em] sticky top-0 z-20 backdrop-blur-sm">
                            <tr>
                                <th className="px-4 py-4">Contenido</th>
                                {type === 'CASE' && <th className="px-4 py-4 w-[140px]">Competidor</th>}
                                {type === 'QUESTION' && <th className="px-4 py-4 w-[140px]">Respuesta</th>}
                                <th className="px-4 py-4 w-[70px]">Estado</th>
                                <th className="px-4 py-4 w-[90px] text-right sticky right-0 z-30 bg-slate-50 dark:bg-slate-950 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {Object.entries(grouped).map(([creatorName, creatorItems]: [string, any]) => (
                                <GroupedRows 
                                    key={creatorName} 
                                    creatorName={creatorName} 
                                    items={creatorItems} 
                                    type={type}
                                    openEdit={openEdit}
                                    handleDelete={handleDelete}
                                />
                            ))}
                            {data.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-light italic">No hay registros vinculados</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Helper component for grouped rows with local collapse state
    function GroupedRows({ creatorName, items, type, openEdit, handleDelete }: any) {
        const [expanded, setExpanded] = useState(false);
        
        return (
            <>
                <tr 
                    onClick={() => setExpanded(!expanded)}
                    className="bg-slate-50/50 dark:bg-white/[0.02] cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-white/[0.05] transition-colors"
                >
                    <td colSpan={type === 'CASE' ? 4 : 3} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className={`transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
                                <ChevronRight size={16} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black uppercase">
                                    {creatorName.charAt(0)}
                                </div>
                                <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                                    {creatorName}
                                </span>
                                <span className="text-[10px] bg-slate-200 dark:bg-white/10 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">
                                    {items.length} {items.length === 1 ? 'registro' : 'registros'}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td className="px-4 py-3 text-right sticky right-0 z-10 bg-slate-50/50 dark:bg-slate-900 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)]">
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            {expanded ? 'Contraer' : 'Expandir'}
                        </span>
                    </td>
                </tr>
                {expanded && items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.01] transition-colors group/row">
                        <td className="px-8 py-3 text-slate-600 dark:text-slate-300 truncate max-w-0 font-medium" title={item.content}>
                            {item.content}
                        </td>
                        {type === 'CASE' && (
                            <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-medium truncate italic text-xs">
                                {item.contextType?.replace('CLIENTE DE COMPETIDOR: ', '') || 'Nuevo'}
                            </td>
                        )}
                        {type === 'QUESTION' && <td className="px-4 py-3 text-slate-500 dark:text-slate-400 truncate text-xs" title={item.options || ''}>{item.options || '-'}</td>}
                        <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${item.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                {item.active ? 'Act' : 'Inac'}
                            </span>
                        </td>
                        <td className="px-4 py-3 text-right sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover/row:bg-indigo-50/30 dark:group-hover/row:bg-white/[0.02] shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.1)]">
                            <div className="flex justify-end space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(item); }} className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all active:scale-90"><Edit size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg transition-all active:scale-90"><Trash2 size={12} /></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
            
            {adding && (
                <div className="glass-card border-indigo-500/30 p-8 space-y-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            {editing ? 'Modificar' : 'Nuevo'} Registro - {adding === 'CASE' ? 'Escenario de Cliente' : 'Cuestionario de Ventas'}
                        </h3>
                        {editing && (
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1">
                                    Registro {currentIndex + 1} de {currentList.length}
                                </span>
                                <div className="flex items-center bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5">
                                    <button 
                                        onClick={() => navigateRecords('prev')}
                                        disabled={currentIndex <= 0}
                                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                                        title="Anterior"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                                    <button 
                                        onClick={() => navigateRecords('next')}
                                        disabled={currentIndex >= currentList.length - 1}
                                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-sm rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed active:scale-90"
                                        title="Siguiente"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Contenido (Pregunta o Escenario) *</label>
                            <textarea 
                                rows={4}
                                value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                placeholder={adding === 'CASE' ? 'Ej. Cliente indica que la fibra óptica le da miedo...' : 'Ej. ¿Cuáles son nuestras promociones actuales?'}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {adding === 'CASE' ? (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Contexto del Escenario *</label>
                                    <select 
                                        value={form.contextType} 
                                        onChange={e => setForm({...form, contextType: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">-- Seleccionar Contexto --</option>
                                        <option value="CLIENTE NUEVO">CLIENTE NUEVO</option>
                                        {competitorsData?.map((name) => (
                                            <option key={name} value={`CLIENTE DE COMPETIDOR: ${name}`}>
                                                CLIENTE DE COMPETIDOR: {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Respuesta de Referencia</label>
                                    <input 
                                        type="text" value={form.options} onChange={e => setForm({...form, options: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all"
                                        placeholder="Ingrese la respuesta correcta o guía para el evaluador..."
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                                <input 
                                    type="checkbox" 
                                    id="activeCheckbox"
                                    checked={form.active} 
                                    onChange={e => setForm({...form, active: e.target.checked})}
                                    className="w-5 h-5 rounded-lg border-slate-300 bg-white dark:bg-slate-900 accent-indigo-600 transition-all"
                                />
                                <label htmlFor="activeCheckbox" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Activo (Habilitar para sorteos)</label>
                            </div>

                            <div>
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
                    </div>

                    <div className="flex justify-end space-x-4 pt-6 border-t border-slate-100 dark:border-white/5">
                        <button onClick={() => { setAdding(null); setEditing(null); }} className="px-6 py-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-indigo-500/20 active:scale-95">
                            <Save size={20} /> <span>Guardar Registro</span>
                        </button>
                    </div>
                </div>
            )}

            {!adding && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                    {renderTable(cases, 'Simulaciones (Cliente)', 'CASE')}
                    {renderTable(questions, 'Evaluaciones (Vendedor)', 'QUESTION')}
                </div>
            )}
        </div>
    );
}
