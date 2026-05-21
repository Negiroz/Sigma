import { useState } from 'react';
import { User, CheckCircle, Plus, Presentation, Headphones, MessageSquare, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export function FieldCoaching() {
    const { user } = useAuth();
    const [selectedAgent, setSelectedAgent] = useState('');
    
    const [primary, setPrimary] = useState({
        presence: 'BUENO',
        routeKnowledge: 'BUENO',
        crmUpdate: 'BUENO'
    });

    const [clients, setClients] = useState<any[]>([]);
    const [addingClient, setAddingClient] = useState(false);
    
    // New Client form state
    const [newClient, setNewClient] = useState({
        tone: 'BUENO', speed: 'BUENO', pitch: 'BUENO', listening: 'BUENO',
        objections: 'BUENO', tools: 'BUENO', time: 'BUENO',
        prospectCall: '', reactivationCall: '', removalCall: ''
    });

    const [step, setStep] = useState(1); // 1. Forms, 2. Summary
    const [conclusions, setConclusions] = useState('');
    const [improvements, setImprovements] = useState('');
    const [finalScore, setFinalScore] = useState<number | null>(null);

    // Fetch agents for the dropdown
    const { data: agents } = useQuery({
        queryKey: ['agents-univ', user?.companyId],
        queryFn: async () => {
             const res = await api.get(`/dashboard/admin/employees?role=AGENT&companyId=${user?.companyId || ''}`);
             return res.data;
        }
    });

    const handleAddClient = () => {
        setClients([...clients, newClient]);
        setAddingClient(false);
        setNewClient({
            tone: 'BUENO', speed: 'BUENO', pitch: 'BUENO', listening: 'BUENO',
            objections: 'BUENO', tools: 'BUENO', time: 'BUENO',
            prospectCall: '', reactivationCall: '', removalCall: ''
        });
    };

    const submitCoaching = async () => {
        if (!selectedAgent) return toast.error("Seleccione un agente");
        try {
            const res = await api.post('/dashboard/university/submit-coaching', {
                employeeId: selectedAgent,
                supervisorId: user?.id,
                primary,
                clients,
                conclusions,
                improvements
            });
            setFinalScore(res.data.finalScore);
            setStep(3); // Result page
            toast.success("Coaching guardado exitosamente");
        } catch (error) {
            toast.error("Error al guardar coaching");
        }
    };

    const RatingSelect = ({ value, onChange, label }: any) => (
        <div className="flex flex-col">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 ml-1">{label}</label>
            <select 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
            >
                <option value="BUENO">Bueno</option>
                <option value="REGULAR">Regular</option>
                <option value="DEFICIENTE">Deficiente</option>
            </select>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            
            {step < 3 && (
                <div className="glass-card p-6 border-indigo-500/10 dark:border-indigo-500/20">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Seleccionar Agente Evaluado</label>
                    <div className="relative group">
                        <select 
                            value={selectedAgent}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">-- Seleccionar Vendedor --</option>
                            {agents?.map((a: any) => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <User size={18} />
                        </div>
                    </div>
                </div>
            )}

            {step === 1 && selectedAgent && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Primary Evaluation */}
                    <div className="glass-card p-8">
                        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                             <div className="p-2 bg-indigo-500/10 rounded-lg">
                                 <Presentation className="text-indigo-600 dark:text-indigo-400" size={20} />
                             </div>
                             <h3 className="text-xl font-bold text-slate-900 dark:text-white">Evaluación Primaria</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <RatingSelect label="Presencia" value={primary.presence} onChange={(v: string) => setPrimary({...primary, presence: v})} />
                            <RatingSelect label="Conoc. de Ruta/Obj" value={primary.routeKnowledge} onChange={(v: string) => setPrimary({...primary, routeKnowledge: v})} />
                            <RatingSelect label="Actualización CRM" value={primary.crmUpdate} onChange={(v: string) => setPrimary({...primary, crmUpdate: v})} />
                        </div>
                    </div>

                    {/* Iterative Clients */}
                    <div className="glass-card p-8">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-rose-500/10 rounded-lg">
                                    <Headphones className="text-rose-600 dark:text-rose-400" size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Evaluación por Cliente</h3>
                                <span className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                                    {clients.length} Evaluados
                                </span>
                            </div>
                            {!addingClient && (
                                <button 
                                    onClick={() => setAddingClient(true)} 
                                    className="flex items-center space-x-2 text-sm bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                                >
                                    <Plus size={18} /> <span>Nuevo Cliente</span>
                                </button>
                            )}
                        </div>

                        {addingClient ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-indigo-500/20 space-y-6 animate-in zoom-in duration-300">
                                <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                     <MessageSquare size={16} /> Formulario de Cliente
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <RatingSelect label="Tono de Voz" value={newClient.tone} onChange={(v: string) => setNewClient({...newClient, tone: v})} />
                                    <RatingSelect label="Velocidad" value={newClient.speed} onChange={(v: string) => setNewClient({...newClient, speed: v})} />
                                    <RatingSelect label="Pitch" value={newClient.pitch} onChange={(v: string) => setNewClient({...newClient, pitch: v})} />
                                    <RatingSelect label="Escucha" value={newClient.listening} onChange={(v: string) => setNewClient({...newClient, listening: v})} />
                                    <RatingSelect label="Objeciones" value={newClient.objections} onChange={(v: string) => setNewClient({...newClient, objections: v})} />
                                    <RatingSelect label="Uso Herramientas" value={newClient.tools} onChange={(v: string) => setNewClient({...newClient, tools: v})} />
                                    <RatingSelect label="Tiempo" value={newClient.time} onChange={(v: string) => setNewClient({...newClient, time: v})} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-white/5">
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 ml-1">Notas Prospecto</label>
                                        <input type="text" value={newClient.prospectCall} onChange={e => setNewClient({...newClient, prospectCall: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 ml-1">Notas Reactivación</label>
                                        <input type="text" value={newClient.reactivationCall} onChange={e => setNewClient({...newClient, reactivationCall: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 ml-1">Notas Retiro</label>
                                        <input type="text" value={newClient.removalCall} onChange={e => setNewClient({...newClient, removalCall: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3 pt-4">
                                    <button onClick={() => setAddingClient(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white px-4 py-2 text-sm font-medium transition-colors">Cancelar</button>
                                    <button onClick={handleAddClient} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">Guardar Cliente</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center pt-8">
                                <button 
                                    onClick={() => setStep(2)} 
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-10 py-4 rounded-2xl font-black text-white shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 w-full md:w-auto uppercase tracking-wider"
                                >
                                    Finalizar Recorrido y ver Resumen
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                    <div className="glass-card p-10">
                        <div className="flex items-center space-x-4 mb-8">
                             <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                 <CheckCircle className="text-indigo-600 dark:text-indigo-400" size={28} />
                             </div>
                             <div>
                                 <h3 className="text-2xl font-black text-slate-900 dark:text-white">Resumen de Coaching</h3>
                                 <p className="text-slate-500 dark:text-slate-400 font-light mt-1">Basado en respuestas primarias y {clients.length} evaluaciones detalladas.</p>
                             </div>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-bold mb-3 group-focus-within:text-indigo-500 transition-colors">
                                     <MessageSquare size={18} /> Conclusiones Finales
                                </label>
                                <textarea 
                                    rows={5}
                                    value={conclusions}
                                    onChange={e => setConclusions(e.target.value)}
                                    placeholder="Escriba las observaciones generales de este coaching..."
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
                                />
                            </div>
                            <div className="group">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 font-bold mb-3 group-focus-within:text-rose-500 transition-colors">
                                     <Activity size={18} /> Oportunidades de Mejora
                                </label>
                                <textarea 
                                    rows={5}
                                    value={improvements}
                                    onChange={e => setImprovements(e.target.value)}
                                    placeholder="¿En qué debe enfocarse el agente para mejorar?"
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 outline-none resize-none transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 mt-10">
                            <button onClick={() => setStep(1)} className="px-8 py-4 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95">
                                Atrás
                            </button>
                            <button onClick={submitCoaching} className="flex-1 bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl font-black text-white shadow-xl shadow-indigo-500/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-lg">
                                Enviar Coaching
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="glass-card mt-12 overflow-hidden animate-in zoom-in duration-700">
                    <div className="bg-emerald-500 dark:bg-emerald-600 h-2 w-full" />
                    <div className="p-16 text-center space-y-6">
                        <div className="mx-auto w-24 h-24 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-inner animate-pulse">
                            <CheckCircle size={48} className="text-emerald-500" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white">¡Sesión Guardada!</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-light mt-2 max-w-md mx-auto">La evaluación de desempeño ha sido registrada exitosamente en el historial del agente.</p>
                        </div>
                        
                        <div className="py-10 bg-slate-50 dark:bg-white/5 rounded-3xl max-w-xs mx-auto border border-slate-100 dark:border-white/5 shadow-sm">
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] mb-2">Nota de Desempeño</p>
                            <p className="text-7xl font-black text-emerald-500 drop-shadow-sm">
                                {finalScore !== null ? finalScore.toFixed(1) : ''}
                            </p>
                            <p className="text-slate-400 text-sm mt-1">/ 20.0</p>
                        </div>
                        
                        <button 
                            onClick={() => { setStep(1); setSelectedAgent(''); setClients([]); }} 
                            className="mt-12 px-10 py-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl shadow-slate-900/20"
                        >
                            Realizar otro Coaching
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
