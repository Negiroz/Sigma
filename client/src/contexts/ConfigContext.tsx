import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConfigState {
    month: number;
    year: number;
    companyId: number | null;
    companyName: string;
    theme: 'light' | 'dark';
    setMonth: (m: number) => void;
    setYear: (y: number) => void;
    setCompanyId: (id: number | null) => void;
    setCompanyName: (name: string) => void;
    toggleTheme: () => void;
}

const ConfigContext = createContext<ConfigState | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initial values from localStorage or defaults
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    const [companyId, setCompanyId] = useState<number | null>(() => {
        const saved = localStorage.getItem('config_companyId');
        return saved ? parseInt(saved) : 1; // Default to ID 1 or null
    });

    const [companyName, setCompanyName] = useState<string>(() => {
        const saved = localStorage.getItem('config_companyName');
        if (saved === 'KPI System') return 'SIGMA';
        return saved || 'SIGMA';
    });

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('config_theme');
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    });

    // --- Side Effects ---

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('config_month', month.toString());
        localStorage.setItem('config_year', year.toString());
        if (companyId) localStorage.setItem('config_companyId', companyId.toString());
        localStorage.setItem('config_companyName', companyName);
        localStorage.setItem('config_theme', theme);
    }, [month, year, companyId, companyName, theme]);

    // Apply Theme
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <ConfigContext.Provider value={{
            month,
            year,
            companyId,
            companyName,
            theme,
            setMonth,
            setYear,
            setCompanyId,
            setCompanyName,
            toggleTheme
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfig must be used within a ConfigProvider');
    }
    return context;
};
