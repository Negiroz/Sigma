import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface PenalizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    initialReasons: string; // JSON string or plain text
    onSave?: (count: number, reasons: string) => void;
    readonly?: boolean;
}

export default function PenalizationModal({ isOpen, onClose, employeeName, initialReasons, onSave, readonly = false }: PenalizationModalProps) {
    const [reasons, setReasons] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            try {
                const parsed = JSON.parse(initialReasons || '[]');
                if (Array.isArray(parsed)) {
                    setReasons(parsed);
                } else {
                    setReasons(initialReasons ? [initialReasons] : []);
                }
            } catch (e) {
                setReasons(initialReasons ? [initialReasons] : []);
            }
        }
    }, [isOpen, initialReasons]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (readonly) return;
        setReasons([...reasons, '']);
    };

    const handleRemove = (index: number) => {
        if (readonly) return;
        const next = [...reasons];
        next.splice(index, 1);
        setReasons(next);
    };

    const handleChange = (index: number, val: string) => {
        if (readonly) return;
        const next = [...reasons];
        next[index] = val;
        setReasons(next);
    };

    const handleSave = () => {
        if (readonly) {
            onClose();
            return;
        }
        const validReasons = reasons.filter(r => r.trim() !== '');
        if (onSave) onSave(validReasons.length, JSON.stringify(validReasons));
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 relative z-[9999]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden z-[10000]">
                <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-800">
                        Penalizaciones: {employeeName}
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                    {reasons.length === 0 && (
                        <div className="text-center text-slate-500 py-4 text-sm">
                            No hay penalizaciones registradas.
                        </div>
                    )}
                    {reasons.map((r, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <input 
                                type="text"
                                value={r}
                                onChange={e => handleChange(i, e.target.value)}
                                placeholder="Motivo de la penalización..."
                                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none w-full disabled:bg-slate-50 disabled:text-slate-700"
                                disabled={readonly}
                            />
                            {!readonly && (
                                <button 
                                    onClick={() => handleRemove(i)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))}
                    {!readonly && (
                        <button 
                            onClick={handleAdd}
                            className="w-full py-2 border-2 border-dashed border-slate-200 text-slate-500 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                        >
                            <Plus size={16} />
                            <span>Agregar Penalización</span>
                        </button>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                    <button onClick={onClose} className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm ${readonly ? 'bg-slate-800 text-white hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-200'}`}>
                        {readonly ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!readonly && (
                        <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors text-sm shadow-sm">
                            Guardar Penalizaciones
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
