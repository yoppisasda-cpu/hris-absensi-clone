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

        // Global handler for ChunkLoadError (highly recommended for Next.js production deployments)
        const handleGlobalError = (event: ErrorEvent) => {
            const errorMsg = event.message || '';
            const errorStack = event.error?.stack || '';
            const isChunkError = 
                errorMsg.toLowerCase().includes('chunk') || 
                errorMsg.toLowerCase().includes('loading chunk') ||
                errorStack.toLowerCase().includes('chunk') ||
                errorStack.toLowerCase().includes('loading chunk') ||
                event.error?.name === 'ChunkLoadError';

            if (isChunkError) {
                console.warn('[System] Chunk load error detected. Reloading page to fetch the latest application build...');
                window.location.reload();
            }
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const errorMsg = event.reason?.message || '';
            const errorStack = event.reason?.stack || '';
            const isChunkError = 
                errorMsg.toLowerCase().includes('chunk') || 
                errorMsg.toLowerCase().includes('loading chunk') ||
                errorStack.toLowerCase().includes('chunk') ||
                errorStack.toLowerCase().includes('loading chunk') ||
                event.reason?.name === 'ChunkLoadError';

            if (isChunkError) {
                console.warn('[System] Chunk load rejection detected. Reloading page to fetch the latest application build...');
                window.location.reload();
            }
        };

        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
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
