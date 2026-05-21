import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { DollarSign, Users, Building, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import EmployeeGrid from '../components/data-entry/EmployeeGrid';
import BranchGrid from '../components/data-entry/BranchGrid';
import DailyBranchGrid from '../components/data-entry/DailyBranchGrid';
import MonthlyBranchGrid from '../components/data-entry/MonthlyBranchGrid';
import DailyEmployeeGrid from '../components/data-entry/DailyEmployeeGrid';
import DailyMeritGrid from '../components/data-entry/DailyMeritGrid';
import MonthlyMeritGrid from '../components/data-entry/MonthlyMeritGrid';
import MonthlyEmployeeGrid from '../components/data-entry/MonthlyEmployeeGrid';
import { Award } from 'lucide-react';

export default function DataEntry() {
    const queryClient = useQueryClient();
    const { month, year, companyId } = useConfig();
    const [activeTab, setActiveTab] = useState('global-goals');
    const [meritTab, setMeritTab] = useState<'daily' | 'monthly'>('daily');
    const [agentTab, setAgentTab] = useState<'daily' | 'monthly'>('daily');
    const [branchTab, setBranchTab] = useState<'daily' | 'monthly'>('daily');

    /* Financial Form Unused Variables Removed */


    const closeMonthMutation = useMutation({
        mutationFn: async (selectedMonth: number) => {
            if (!companyId) throw new Error('Seleccione una empresa primero');
            await api.post('/dashboard/merit/close-month', {
                companyId: companyId,
                month: selectedMonth,
                year: year
            });
        },
        onSuccess: () => {
            toast.success(`Mes cerrado correctamente. Se actualizaron los niveles de XP.`);
            queryClient.invalidateQueries({ queryKey: ['meritLeaderboard'] });
            queryClient.invalidateQueries({ queryKey: ['monthlyMerit'] });
        },
        onError: () => {
            toast.error('Error al cerrar el mes');
        }
    });

    const handleCloseMonth = () => {
        const userMonth = window.prompt("¿Qué número de mes deseas cerrar? (1-12):", month.toString());
        if (!userMonth) return;

        const parsedMonth = parseInt(userMonth, 10);
        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            toast.error('Número de mes inválido');
            return;
        }

        if (window.confirm(`¿Estás 100% seguro de que deseas cerrar el mes ${parsedMonth} del ${year}? Esto descontará los "impuestos de rango" y sumará los puntos mensuales a la XP histórica permanentemente. Esta acción no se puede deshacer y podría sobrescribir la XP si se hace dos veces sobre el mismo mes ya cerrado sin restablecer.`)) {
            closeMonthMutation.mutate(parsedMonth);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Entrada de Datos ✓</h2>
                <p className="text-slate-500">Carga manual de métricas operativas y financieras</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('global-goals')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'global-goals' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <DollarSign size={16} />
                    <span>Metas Globales</span>
                </button>
                <button
                    onClick={() => setActiveTab('daily-branch')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'daily-branch' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Building size={16} />
                    <span>Rendimiento Diario Sedes</span>
                </button>
                <button
                    onClick={() => setActiveTab('daily-employee')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'daily-employee' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={16} />
                    <span>Rendimiento diario Campo</span>
                </button>
                <button
                    onClick={() => setActiveTab('merit')}
                    className={`flex items-center space-x-2 px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'merit' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <ShieldCheck size={16} />
                    <span>Rendimiento diario Agentes AI</span>
                </button>
            </div>


            {/* Global Goals Tab */}
            {activeTab === 'global-goals' && (
                <div className="space-y-6">
                    <BranchGrid month={month} year={year} companyId={companyId} />
                    <EmployeeGrid month={month} year={year} companyId={companyId} />
                </div>
            )}

            {/* Daily Branch Tab */}
            {activeTab === 'daily-branch' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="flex space-x-4 bg-white p-1 rounded-lg w-fit shadow-sm border border-slate-200">
                            <button
                                onClick={() => setBranchTab('daily')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${branchTab === 'daily' ? 'bg-slate-50 text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Registro Diario
                            </button>
                            <button
                                onClick={() => setBranchTab('monthly')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${branchTab === 'monthly' ? 'bg-slate-50 text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Acumulado Mensual
                            </button>
                        </div>
                    </div>

                    {branchTab === 'daily' ? (
                        <DailyBranchGrid companyId={companyId} />
                    ) : (
                        <MonthlyBranchGrid companyId={companyId} />
                    )}
                </div>
            )}

            {/* Daily Employee: Agentes de Campo Tab */}
            {activeTab === 'daily-employee' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div className="flex space-x-4 bg-white p-1 rounded-lg w-fit shadow-sm border border-slate-200">
                            <button
                                onClick={() => setAgentTab('daily')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${agentTab === 'daily' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'}`}
                            >
                                Registro Diario
                            </button>
                            <button
                                onClick={() => setAgentTab('monthly')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${agentTab === 'monthly' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'}`}
                            >
                                Acumulado Mensual
                            </button>
                        </div>
                    </div>

                    {agentTab === 'daily' ? (
                        <DailyEmployeeGrid companyId={companyId} />
                    ) : (
                        <MonthlyEmployeeGrid companyId={companyId} />
                    )}
                </div>
            )}

            {/* Daily Merit Tab (Gamification) */}
            {activeTab === 'merit' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex space-x-4 bg-white p-1 rounded-lg w-fit shadow-sm border border-slate-200">
                            <button
                                onClick={() => setMeritTab('daily')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${meritTab === 'daily' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-700'}`}
                            >
                                Registro Diario
                            </button>
                            <button
                                onClick={() => setMeritTab('monthly')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${meritTab === 'monthly' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-700'}`}
                            >
                                Acumulado Mensual
                            </button>
                        </div>
                        <button
                            onClick={handleCloseMonth}
                            disabled={closeMonthMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2 w-fit disabled:opacity-50"
                        >
                            <Award size={16} />
                            <span>{closeMonthMutation.isPending ? 'Cerrando mes...' : 'Cerrar Mes Meritocrático'}</span>
                        </button>
                    </div>

                    {meritTab === 'daily' ? (
                        <DailyMeritGrid companyId={companyId} />
                    ) : (
                        <MonthlyMeritGrid companyId={companyId} />
                    )}
                </div>
            )}
        </div>
    );
}
