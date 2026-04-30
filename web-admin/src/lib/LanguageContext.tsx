'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import id from '../locales/id.json';

type Translations = typeof id;

interface LanguageContextType {
    language: string;
    setLanguage: (lang: string) => void;
    t: (key: string) => string;
}

const translations: Record<string, any> = { en, id };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState('id');

    useEffect(() => {
        const savedLang = localStorage.getItem('app_language');
        if (savedLang && (savedLang === 'en' || savedLang === 'id')) {
            setLanguageState(savedLang);
        }
    }, []);

    const setLanguage = (lang: string) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);

        // Proactive: Save to backend if token exists
        const token = localStorage.getItem('token');
        if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}/users/me/settings`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ language: lang })
            }).catch(err => console.error('Failed to sync language to backend', err));
        }
    };

    const t = (path: string) => {
        const keys = path.split('.');
        let current = translations[language];

        for (const key of keys) {
            if (current && current[key]) {
                current = current[key];
            } else {
                return path; // Fallback to key name
            }
        }

        return current as string;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
