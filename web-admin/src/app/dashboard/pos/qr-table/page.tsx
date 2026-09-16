'use client';

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode } from "lucide-react";

export default function QRTablePage() {
    const [numTables, setNumTables] = useState<number>(10);
    const [companyId, setCompanyId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        try {
            const tenantId = localStorage.getItem('currentTenantId');
            if (tenantId) {
                setCompanyId(Number(tenantId));
            } else {
                const res = await api.get('/companies/my');
                if (res.data && res.data.id) {
                    setCompanyId(res.data.id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch company info", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;

    if (!companyId) return (
        <DashboardLayout>
            <div className="p-8 text-red-500">Error: Company ID not found for this user.</div>
        </DashboardLayout>
    );

    const tables = Array.from({ length: numTables }, (_, i) => i + 1);

    return (
        <DashboardLayout>
            <div className="p-4 md:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <QrCode className="w-6 h-6 text-blue-500" />
                            Cetak QR Meja
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Buat QR Code untuk pelanggan agar bisa pesan langsung dari meja (Order Online).
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col">
                            <label className="text-xs text-slate-500 font-semibold mb-1">Jumlah Meja</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={numTables}
                                onChange={(e) => setNumTables(Number(e.target.value) || 1)}
                                className="w-24 px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 bg-white"
                            />
                        </div>
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all self-end h-[38px]"
                        >
                            <Printer className="w-4 h-4" />
                            Print QR
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
                    {/* Print specific styles */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #qr-print-area, #qr-print-area * {
                                visibility: visible;
                            }
                            #qr-print-area {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            .qr-card {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    `}} />

                    <div id="qr-print-area" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {tables.map(table => {
                            const url = `https://order.aivola.id/#/?tenant=${companyId}&table=${table}`;
                            return (
                                <div key={table} className="qr-card flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Meja {table}</h3>
                                    <div className="bg-white p-3 rounded-xl shadow-sm">
                                        <QRCodeSVG 
                                            value={url} 
                                            size={120}
                                            level="Q"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400 mt-4 text-center">Scan untuk pesan</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
