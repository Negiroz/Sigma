import { LayoutDashboard, Users, TrendingUp, DollarSign, Settings, LogOut, Database, Trophy, Swords, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Resumen', href: '/' },
    { icon: TrendingUp, label: 'Rendimiento', href: '/performance' },
    { icon: DollarSign, label: 'Gerencias', href: '/financials' },
    { icon: Database, label: 'Carga de Datos', href: '/data-entry' },
    { icon: Users, label: 'Agente de Campo', href: '/agents' },
    { icon: Swords, label: 'Versus Arena', href: '/versus' },
    { icon: Trophy, label: 'Meritocracia Agentes AI', href: '/merit' },
    { icon: Trophy, label: 'Meritocracia Campo', href: '/merit-agents' },
    { icon: GraduationCap, label: 'Univ de Ventas', href: '/university' },
    { icon: Settings, label: 'Admin', href: '/admin' },
];

import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

export function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, user } = useAuth();

    let activeCompany = 'SIGMA';
    let userRole = 'USER';
    let username = 'Usuario';

    if (user) {
        activeCompany = user.companyName || 'SIGMA';
        userRole = user.role;
        username = user.username;
    }

    // Config Context Override
    const { companyName } = useConfig();
    if (companyName) activeCompany = companyName;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredNavItems = navItems.filter(item => {
        if (item.label === 'Admin' || item.label === 'Carga de Datos' || item.label === 'Univ de Ventas') {
            return userRole === 'ADMIN' || userRole === 'SUPERADMIN' || userRole === 'MANAGER';
        }
        return true;
    });

    return (
        <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl border-r border-white/5 relative z-20 w-20 hover:w-64 transition-[width] duration-300 ease-in-out group overflow-hidden">
            <div className="p-6 flex items-center h-20">
                <div className="min-w-[2.5rem] flex items-center justify-center">
                    <img 
                        src={logo} 
                        alt="Sigma Logo" 
                        className="w-10 h-10 rounded-lg shadow-lg shadow-blue-500/20 object-cover border border-white/10"
                    />
                </div>
                <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        SIGMA
                    </h1>
                    <p className="text-xs text-slate-400 font-medium truncate max-w-[150px]">
                        {activeCompany}
                    </p>
                </div>
            </div>

            <nav className="flex-1 px-3 space-y-2 mt-2">
                {filteredNavItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={cn(
                                "flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-300 relative overflow-hidden whitespace-nowrap",
                                isActive
                                    ? "bg-blue-600/10 text-white shadow-inner shadow-blue-500/10"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-r-full" />
                            )}
                            <div className="min-w-[1.5rem] flex justify-center">
                                <item.icon
                                    size={20}
                                    className={cn(
                                        "transition-transform duration-300 group-hover/link:scale-110",
                                        isActive ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" : "text-slate-500"
                                    )}
                                />
                            </div>
                            <span className={`font-medium tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-1 ${isActive ? "text-blue-100" : ""}`}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-slate-900/50 overflow-hidden space-y-2">
                <div className="flex items-center space-x-3 px-3 py-2 text-slate-300">
                    <div className="min-w-[1.5rem] flex justify-center">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300">
                            <Users size={18} />
                        </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate text-white">{username}</p>
                        <p className="text-xs text-slate-500 truncate">{userRole}</p>
                    </div>
                </div>

                <div className="h-px bg-white/5 mx-2" />

                <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 text-slate-400 hover:text-red-400 transition-colors w-full px-3 py-2 hover:bg-red-500/10 rounded-lg group/btn whitespace-nowrap"
                >
                    <div className="min-w-[1.5rem] flex justify-center">
                        <LogOut size={20} className="group-hover/btn:-translate-x-1 transition-transform" />
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-1">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}
