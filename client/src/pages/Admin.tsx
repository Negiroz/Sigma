import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Users, Settings, UserPlus, Shield, Building, Edit2, Trash2, Plus, Moon, Sun, Calendar, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import ImageCropperModal from '../components/ImageCropperModal';
import KpiSettings from '../components/admin/KpiSettings';
import PenalizationSettings from '../components/admin/PenalizationSettings';

export default function Admin() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { month, year, companyId, companyName, theme, setMonth, setYear, setCompanyId, setCompanyName, toggleTheme } = useConfig();
    const [activeTab, setActiveTab] = useState<'users' | 'branches' | 'employees' | 'companies' | 'salesTeams' | 'config' | 'kpis' | 'penalties'>('kpis');

    // Queries
    // Queries in Admin need to respect selected company (if not company-bound)
    const { data: branches } = useQuery({
        queryKey: ['adminBranches', companyId],
        queryFn: async () => (await api.get('/dashboard/admin/branches', { params: { companyId } })).data
    });

    const { data: employees } = useQuery({
        queryKey: ['adminEmployees', companyId],
        queryFn: async () => (await api.get('/dashboard/admin/employees', { params: { companyId } })).data
    });

    const { data: users } = useQuery({ queryKey: ['adminUsers'], queryFn: async () => (await api.get('/dashboard/admin/users')).data });
    const { data: companies } = useQuery({ queryKey: ['adminCompanies'], queryFn: async () => (await api.get('/dashboard/admin/companies')).data });

    const { data: salesTeams } = useQuery({ 
        queryKey: ['adminSalesTeams', companyId], 
        queryFn: async () => (await api.get('/dashboard/admin/teams', { params: { companyId } })).data 
    });

    // Mutations
    const createBranchMutation = useMutation({
        mutationFn: async (data: { name: string, division: string }) => await api.post('/dashboard/admin/branches', { ...data, companyId: companyId || 1 }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminBranches'] })
    });

    const deleteBranchMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/branches/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminBranches'] })
    });

    const createEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('role', data.role);
            if (data.branchId) formData.append('branchId', data.branchId);
            if (data.teamId) formData.append('teamId', data.teamId);
            formData.append('companyId', String(companyId || 1));
            if (data.photoFile) {
                formData.append('photo', data.photoFile);
            }
            return await api.post('/dashboard/admin/employees', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
            queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] });
        }
    });

    const toggleEmployeeStatusMutation = useMutation({
        mutationFn: async ({ id, active }: { id: number, active: boolean }) => await api.patch(`/dashboard/admin/employees/${id}/status`, { active }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminEmployees'] })
    });

    // Simple Form States
    const [newBranchName, setNewBranchName] = useState('');
    const [newBranchDivision, setNewBranchDivision] = useState('Primera');
    const [newEmployee, setNewEmployee] = useState<any>({ name: '', role: 'AGENT', branchId: '', teamId: '', photoFile: null });
    const [newUser, setNewUser] = useState({ username: '', password: '', role: 'USER', branchIds: [] as number[] });
    const [editingEmployee, setEditingEmployee] = useState<any>(null); // State for editing
    const [editingBranch, setEditingBranch] = useState<any>(null); // State for editing branch
    const [editingUser, setEditingUser] = useState<any>(null);

    const updateEmployeeMutation = useMutation({
        mutationFn: async (data: any) => {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('role', data.role);
            formData.append('branchId', data.branchId || '');
            formData.append('teamId', data.teamId || '');
            if (data.photoFile) {
                formData.append('photo', data.photoFile);
            }
            return await api.put(`/dashboard/admin/employees/${data.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
            queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] });
            setEditingEmployee(null); // Close edit mode
        }
    });

    const deleteEmployeeMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/employees/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
            queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] });
        }
    });

    const updateBranchMutation = useMutation({
        mutationFn: async (data: any) => await api.put(`/dashboard/admin/branches/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminBranches'] });
            setEditingBranch(null); // Close edit mode
        }
    });

    const createUserMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/dashboard/admin/users', { ...data, companyId: companyId || 1 }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    });

    const updateUserMutation = useMutation({
        mutationFn: async (data: any) => await api.put(`/dashboard/admin/users/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            setEditingUser(null);
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] })
    });

    const createCompanyMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/dashboard/admin/companies', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminCompanies'] });
            toast.success("Empresa creada exitosamente");
        },
        onError: (err: any) => {
            console.error('Error creating company:', err);
            toast.error(err.response?.data?.error || "Error al crear empresa");
        }
    });

    const updateCompanyMutation = useMutation({
        mutationFn: async (data: any) => await api.put(`/dashboard/admin/companies/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminCompanies'] });
            setEditingCompany(null);
        }
    });

    const deleteCompanyMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/companies/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminCompanies'] })
    });



    // Sales Teams Mutations
    const createSalesTeamMutation = useMutation({
        mutationFn: async (data: any) => await api.post('/dashboard/admin/teams', { ...data, companyId: companyId || 1 }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] })
    });

    const updateSalesTeamMutation = useMutation({
        mutationFn: async (data: any) => await api.put(`/dashboard/admin/teams/${data.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] });
            queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
            setEditingSalesTeam(null);
        }
    });

    const deleteSalesTeamMutation = useMutation({
        mutationFn: async (id: number) => await api.delete(`/dashboard/admin/teams/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminSalesTeams'] });
            queryClient.invalidateQueries({ queryKey: ['adminEmployees'] });
        }
    });

    const [newCompany, setNewCompany] = useState({ companyName: '', adminUsername: '', adminPassword: '' });
    const [editingCompany, setEditingCompany] = useState<any>(null);

    const [newSalesTeam, setNewSalesTeam] = useState({ name: '', supervisorId: '' });
    const [editingSalesTeam, setEditingSalesTeam] = useState<any>(null);

    const [itemToDelete, setItemToDelete] = useState<{ id: number, type: 'employee' | 'company' | 'user' | 'salesTeam' | 'branch', message: string } | null>(null);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        switch (itemToDelete.type) {
            case 'employee':
                deleteEmployeeMutation.mutate(itemToDelete.id);
                break;
            case 'company':
                deleteCompanyMutation.mutate(itemToDelete.id);
                break;
            case 'user':
                deleteUserMutation.mutate(itemToDelete.id);
                break;

            case 'salesTeam':
                deleteSalesTeamMutation.mutate(itemToDelete.id);
                break;
            case 'branch':
                deleteBranchMutation.mutate(itemToDelete.id);
                break;
        }
        setItemToDelete(null);
    };

    return (
        <div className="space-y-8 animate-fade-in-up" >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight premium-gradient-text">Administración</h2>
                    <p className="text-slate-500 mt-2 font-light">Gestión integral de recursos y accesos</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-slate-100/50 p-1 rounded-xl w-fit" >
                {
                    [
                        { id: 'branches', label: 'Sedes', icon: Building },
                        { id: 'employees', label: 'Empleados', icon: Users },
                        { id: 'users', label: 'Usuarios Sistema', icon: Shield, adminOnly: true },
                        { id: 'companies', label: 'Empresas', icon: Building, adminOnly: true },

                        { id: 'salesTeams', label: 'Equipos Integrales', icon: Users },
                        { id: 'kpis', label: 'Valores KPIs', icon: Settings, adminOnly: true },
                        { id: 'penalties', label: 'Amonestaciones', icon: Shield, adminOnly: true },
                        { id: 'config', label: 'Configuración', icon: Settings },
                    ].filter(tab => !tab.adminOnly || (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN')).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                        >
                            <tab.icon size={16} />
                            <span>{tab.label}</span>
                        </button>
                    ))
                }
            </div >

            {/* Branches Content */}
            {
                activeTab === 'branches' && (
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Sedes Operativas</h3>
                            <div className="flex gap-2">
                                {/* Reused form for Create OR Edit */}
                                <input
                                    value={editingBranch ? editingBranch.name : newBranchName}
                                    onChange={(e) => editingBranch
                                        ? setEditingBranch({ ...editingBranch, name: e.target.value })
                                        : setNewBranchName(e.target.value)
                                    }
                                    placeholder={editingBranch ? "Editando sede..." : "Nueva sede..."}
                                    className={`bg-slate-50 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${editingBranch ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-slate-200'}`}
                                />
                                <select
                                    value={editingBranch ? (editingBranch.division || 'Primera') : newBranchDivision}
                                    onChange={(e) => editingBranch
                                        ? setEditingBranch({ ...editingBranch, division: e.target.value })
                                        : setNewBranchDivision(e.target.value)
                                    }
                                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Primera">Primera División</option>
                                    <option value="Segunda">Segunda División</option>
                                </select>

                                {editingBranch ? (
                                    <>
                                        <button
                                            onClick={() => updateBranchMutation.mutate(editingBranch)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors"
                                            title="Guardar Cambios"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setEditingBranch(null)}
                                            className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
                                            title="Cancelar Edición"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (newBranchName) {
                                                createBranchMutation.mutate({ name: newBranchName, division: newBranchDivision });
                                                setNewBranchName('');
                                                setNewBranchDivision('Primera');
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                        title="Agregar Sede"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {branches?.map((branch: any) => (
                                <div key={branch.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-blue-300 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <span className="font-semibold text-slate-700 block">{branch.name}</span>
                                            <span className="text-xs text-slate-400 font-medium">División: {branch.division || 'Primera'}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingBranch(branch)}
                                            className="text-slate-400 hover:text-blue-500 transition-colors"
                                            title="Modificar Sede"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setItemToDelete({ id: branch.id, type: 'branch', message: '¿Estás seguro de eliminar esta sede?' })}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar Sede"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Employees Content */}
            {
                activeTab === 'employees' && (
                    <div className="glass-card p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-slate-800">Directorio de Empleados</h3>
                            <div className="flex gap-2 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
                                {/* Reused form for Create OR Edit */}
                                <input
                                    value={editingEmployee ? editingEmployee.name : newEmployee.name}
                                    onChange={(e) => editingEmployee
                                        ? setEditingEmployee({ ...editingEmployee, name: e.target.value })
                                        : setNewEmployee({ ...newEmployee, name: e.target.value })
                                    }
                                    placeholder={editingEmployee ? "Editando nombre..." : "Nombre..."}
                                    className={`bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full ${editingEmployee ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-slate-200'}`}
                                />
                                <select
                                    value={editingEmployee ? editingEmployee.role : newEmployee.role}
                                    onChange={(e) => editingEmployee
                                        ? setEditingEmployee({ ...editingEmployee, role: e.target.value })
                                        : setNewEmployee({ ...newEmployee, role: e.target.value })
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="AGENT">Agente de Campo</option>
                                    <option value="CLOSER">Agente AI</option>
                                    <option value="SUPERVISOR">Supervisor AI</option>
                                    <option value="MANAGER">Gerente</option>
                                </select>
                                <select
                                    value={editingEmployee ? (editingEmployee.branchId || '') : newEmployee.branchId}
                                    onChange={(e) => editingEmployee
                                        ? setEditingEmployee({ ...editingEmployee, branchId: e.target.value })
                                        : setNewEmployee({ ...newEmployee, branchId: e.target.value })
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Sede...</option>
                                    {branches?.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <select
                                    value={editingEmployee ? (editingEmployee.teamId || '') : newEmployee.teamId}
                                    onChange={(e) => editingEmployee
                                        ? setEditingEmployee({ ...editingEmployee, teamId: e.target.value })
                                        : setNewEmployee({ ...newEmployee, teamId: e.target.value })
                                    }
                                    disabled={(editingEmployee?.role || newEmployee.role) !== 'CLOSER'}
                                    className={`bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${((editingEmployee?.role || newEmployee.role) !== 'CLOSER') ? 'bg-slate-50 cursor-not-allowed text-slate-400' : ''}`}
                                >
                                    <option value="">{ (editingEmployee?.role || newEmployee.role) === 'SUPERVISOR' ? 'Es Supervisor' : 'Equipo...' }</option>
                                    {(editingEmployee?.role || newEmployee.role) === 'CLOSER' && salesTeams?.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        id="employee-photo"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = () => {
                                                    setCropImageSrc(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="employee-photo"
                                        className={`flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors ${ (editingEmployee?.photoFile || newEmployee.photoFile) ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500' }`}
                                        title="Subir fotografía"
                                    >
                                        <ImageIcon size={20} />
                                        {(editingEmployee?.photoFile || newEmployee.photoFile) && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                            </span>
                                        )}
                                    </label>
                                </div>

                                {editingEmployee ? (
                                    <>
                                        <button
                                            onClick={() => updateEmployeeMutation.mutate(editingEmployee)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors"
                                            title="Guardar Cambios"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setEditingEmployee(null)}
                                            className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
                                            title="Cancelar Edición"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (newEmployee.name) {
                                                createEmployeeMutation.mutate(newEmployee);
                                                setNewEmployee({ name: '', role: 'AGENT', branchId: '', photoFile: null });
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                        title="Agregar Empleado"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-[600px] custom-scrollbar border rounded-xl">
                            <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
                                <thead className="text-slate-900 font-semibold">
                                    <tr className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                        <th className="px-6 py-4 w-16 text-center border-b border-slate-200">#</th>
                                        <th className="px-6 py-4 border-b border-slate-200">Foto</th>
                                        <th className="px-6 py-4 border-b border-slate-200">Nombre</th>
                                        <th className="px-6 py-4 border-b border-slate-200">Rol</th>
                                        <th className="px-6 py-4 border-b border-slate-200">Sede Asignada</th>
                                        <th className="px-6 py-4 border-b border-slate-200">Equipo Integral</th>
                                        <th className="px-6 py-4 text-right border-b border-slate-200">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {employees?.map((emp: any, index: number) => (
                                        <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-center text-slate-500 font-medium">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm">
                                                    {emp.photo ? (
                                                        <img 
                                                            src={emp.photo.startsWith('http') ? emp.photo : `${api.defaults.baseURL?.replace('/api', '') || ''}${emp.photo}`} 
                                                            alt={emp.name} 
                                                            className="h-full w-full object-cover" 
                                                        />
                                                    ) : (
                                                        <span className="text-slate-400 text-xs font-bold">{emp.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">{emp.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${emp.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                                                    emp.role === 'CLOSER' ? 'bg-indigo-100 text-indigo-700' :
                                                    emp.role === 'SUPERVISOR' ? 'bg-emerald-100 text-emerald-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {emp.role === 'MANAGER' ? 'Gerente' : 
                                                     emp.role === 'CLOSER' ? 'Agente AI' : 
                                                     emp.role === 'SUPERVISOR' ? 'Supervisor AI' : 
                                                     'Agente de Campo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{emp.branch?.name || '-'}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {emp.role === 'SUPERVISOR' && emp.supervisedTeams?.length > 0 ? (
                                                    <span className="text-emerald-600 font-medium italic">
                                                        Supervisa: {emp.supervisedTeams.map((t: any) => t.name).join(', ')}
                                                    </span>
                                                ) : (
                                                    emp.team?.name || '-'
                                                )}
                                             </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setEditingEmployee(emp)}
                                                    className="mr-3 text-blue-500 hover:text-blue-700 transition-colors"
                                                    title="Modificar Datos"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setItemToDelete({ id: emp.id, type: 'employee', message: '¿Estás seguro de eliminar este empleado? Esta acción no se puede deshacer.' })}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Eliminar Empleado"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'users' && (
                    <div className="glass-card p-6">
                        {/* Header & Form */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h3 className="text-lg font-bold text-slate-800">Usuarios del Sistema</h3>
                            <div className="flex gap-2 w-full md:w-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <input
                                    value={editingUser ? editingUser.username : newUser.username}
                                    onChange={(e) => editingUser
                                        ? setEditingUser({ ...editingUser, username: e.target.value })
                                        : setNewUser({ ...newUser, username: e.target.value })
                                    }
                                    placeholder={editingUser ? "Editar Usuario..." : "Nuevo Usuario..."}
                                    className={`bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${editingUser ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-slate-200'}`}
                                />
                                <input
                                    type="password"
                                    value={editingUser ? (editingUser.password || '') : newUser.password}
                                    onChange={(e) => editingUser
                                        ? setEditingUser({ ...editingUser, password: e.target.value })
                                        : setNewUser({ ...newUser, password: e.target.value })
                                    }
                                    placeholder={editingUser ? "Nueva clave (opcional)" : "Contraseña..."}
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <select
                                    value={editingUser ? editingUser.role : newUser.role}
                                    onChange={(e) => editingUser
                                        ? setEditingUser({ ...editingUser, role: e.target.value })
                                        : setNewUser({ ...newUser, role: e.target.value })
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="USER">Usuario</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="MANAGER">Gerente</option>
                                    <option value="VIEWER">Visualizador</option>
                                </select>

                                {editingUser ? (
                                    <>
                                        <button
                                            onClick={() => updateUserMutation.mutate(editingUser)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors"
                                            title="Guardar Cambios"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setEditingUser(null)}
                                            className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (newUser.username && newUser.password) {
                                                createUserMutation.mutate(newUser);
                                                setNewUser({ username: '', password: '', role: 'USER', branchIds: [] });
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                        title="Crear Usuario"
                                    >
                                        <UserPlus size={20} />
                                    </button>
                                )}
                            </div>
                            
                            {/* Branch Selection for Managers */}
                            {(editingUser?.role === 'MANAGER' || (!editingUser && newUser.role === 'MANAGER')) && (
                                <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <p className="text-sm font-semibold text-blue-800 mb-2">Asignar Sedes (Solo Gerente):</p>
                                    <div className="flex flex-wrap gap-3">
                                        {branches?.map((branch: any) => {
                                            const isSelected = editingUser 
                                                ? (editingUser.branchIds || editingUser.managedBranches?.map((b: any) => b.id) || []).includes(branch.id)
                                                : newUser.branchIds.includes(branch.id);
                                            
                                            return (
                                                <label key={branch.id} className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (editingUser) {
                                                                const currentIds = editingUser.branchIds || editingUser.managedBranches?.map((b: any) => b.id) || [];
                                                                const nextIds = checked 
                                                                    ? [...currentIds, branch.id]
                                                                    : currentIds.filter((id: number) => id !== branch.id);
                                                                setEditingUser({ ...editingUser, branchIds: nextIds });
                                                            } else {
                                                                const nextIds = checked
                                                                    ? [...newUser.branchIds, branch.id]
                                                                    : newUser.branchIds.filter((id: number) => id !== branch.id);
                                                                setNewUser({ ...newUser, branchIds: nextIds });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-xs font-medium">{branch.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Users List */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users?.map((u: any) => (
                                <div key={u.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-blue-300 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-2 rounded-lg ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{u.username}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-400">{u.role}</p>
                                                {u.managedBranches?.length > 0 && (
                                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded">
                                                        {u.managedBranches.length} sedes
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setItemToDelete({ id: u.id, type: 'user', message: '¿Estás seguro de eliminar este usuario del sistema?' })}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            {
                activeTab === 'companies' && (
                    <div className="glass-card p-6">
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">{editingCompany ? "Editar Empresa" : "Nueva Empresa y Administrador"}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <input
                                    value={editingCompany ? editingCompany.name : newCompany.companyName}
                                    onChange={(e) => editingCompany
                                        ? setEditingCompany({ ...editingCompany, name: e.target.value })
                                        : setNewCompany({ ...newCompany, companyName: e.target.value })}
                                    placeholder={editingCompany ? "Nombre..." : "Nombre de la Empresa"}
                                    className={`bg-white border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full ${editingCompany ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-slate-200'}`}
                                />
                                {!editingCompany && (
                                    <>
                                        <input
                                            value={newCompany.adminUsername}
                                            onChange={(e) => setNewCompany({ ...newCompany, adminUsername: e.target.value })}
                                            placeholder="Usuario Admin Inicial"
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                        />
                                        <input
                                            type="password"
                                            value={newCompany.adminPassword}
                                            onChange={(e) => setNewCompany({ ...newCompany, adminPassword: e.target.value })}
                                            placeholder="Contraseña Inicial"
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-full"
                                        />
                                    </>
                                )}

                                {editingCompany ? (
                                    <>
                                        <button
                                            onClick={() => updateCompanyMutation.mutate(editingCompany)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit2 size={18} />
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditingCompany(null)}
                                            className="bg-slate-400 hover:bg-slate-500 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} className="rotate-45" />
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (newCompany.companyName && newCompany.adminUsername && newCompany.adminPassword) {
                                                createCompanyMutation.mutate(newCompany);
                                                setNewCompany({ companyName: '', adminUsername: '', adminPassword: '' });
                                            } else {
                                                toast.error("Por favor completa todos los campos (Nombre, Usuario y Contraseña)");
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Crear Empresa
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-md font-semibold text-slate-700 mb-3">Empresas Registradas</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {companies?.map((c: any) => (
                                    <div key={c.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-colors">
                                        <div>
                                            <div className="flex items-center space-x-3 mb-2">
                                                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                                                    <Building size={20} />
                                                </div>
                                                <h5 className="font-bold text-slate-800">{c.name}</h5>
                                            </div>
                                            <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md">
                                                <p className="font-semibold mb-1">Admins:</p>
                                                <ul className="list-disc list-inside">
                                                    {c.users?.map((u: any) => (
                                                        <li key={u.username}>{u.username}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity pt-3 border-t border-slate-100">
                                            <button
                                                onClick={() => setEditingCompany(c)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors p-1"
                                                title="Editar Nombre"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete({ id: c.id, type: 'company', message: '¿Estás seguro de eliminar esta empresa? Esto borrará TODOS sus datos asociados y no se puede deshacer.' })}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                title="Eliminar Empresa"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'salesTeams' && (
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800">Equipos Integrales (Ventas)</h3>
                            <div className="flex gap-2">
                                <input
                                    value={editingSalesTeam ? editingSalesTeam.name : newSalesTeam.name}
                                    onChange={(e) => editingSalesTeam
                                        ? setEditingSalesTeam({ ...editingSalesTeam, name: e.target.value })
                                        : setNewSalesTeam({ ...newSalesTeam, name: e.target.value })
                                    }
                                    placeholder={editingSalesTeam ? "Editando equipo..." : "Nuevo equipo..."}
                                    className={`bg-slate-50 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${editingSalesTeam ? 'border-yellow-300 ring-2 ring-yellow-100' : 'border-slate-200'}`}
                                />
                                <select
                                    value={editingSalesTeam ? (editingSalesTeam.supervisorId || '') : newSalesTeam.supervisorId}
                                    onChange={(e) => editingSalesTeam
                                        ? setEditingSalesTeam({ ...editingSalesTeam, supervisorId: e.target.value })
                                        : setNewSalesTeam({ ...newSalesTeam, supervisorId: e.target.value })
                                    }
                                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Supervisor...</option>
                                    {employees?.filter((e: any) => e.role === 'SUPERVISOR').map((e: any) => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>

                                {editingSalesTeam ? (
                                    <>
                                        <button
                                            onClick={() => updateSalesTeamMutation.mutate(editingSalesTeam)}
                                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors"
                                            title="Guardar Cambios"
                                        >
                                            <Edit2 size={20} />
                                        </button>
                                        <button
                                            onClick={() => setEditingSalesTeam(null)}
                                            className="bg-slate-400 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
                                            title="Cancelar Edición"
                                        >
                                            <Plus size={20} className="rotate-45" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (newSalesTeam.name && newSalesTeam.supervisorId) {
                                                createSalesTeamMutation.mutate(newSalesTeam);
                                                setNewSalesTeam({ name: '', supervisorId: '' });
                                            }
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"
                                        title="Crear Equipo"
                                    >
                                        <Plus size={20} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {salesTeams?.map((t: any) => (
                                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                                                <Users size={20} />
                                            </div>
                                            <h5 className="font-bold text-slate-800">{t.name}</h5>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-sm text-slate-500">
                                        <p>Supervisor: <span className="font-semibold text-slate-700">{t.supervisor?.name || '-'}</span></p>
                                        <p>Miembros: <span className="font-semibold text-slate-700">{t._count?.members || 0}</span></p>
                                        {t.members?.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-50">
                                                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Integrantes:</p>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    {t.members.map((m: any) => m.name).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => setEditingSalesTeam(t)}
                                            className="text-slate-400 hover:text-blue-500 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setItemToDelete({ id: t.id, type: 'salesTeam', message: '¿Estás seguro de eliminar este equipo integral?' })}
                                            className="text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
            {
                activeTab === 'config' && (
                    <div className="glass-card p-8">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Configuración Global</h3>
                            <p className="text-slate-500">Ajusta los parámetros de visualización del sistema.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Fecha de Trabajo */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                    <Calendar className="text-blue-500" size={20} />
                                    Periodo de Trabajo
                                </h4>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Mes</label>
                                        <select
                                            value={month}
                                            onChange={(e) => setMonth(parseInt(e.target.value))}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                                <option key={m} value={m}>
                                                    {new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' }).charAt(0).toUpperCase() + new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' }).slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Año</label>
                                        <select
                                            value={year}
                                            onChange={(e) => setYear(parseInt(e.target.value))}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => 2024 + i).map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Empresa y Tema */}
                            <div className="space-y-4">
                                <h4 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                                    <Settings className="text-purple-500" size={20} />
                                    Preferencias
                                </h4>
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-600 mb-1">Empresa Activa</label>
                                        <select
                                            value={companyId || ''}
                                            onChange={(e) => {
                                                const id = e.target.value ? parseInt(e.target.value) : null;
                                                setCompanyId(id);
                                                if (id) {
                                                    const selected = companies?.find((c: any) => c.id === id);
                                                    if (selected) setCompanyName(selected.name);
                                                }
                                            }}
                                            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Seleccionar Empresa...</option>
                                            {companies?.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-400 mt-1">Cambia la visualización de datos globales.</p>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                                        <span className="text-sm font-medium text-slate-700">Modo Oscuro</span>
                                        <button
                                            onClick={toggleTheme}
                                            className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-800 text-yellow-400' : 'bg-orange-100 text-orange-500'}`}
                                        >
                                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            {activeTab === 'kpis' && <KpiSettings />}
            {activeTab === 'penalties' && <PenalizationSettings />}
            {/* Delete Confirmation Modal */}
            {itemToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ animation: 'scaleUp 0.15s ease-out' }}>
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="p-3 bg-red-100 text-red-600 rounded-full">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Confirmar Eliminación</h3>
                        </div>
                        <p className="text-slate-600 mb-6">{itemToDelete.message}</p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium border border-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg transition-colors font-medium shadow-sm"
                            >
                                Sí, eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {cropImageSrc && (
                <ImageCropperModal
                    imageSrc={cropImageSrc}
                    onCropSave={(blob) => {
                        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                        if (editingEmployee) setEditingEmployee({ ...editingEmployee, photoFile: file });
                        else setNewEmployee({ ...newEmployee, photoFile: file });
                        setCropImageSrc(null);
                    }}
                    onCancel={() => setCropImageSrc(null)}
                />
            )}
        </div >
    );
}
