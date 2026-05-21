import { Sidebar } from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import NotificationBanner from '../components/NotificationBanner';

export function DashboardLayout() {
    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden relative transition-colors duration-300">
            {/* Background Decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-slate-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 -z-10 pointer-events-none transition-colors duration-300" />
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 -z-10 pointer-events-none mix-blend-soft-light" />

            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    <NotificationBanner />
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
