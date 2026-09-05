const fs = require('fs');
let content = fs.readFileSync('web-admin/src/app/dashboard/reimbursements/page.tsx', 'utf-8');

// 1. Add RotateCcw to imports
content = content.replace("Receipt, CheckCircle, XCircle, User, Eye, Download, Search, AlertTriangle, Cpu, CreditCard, FileSpreadsheet } from 'lucide-react';", "Receipt, CheckCircle, XCircle, User, Eye, Download, Search, AlertTriangle, Cpu, CreditCard, FileSpreadsheet, RotateCcw } from 'lucide-react';");

// 2. Change handleUpdateStatus signature
content = content.replace("const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {", "const handleUpdateStatus = async (id: number, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {");

// 3. Change JSX rendering for APPROVED/REJECTED
const oldJsx = `                                            ) : (claim.status === 'APPROVED' && !claim.isPaid) ? (
                                                <button
                                                    onClick={() => openPayModal(claim)}
                                                    className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                >
                                                    <CreditCard className="h-3.5 w-3.5" />
                                                    BAYAR SEKARANG
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">Selesai</span>
                                            )}`;

const newJsx = `                                            ) : (claim.status === 'APPROVED' && !claim.isPaid) ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => openPayModal(claim)}
                                                        className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        BAYAR SEKARANG
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(claim.id, 'PENDING')}
                                                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 flex-shrink-0"
                                                        title="Batal Setuju (Kembalikan ke Pending)"
                                                    >
                                                        <RotateCcw className="h-4 w-4 mt-0.5" />
                                                    </button>
                                                </div>
                                            ) : (claim.status === 'REJECTED') ? (
                                                <div className="flex justify-end items-center gap-2">
                                                    <span className="text-[10px] text-red-500 font-bold mr-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">DITOLAK</span>
                                                    <button
                                                        onClick={() => handleUpdateStatus(claim.id, 'PENDING')}
                                                        className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors border border-transparent hover:border-slate-200 flex-shrink-0"
                                                        title="Batal Tolak (Kembalikan ke Pending)"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-medium">Selesai</span>
                                            )}`;

content = content.replace(oldJsx, newJsx);

fs.writeFileSync('web-admin/src/app/dashboard/reimbursements/page.tsx', content);
