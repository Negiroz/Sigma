import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './layouts/DashboardLayout';

const queryClient = new QueryClient();

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Performance from './pages/Performance';
import Financials from './pages/Financials';
import Agents from './pages/Agents';
import VersusArena from './pages/VersusArena';
import MeritDashboard from './pages/MeritDashboard';
import MeritDashboardAgents from './pages/MeritDashboardAgents';
import Admin from './pages/Admin';
import DataEntry from './pages/DataEntry';
import SalesUniversity from './pages/SalesUniversity';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Placeholder components

import { AuthProvider } from './contexts/AuthContext';
import { ConfigProvider } from './contexts/ConfigContext';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-right" reverseOrder={false} />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/financials" element={<Financials />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/versus" element={<VersusArena />} />
                  <Route path="/merit" element={<MeritDashboard />} />
                  <Route path="/merit-agents" element={<MeritDashboardAgents />} />

                  <Route element={<ProtectedAdminRoute />}>
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/data-entry" element={<DataEntry />} />
                    <Route path="/university/:tab?" element={<SalesUniversity />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
