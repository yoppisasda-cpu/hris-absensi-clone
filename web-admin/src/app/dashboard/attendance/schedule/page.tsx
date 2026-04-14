'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from '@/lib/api';
import { 
    CalendarCheck, Search, Filter, Save, Clock, Ban, X, AlertTriangle
} from 'lucide-react';

interface Shift {
    id: number;
    title: string;
    startTime: string;
    endTime: string;
}

interface User {
    id: number;
    name: string;
    jobTitle: string;
    branchId: number;
    shiftId: number | null; // default shift from profile
    shift?: Shift;
}

interface Branch {
    id: number;
    name: string;
}

interface Schedule {
    id: number;
    userId: number;
    shiftId: number | null;
    isOff: boolean;
    date: string;
}

const SHIFT_COLORS = [
    { bg: '#eef2ff', text: '#4f46e5' }, // Indigo
    { bg: '#f0fdf4', text: '#16a34a' }, // Green
    { bg: '#fff7ed', text: '#ea580c' }, // Orange
    { bg: '#fdf4ff', text: '#c026d3' }, // Fuchsia
    { bg: '#ecfeff', text: '#0891b2' }, // Cyan
    { bg: '#fdf8ea', text: '#d97706' }, // Amber
    { bg: '#faf5ff', text: '#9333ea' }, // Purple
];

