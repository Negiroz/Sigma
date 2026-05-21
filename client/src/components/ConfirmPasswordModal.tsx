import React, { useState } from 'react';
import { Shield, X, Loader2 } from 'lucide-react';

interface ConfirmPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    title: string;
    description: string;
    isLoading?: boolean;
}

export default function ConfirmPasswordModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    isLoading
}: ConfirmPasswordModalProps) {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(password);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-2 text-red-600">
                            <Shield size={20} />
                            <h3 className="font-bold text-lg">{title}</h3>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>

                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        {description}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Contraseña de Administrador
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono"
                                placeholder="••••••••"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="flex space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !password}
                                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin mr-2" size={18} />
                                ) : null}
                                Confirmar Reinicio
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
