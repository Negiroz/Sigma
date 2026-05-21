import { useState, useEffect } from 'react';
import { Swords, Target, ClipboardCheck, MessageSquare, AlertCircle, ChevronRight, UserCircle, Building2, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export function DailyTraining() {
    const { user } = useAuth();
    const [pitchData, setPitchData] = useState<any>(null);
    const [loadingPitch, setLoadingPitch] = useState(false);
    
    // Selection state
    const [branches, setBranches] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedAgentId, setSelectedAgentId] = useState<string>('');

    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [evalScore, setEvalScore] = useState<number | null>(null);
    
    const [speechObs, setSpeechObs] = useState('');
    const [objectionObs, setObjectionObs] = useState('');
    const [generalNotes, setGeneralNotes] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedbackSaved, setFeedbackSaved] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        if (selectedBranchId) {
            fetchEmployees(selectedBranchId);
        } else {
            setEmployees([]);
            setSelectedAgentId('');
        }
    }, [selectedBranchId]);

    const fetchBranches = async () => {
        try {
            const res = await api.get(`/dashboard/admin/branches?companyId=${user?.companyId}`);
            if (Array.isArray(res.data)) {
                setBranches(res.data);
                if (res.data.length === 1) {
                    setSelectedBranchId(res.data[0].id.toString());
                }
            } else {
                setBranches([]);
            }
        } catch (error) {
            console.error("Error fetching branches");
            setBranches([]);
        }
    };

    const fetchEmployees = async (branchId: string) => {
        try {
            const res = await api.get(`/dashboard/admin/employees?role=AGENT&branchId=${branchId}`);
            if (Array.isArray(res.data)) {
                setEmployees(res.data.filter((e: any) => e.active));
            } else {
                setEmployees([]);
            }
        } catch (error) {
            console.error("Error fetching employees");
            setEmployees([]);
        }
    };

    const drawPitch = async () => {
        try {
            setLoadingPitch(true);
            const query = new URLSearchParams({
                companyId: user?.companyId?.toString() || '',
                branchId: selectedBranchId,
                targetAgentId: selectedAgentId
            }).toString();
            
            const res = await api.get(`/dashboard/university/draw-pitch?${query}`);
            setPitchData(res.data);
            setFeedbackSaved(false);
            setSpeechObs('');
            setObjectionObs('');
            setGeneralNotes('');
            toast.success("Sorteo realizado!");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Error al realizar el sorteo");
        } finally {
            setLoadingPitch(false);
        }
    };

    const drawEvaluation = async () => {
        try {
            const query = new URLSearchParams({
                branchId: selectedBranchId
            }).toString();
            const res = await api.get(`/dashboard/university/daily-evaluation?${query}`);
            setQuestions(res.data);
            setAnswers({});
            setEvalScore(null);
        } catch (error) {
            toast.error("Error al obtener preguntas");
        }
    };

    const submitEvaluation = async () => {
        if (!pitchData?.evaluatedAgent?.id) {
            toast.error("Realiza el sorteo del pitch primero para asignar el agente evaluado");
            return;
        }

        const answerPayload = questions.map(q => ({
            questionId: q.id,
            rating: answers[q.id] || 'MALA'
        }));

        try {
            const res = await api.post('/dashboard/university/submit-evaluation', {
                employeeId: pitchData.evaluatedAgent.id,
                answers: answerPayload
            });
            setEvalScore(res.data.score);
            toast.success("Evaluación guardada correctemente");
        } catch (error) {
            toast.error("Error al guardar evaluación");
        }
    };

    const submitFeedback = async () => {
        if (!pitchData?.seller?.id) {
            toast.error("Realiza el sorteo primero");
            return;
        }

        if (!speechObs && !objectionObs) {
            toast.error("Por favor registra al menos una observación");
            return;
        }

        try {
            setIsSubmittingFeedback(true);
            await api.post('/dashboard/university/submit-feedback', {
                employeeId: pitchData.seller.id,
                speechObservations: speechObs,
                objectionObservations: objectionObs,
                notes: generalNotes
            });
            setFeedbackSaved(true);
            toast.success("Observaciones registradas correctamente");
        } catch (error) {
            toast.error("Error al registrar observaciones");
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Selection Bar */}
            <div className="glass-card p-6 border-indigo-500/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Building2 size={12} /> Seleccionar Sede
                        </label>
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                            <option value="">Todas las sedes gestionadas</option>
                            {Array.isArray(branches) && branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <UserCircle size={12} /> Agente a Evaluar (Opcional)
                        </label>
                        <select
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                            disabled={!selectedBranchId}
                        >
                            <option value="">Selección Aleatoria</option>
                            {Array.isArray(employees) && employees.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                        </select>
                        {!selectedBranchId && <p className="text-[9px] text-slate-400 italic">Selecciona una sede para elegir un agente específico.</p>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Side: Pitch Draw */}
                <div className="glass-card p-8 group hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Swords className="text-indigo-600 dark:text-indigo-400" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Simulación de Venta
                            </h2>
                        </div>
                        <button 
                            onClick={drawPitch}
                            disabled={loadingPitch}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                        >
                            {loadingPitch ? 'Sorteando...' : 'Sortear Roles'}
                        </button>
                    </div>

                {pitchData ? (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-[0.2em] mb-2">Vendedor</p>
                                <p className="text-xl text-slate-900 dark:text-white font-extrabold">{pitchData.seller?.name}</p>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-500/10 p-5 rounded-2xl border border-rose-100 dark:border-rose-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-black uppercase tracking-[0.2em] mb-2">Cliente</p>
                                <p className="text-xl text-slate-900 dark:text-white font-extrabold">{pitchData.client?.name}</p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.2em] mb-2">Evaluado</p>
                                <p className="text-xl text-slate-900 dark:text-white font-extrabold">{pitchData.evaluatedAgent?.name}</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-white/5 space-y-5">
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-2">Contexto del Escenario</p>
                                <div className="inline-flex items-center px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold border border-indigo-500/10">
                                    {pitchData.contextType}
                                </div>
                            </div>
                            <div className="pt-5 border-t border-slate-200 dark:border-white/5">
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-3">Caso / Objeción a superar</p>
                                <blockquote className="text-lg text-slate-700 dark:text-slate-200 font-medium italic leading-relaxed pl-4 border-l-4 border-indigo-500/30">
                                    "{pitchData.case?.content}"
                                </blockquote>
                            </div>
                        </div>

                        {/* Historical Feedback Section */}
                        {pitchData.lastFeedback && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-500/20 space-y-4 animate-pulse-slow">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="text-amber-600 dark:text-amber-400" size={18} />
                                    <h3 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                                        Feedback de su última presentación
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {pitchData.lastFeedback.speechObservations && (
                                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-amber-200/50 dark:border-white/5">
                                            <p className="text-[10px] text-amber-700 dark:text-amber-500 font-black uppercase mb-1">Mejoras en Discurso:</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{pitchData.lastFeedback.speechObservations}"</p>
                                        </div>
                                    )}
                                    {pitchData.lastFeedback.objectionObservations && (
                                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-amber-200/50 dark:border-white/5">
                                            <p className="text-[10px] text-amber-700 dark:text-amber-500 font-black uppercase mb-1">Manejo de Objeciones:</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{pitchData.lastFeedback.objectionObservations}"</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-amber-600/70 dark:text-amber-400/50 text-right font-medium italic">
                                    Evaluar si hubo mejoras hoy.
                                </p>
                            </div>
                        )}

                        {/* Observation Form Section */}
                        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500/10 rounded-lg">
                                    <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white">Registro de Observaciones</h3>
                            </div>

                            {!feedbackSaved ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Mejoras en Discurso</label>
                                        <textarea 
                                            value={speechObs}
                                            onChange={(e) => setSpeechObs(e.target.value)}
                                            placeholder="¿Qué oportunidades de mejora tiene el agente en su discurso?"
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Manejo de Objeciones</label>
                                        <textarea 
                                            value={objectionObs}
                                            onChange={(e) => setObjectionObs(e.target.value)}
                                            placeholder="¿Cómo puede mejorar el manejo de objeciones?"
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                                        />
                                    </div>
                                    <button
                                        onClick={submitFeedback}
                                        disabled={isSubmittingFeedback}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmittingFeedback ? 'Guardando...' : 'Registrar Feedback'}
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500 text-white rounded-full">
                                        <ClipboardCheck size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400">Feedback Registrado</p>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-500">Se mostrará en la próxima simulación del agente.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50/50 dark:bg-transparent transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-500/50">
                        <Swords size={40} className="mb-3 opacity-20" />
                        <p className="font-medium">Oprime "Sortear Roles" para iniciar</p>
                    </div>
                )}
            </div>

            {/* Right Side: Evaluation */}
            <div className="glass-card p-8 group hover:-translate-y-1 transition-all duration-300">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl">
                            <Target className="text-emerald-600 dark:text-emerald-400" size={24} />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                                Evaluación Rápida
                            </h2>
                            {pitchData?.evaluatedAgent && (
                                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                                    Evaluando a: {pitchData.evaluatedAgent.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <button 
                            onClick={drawEvaluation}
                            className="bg-emerald-600/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20 px-4 py-2 rounded-xl font-bold transition-all text-sm active:scale-95"
                        >
                            Generar Test
                        </button>
                        <p className="text-[10px] text-slate-400 font-medium italic flex items-center gap-1">
                            <BookOpen size={10} /> ¿Repasar material? Ve a la pestaña Material
                        </p>
                    </div>
                </div>

                {questions.length > 0 ? (
                    <div className="space-y-5 animate-in fade-in duration-500">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-emerald-500/30 transition-all">
                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 flex items-start">
                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black px-2 py-0.5 rounded text-xs mr-3 mt-0.5">{idx + 1}</span> 
                                    {q.content}
                                </p>
                                {q.options && (
                                    <details className="ml-9 mb-4 group/answer">
                                        <summary className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest cursor-pointer hover:text-amber-700 transition-colors list-none flex items-center gap-1 outline-none">
                                            <ChevronRight size={12} className="group-open/answer:rotate-90 transition-transform" />
                                            Ver Respuesta Sugerida
                                        </summary>
                                        <div className="mt-2 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl animate-in slide-in-from-top-1 duration-200">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{q.options}"</p>
                                        </div>
                                    </details>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {(['BUENA', 'REGULAR', 'MALA'] as const).map(rating => (
                                        <button
                                            key={rating}
                                            onClick={() => setAnswers(prev => ({ ...prev, [q.id]: rating }))}
                                            className={`text-[10px] px-4 py-2 rounded-xl font-black tracking-widest transition-all ${
                                                answers[q.id] === rating 
                                                    ? rating === 'BUENA' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : rating === 'REGULAR' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                                                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-700'
                                            }`}
                                        >
                                            {rating}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {evalScore === null ? (
                            <button 
                                onClick={submitEvaluation} 
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-2xl mt-4 shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest"
                            >
                                Guardar Desempeño
                            </button>
                        ) : (
                            <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center mt-6 animate-in zoom-in duration-500">
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-[0.3em] mb-2">Puntuación Lograda</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-5xl text-slate-900 dark:text-white font-black">{evalScore}</span>
                                    <span className="text-2xl text-emerald-500 font-black">/ 20</span>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50/50 dark:bg-transparent transition-colors group-hover:border-emerald-300 dark:group-hover:border-emerald-500/50">
                        <Target size={40} className="mb-3 opacity-20" />
                        <p className="font-medium">Genera un cuestionario para evaluar</p>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}