export default function SchedulingMatrixPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Filters
    const [filterBranch, setFilterBranch] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [userSearch, setUserSearch] = useState('');

    // Matrix State adjustments
    // Key: "userId|yyyy-mm-dd", Value: "DEFAULT" | "OFF" | "shiftId"
    const [dirtyCells, setDirtyCells] = useState<Record<string, string>>({});

    const fetchData = async () => {
        setIsLoading(true);
        setDirtyCells({}); // reset dirt
        try {
            const [usersRes, branchesRes, shiftsRes, schedulesRes] = await Promise.all([
                api.get('/users'),
                api.get('/branches'),
                api.get('/shifts'),
                api.get('/schedules', { params: { month: filterMonth, year: filterYear } })
            ]);
            setUsers(usersRes.data);
            setBranches(branchesRes.data);
            setShifts(shiftsRes.data);
            setSchedules(schedulesRes.data);
        } catch (err) {
            console.error('Failed to fetch data.', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterMonth, filterYear]);

    // Computed Data
    const daysInMonth = new Date(filterYear, filterMonth, 0).getDate();
    const headers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            (u.name.toLowerCase().includes(userSearch.toLowerCase())) &&
            (filterBranch === '' || u.branchId === parseInt(filterBranch))
        );
    }, [users, userSearch, filterBranch]);

    // Fast lookup for loaded schedules: dict[userId][dateStr] = schedule
    const scheduleMap = useMemo(() => {
        const dict: Record<number, Record<string, Schedule>> = {};
        schedules.forEach(sc => {
            const dateStr = sc.date.split('T')[0];
            if (!dict[sc.userId]) dict[sc.userId] = {};
            dict[sc.userId][dateStr] = sc;
        });
        return dict;
    }, [schedules]);

    const handleCellChange = (userId: number, day: number, value: string) => {
        const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${userId}|${dateStr}`;
        setDirtyCells(prev => {
            const next = { ...prev, [key]: value };
            return next;
        });
    };

    const getCellValue = (userId: number, day: number) => {
        const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const key = `${userId}|${dateStr}`;
        
        // 1. Check if user modified it
        if (dirtyCells[key] !== undefined) return dirtyCells[key];

        // 2. Check if DB has specific schedule
        const dbSchedule = scheduleMap[userId]?.[dateStr];
        if (dbSchedule) {
            if (dbSchedule.isOff) return 'OFF';
            if (dbSchedule.shiftId) return dbSchedule.shiftId.toString();
        }

        // 3. Otherwise Default
        return 'DEFAULT';
    };

    const handleSaveMatrix = async () => {
        const keys = Object.keys(dirtyCells);
        if (keys.length === 0) return;

        const changes = keys.map(k => {
            const [userIdStr, date] = k.split('|');
            const val = dirtyCells[k];
            return {
                userId: parseInt(userIdStr),
                date,
                isDefault: val === 'DEFAULT',
                isOff: val === 'OFF',
                shiftId: (val !== 'DEFAULT' && val !== 'OFF') ? val : null
            };
        });

        setIsSaving(true);
        try {
            const res = await api.post('/schedules/matrix', { changes });
            alert(res.data.message || 'Jadwal berhasil diperbarui!');
            fetchData();
        } catch (err: any) {
            alert('Gagal menyimpan jadwal: ' + (err.response?.data?.error || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    const hasChanges = Object.keys(dirtyCells).length > 0;

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <CalendarCheck className="h-7 w-7 text-indigo-600" />
                        Matrix Penjadwalan Shift
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Atur shift spesifik harian. Pilih [-- Default --] untuk ikuti shift bawaan profil.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 mb-6 mx-2">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Filter:</span>
                </div>
                
                <select 
                    value={filterMonth} 
                    onChange={e => setFilterMonth(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('id-ID', {month: 'long'})}</option>
                    ))}
                </select>

                <select 
                    value={filterYear} 
                    onChange={e => setFilterYear(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                </select>

                <select 
                    value={filterBranch} 
                    onChange={e => setFilterBranch(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                    <option value="">Semua Cabang (Global)</option>
                    {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Cari Karyawan..." 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                </div>
            </div>

            {/* Matrix Table */}
            <div className="mx-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-24 relative">
                <style jsx>{`
                    .matrix-select {
                        appearance: none;
                        background: transparent;
                        border: none;
                        outline: none;
                        font-size: 11px;
                        font-weight: 600;
                        width: 100%;
                        height: 100%;
                        padding: 6px;
                        cursor: pointer;
                        text-align: center;
                        text-align-last: center;
                    }
                    .matrix-cell {
                        min-width: 75px;
                        padding: 0;
                        border-right: 1px solid #f1f5f9;
                        border-bottom: 1px solid #f1f5f9;
                        position: relative;
                        transition: background-color 0.2s;
                    }
                    .matrix-cell:hover {
                        background-color: #f8fafc;
                    }
                    .cell-MODIFIED { box-shadow: inset 0 0 0 1.5px #f59e0b; }
                `}</style>
                <div className="overflow-x-auto h-[65vh]" style={{ scrollBehavior: 'smooth' }}>
                    <table className="w-full text-left text-sm border-collapse" style={{ minWidth: 'max-content' }}>
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)] w-[250px] min-w-[250px]">
                                    Nama Karyawan
                                </th>
                                {headers.map(day => (
                                    <th key={day} className="py-3 text-center border-r border-slate-200 w-[75px] min-w-[75px]">
                                        <div className="flex flex-col items-center">
                                            <span>{day}</span>
                                            <span className="text-[8px] font-medium text-slate-400">
                                                {new Date(filterYear, filterMonth - 1, day).toLocaleString('id-ID', { weekday: 'short' })}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="px-6 py-12 text-center text-slate-400">
                                        Memuat Matrix...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={daysInMonth + 1} className="px-6 py-12 text-center text-slate-400 italic">
                                        Tidak ada data karyawan sesuai filter.
                                    </td>
                                </tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="px-4 py-2 sticky left-0 z-10 bg-white border-r border-b border-slate-200 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.05)] w-[250px] min-w-[250px]">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800 text-xs truncate" title={user.name}>{user.name}</span>
                                            <span className="text-[9px] text-slate-400 uppercase truncate">
                                                {user.shift?.title ? `Default: ${user.shift.title}` : 'Tanpa Shift Default'}
                                            </span>
                                        </div>
                                    </td>
                                    {headers.map(day => {
                                        const dateStr = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const isModified = dirtyCells[`${user.id}|${dateStr}`] !== undefined;
                                        const cellVal = getCellValue(user.id, day);
                                        
                                        let dynamicStyle = { backgroundColor: 'transparent', color: '#94a3b8' };
                                        if (cellVal === 'OFF') {
                                            dynamicStyle = { backgroundColor: '#fef2f2', color: '#ef4444' };
                                        } else if (cellVal !== 'DEFAULT') {
                                            const sId = parseInt(cellVal) || 0;
                                            const shiftColor = SHIFT_COLORS[sId % SHIFT_COLORS.length];
                                            dynamicStyle = { backgroundColor: shiftColor.bg, color: shiftColor.text };
                                        }

                                        const cellClass = `matrix-cell ${isModified ? 'cell-MODIFIED' : ''}`;

                                        return (
                                            <td key={day} className={cellClass} style={dynamicStyle}>
                                                <select 
                                                    className="matrix-select"
                                                    value={cellVal}
                                                    onChange={(e) => handleCellChange(user.id, day, e.target.value)}
                                                    title={isModified ? 'Telah diubah (Belum disimpan)' : ''}
                                                    style={{ color: dynamicStyle.color }}
                                                >
                                                    <option value="DEFAULT">--</option>
                                                    <option value="OFF">OFF</option>
                                                    {shifts.map(s => (
                                                        <option key={s.id} value={s.id}>{s.title}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Action Bar untuk Save */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] border border-slate-700 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400" />
                            <span className="text-sm font-semibold">{Object.keys(dirtyCells).length} Perubahan belum disimpan</span>
                        </div>
                        <div className="h-6 w-px bg-slate-700 mx-2"></div>
                        <button 
                            onClick={() => setDirtyCells({})}
                            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                            <X className="h-3 w-3" /> Batal
                        </button>
                        <button 
                            onClick={handleSaveMatrix}
                            disabled={isSaving}
                            className="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white text-sm font-bold py-1.5 px-4 rounded-full transition-colors flex items-center gap-2 ml-2"
                        >
                            {isSaving ? (
                                <div className="h-3 w-3 border-2 border-white/30 border-t-white animate-spin rounded-full"></div>
                            ) : <Save className="h-3 w-3" />}
                            Simpan Perubahan
                        </button>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
