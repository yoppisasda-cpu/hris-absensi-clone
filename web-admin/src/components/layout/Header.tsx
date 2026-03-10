'use client';

import { useState, useEffect } from 'react';
import { Bell, UserCircle, Globe } from "lucide-react"
import api from '@/lib/api';
import { useLanguage } from '@/lib/LanguageContext';

export default function Header() {
    const { language, setLanguage } = useLanguage();
    const [profileName, setProfileName] = useState('Memuat...');
    const [roleLabel, setRoleLabel] = useState('-');
    const [companyName, setCompanyName] = useState('');

    useEffect(() => {
        const name = localStorage.getItem('userName');
        if (name) setProfileName(name);

        const r = localStorage.getItem('userRole');
        if (r === 'SUPERADMIN') setRoleLabel('SaaS Owner');
        else if (r === 'ADMIN') setRoleLabel('HR Director');
        else if (r) setRoleLabel('Karyawan');

        const token = localStorage.getItem('jwt_token');
        if (!token) return;

        const fetchCompany = async () => {
            try {
                const response = await api.get('/companies/my');
                if (response.data && response.data.name) {
                    setCompanyName(response.data.name);
                }
            } catch (error) {
                console.error("Gagal mengambil info perusahaan", error);
            }
        };

        fetchCompany();
    }, []);
    return (
        <header className="flex h-16 w-full items-center justify-between border-b bg-white px-6 shadow-sm">
            <div className="flex items-center gap-4 text-slate-500">
                {/* Search removed as requested */}
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                >
                    <Globe className="h-3.5 w-3.5" />
                    {language.toUpperCase()}
                </button>

                <button className="relative text-slate-400 hover:text-slate-600">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-0 top-0 flex h-2 w-2 rounded-full bg-red-500"></span>
                </button>

                <div className="flex items-center gap-3 border-l pl-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{profileName}</p>
                        <p className="text-xs text-slate-500">{roleLabel} - {companyName}</p>
                    </div>
                    <UserCircle className="h-8 w-8 text-slate-400" />
                </div>
            </div>
        </header>
    )
}
