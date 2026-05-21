import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Swords, Map, Target, Database } from 'lucide-react';
import { DailyTraining } from '../components/university/DailyTraining';
import { FieldCoaching } from '../components/university/FieldCoaching';
import { CompetitionMatrix } from '../components/university/CompetitionMatrix';
import { KnowledgeBases } from '../components/university/KnowledgeBases';
import { StudyMaterial } from '../components/university/StudyMaterial';
import { EvaluationResults } from '../components/university/EvaluationResults';
import { BookOpen, ClipboardList } from 'lucide-react';

export default function SalesUniversity() {
    const { tab } = useParams<{ tab: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'training' | 'coaching' | 'competition' | 'knowledge' | 'study' | 'results'>('training');

    useEffect(() => {
        if (tab && ['training', 'coaching', 'competition', 'knowledge', 'study', 'results'].includes(tab)) {
            setActiveTab(tab as any);
        }
    }, [tab]);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab as any);
        navigate(`/university/${newTab}`);
    };

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-8">
                <div className="flex items-center space-x-4 mb-2">
                    <div className="p-3 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl shadow-sm border border-indigo-500/10">
                        <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={28} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight premium-gradient-text">
                            Universidad de Ventas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-light mt-1">
                            Entrenamiento, evaluación y conocimiento competitivo en un solo lugar.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 bg-slate-200/30 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm mb-8 w-fit">
                <button
                    onClick={() => handleTabChange('training')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'training' 
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <Swords size={18} />
                    <span>Entrenamiento</span>
                </button>
                <button
                    onClick={() => handleTabChange('coaching')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'coaching' 
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <Map size={18} />
                    <span>Coaching</span>
                </button>
                <button
                    onClick={() => handleTabChange('competition')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'competition' 
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <Target size={18} />
                    <span>Competencia</span>
                </button>
                <button
                    onClick={() => handleTabChange('knowledge')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'knowledge' 
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <Database size={18} />
                    <span>Conocimiento</span>
                </button>
                <button
                    onClick={() => handleTabChange('study')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'study' 
                        ? 'bg-white dark:bg-amber-600 text-amber-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <BookOpen size={18} />
                    <span>Material</span>
                </button>
                <button
                    onClick={() => handleTabChange('results')}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center space-x-2 ${
                        activeTab === 'results' 
                        ? 'bg-white dark:bg-emerald-600 text-emerald-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'
                    }`}
                >
                    <ClipboardList size={18} />
                    <span>Resultados</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-4">
                {activeTab === 'training' && <DailyTraining />}
                {activeTab === 'coaching' && <FieldCoaching />}
                {activeTab === 'competition' && <CompetitionMatrix />}
                {activeTab === 'knowledge' && <KnowledgeBases />}
                {activeTab === 'study' && <StudyMaterial />}
                {activeTab === 'results' && <EvaluationResults />}
            </div>
        </div>
    );
}
