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
        <div className="flex h-screen bg-[#020617] overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 font-sans">
            {/* Sidebar Kiri */}
            <div id="main-sidebar" className="print:hidden z-30 transition-all duration-500 ease-in-out">
                <Sidebar />
            </div>

            {/* Konten Kanan */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Header Atas - Floating Style */}
                <div id="main-header" className="print:hidden z-20 px-8 pt-6">
                    <Header />
                </div>

                {/* Main Workspace */}
                <main className="flex-1 overflow-y-auto px-10 py-8 transition-all duration-300 scroll-smooth no-scrollbar">
                    <div className="mx-auto max-w-[1600px] animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                        {children}
                    </div>
                </main>

                {/* Background Decorative Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -z-10 translate-x-1/4 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none -z-10 -translate-x-1/4 translate-y-1/4" />
            </div>
        </div>
    );
}
