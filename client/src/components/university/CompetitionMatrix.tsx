import { useState, useMemo } from 'react';
import { Target, Plus, Save, Server, Route, Edit, ChevronDown, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export function CompetitionMatrix() {
    const { user } = useAuth();
    const [adding, setAdding] = useState(false);
    
    const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

    const toggleCard = (name: string) => {
        setExpandedCards(prev => ({ ...prev, [name]: !prev[name] }));
    };
    
    // Refresh mechanism
    const [refreshNonce, setRefreshNonce] = useState(0);

    const [form, setForm] = useState({
        name: '',
        branchIds: [] as string[],
        active: true,
        installPrice: '',
        equipment: '',
        promo: '',
        offers: [{ bandwidth: '', price: '' }]
    });

    const { data: competitors, isLoading } = useQuery({
        queryKey: ['competitors', user?.companyId, refreshNonce],
        queryFn: async () => {
             const res = await api.get(`/dashboard/university/competitors?companyId=${user?.companyId || ''}`);
             return res.data;
        }
    });

    const { data: branches } = useQuery({
        queryKey: ['branches', user?.companyId],
        queryFn: async () => {
             const res = await api.get(`/dashboard/admin/branches?companyId=${user?.companyId || ''}`);
             return res.data;
        }
    });

    const groupedCompetitors = useMemo(() => {
        if (!competitors) return [];
        const groups: Record<string, any> = {};
        
        competitors.forEach((c: any) => {
             if (!groups[c.name]) {
                  const first = c.offers?.[0] || {};
                  groups[c.name] = {
                      name: c.name,
                      active: c.active,
                      branches: [],
                      installPrice: first.installPrice,
                      equipment: first.equipment,
                      promo: first.promo,
                      offers: c.offers || [],
                      lastUpdate: first.updatedAt || null
                  };
             }
             
             if (c.branch) {
                 groups[c.name].branches.push({ id: c.branchId, name: c.branch.name });
             }
             
             // Keep the most recent lastUpdate
             const cUpdate = c.offers?.[0]?.updatedAt;
             if (cUpdate) {
                 if (!groups[c.name].lastUpdate || new Date(cUpdate) > new Date(groups[c.name].lastUpdate)) {
                     groups[c.name].lastUpdate = cUpdate;
                 }
             }
        });

        return Object.values(groups);
    }, [competitors]);

    const addOfferRow = () => {
        setForm(prev => ({
            ...prev,
            offers: [...prev.offers, { bandwidth: '', price: '' }]
        }));
    };

    const updateOffer = (index: number, field: string, value: string) => {
        const newOffers = [...form.offers];
        newOffers[index] = { ...newOffers[index], [field]: value };
        setForm({ ...form, offers: newOffers });
    };

    const toggleBranch = (id: string) => {
        setForm(prev => {
            const exists = prev.branchIds.includes(id);
            return {
                ...prev,
                branchIds: exists ? prev.branchIds.filter(b => b !== id) : [...prev.branchIds, id]
            };
        });
    };

    const openEdit = (compGroup: any) => {
        setForm({
            name: compGroup.name,
            active: compGroup.active,
            branchIds: compGroup.branches.map((b: any) => String(b.id)),
            installPrice: compGroup.installPrice ? String(compGroup.installPrice) : '',
            equipment: compGroup.equipment ? String(compGroup.equipment) : '',
            promo: compGroup.promo ? String(compGroup.promo) : '',
            offers: compGroup.offers.length > 0 ? compGroup.offers : [{ bandwidth: '', price: '' }]
        });
        setAdding(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submitCompetitor = async () => {
        if (!form.name || form.branchIds.length === 0) return toast.error("Nombre y al menos una Sede son obligatorios");

        try {
            await api.post('/dashboard/university/competitors', {
                name: form.name,
                active: form.active,
                installPrice: form.installPrice,
                equipment: form.equipment,
                promo: form.promo,
                offers: form.offers,
                branchIds: form.branchIds
            });
            
            toast.success("Competidor guardado exitosamente");
            setAdding(false);
            setForm({
                name: '', branchIds: [], active: true,
                installPrice: '', equipment: '', promo: '',
                offers: [{ bandwidth: '', price: '' }]
            });
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al guardar competidor");
        }
    };

    const handleDeleteCompetitor = async (name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al ISP "${name}" por completo? Esta acción no se puede deshacer.`)) return;
        
        try {
            await api.delete(`/dashboard/university/competitors?name=${encodeURIComponent(name)}&companyId=${user?.companyId || ''}`);
            toast.success("ISP eliminado correctamente");
            setRefreshNonce(n => n + 1);
        } catch (error) {
            toast.error("Error al eliminar el ISP");
            console.error(error);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center glass-card p-8 border-rose-500/10 dark:border-rose-500/20 gap-6">
                <div>
                    <h2 className="text-2xl font-black flex items-center text-slate-900 dark:text-white gap-3">
                        <div className="p-2 bg-rose-500/10 rounded-xl">
                            <Target className="text-rose-600 dark:text-rose-400" size={24} />
                        </div>
                        Matriz de Competencia
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-light">Análisis estratégico de ofertas y planes de otros proveedores (ISP).</p>
                </div>
                {!adding && (
                    <button onClick={() => {
                        setForm({
                            name: '', branchIds: [], active: true,
                            installPrice: '', equipment: '', promo: '',
                            offers: [{ bandwidth: '', price: '' }]
                        });
                        setAdding(true);
                    }} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95">
                        <Plus size={20} /> <span>Agregar ISP</span>
                    </button>
                )}
            </div>

            {adding && (
                <div className="glass-card border-rose-500/30 p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                        <h3 className="text-lg font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest">{form.name ? 'Editar Proveedor' : 'Nuevo Proveedor Competidor'}</h3>
                        <div className="flex items-center space-x-2">
                             <input type="checkbox" id="activeToggle" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="accent-rose-500 w-4 h-4" />
                             <label htmlFor="activeToggle" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer">Activo</label>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Nombre del ISP</label>
                            <input 
                                type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                placeholder="Ej. Inter, Netuno..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2.5">Sedes Disponibles</label>
                            <div className="flex flex-wrap gap-2">
                                {branches?.map((b: any) => (
                                    <button
                                        key={b.id}
                                        onClick={() => toggleBranch(String(b.id))}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                            form.branchIds.includes(String(b.id))
                                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10'
                                        }`}
                                    >
                                        {b.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                             <Server size={16} className="text-rose-500" /> Información Técnica & Costos
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Costo Instalación ($)</label>
                                <input type="number" value={form.installPrice} onChange={e => setForm({...form, installPrice: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 outline-none" placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Equipamiento</label>
                                <input type="text" value={form.equipment} onChange={e => setForm({...form, equipment: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 outline-none" placeholder="ONT + Router" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Promoción Actual</label>
                                <input type="text" value={form.promo} onChange={e => setForm({...form, promo: e.target.value})} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg p-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 outline-none" placeholder="Ej. Mes gratis" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Planes de Ancho de Banda</h4>
                            <button onClick={addOfferRow} className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1">
                                <Plus size={14} /> Añadir Plan
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {form.offers.map((offer, idx) => (
                                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center animate-in fade-in slide-in-from-left-2 transition-all">
                                    <div className="relative">
                                        <input placeholder="Velocidad (ej 100Mbps)" value={offer.bandwidth} onChange={e => updateOffer(idx, 'bandwidth', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 outline-none" />
                                    </div>
                                    <div className="flex space-x-3">
                                        <input placeholder="Precio ($/mes)" type="number" value={offer.price} onChange={e => updateOffer(idx, 'price', e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-rose-500 outline-none" />
                                        {form.offers.length > 1 && (
                                            <button onClick={() => setForm(f => ({ ...f, offers: f.offers.filter((_, i) => i !== idx) }))} className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500/20 transition-colors">
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-8 border-t border-slate-100 dark:border-white/5 gap-4">
                        <button onClick={() => setAdding(false)} className="px-6 py-3 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-bold transition-colors">Cancelar</button>
                        <button onClick={submitCompetitor} className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-2 transition-all shadow-xl shadow-rose-500/20 active:scale-95">
                            <Save size={20} /> <span>Guardar Competidor</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {isLoading && <div className="p-12 text-center text-slate-400 bg-white/50 dark:bg-slate-900/50 rounded-3xl animate-pulse">Cargando matriz...</div>}
                {!isLoading && groupedCompetitors.length === 0 && (
                    <div className="text-center p-16 glass-card border-dashed border-2 border-slate-200 dark:border-slate-800">
                        <Target size={48} className="mx-auto text-slate-200 dark:text-slate-800 mb-4" />
                        <p className="text-slate-400 font-medium">No hay registradas ofertas de la competencia aún.</p>
                    </div>
                )}
                {groupedCompetitors.map((compGroup: any, idx) => (
                    <div key={idx} className="glass-card overflow-hidden transition-all hover:border-rose-500/30 group">
                        <div className="bg-white/50 dark:bg-slate-900/50 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-start sm:items-center space-x-5">
                                <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                    <Server className="text-rose-600 dark:text-rose-400" size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{compGroup.name}</h3>
                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-[0.1em] border ${compGroup.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                            {compGroup.active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <Route size={14} className="text-slate-400" />
                                        {compGroup.branches.map((b: any) => (
                                            <span key={b.id} className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 px-2.5 py-0.5 rounded-lg text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                                                {b.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Info highlights */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:flex lg:items-center lg:gap-6">
                                {compGroup.installPrice && Number(compGroup.installPrice) > 0 && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Instalación</span>
                                        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">${compGroup.installPrice}</span>
                                    </div>
                                )}
                                {compGroup.equipment && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Equipos</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1">{compGroup.equipment}</span>
                                    </div>
                                )}
                                {compGroup.promo && (
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Promoción</span>
                                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 italic line-clamp-1">{compGroup.promo}</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-white/5">
                                {compGroup.lastUpdate && (
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                        Update: {new Date(compGroup.lastUpdate).toLocaleDateString()}
                                    </span>
                                )}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => openEdit(compGroup)} 
                                        className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-all active:scale-90"
                                        title="Editar Proveedor"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteCompetitor(compGroup.name)} 
                                        className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-xl transition-all active:scale-90"
                                        title="Eliminar Proveedor"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                            <button 
                                onClick={() => toggleCard(compGroup.name)}
                                className="w-full flex items-center justify-center p-3 text-xs font-black text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-all uppercase tracking-[0.2em] group/btn"
                            >
                                {expandedCards[compGroup.name] ? 'Ocultar Ofertas' : 'Ver Planes y Precios'}
                                <ChevronDown className={`ml-2 transform transition-transform duration-500 group-hover/btn:translate-y-0.5 ${expandedCards[compGroup.name] ? 'rotate-180' : ''}`} size={16} />
                            </button>
                        </div>
                        
                        {expandedCards[compGroup.name] && (
                            <div className="p-0 border-t border-slate-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-300">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/50 uppercase tracking-[0.2em] font-black">
                                            <tr>
                                                <th className="px-8 py-4">Velocidad / Ancho de Banda</th>
                                                <th className="px-8 py-4">Tarifa Mensual</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                            {compGroup.offers?.map((offer: any, oIdx: number) => (
                                                <tr key={oIdx} className="hover:bg-indigo-50/30 dark:hover:bg-white/[0.02] transition-colors group/row">
                                                    <td className="px-8 py-5 text-slate-700 dark:text-white font-bold group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-colors">{offer.bandwidth}</td>
                                                    <td className="px-8 py-5">
                                                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${offer.price}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!compGroup.offers || compGroup.offers.length === 0) && (
                                                <tr><td colSpan={2} className="px-8 py-12 text-center text-slate-400 italic font-light">Sin planes registrados para este proveedor</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
