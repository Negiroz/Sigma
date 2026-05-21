import { X, Trophy, AlertTriangle, TrendingUp, Target, Shield, Info, Star, Medal, Loader } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useConfig } from '../../contexts/ConfigContext';

interface ScoringRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    section?: 'general' | 'nivel' | 'xp' | 'agent';
}

export default function ScoringRulesModal({ isOpen, onClose, section = 'general' }: ScoringRulesModalProps) {
    const { month, year } = useConfig();
    
    const { data: config, isLoading } = useQuery({
        queryKey: ['kpiConfig', month, year],
        queryFn: async () => (await api.get(`/dashboard/admin/kpi-config`, { params: { month, year } })).data,
        enabled: isOpen && (section === 'general' || section === 'agent')
    });

    if (!isOpen) return null;

    const supportTicketsVal = config?.supportTickets ?? 6;
    const tasksDoneVal = config?.tasksDone ?? 2;
    const paymentsVal = config?.payments ?? 0.5;
    const conversationsVal = config?.conversations ?? 0.2;
    const closingsVal = config?.closings ?? 30;
    const revenueDivider = config?.revenueDivider ?? 10;

    // Agentes de Campo
    const agentClosingPts       = config?.agentClosingPoints      ?? 300;
    const agentProspectPts      = config?.agentProspectPoints     ?? 50;
    const agentConvPts          = config?.agentConversionPoints   ?? 50;
    const agentReactPts         = config?.agentReactivationPoints ?? 100;
    const agentEquipPts         = config?.agentEquipmentPoints    ?? 100;
    const agentPenaltyPts       = config?.agentPenaltyPoints      ?? 30;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        {section === 'general' && <><Target className="text-indigo-600" /> Reglas de Puntuación Diaria</>}
                        {section === 'nivel' && <><Medal className="text-amber-500" /> Sistema de Niveles</>}
                        {section === 'xp' && <><Star className="text-yellow-500" /> Acumulación de XP Total</>}
                        {section === 'agent' && <><Target className="text-blue-600" /> Reglas de Puntuación: Agentes de Campo</>}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {section === 'general' && (
                        <>
                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="text-blue-500" /> Venta (Grupo A)
                                </h3>
                                <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                            <span className="font-semibold text-slate-700">Cierres</span>
                                            <span className="font-bold text-blue-700">{closingsVal} pts / cierre</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                            <span className="font-bold text-blue-600">Ejemplo:</span> Si hoy cierras <span className="font-bold">3 ventas</span>, obtienes: 3 x {closingsVal} = <span className="font-bold">{3 * closingsVal} puntos</span>. (Sin límite).
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                            <span className="font-semibold text-slate-700">Conversión Mensual (Bono)</span>
                                            <div className="text-right">
                                                <div className="font-bold text-blue-700">{'>'} 30% = +150 pts</div>
                                                <div className="font-bold text-blue-600 text-xs">{'>'} 15% = +75 pts</div>
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50 flex items-start gap-2">
                                            <Info className="text-blue-500 mt-0.5 flex-shrink-0" size={16} />
                                            <span>
                                                <span className="font-bold text-blue-600">Evaluación Mensual:</span> Este bono <span className="font-bold underline">no se otorga a diario</span>.
                                                A final de mes, si el total de Cierres entre Total de Prospectos supera el 30%, ganarás 150 puntos extra en tu ranking mensual.
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">Ingresos ($)</span>
                                            <span className="font-bold text-blue-700">1 pt / cada ${revenueDivider}</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                            <span className="font-bold text-blue-600">Ejemplo:</span> Si tu facturación del día es <span className="font-bold">${revenueDivider * 12}</span>, obtienes: {revenueDivider * 12} / {revenueDivider} = <span className="font-bold">12 puntos</span>.
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Shield className="text-emerald-500" /> Operaciones (Grupo B)
                                </h3>
                                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                                            <span className="font-semibold text-slate-700">S Resueltos</span>
                                            <span className="font-bold text-emerald-700">{supportTicketsVal} pts / ticket</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-emerald-50">
                                            <span className="font-bold text-emerald-600">Ejemplo:</span> Ayudar a resolver <span className="font-bold">8 tickets</span> de soporte hoy te suma: 8 x {supportTicketsVal} = <span className="font-bold">{8 * supportTicketsVal} puntos</span>.
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                                            <span className="font-semibold text-slate-700">S no resuelto / S escaldo</span>
                                            <span className="font-bold text-emerald-700">{tasksDoneVal} pts / ticket</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-emerald-50">
                                            <span className="font-bold text-emerald-600">Ejemplo:</span> Cualquiera de los otros 2 tipos de soporte suma <span className="font-bold">{tasksDoneVal} puntos</span>. (ej. 5 S no resueltos = {5 * tasksDoneVal} pts).
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <TrendingUp className="text-orange-500" /> Atención (Grupo C)
                                </h3>
                                <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100 space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center border-b border-orange-100 pb-2">
                                            <span className="font-semibold text-slate-700">Conversaciones</span>
                                            <span className="font-bold text-orange-700">{conversationsVal} pts / unidad</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-orange-50">
                                            <span className="font-bold text-orange-600">Ejemplo:</span> Realizar <span className="font-bold">50 conversaciones</span> suma: 50 x {conversationsVal} = <span className="font-bold">{50 * conversationsVal} puntos</span>.
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center border-b border-orange-100 pb-2">
                                            <span className="font-semibold text-slate-700">Pagos</span>
                                            <span className="font-bold text-orange-700">{paymentsVal} pts / pago</span>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-orange-50">
                                            <span className="font-bold text-orange-600">Ejemplo:</span> Lograr <span className="font-bold">20 pagos</span> desde conversaciones suma: 20 x {paymentsVal} = <span className="font-bold">{20 * paymentsVal} puntos</span>.
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Trophy className="text-purple-500" /> Versus Arena
                                </h3>
                                <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-semibold text-slate-700">Resultado del Duelo</span>
                                        <div className="text-right text-xs space-y-1">
                                            <div className="font-bold text-green-600">+30 pts (Ganador)</div>
                                            <div className="font-bold text-red-500">-30 pts (Perdedor)</div>
                                            <div className="font-bold text-slate-500">0 pts (Empate / Sin Rival)</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-purple-50">
                                        <p className="mb-2"><span className="font-bold text-purple-600">¿Cómo funciona?</span> Compites contra un compañero aleatorio. Gana quien tenga mayor puntaje base del día.</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li><span className="font-bold text-green-600">Victoria:</span> Sumas 30 pts extra.</li>
                                            <li><span className="font-bold text-red-500">Derrota:</span> Te restan 30 pts.</li>
                                            <li><span className="font-bold text-slate-500">Empate/Sin Rival:</span> No se suman ni restan puntos ("No Contest").</li>
                                        </ul>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="text-red-500" /> Penalizaciones
                                </h3>
                                <div className="bg-red-50/50 rounded-xl p-5 border border-red-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-slate-700">Tickets Evitables / Errores</span>
                                        <span className="font-bold text-red-700">-30 pts / unidad</span>
                                    </div>
                                    <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-red-50">
                                        <span className="font-bold text-red-600">Cuidado:</span> Estos puntos se <span className="font-bold underline">restan</span> de tu total. 2 errores operacionales = -60 puntos directos.
                                    </div>
                                </div>
                            </section>
                        </>
                    )}

                    {section === 'agent' && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <TrendingUp className="text-blue-500" /> Sistema de Puntuación
                            </h3>
                            {isLoading && <div className="flex justify-center py-4"><Loader className="animate-spin text-blue-400" /></div>}
                            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 space-y-4">
                                <div>
                                    <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                        <span className="font-semibold text-slate-700">Cierres (100% Meta)</span>
                                        <span className="font-bold text-blue-700">{agentClosingPts} pts repartidos</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                        <span className="font-bold text-blue-600">Fórmula:</span> {agentClosingPts} puntos divididos entre tu meta mensual. Si superas el 100% de la meta, seguirás sumando puntos sin límite por cada venta adicional.
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                        <span className="font-semibold text-slate-700">Prospectos (100% Meta)</span>
                                        <span className="font-bold text-blue-700">{agentProspectPts} pts repartidos</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                        <span className="font-bold text-blue-600">Fórmula:</span> {agentProspectPts} puntos divididos entre tu meta de prospectos.
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                        <span className="font-semibold text-slate-700">Conversión (100% Meta)</span>
                                        <span className="font-bold text-blue-700">{agentConvPts} pts repartidos</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                        <span className="font-bold text-blue-600">Fórmula:</span> {agentConvPts} puntos divididos entre tu meta de conversión asignada.
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                        <span className="font-semibold text-slate-700">Reactivaciones (100% Meta)</span>
                                        <span className="font-bold text-blue-700">{agentReactPts} pts repartidos</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                        <span className="font-bold text-blue-600">Fórmula:</span> {agentReactPts} puntos divididos entre tu meta de reactivaciones.
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                                        <span className="font-semibold text-slate-700">Retiro de Equipos (100% Meta)</span>
                                        <span className="font-bold text-blue-700">{agentEquipPts} pts repartidos</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-blue-50">
                                        <span className="font-bold text-blue-600">Fórmula:</span> {agentEquipPts} puntos divididos entre tu meta de retiros de equipo.
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center border-b border-red-100 pb-2">
                                        <span className="font-semibold text-slate-700 text-red-600">Incumplimientos / Penalizaciones</span>
                                        <span className="font-bold text-red-700">-{agentPenaltyPts} pts / falta</span>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600 bg-white p-3 rounded-lg border border-red-50">
                                        <span className="font-bold text-red-600">Cuidado:</span> Faltas a reuniones, atrasos o mal llenado de reportes en el CRM te restarán {agentPenaltyPts} unidades automáticamente.
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {section === 'nivel' && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Medal className="text-amber-500" /> ¿Cómo subir de nivel?
                            </h3>
                            <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 space-y-4">
                                <p className="text-slate-700 text-sm">
                                    El avance de <strong>Nivel</strong> está asociado a tu <strong>XP Total Acumulada</strong>, no a los puntos del mes. Esto significa que tu nivel es vitalicio y refleja tu experiencia histórica en la empresa, ¡no empiezas desde cero cada mes!
                                </p>
                                
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Rango de Niveles</h4>
                                    <ul className="space-y-3 text-sm">
                                        <li className="flex justify-between">
                                            <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">BRONZE</span>
                                            <span className="text-slate-600 text-right">0 a 2,499 <strong>XP</strong></span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-xs border border-slate-200">SILVER</span>
                                            <span className="text-slate-600 text-right">2,500 a 6,999 <strong>XP</strong></span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="font-bold text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded text-xs border border-yellow-200">GOLD</span>
                                            <span className="text-slate-600 text-right">7,000 a 14,999 <strong>XP</strong></span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-300">PLATINUM</span>
                                            <span className="text-slate-600 text-right">15,000 a 29,999 <strong>XP</strong></span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded text-xs border border-cyan-200">DIAMOND</span>
                                            <span className="text-slate-600 text-right">30,000+ <strong>XP</strong></span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-amber-50 flex items-start gap-2">
                                    <Info className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                                    <span>
                                        Al final de cada mes, los puntos que generes se sumarán a tu XP histórico. Al acumular suficiente XP escalarás de nivel permanentemente.
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    {section === 'xp' && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Star className="text-yellow-500" /> ¿Cómo se acumula la XP Total?
                            </h3>
                            <div className="bg-yellow-50/50 rounded-xl p-5 border border-yellow-100 space-y-4">
                                <p className="text-slate-700 text-sm">
                                    A diferencia del puntaje diario (que se reinicia a 0 cada mes), la <strong>XP Total</strong> representa tu experiencia histórica global a lo largo de tu carrera en la empresa.
                                </p>
                                
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-sm space-y-3">
                                    <div className="flex items-start gap-2 border-b border-slate-100 pb-3">
                                        <div className="font-bold text-lg text-yellow-600 mt-0.5">1</div>
                                        <p className="text-slate-600">
                                            <strong className="text-slate-800">Aumento de XP.</strong> Al cerrarse el ciclo mensual, la totalidad de los puntos que acumulaste durante el mes se suman a tu XP (Puntos de Experiencia). La fórmula es simple: <strong className="text-slate-700">Nueva XP = XP Actual + Puntos del Mes - Impuesto de Nivel</strong>.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-2 pt-1">
                                        <div className="font-bold text-lg text-amber-600 mt-0.5">2</div>
                                        <div className="text-slate-600 space-y-2 flex-1">
                                            <p><strong className="text-slate-800">Impuestos de Rango (Rank Decay).</strong> Para asegurar competitividad, el sistema resta una cantidad fija ("impuesto") mensualmente según tu nivel actual:</p>
                                            <ul className="text-xs space-y-1 bg-slate-50 p-2 rounded border border-slate-100">
                                                <li><span className="font-bold text-cyan-800">DIAMOND:</span> Paga <strong className="text-red-500">2,000 pts</strong> de impuesto.</li>
                                                <li><span className="font-bold text-slate-800">PLATINUM:</span> Paga <strong className="text-red-500">1,000 pts</strong> de impuesto.</li>
                                                <li><span className="font-bold text-yellow-700">GOLD:</span> Paga <strong className="text-red-500">300 pts</strong> de impuesto.</li>
                                                <li><span className="font-bold text-slate-500">SILVER y BRONZE:</span> <strong className="text-green-600">No pagan</strong> impuesto (0 pts).</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-slate-600 bg-white p-3 rounded-lg border border-yellow-50 flex items-start gap-2">
                                    <Info className="text-yellow-500 mt-0.5 flex-shrink-0" size={16} />
                                    <span>
                                        Conclusión: El esfuerzo que haces mes a mes se preservará en tu XP, que es una métrica constante. ¡Mantente activo y liderando la clasificación!
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 text-sm text-slate-500 rounded-b-2xl">
                    <Info className="text-blue-400 flex-shrink-0" size={20} />
                    <p>
                        {section === 'general' && (
                            <>
                                <strong>Sistema Híbrido:</strong> Los puntos diarios te sirven para ganar batallas Versus y subir el marcador del día.
                                El <strong>Acumulado Mensual</strong> procesará todas tus ventas, ingresos y promedios y te sumará bonos ocultos a final de mes. ¡Suma la mayor cantidad de prospectos y cierres!
                            </>
                        )}
                        {section === 'nivel' && (
                            <>
                                <strong>Dato importante:</strong> Cada nuevo mes arranca desde cero puntos. Debes esforzarte constantemente para llegar a estatus altos y mantener los mejores niveles.
                            </>
                        )}
                        {section === 'xp' && (
                            <>
                                <strong>Dato importante:</strong> Cuanto mayor sea tu nivel final y tu XP histórica, mayor esfuerzo necesitarás para que los puntos mensuales hagan subir tu barra de XP.
                            </>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
