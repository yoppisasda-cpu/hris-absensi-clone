'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!isMounted) return;

        const token = localStorage.getItem('jwt_token');
        const role = localStorage.getItem('userRole');

        if (!token || role === 'EMPLOYEE') {
            router.push('/');
        }
    }, [isMounted, router]);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" style={{ display: 'flex', height: '100vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
            {/* Sidebar Kiri */}
            <div id="main-sidebar" className="print:hidden">
                <Sidebar />
            </div>

            {/* Konten Kanan */}
            <div className="flex flex-1 flex-col overflow-hidden" style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header Atas */}
                <div id="main-header" className="print:hidden">
                    <Header />
                </div>

                {/* Main Workspace */}
                <main className="flex-1 overflow-y-auto p-6 transition-all duration-300" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ margin: '0 auto', maxWidth: '80rem' }}>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
