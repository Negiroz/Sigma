import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useConfig } from '../contexts/ConfigContext';
import { DollarSign, Wrench, Users, Activity, TrendingDown, FileText, FileSpreadsheet, ArchiveRestore } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';
import { exportToExcel, exportToPDF } from '../lib/exportUtils';

export default function Dashboard() {
    const { month, year, companyId } = useConfig();

    const { data: summary, isLoading, error } = useQuery({
        queryKey: ['dashboardSummary', month, year, companyId],
        queryFn: async () => {
            const res = await api.get(`/dashboard/summary?month=${month}&year=${year}&companyId=${companyId || ''}`);
            return res.data;
        }
    });

    const { data: chartData = [] } = useQuery({
        queryKey: ['dashboardHistory', companyId],
        queryFn: async () => (await api.get(`/dashboard/history?companyId=${companyId || ''}`)).data
    });

    const { data: dailyClosingsData = [] } = useQuery({
        queryKey: ['dashboardDailyClosings', month, year, companyId],
        queryFn: async () => (await api.get(`/dashboard/daily-closings?month=${month}&year=${year}&companyId=${companyId || ''}`)).data
    });

    const { data: performanceData = {} } = useQuery({
        queryKey: ['dashboardPerformance', month, year, companyId],
        queryFn: async () => (await api.get(`/dashboard/performance?month=${month}&year=${year}&companyId=${companyId || ''}`)).data
    });

    if (isLoading) return <div className="p-8 text-slate-500">Cargando dashboard...</div>;
    if (error) return <div className="p-8 text-red-500">Error al cargar el dashboard: {(error as any).message}</div>;

    const financials = summary?.financials || {};
    const operational = summary?.operational || {};

    if (!summary || !summary.financials) return <div className="p-8 text-slate-500">No hay datos disponibles para este periodo.</div>;

    // Export Handlers
    const handleExportExcel = () => {
        const data = [
            { Metric: 'Total Facturado', Value: Math.floor(financials.billed || 0) },
            { Metric: 'Clientes Activos', Value: financials.activeClients },
            { Metric: 'Churn Rate', Value: `${financials.churnRate}%` },
            { Metric: 'Instalaciones Total', Value: operational.totalInstallations },
            { Metric: 'Cierres Total', Value: operational.closings }
        ];
        exportToExcel(data, `Dashboard_Report_${month}_${year}`);
    };

    const handleExportPDF = () => {
        const columns = ['Métrica', 'Valor'];
        const data = [
            ['Total Facturado', `$${Math.floor(financials.billed || 0).toLocaleString()}`],
            ['Clientes Activos', `${financials.activeClients || 0}`],
            ['Churn Rate', `${financials.churnRate || 0}%`],
            ['Instalaciones Total', `${operational.totalInstallations || 0}`],
            ['Cierres Total', `${operational.closings || 0}`]
        ];
        exportToPDF(`Reporte Dashboard - ${month}/${year}`, columns, data, `Dashboard_Report_${month}_${year}`);
    };

    const cards = [
        {
            title: 'Total Facturado',
            value: `$${Math.floor(financials.billed || 0).toLocaleString()}`,
            diff: financials.billedDiffGoal || 0,
            diffAbsolute: financials.billedGoalProrated,
            diffLabel: 'Meta',
            diffIsMoney: true,
            goalDiff: financials.billedDiffPrev,
            goalDiffAbsolute: financials.billedPrevMonthProrated,
            isProrated: true,
            icon: DollarSign,
            color: 'from-emerald-400 to-teal-500',
            iconColor: 'text-emerald-500',
            bgGradient: 'from-emerald-50 to-teal-50'
        },
        {
            title: 'Clientes Activos',
            value: financials.activeClients || 0,
            diff: financials.activeClientsDiffGoal || 0,
            diffAbsolute: financials.activeClientsGoalProrated || 0,
            diffLabel: 'Meta P.',
            diffIsMoney: false,
            goalDiff: financials.activeClientsDiffGoal,
            goalDiffAbsolute: financials.activeClientsGoalProrated,
            isProrated: true,
            icon: Users,
            color: 'from-blue-400 to-indigo-500',
            iconColor: 'text-blue-500',
            bgGradient: 'from-blue-50 to-indigo-50'
        },
        {
            title: 'Churn Rate',
            value: `${financials.churnRate || 0}% `,
            diff: financials.churnRateDiffPrev || 0,
            diffAbsolute: financials.churnRatePrev,
            diffLabel: 'Mes Ant.',
            diffSuffix: '%',
            diffFractionDigits: 1,
            inverseColor: true,
            icon: TrendingDown,
            color: 'from-rose-400 to-pink-500',
            iconColor: 'text-rose-500',
            bgGradient: 'from-rose-50 to-pink-50'
        },
        {
            title: 'Instalaciones',
            value: operational.totalInstallations || 0,
            diff: operational.installationsDiffPrev || 0,
            diffAbsolute: operational.installationsPrevProrated,
            diffLabel: 'Mes Ant.',
            icon: Wrench,
            color: 'from-amber-400 to-orange-500',
            iconColor: 'text-amber-500',
            bgGradient: 'from-amber-50 to-orange-50'
        },
        {
            title: 'Cierres',
            value: operational.closings || 0,
            diff: operational.closingsDiffPrev || 0,
            diffAbsolute: operational.closingsPrevProrated,
            diffLabel: 'Mes Ant.',
            icon: Activity,
            color: 'from-violet-400 to-purple-500',
            iconColor: 'text-violet-500',
            bgGradient: 'from-violet-50 to-purple-50'
        },
        {
            title: 'Recuperación',
            value: operational.recovery || 0,
            diff: operational.recoveryDiffGoal || 0,
            diffAbsolute: operational.recoveryGoalProrated || 0,
            diffLabel: 'Meta P.',
            goalDiff: operational.recoveryDiffGoal,
            goalDiffAbsolute: operational.recoveryGoalProrated,
            isProrated: true,
            icon: ArchiveRestore,
            color: 'from-cyan-400 to-blue-500',
            iconColor: 'text-cyan-500',
            bgGradient: 'from-cyan-50 to-blue-50'
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight premium-gradient-text">Resumen General</h2>
                    <p className="text-slate-500 mt-2 font-light">Vista panorámica del rendimiento comercial - {new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date(0, month - 1).toLocaleString('es-ES', { month: 'long' }).slice(1)} {year}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20"
                    >
                        <FileSpreadsheet size={18} />
                        <span>Excel</span>
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center space-x-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition shadow-lg shadow-rose-500/20"
                    >
                        <FileText size={18} />
                        <span>PDF</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                {cards.map((card, index) => (
                    <div key={index} className="glass-card p-6 relative group overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.bgGradient} opacity-20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.bgGradient} shadow-sm group-hover:shadow-md transition-shadow`}>
                                <card.icon className={card.iconColor} size={24} />
                            </div>
                            {card.diff !== undefined && (
                                <div className="flex flex-col items-end">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${((card as any).inverseColor ? card.diff <= 0 : card.diff >= 0) ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} group-hover:bg-white group-hover:shadow-sm transition-all`}>
                                        {card.diff >= 0 ? '+' : ''}{card.diff.toFixed(1)}%
                                    </span>
                                    {(card as any).diffAbsolute !== undefined && (
                                        <span className="text-[10px] text-slate-400 font-medium mt-1">
                                            {(card as any).diffLabel || 'Meta'}: {(card as any).diffIsMoney ? '$' : ''}{(card as any).diffAbsolute.toLocaleString('en-US', { maximumFractionDigits: (card as any).diffFractionDigits || 0 })}{(card as any).diffSuffix || ''}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-slate-500 text-sm font-medium tracking-wide">{card.title}</h3>
                            <p className="text-3xl font-bold text-slate-800 mt-2 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-700 group-hover:to-slate-900 transition-colors">
                                {card.value}
                            </p>
                            {(card as any).goalDiff !== undefined && (
                                <p className={`text-[10px] font-bold mt-1 ${(card as any).goalDiff >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {(card as any).isProrated 
                                        ? `M/A $${((card as any).goalDiffAbsolute || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} (${(card as any).goalDiff > 0 ? '+' : ''}${(card as any).goalDiff.toFixed(1)}%)`
                                        : `${(card as any).goalDiff >= 0 ? 'Sobre meta' : 'Bajo meta'} (${Math.abs((card as any).goalDiff).toFixed(1)}%)${(card as any).goalDiffAbsolute !== undefined ? ` - $${(card as any).goalDiffAbsolute.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : ''}`}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Historical Area Chart */}
                <div className="glass-card p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Evolución de Ingresos</h3>
                            <p className="text-sm text-slate-500">Facturación vs Costos (Últimos 6 Meses)</p>
                        </div>
                    </div>

                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: any) => [`$${Math.floor(value).toLocaleString()}`, 'Facturado']}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area type="monotone" dataKey="billed" stroke="#10b981" fillOpacity={1} fill="url(#colorBilled)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Regional Comparison Bar Chart */}
                <div className="glass-card p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Comparativa de Gerencia v2</h3>
                            <p className="text-sm text-slate-500">Facturado vs Meta (Proporcional al día actual)</p>
                        </div>
                    </div>
 
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(performanceData as any).byManagement || []} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name]}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    align="center" 
                                    iconType="circle"
                                    wrapperStyle={{ 
                                        paddingTop: '20px',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }} 
                                />
                                <Bar dataKey="billed" name="Facturado en mes" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="target" name="Meta" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="previous" name="Mes anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Daily Closings Area Chart */}
            <div className="glass-card p-8 relative overflow-hidden mt-8">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500" />
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Evolución Diaria de Cierres</h3>
                        <p className="text-sm text-slate-500">Total de cierres logrados día a día en el mes actual</p>
                    </div>
                </div>

                <div className="h-80 w-full">
                    {dailyClosingsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyClosingsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorClosings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: any) => [`${value} Cierres`, 'Total']}
                                    labelFormatter={(label) => `Día ${label}`}
                                />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <Area type="monotone" dataKey="closings" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorClosings)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                            No hay datos de cierres para este mes.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
