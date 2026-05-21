import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Bell, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
    id: string;
    type: 'warning' | 'info' | 'success';
    message: string;
    timestamp: string;
}

export default function NotificationBanner() {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(true);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const res = await api.get('/dashboard/notifications');
            return res.data.notifications as Notification[];
        },
        refetchInterval: 30 * 60 * 1000, // 30 minutes
    });

    const notifications = data || [];

    // Reset visibility when notifications change (if there are new ones)
    useEffect(() => {
        if (notifications.length > 0) {
            setIsVisible(true);
        }
    }, [notifications.length]);

    // Only show for ADMIN or SUPERADMIN
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    if (!isAdmin || !isVisible) return null;

    return (
        <div className="mb-6 relative z-50">
            <div className={`p-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between shadow-lg ${
                notifications.length > 0 
                ? 'bg-amber-50 border-amber-400' 
                : 'bg-emerald-50 border-emerald-400'
            }`}>
                <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${
                        notifications.length > 0 ? 'bg-amber-100' : 'bg-emerald-100'
                    }`}>
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : notifications.length > 0 ? (
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        ) : (
                            <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                    </div>
                    
                    <div>
                        {notifications.length > 0 ? (
                            <div className="space-y-1">
                                {notifications.map(n => (
                                    <p key={n.id} className="text-sm font-semibold text-amber-900">
                                        {n.message}
                                    </p>
                                ))}
                                <p className="text-[10px] text-amber-700 uppercase tracking-wider font-bold">
                                    Requiere atención inmediata
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-emerald-900 flex items-center">
                                    Sistema Actualizado
                                    <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                </span>
                                <span className="text-[10px] text-emerald-700 uppercase tracking-tighter">
                                    Toda la información del día anterior ha sido registrada
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => refetch()}
                        className="p-1.5 hover:bg-white/50 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                        title="Actualizar ahora"
                    >
                        <Bell className="h-4 w-4" />
                    </button>
                    <div className={`h-8 w-[1px] mx-2 ${
                        notifications.length > 0 ? 'bg-amber-200' : 'bg-emerald-200'
                    }`} />
                    <button 
                        onClick={() => setIsVisible(false)}
                        className={`p-1.5 hover:bg-white/50 rounded-md transition-colors ${
                            notifications.length > 0 
                                ? 'text-amber-500 hover:text-amber-700' 
                                : 'text-emerald-500 hover:text-emerald-700'
                        }`}
                        title="Cerrar aviso"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
