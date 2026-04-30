'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { Building2, MapPin, Save, AlertTriangle, Trash2, Globe, Edit2, FileText, CheckCircle2, Download, X, MessageSquare, Wand2, Loader2 } from 'lucide-react';
import MapPicker from '@/components/maps/MapPicker';

interface Company {
    id: number;
    name: string;
    latitude: number | null;
    longitude: number | null;
    radius: number | null;
    picName: string | null;
    picPhone: string | null;
    contractType: 'BULANAN' | 'TAHUNAN';
    contractValue: number;
    contractStart: string | null;
    contractEnd: string | null;
    employeeLimit: number;
    adminLimit: number;
    posLimit: number;
    photoRetentionDays?: number;
    purchasedInsights?: string[];
    plan?: 'STARTER' | 'PRO' | 'ENTERPRISE';
    addons?: string[];
    _count?: {
        users: number;
    };
    discountKpi?: number;
    discountLearning?: number;
    discountInventory?: number;
    discountAi?: number;
    discountFraud?: number;
    discountExpansion?: number;
    discountProspecting?: number;
    waApiKey?: string | null;
    waGatewayUrl?: string | null;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const isNearingExpiry = (dateString: string | null) => {
        if (!dateString) return false;
        const expiryDate = new Date(dateString);
        const now = new Date();
        const diffTime = expiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30 && diffDays > 0;
    };

    const isExpired = (dateString: string | null) => {
        if (!dateString) return false;
        const expiryDate = new Date(dateString);
        const now = new Date();
        return expiryDate < now;
    };

    // Form States
    const [name, setName] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('100'); // Default 100m
    
    // contract states
    const [picName, setPicName] = useState('');
    const [picPhone, setPicPhone] = useState('');
    const [contractType, setContractType] = useState('BULANAN');
    const [contractValue, setContractValue] = useState('0');
    const [contractStart, setContractStart] = useState('');
    const [contractEnd, setContractEnd] = useState('');
    const [employeeLimit, setEmployeeLimit] = useState('0');
    const [adminLimit, setAdminLimit] = useState('2');
    const [posLimit, setPosLimit] = useState('1');
    const [photoRetentionDays, setPhotoRetentionDays] = useState('30');

    // Add-on states
    const [plan, setPlan] = useState<'STARTER' | 'PRO' | 'ENTERPRISE'>('STARTER');
    const [addonKpi, setAddonKpi] = useState(false);
    const [addonLearning, setAddonLearning] = useState(false);
    const [addonInventory, setAddonInventory] = useState(false);
    const [addonAi, setAddonAi] = useState(false);
    const [addonFraud, setAddonFraud] = useState(false);
    const [addonExpansion, setAddonExpansion] = useState(false);
    const [addonProspecting, setAddonProspecting] = useState(false);
    const [addonAivolaGo, setAddonAivolaGo] = useState(false);

    // Discount States (Percent)
    const [discountKpi, setDiscountKpi] = useState('0');
    const [discountLearning, setDiscountLearning] = useState('0');
    const [discountInventory, setDiscountInventory] = useState('0');
    const [discountAi, setDiscountAi] = useState('0');
    const [discountFraud, setDiscountFraud] = useState('0');
    const [discountExpansion, setDiscountExpansion] = useState('0');
    const [discountProspecting, setDiscountProspecting] = useState('0');

    // Admin Account States
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [waApiKey, setWaApiKey] = useState('');
    const [waGatewayUrl, setWaGatewayUrl] = useState('');

    const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
    const [isAiLoading, setIsAiLoading] = useState<number | null>(null);
    const [isMapOpen, setIsMapOpen] = useState(false);

    const handleAiReply = async (company: Company) => {
        if (!company.picPhone) {
            alert("Nomor HP PIC tidak ditemukan!");
            return;
        }

        setIsAiLoading(company.id);
        try {
            const res = await api.post('/ai/subscription-draft', {
                clientName: company.picName || company.name,
                plan: company.plan || 'STARTER',
                isAnnual: company.contractType === 'TAHUNAN'
            });
            
            const draft = res.data.draft;
            let phone = company.picPhone.replace(/\D/g, '');
            if (phone.startsWith('0')) {
                phone = '62' + phone.substring(1);
            }
            
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(draft)}`;
            window.open(waUrl, '_blank');
        } catch (error) {
            console.error("Gagal membuat draf AI:", error);
            alert("Gagal menghubungi AI Assistant.");
        } finally {
            setIsAiLoading(null);
        }
    };
    
    // Invoice States
    const [selectedInvoiceCompany, setSelectedInvoiceCompany] = useState<Company | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceDiscount, setInvoiceDiscount] = useState('0');

    // Fetch daftar perusahaan saat komponen dimuat
    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await api.get('/companies');
            setCompanies(res.data);
        } catch (error) {
            console.error('Gagal mengambil data klien:', error);
        }
    };

    const resetForm = () => {
        setEditingCompanyId(null);
        setName('');
        setLatitude('');
        setLongitude('');
        setRadius('100');
        setPicName('');
        setPicPhone('');
        setContractType('BULANAN');
        setContractValue('0');
        setContractStart('');
        setContractEnd('');
        setEmployeeLimit('0');
        setAdminLimit('2');
        setPosLimit('1');
        setPhotoRetentionDays('30');
        setPlan('STARTER');
        setAddonKpi(false);
        setAddonLearning(false);
        setAddonInventory(false);
        setAddonAi(false);
        setAddonFraud(false);
        setAddonExpansion(false);
        setDiscountKpi('0');
        setDiscountLearning('0');
        setDiscountInventory('0');
        setDiscountAi('0');
        setDiscountFraud('0');
        setDiscountExpansion('0');
        setDiscountProspecting('0');
        setAddonProspecting(false);
        setAddonAivolaGo(false);
        setAdminName('');
        setAdminEmail('');
        setAdminPassword('');
        setWaApiKey('');
        setWaGatewayUrl('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const buildInsights = () => {
                const insights: string[] = [];
                if (addonKpi && addonLearning) { insights.push('KPI_LEARNING'); }
                else {
                    if (addonKpi) insights.push('KPI');
                    if (addonLearning) insights.push('LEARNING');
                }
                return insights;
            };

            const payload = {
                name,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null,
                radius: parseInt(radius) || 100,
                picName,
                picPhone,
                contractType,
                contractValue: parseFloat(contractValue) || 0,
                contractStart: contractStart || null,
                contractEnd: contractEnd || null,
                employeeLimit: parseInt(employeeLimit) || 0,
                adminLimit: parseInt(adminLimit) || 0,
                posLimit: parseInt(posLimit) || 0,
                photoRetentionDays: parseInt(photoRetentionDays) || 30,
                purchasedInsights: buildInsights(),
                plan,
                addons: [
                    ...(addonInventory ? ['INVENTORY'] : []),
                    ...(addonAi ? ['AI_ADVISOR'] : []),
                    ...(addonFraud ? ['FRAUD_DETECTION'] : []),
                    ...(addonExpansion ? ['STAFF_EXPANSION'] : []),
                    ...(addonProspecting ? ['PROSPECTING_AI'] : []),
                    ...(addonAivolaGo ? ['AIVOLA_GO'] : [])
                ],
                discountKpi: parseInt(discountKpi) || 0,
                discountLearning: parseInt(discountLearning) || 0,
                discountInventory: parseInt(discountInventory) || 0,
                discountAi: parseInt(discountAi) || 0,
                discountFraud: parseInt(discountFraud) || 0,
                discountExpansion: parseInt(discountExpansion) || 0,
                discountProspecting: parseInt(discountProspecting) || 0,
                modules: (plan === 'PRO' || plan === 'ENTERPRISE') ? 'BOTH' : 'ABSENSI',
                adminName, adminEmail, adminPassword,
                waApiKey, waGatewayUrl
            };

            let res;
            if (editingCompanyId) {
                res = await api.patch(`/companies/${editingCompanyId}`, payload);
            } else {
                res = await api.post('/companies', payload);
            }

            if (res.status === 200 || res.status === 201) {
                // UPDATE LOCAL STORAGE IF WE ARE EDITING OUR OWN COMPANY
                const loggedInCompanyId = localStorage.getItem('companyId');
                if (editingCompanyId && loggedInCompanyId === editingCompanyId.toString()) {
                    localStorage.setItem('userPlan', plan);
                    localStorage.setItem('userAddons', JSON.stringify([
                        ...(addonInventory ? ['INVENTORY'] : []),
                        ...(addonAi ? ['AI_ADVISOR'] : []),
                        ...(addonFraud ? ['FRAUD_DETECTION'] : []),
                        ...(addonExpansion ? ['STAFF_EXPANSION'] : []),
                        ...(addonAivolaGo ? ['AIVOLA_GO'] : [])
                    ]));
                    // Trigger a storage event for other components like Sidebar to update
                    window.dispatchEvent(new Event('storage'));
                    // Force refresh or context update might be needed, but local storage is a good start
                }

                resetForm();
                fetchCompanies();
                alert(editingCompanyId ? 'Data klien berhasil diperbarui!' : 'Berhasil mendaftarkan klien dan admin baru!');
                
                // If it was our own company, reload to apply all changes across the app
                if (editingCompanyId && loggedInCompanyId === editingCompanyId.toString()) {
                    window.location.reload();
                }
            } else {
                alert('Gagal memproses data klien.');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Terjadi kesalahan jaringan.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (company: Company) => {
        setEditingCompanyId(company.id);
        setName(company.name);
        setLatitude(company.latitude?.toString() || '');
        setLongitude(company.longitude?.toString() || '');
        setRadius(company.radius?.toString() || '100');
        setPicName(company.picName || '');
        setPicPhone(company.picPhone || '');
        setContractType(company.contractType);
        setContractValue(company.contractValue?.toString() || '0');
        setContractStart(company.contractStart ? new Date(company.contractStart).toISOString().split('T')[0] : '');
        setContractEnd(company.contractEnd ? new Date(company.contractEnd).toISOString().split('T')[0] : '');
        setEmployeeLimit(company.employeeLimit?.toString() || '0');
        setAdminLimit(company.adminLimit?.toString() || '2');
        setPosLimit(company.posLimit?.toString() || '1');
        setPhotoRetentionDays(company.photoRetentionDays?.toString() || '30');
        setPlan(company.plan || 'STARTER');

        // Set add-on checkboxes
        const insights = company.purchasedInsights || [];
        setAddonKpi(insights.includes('KPI') || insights.includes('KPI_LEARNING'));
        setAddonLearning(insights.includes('LEARNING') || insights.includes('KPI_LEARNING'));
        
        const addons = company.addons || [];
        setAddonInventory(addons.includes('INVENTORY'));
        setAddonAi(addons.includes('AI_ADVISOR'));
        setAddonFraud(addons.includes('FRAUD_DETECTION'));
        setAddonExpansion(addons.includes('STAFF_EXPANSION'));
        setAddonProspecting(addons.includes('PROSPECTING_AI'));
        setAddonAivolaGo(addons.includes('AIVOLA_GO'));

        setDiscountKpi(company.discountKpi?.toString() || '0');
        setDiscountLearning(company.discountLearning?.toString() || '0');
        setDiscountInventory(company.discountInventory?.toString() || '0');
        setDiscountAi(company.discountAi?.toString() || '0');
        setDiscountFraud(company.discountFraud?.toString() || '0');
        setDiscountExpansion(company.discountExpansion?.toString() || '0');
        setDiscountProspecting(company.discountProspecting?.toString() || '0');
        setWaApiKey(company.waApiKey || '');
        setWaGatewayUrl(company.waGatewayUrl || '');
        // Fetch mapped admin fields from backend
        setAdminName((company as any).adminName || '');
        setAdminEmail((company as any).adminEmail || '');
        setAdminPassword('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCompany = async (id: number, companyName: string) => {
        if (!confirm(`Hapus PERMANEN tenant "${companyName}"?\nSemua data karyawan, absensi, dan payroll terkait akan ikut terhapus.`)) return;
        
        try {
            await api.delete(`/companies/${id}`);
            alert('Tenant berhasil dihapus.');
            fetchCompanies();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || 'Gagal menghapus tenant.');
        }
    };

    // --- INVOICE CALCULATION LOGIC ---
    const calculateInvoice = (company: Company) => {
        const pricing = {
            plans: {
                STARTER: 150000,
                PRO: 350000,
                ENTERPRISE: 750000
            },
            seats: 10000,
            addons: {
                KPI: 1500,
                LEARNING: 2000,
                BUNDLE_KPI_LRN: 3000,
                INVENTORY: 20000,
                AI: 20000,
                FRAUD: 10000,
                EXPANSION: 7000,
                PROSPECTING: 50000
            },
            planLimits: {
                STARTER: 10,
                PRO: 50,
                ENTERPRISE: 100
            }
        };

        const plan = company.plan || 'STARTER';
        const isAnnual = company.contractType === 'TAHUNAN';
        const multiplier = isAnnual ? 10 : 1; // Sync with landing page: 10x monthly = 1 Year
        const periodUnit = isAnnual ? '12 Bln' : '1 Bln';
        const periodLabel = isAnnual ? '1 Thn' : '1 Bln';

        // USE MANUAL CONTRACT VALUE IF SET, otherwise use plan default
        let basePrice = (company.contractValue && Number(company.contractValue) > 0) 
            ? Number(company.contractValue) 
            : pricing.plans[plan as keyof typeof pricing.plans];
        
        // Multiplier for basePrice (Plan package)
        let totalBasePrice = basePrice * (isAnnual ? 12 : 1); // For display
        
        basePrice = basePrice * multiplier; 

        // Discount logic for each item
        const applyDiscount = (price: number, discountPercent: number) => {
            if (!discountPercent || discountPercent <= 0) return price;
            return price * (1 - (discountPercent / 100));
        };

        // Seats calculation (Free 2 Admin, 1 POS)
        const extraAdmin = Math.max(0, (company.adminLimit || 2) - 2);
        const extraPos = Math.max(0, (company.posLimit || 1) - 1);
        const seatCost = (extraAdmin + extraPos) * pricing.seats * multiplier;

        // Addon calculation (Use employeeLimit as purchased capacity, fallback to actual users if limit is 0)
        const userCount = (company.employeeLimit && company.employeeLimit > 0) 
            ? company.employeeLimit 
            : (company._count?.users || 0);
        const insights = company.purchasedInsights || [];
        const addons = company.addons || [];
        
        let addonTotal = 0;
        const detailItems: { name: string, price: number, qty: number | string, total: number }[] = [];

        // KPI & Learning Bundle check
        const hasKpi = insights.includes('KPI') || insights.includes('KPI_LEARNING');
        const hasLearning = insights.includes('LEARNING') || insights.includes('KPI_LEARNING');
        
        if (hasKpi && hasLearning) {
            const disc = Math.max(company.discountKpi || 0, company.discountLearning || 0);
            const unitPrice = applyDiscount(pricing.addons.BUNDLE_KPI_LRN, disc);
            const cost = userCount * unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ 
                name: `Bundle: KPI & Learning ${disc > 0 ? `(Disc ${disc}%)` : ''}`, 
                price: unitPrice, 
                qty: `${userCount} u x ${periodUnit}`, 
                total: cost 
            });
        } else {
            if (hasKpi) {
                const disc = company.discountKpi || 0;
                const unitPrice = applyDiscount(pricing.addons.KPI, disc);
                const cost = userCount * unitPrice * multiplier;
                addonTotal += cost;
                detailItems.push({ 
                    name: `Add-on: KPI Penilaian ${disc > 0 ? `(Disc ${disc}%)` : ''}`, 
                    price: unitPrice, 
                    qty: `${userCount} u x ${periodUnit}`, 
                    total: cost 
                });
            }
            if (hasLearning) {
                const disc = company.discountLearning || 0;
                const unitPrice = applyDiscount(pricing.addons.LEARNING, disc);
                const cost = userCount * unitPrice * multiplier;
                addonTotal += cost;
                detailItems.push({ 
                    name: `Add-on: Learning Center ${disc > 0 ? `(Disc ${disc}%)` : ''}`, 
                    price: unitPrice, 
                    qty: `${userCount} u x ${periodUnit}`, 
                    total: cost 
                });
            }
        }

        if (addons.includes('INVENTORY')) {
            const disc = company.discountInventory || 0;
            const unitPrice = applyDiscount(pricing.addons.INVENTORY, disc);
            const cost = unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ name: `Add-on: Inventory Management ${disc > 0 ? `(Disc ${disc}%)` : ''}`, price: unitPrice, qty: periodUnit, total: cost });
        }
        if (addons.includes('AI_ADVISOR')) {
            const disc = company.discountAi || 0;
            const unitPrice = applyDiscount(pricing.addons.AI, disc);
            const cost = unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ name: `Add-on: Aivola Mind (AI) ${disc > 0 ? `(Disc ${disc}%)` : ''}`, price: unitPrice, qty: periodUnit, total: cost });
        }
        if (addons.includes('FRAUD_DETECTION')) {
            const disc = company.discountFraud || 0;
            const unitPrice = applyDiscount(pricing.addons.FRAUD, disc);
            const cost = unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ name: `Add-on: Anti-Fraud Face Check ${disc > 0 ? `(Disc ${disc}%)` : ''}`, price: unitPrice, qty: periodUnit, total: cost });
        }
        if (addons.includes('PROSPECTING_AI')) {
            const disc = company.discountProspecting || 0;
            const unitPrice = applyDiscount(pricing.addons.PROSPECTING, disc);
            const cost = unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ name: `Add-on: Prospecting AI (MAP) ${disc > 0 ? `(Disc ${disc}%)` : ''}`, price: unitPrice, qty: periodUnit, total: cost });
        }
        if (addons.includes('AIVOLA_GO')) {
            const unitPrice = 25000;
            const cost = unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ name: `Add-on: Aivola GO Ecosystem`, price: unitPrice, qty: periodUnit, total: cost });
        }

        // Expanded Staff Logic
        const baseLimit = pricing.planLimits[plan as keyof typeof pricing.planLimits] || 10;
        const extraStaff = Math.max(0, userCount - baseLimit);

        if (extraStaff > 0 && addons.includes('STAFF_EXPANSION')) {
            const disc = company.discountExpansion || 0;
            const unitPrice = applyDiscount(pricing.addons.EXPANSION, disc);
            const cost = extraStaff * unitPrice * multiplier;
            addonTotal += cost;
            detailItems.push({ 
                name: `Expansion Pack: Extra Staff ${disc > 0 ? `(Disc ${disc}%)` : ''}`, 
                price: unitPrice, 
                qty: `${extraStaff} u x ${periodUnit}`, 
                total: cost 
            });
        }

        const total = basePrice + seatCost + addonTotal;

        return {
            basePrice,
            planName: plan,
            periodLabel,
            seatCost,
            extraAdmin,
            extraPos,
            addonTotal,
            detailItems,
            total: Math.max(0, total - (parseInt(invoiceDiscount) || 0))
        };
    };

    return (
        <DashboardLayout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-black">Manajemen Klien (Tenant)</h1>
                <p className="text-sm text-slate-500">Daftarkan perusahaan baru lengkap dengan titik lokasi kantor absensinya.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Bagian Kiri: Form Input */}
                <div className="lg:col-span-1 border border-slate-200 bg-white p-6 shadow-sm rounded-xl h-fit">
                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-slate-900">
                            {editingCompanyId ? 'Edit Data Klien' : 'Registrasi Tenant Baru'}
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {editingCompanyId && (
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex justify-between items-center mb-4">
                                <div className="text-xs text-amber-700 font-medium italic">Sedang mengedit: ID {editingCompanyId}</div>
                                <button type="button" onClick={resetForm} className="text-[10px] font-bold text-amber-800 hover:underline">Batal Edit</button>
                            </div>
                        )}
                        <div className="space-y-4 border-b border-slate-50 pb-4">
                            <h3 className="text-slate-800 uppercase tracking-widest mb-2 font-bold">Informasi Dasar & PIC</h3>
                            <div>
                                <label className="mb-1 block text-slate-800 font-bold">Nama Perusahaan Klien</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Misal: PT Angin Ribut"
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold">Nama PIC</label>
                                    <input
                                        type="text"
                                        value={picName}
                                        onChange={(e) => setPicName(e.target.value)}
                                        placeholder="Nama Lengkap PIC"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold">No. HP PIC</label>
                                    <input
                                        type="text"
                                        value={picPhone}
                                        onChange={(e) => setPicPhone(e.target.value)}
                                        placeholder="0812..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            {/* === WABLAS CONFIGURATION === */}
                            <div className="space-y-4 border-b border-slate-50 pb-4 bg-emerald-50/50 -mx-6 px-6 pt-4 mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                    WhatsApp Gateway (Wablas)
                                </h3>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Domain / Server Wablas</label>
                                    <input
                                        type="text"
                                        value={waGatewayUrl}
                                        onChange={(e) => setWaGatewayUrl(e.target.value)}
                                        placeholder="Contoh: https://solo.wablas.com"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">API Key Wablas (Token)</label>
                                    <input
                                        type="text"
                                        value={waApiKey}
                                        onChange={(e) => setWaApiKey(e.target.value)}
                                        placeholder="Masukkan Token Wablas Klien"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 italic">* Kosongkan jika ingin menggunakan sistem WhatsApp default Aivola.</p>
                            </div>
                        </div>


                        <div className="space-y-4 border-b border-slate-50 pb-4">
                            <h3 className="text-slate-800 uppercase tracking-widest mb-2 font-bold">Detail Kontrak</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold">Jenis Kontrak</label>
                                    <select
                                        value={contractType}
                                        onChange={(e) => setContractType(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="BULANAN">Bulanan</option>
                                        <option value="TAHUNAN">Tahunan</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold">Nilai Kontrak (Rp)</label>
                                    <input
                                        type="number"
                                        value={contractValue}
                                        onChange={(e) => setContractValue(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold text-xs">Mulai</label>
                                    <input
                                        type="date"
                                        value={contractStart}
                                        onChange={(e) => setContractStart(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold text-xs">Berakhir</label>
                                    <input
                                        type="date"
                                        value={contractEnd}
                                        onChange={(e) => setContractEnd(e.target.value)}
                                        className="w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-slate-800 font-bold">Limit Karyawan</label>
                                    <input
                                        type="number"
                                        value={employeeLimit}
                                        onChange={(e) => setEmployeeLimit(e.target.value)}
                                        placeholder="0 = ∞"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                     <div className="flex items-center justify-between mb-1">
                                         <label className="text-slate-800 font-bold">Slot Back-Office</label>
                                         <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">Rp 10.000/kursi/bln</span>
                                     </div>
                                    <input
                                        type="number"
                                        value={adminLimit}
                                        onChange={(e) => setAdminLimit(e.target.value)}
                                        placeholder="2"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                     <div className="flex items-center justify-between mb-1">
                                         <label className="text-slate-800 font-bold">Slot Kasir (POS)</label>
                                         <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700 font-bold">Rp 10.000/unit/bln</span>
                                     </div>
                                    <input
                                        type="number"
                                        value={posLimit}
                                        onChange={(e) => setPosLimit(e.target.value)}
                                        placeholder="1"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="flex items-end">
                                    <p className="mb-2 text-[10px] text-slate-400 italic">Masing-masing POS Terminal di Cabang.</p>
                                </div>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-400 italic">Slot Back-Office membatasi jumlah Admin, Finance, Manager, & Owner.</p>
                            
                            <div>
                                <label className="mb-1 block text-slate-800 font-bold">Paket Layanan (Subscription)</label>
                                <select
                                    value={plan}
                                    onChange={(e) => setPlan(e.target.value as any)}
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm font-bold text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="STARTER">⬜ STARTER (Standard HR)</option>
                                    <option value="PRO">🟦 PRO (Full HR + Basic Finance)</option>
                                    <option value="ENTERPRISE">🟪 ENTERPRISE (All-In & Early Access)</option>
                                </select>
                                <p className="mt-1 text-[10px] text-slate-400 italic">Menentukan fitur dasar dan limitasi yang didapat tenant.</p>
                            </div>
                            
                            <div>
                                <label className="mb-1 block text-slate-800 font-bold">Retensi Foto (Hari)</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        value={photoRetentionDays}
                                        onChange={(e) => setPhotoRetentionDays(e.target.value)}
                                        placeholder="30"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium h-full flex items-center">hari</span>
                                </div>
                                <p className="mt-1 text-[10px] text-slate-400 italic">Foto akan otomatis dihapus setelah jumlah hari ini.</p>
                            </div>
                        </div>

                        {/* === ADD-ON: KPI, FINANCE, AI === */}
                        <div className="space-y-3 border-b border-slate-50 pb-4">
                            <h3 className="text-slate-800 uppercase tracking-widest mb-2 font-bold">Add-On Aktif</h3>
                            <p className="text-[10px] text-slate-400 italic">Centang fitur tambahan yang sudah dibeli klien.</p>
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all">
                                <input
                                    type="checkbox"
                                    checked={addonKpi}
                                    onChange={(e) => setAddonKpi(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded accent-indigo-600"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                        🎯 KPI & Penilaian Kinerja
                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Rp 1.500/karyawan</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Fitur pembuatan KPI, penilaian, dan laporan performa.</div>
                                    {addonKpi && (
                                        <div className="mt-2 flex items-center gap-2 bg-indigo-50/50 p-1.5 rounded border border-indigo-100">
                                            <span className="text-[10px] text-indigo-700 font-bold">Diskon Khusus:</span>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={discountKpi} 
                                                    onChange={(e) => setDiscountKpi(e.target.value)} 
                                                    className="w-20 h-7 text-xs border border-indigo-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-900" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-2 top-1.5 text-[10px] text-indigo-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-sky-50 hover:border-sky-300 transition-all">
                                <input
                                    type="checkbox"
                                    checked={addonLearning}
                                    onChange={(e) => setAddonLearning(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded accent-sky-600"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                        📚 Learning & Development
                                        <span className="text-[9px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.5 rounded">Rp 2.000/karyawan</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Modul pelatihan, ujian online, dan tracking kompetensi.</div>
                                    {addonLearning && (
                                        <div className="mt-2 flex items-center gap-2 bg-sky-50/50 p-1.5 rounded border border-sky-100">
                                            <span className="text-[10px] text-sky-700 font-bold">Diskon Khusus:</span>
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={discountLearning} 
                                                    onChange={(e) => setDiscountLearning(e.target.value)} 
                                                    className="w-20 h-7 text-xs border border-sky-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-sky-500 outline-none text-slate-900" 
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-2 top-1.5 text-[10px] text-sky-400 font-bold">%</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </label>
                            {addonKpi && addonLearning && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    🚀 Bundle aktif — ditagih Rp 3.000/karyawan (hemat Rp 500)
                                </div>
                            )}

                            <div className="pt-2">
                                <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-2 mt-2">Add-On Finance & AI Management</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={addonInventory}
                                            onChange={(e) => setAddonInventory(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                📦 Inventory & Stock
                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Rp 20.000/bln</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Manajemen stok barang, multi-gudang, dan integrasi POS.</div>
                                            {addonInventory && (
                                                <div className="mt-2 flex items-center gap-2 bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                                                    <span className="text-[10px] text-emerald-700 font-bold">Diskon:</span>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={discountInventory} 
                                                            onChange={(e) => setDiscountInventory(e.target.value)} 
                                                            className="w-20 h-7 text-xs border border-emerald-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900" 
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[10px] text-emerald-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all bg-blue-50/30">
                                        <input
                                            type="checkbox"
                                            checked={addonAivolaGo}
                                            onChange={(e) => setAddonAivolaGo(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-blue-600"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                🚀 Aivola GO Ecosystem
                                                <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">Rp 25.000/bln</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Munculkan brand & katalog produk di aplikasi ekosistem Aivola GO.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-violet-50 hover:border-violet-300 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={addonAi}
                                            onChange={(e) => setAddonAi(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-violet-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                🧠 Aivola Mind (AI Advisor)
                                                <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded">Rp 20.000/bln</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Penasehat bisnis AI yang menganalisa performa keuangan & stok.</div>
                                            {addonAi && (
                                                <div className="mt-2 flex items-center gap-2 bg-violet-50/50 p-1.5 rounded border border-violet-100">
                                                    <span className="text-[10px] text-violet-700 font-bold">Diskon:</span>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={discountAi} 
                                                            onChange={(e) => setDiscountAi(e.target.value)} 
                                                            className="w-20 h-7 text-xs border border-violet-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-violet-500 outline-none text-slate-900" 
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[10px] text-violet-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-rose-50 hover:border-rose-300 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={addonFraud}
                                            onChange={(e) => setAddonFraud(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-rose-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                🛡️ Anti-Fraud Face Check
                                                <span className="text-[9px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded">Rp 10.000/bln</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Verifikasi wajah ketat saat absensi & transaksi sensitif.</div>
                                            {addonFraud && (
                                                <div className="mt-2 flex items-center gap-2 bg-rose-50/50 p-1.5 rounded border border-rose-100">
                                                    <span className="text-[10px] text-rose-700 font-bold">Diskon:</span>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={discountFraud} 
                                                            onChange={(e) => setDiscountFraud(e.target.value)} 
                                                            className="w-20 h-7 text-xs border border-rose-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-rose-500 outline-none text-slate-900" 
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[10px] text-rose-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={addonProspecting}
                                            onChange={(e) => setAddonProspecting(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-amber-600"
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                🎯 Prospecting AI (Lead Finder)
                                                <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">Rp 50.000/bln</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Cari prospek bisnis di Google Maps & kontak otomatis.</div>
                                            {addonProspecting && (
                                                <div className="mt-2 flex items-center gap-2 bg-amber-50/50 p-1.5 rounded border border-amber-100">
                                                    <span className="text-[10px] text-amber-700 font-bold">Diskon:</span>
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            value={discountProspecting} 
                                                            onChange={(e) => setDiscountProspecting(e.target.value)} 
                                                            className="w-20 h-7 text-xs border border-amber-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-amber-500 outline-none text-slate-900" 
                                                            placeholder="0"
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[10px] text-amber-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                                        <input
                                            type="checkbox"
                                            checked={addonExpansion}
                                            onChange={(e) => setAddonExpansion(e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-emerald-600"
                                        />
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                                📈 Expansion Pack (Staff)
                                                <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Rp 7.000/karyawan</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">Tambah kapasitas karyawan di atas limit paket standar.</div>
                                            
                                            {/* Indikator Real-time */}
                                            {addonExpansion && (
                                                <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded px-2 py-1.5">
                                                    <div className="text-[10px] font-bold text-emerald-700 flex justify-between items-center">
                                                        <span>Kapasitas Tambahan:</span>
                                                        <span className="text-sm">
                                                            {Math.max(0, parseInt(employeeLimit) - (plan === 'PRO' ? 50 : plan === 'ENTERPRISE' ? 100 : 10))} Orang
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-emerald-600 italic">
                                                        *Dihitung dari (Limit {employeeLimit} - Dasar {plan === 'PRO' ? 50 : plan === 'ENTERPRISE' ? 100 : 10})
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center gap-2">
                                                        <span className="text-[10px] text-emerald-700 font-bold">Diskon:</span>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                value={discountExpansion} 
                                                                onChange={(e) => setDiscountExpansion(e.target.value)} 
                                                                className="w-20 h-7 text-xs border border-emerald-200 rounded pl-2 pr-5 focus:ring-1 focus:ring-emerald-500 outline-none bg-white text-slate-900" 
                                                                placeholder="0"
                                                            />
                                                            <span className="absolute right-2 top-1.5 text-[10px] text-emerald-400 font-bold">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 border-b border-slate-50 pb-4 bg-blue-50/50 -mx-6 px-6 pt-4 mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                                    {editingCompanyId ? 'Update Akun Administrator (PIC)' : 'Akun Administrator Pertama'}
                                </h3>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Nama Admin</label>
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        placeholder="Nama Lengkap Admin"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm text-slate-900 bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Admin</label>
                                    <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="hrd@perusahaan.com"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        {editingCompanyId ? 'Ganti Password (Kosongkan jika tidak diubah)' : 'Password Awal'}
                                    </label>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                <h3 className="text-slate-800 uppercase tracking-widest mb-2 font-bold">Lokasi Kantor (Opsional)</h3>
                                <button 
                                    type="button"
                                    onClick={() => setIsMapOpen(true)}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    <Globe className="h-3 w-3" /> Pilih di Peta
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        placeholder="-6.2..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-medium text-slate-500 uppercase">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        placeholder="106.8..."
                                        className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700 text-xs">Radius (Meter)</label>
                                <input
                                    type="number"
                                    value={radius}
                                    onChange={(e) => setRadius(e.target.value)}
                                    className="w-full rounded-md border border-slate-300 py-2 px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:bg-slate-300 ${
                                editingCompanyId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            <Save className="h-4 w-4" />
                            {isLoading ? 'Memproses...' : (editingCompanyId ? 'Simpan Perubahan' : 'Daftarkan Klien')}
                        </button>
                    </form>
                </div>

                {/* Bagian Kanan: Tabel Data */}
                <div className="lg:col-span-2 border border-slate-200 bg-white p-6 shadow-sm rounded-xl">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Daftar Klien Terdaftar</h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-800">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-950">
                                <tr>
                                    <th className="px-4 py-3 border-b">Detail Klien & PIC</th>
                                    <th className="px-4 py-3 border-b text-center">Status Kontrak</th>
                                    <th className="px-4 py-3 border-b text-right">Nilai Kontrak</th>
                                    <th className="px-4 py-3 border-b text-center">Limit</th>
                                    <th className="px-4 py-3 border-b text-center">Add-On</th>
                                    <th className="px-4 py-3 border-b text-right">Aksi</th>
                                    <th className="px-4 py-3 border-b">GPS / Radius</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            Sedang memuat data... atau belum ada data klien.
                                        </td>
                                    </tr>
                                ) : (
                                    companies.map((company) => (
                                        <tr key={company.id} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-4 border-b border-slate-100">
                                                <div className="font-bold text-slate-900">{company.name}</div>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                        company.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                                        company.plan === 'PRO' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                        'bg-slate-100 text-slate-600 border border-slate-200'
                                                    }`}>
                                                        {company.plan || 'STARTER'}
                                                    </span>
                                                    <div className="text-[10px] text-slate-400">ID: TENANT-{company.id.toString().padStart(3, '0')}</div>
                                                </div>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium border border-slate-100">PIC: {company.picName || '-'}</span>
                                                    <span className="text-[10px] text-slate-400">{company.picPhone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                    company.contractType === 'BULANAN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {company.contractType === 'BULANAN' ? 'Bulanan' : 'Tahunan'}
                                                </span>
                                                <div className="text-[10px] text-slate-400 mt-1 italic flex flex-col gap-1 items-center">
                                                    <span>
                                                        {company.contractStart ? new Date(company.contractStart).toLocaleDateString('id-ID') : '-'} s/d {company.contractEnd ? new Date(company.contractEnd).toLocaleDateString('id-ID') : '-'}
                                                    </span>
                                                    {isExpired(company.contractEnd) ? (
                                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                                            <AlertTriangle className="h-3 w-3" /> Kontrak Habis
                                                        </span>
                                                    ) : isNearingExpiry(company.contractEnd) ? (
                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Segera Habis
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-right font-mono font-bold text-slate-700">
                                                Rp {company.contractValue?.toLocaleString('id-ID') || 0}
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-center">
                                                <div className="text-xs font-bold text-slate-800">{company.employeeLimit || '∞'}</div>
                                                <div className="text-[10px] text-slate-400">Total User</div>
                                                <div className="mt-1 flex flex-col gap-1 items-center">
                                                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 border border-blue-100">{company.adminLimit || 0} Admin</span>
                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 border border-emerald-100">{company.posLimit || 0} POS</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-center">
                                                <div className="grid grid-cols-1 gap-1 min-w-[100px]">
                                                    {(() => {
                                                        const insights = company.purchasedInsights || [];
                                                        const addons = company.addons || [];
                                                        const hasKpi = insights.includes('KPI') || insights.includes('KPI_LEARNING');
                                                        const hasLearning = insights.includes('LEARNING') || insights.includes('KPI_LEARNING');
                                                        const hasInventory = addons.includes('INVENTORY');
                                                        const hasAi = addons.includes('AI_ADVISOR');
                                                        const hasFraud = addons.includes('FRAUD_DETECTION');
                                                        
                                                        return (
                                                            <>
                                                                <div className="flex flex-wrap gap-1 justify-center">
                                                                    {hasKpi && <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md border border-indigo-100" title={`KPI ${(company.discountKpi || 0) > 0 ? `(Disc ${company.discountKpi}%)` : ''}`}>🎯 KPI {(company.discountKpi || 0) > 0 && `-${company.discountKpi}%`}</span>}
                                                                    {hasLearning && <span className="text-[8px] font-bold bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-md border border-sky-100" title={`Learning ${(company.discountLearning || 0) > 0 ? `(Disc ${company.discountLearning}%)` : ''}`}>📚 LRN {(company.discountLearning || 0) > 0 && `-${company.discountLearning}%`}</span>}
                                                                    {hasInventory && <span className="text-[8px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md border border-emerald-100" title={`Inventory ${(company.discountInventory || 0) > 0 ? `(Disc ${company.discountInventory}%)` : ''}`}>📦 INV {(company.discountInventory || 0) > 0 && `-${company.discountInventory}%`}</span>}
                                                                    {hasAi && <span className="text-[8px] font-bold bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-md border border-violet-100" title={`AI Advisor ${(company.discountAi || 0) > 0 ? `(Disc ${company.discountAi}%)` : ''}`}>🧠 AI {(company.discountAi || 0) > 0 && `-${company.discountAi}%`}</span>}
                                                                    {hasFraud && <span className="text-[8px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-md border border-rose-100" title={`Anti-Fraud ${(company.discountFraud || 0) > 0 ? `(Disc ${company.discountFraud}%)` : ''}`}>🛡️ SEC {(company.discountFraud || 0) > 0 && `-${company.discountFraud}%`}</span>}
                                                                    {addons.includes('PROSPECTING_AI') && <span className="text-[8px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md border border-amber-100" title={`Prospecting ${(company.discountProspecting || 0) > 0 ? `(Disc ${company.discountProspecting}%)` : ''}`}>🎯 MAP {(company.discountProspecting || 0) > 0 && `-${company.discountProspecting}%`}</span>}
                                                                    {addons.includes('STAFF_EXPANSION') && <span className="text-[8px] font-bold bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-md border border-teal-100" title={`Expansion ${(company.discountExpansion || 0) > 0 ? `(Disc ${company.discountExpansion}%)` : ''}`}>📈 EXP {(company.discountExpansion || 0) > 0 && `-${company.discountExpansion}%`}</span>}
                                                                </div>
                                                                {insights.length === 0 && addons.length === 0 && (
                                                                    <span className="text-[9px] text-slate-300">Default Only</span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleAiReply(company)}
                                                        disabled={isAiLoading === company.id}
                                                        className={`p-2 rounded-lg transition-all ${isAiLoading === company.id ? 'text-violet-400 bg-violet-100' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'}`}
                                                        title="Balas via AI WhatsApp"
                                                    >
                                                        {isAiLoading === company.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInvoiceCompany(company);
                                                            setShowInvoiceModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                        title="Generate Invoice Tagihan"
                                                    >
                                                        <FileText className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditClick(company)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit Tenant"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCompany(company.id, company.name)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Hapus Tenant"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 border-b border-slate-100">
                                                <div className="text-[10px] text-slate-500">Lat: {company.latitude ?? '-'}</div>
                                                <div className="text-[10px] text-slate-500">Lng: {company.longitude ?? '-'}</div>
                                                <div className="mt-1 text-[10px] font-bold text-blue-600">{company.radius ?? 0}m Radius</div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* === MODAL INVOICE === */}
            {showInvoiceModal && selectedInvoiceCompany && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Header Modal */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-emerald-600" />
                                <h3 className="text-lg font-bold text-slate-800">Preview Invoice Tagihan</h3>
                            </div>
                            <button onClick={() => { setShowInvoiceModal(false); setInvoiceDiscount('0'); }} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Konten Invoice */}
                        <div className="max-h-[70vh] overflow-y-auto p-8 bg-white" id="invoice-content">
                            {/* Brand Header */}
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="text-2xl font-black tracking-tighter text-blue-600">AIVOLA <span className="text-slate-400">CLOUD</span></div>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Saas Management Platform</p>
                                </div>
                                <div className="text-right">
                                    <h4 className="text-xl font-bold text-slate-800 uppercase">INVOICE</h4>
                                    <p className="text-xs text-slate-500">#{new Date().getFullYear()}/INV/{selectedInvoiceCompany.id.toString().padStart(4, '0')}</p>
                                </div>
                            </div>

                            {/* Client & Info Section */}
                            <div className="grid grid-cols-2 gap-8 mb-10 border-y border-slate-50 py-6">
                                <div>
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Ditujukan Untuk:</h5>
                                    <div className="font-bold text-slate-900 text-lg uppercase">{selectedInvoiceCompany.name}</div>
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-[200px]">PIC: {selectedInvoiceCompany.picName || '-'}</p>
                                    <p className="text-sm text-slate-500">{selectedInvoiceCompany.picPhone || '-'}</p>
                                </div>
                                <div className="text-right">
                                    <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Detail Pembayaran:</h5>
                                    <p className="text-sm text-slate-700 font-bold">Tanggal Cetak: <span className="font-normal text-slate-500">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
                                    <p className="text-sm text-slate-700 font-bold">Periode: <span className="font-normal text-slate-500">{selectedInvoiceCompany.contractType}</span></p>
                                    <p className="text-sm text-slate-700 font-bold">Mata Uang: <span className="font-normal text-slate-500">IDR (Rupiah)</span></p>
                                </div>
                            </div>

                            {/* Items Table */}
                            {(() => {
                                const inv = calculateInvoice(selectedInvoiceCompany);
                                return (
                                    <>
                                        <table className="w-full text-sm mb-10">
                                            <thead>
                                                <tr className="border-b-2 border-slate-100 text-slate-400 text-left">
                                                    <th className="py-3 font-bold uppercase text-[10px]">Deskripsi Layanan</th>
                                                    <th className="py-3 text-right font-bold uppercase text-[10px]">Harga Satuan</th>
                                                    <th className="py-3 text-right font-bold uppercase text-[10px]">Qty</th>
                                                    <th className="py-3 text-right font-bold uppercase text-[10px]">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-slate-700">
                                                <tr className="border-b border-slate-50">
                                                    <td className="py-4">
                                                        <div className="font-bold text-slate-800 tracking-tight text-blue-700">🚀 PAKET {inv.planName}</div>
                                                        <div className="text-[10px] text-slate-400">Layanan Inti Platform Aivola</div>
                                                    </td>
                                                    <td className="py-4 text-right">Rp {inv.basePrice.toLocaleString('id-ID')}</td>
                                                    <td className="py-4 text-right">{inv.periodLabel}</td>
                                                    <td className="py-4 text-right font-semibold">Rp {inv.basePrice.toLocaleString('id-ID')}</td>
                                                </tr>
                                                {(inv.extraAdmin > 0 || inv.extraPos > 0) && (
                                                    <tr className="border-b border-slate-50">
                                                        <td className="py-4">
                                                            <div className="font-bold text-slate-800 tracking-tight">👤 KURSI / SLOT TAMBAHAN</div>
                                                            <div className="text-[10px] text-slate-400 italic">
                                                                {inv.extraAdmin > 0 && `${inv.extraAdmin} Admin `}
                                                                {inv.extraPos > 0 && `${inv.extraPos} POS`}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-right">Rp 10.000</td>
                                                        <td className="py-4 text-right">{inv.extraAdmin + inv.extraPos} Unit</td>
                                                        <td className="py-4 text-right font-semibold">Rp {inv.seatCost.toLocaleString('id-ID')}</td>
                                                    </tr>
                                                )}
                                                {inv.detailItems.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-slate-50">
                                                        <td className="py-4">
                                                            <div className="font-bold text-slate-800 tracking-tight uppercase">💎 {item.name}</div>
                                                            <div className="text-[10px] text-slate-400">Fitur Ekstra Aktif</div>
                                                        </td>
                                                        <td className="py-4 text-right">Rp {item.price.toLocaleString('id-ID')}</td>
                                                        <td className="py-4 text-right">{item.qty}</td>
                                                        <td className="py-4 text-right font-semibold">Rp {item.total.toLocaleString('id-ID')}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Total Section */}
                                        <div className="flex justify-end">
                                            <div className="w-full max-w-[300px] space-y-3">
                                                <div className="flex justify-between text-sm text-slate-500 pr-2">
                                                    <span>Subtotal Layanan</span>
                                                    <span>Rp {(inv.total + (parseInt(invoiceDiscount) || 0)).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm text-orange-600 bg-orange-50 p-2 rounded border border-orange-100">
                                                    <span className="font-bold">DISKON TAMBAHAN (RP)</span>
                                                    <input 
                                                        type="number"
                                                        value={invoiceDiscount}
                                                        onChange={(e) => setInvoiceDiscount(e.target.value)}
                                                        className="w-24 h-7 text-xs border border-orange-200 rounded px-2 text-right font-bold focus:ring-1 focus:ring-orange-500 outline-none bg-white text-slate-900"
                                                    />
                                                </div>
                                                <div className="flex justify-between border-t-2 border-blue-100 pt-3 text-lg font-black text-slate-900 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                                    <span className="uppercase tracking-tight">TOTAL TAGIHAN</span>
                                                    <span className="text-blue-600">Rp {inv.total.toLocaleString('id-ID')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                            
                            {/* Footer */}
                            <div className="mt-16 text-center border-t border-slate-100 pt-8">
                                <p className="text-[10px] text-slate-400 italic">Harap membayar sebelum masa kontrak berakhir untuk menghindari pembekuan akun.</p>
                                <p className="text-[10px] font-bold text-slate-300 mt-4 uppercase tracking-widest">© {new Date().getFullYear()} Aivola Cloud System</p>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 italic font-medium">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                Validated Digital Invoice
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { setShowInvoiceModal(false); setInvoiceDiscount('0'); }}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    Tutup
                                </button>
                                <button 
                                    onClick={() => {
                                        const printContent = document.getElementById('invoice-content');
                                        const printWindow = window.open('', '', 'width=900,height=900');
                                        if (printWindow) {
                                            printWindow.document.write(`
                                                <html>
                                                    <head>
                                                        <title>Invoice - ${selectedInvoiceCompany?.name}</title>
                                                        <script src="https://cdn.tailwindcss.com"></script>
                                                    </head>
                                                    <body>
                                                        <div class="p-8">
                                                            ${printContent?.innerHTML}
                                                        </div>
                                                        <script>
                                                            window.onload = function() {
                                                                window.print();
                                                                window.close();
                                                            };
                                                        </script>
                                                    </body>
                                                </html>
                                            `);
                                            printWindow.document.close();
                                        }
                                    }}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    Cetak PDF / Print
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <MapPicker 
                isOpen={isMapOpen} 
                onClose={() => setIsMapOpen(false)} 
                onSelect={(lat, lng) => {
                    setLatitude(lat.toString());
                    setLongitude(lng.toString());
                }}
                initialLat={parseFloat(latitude) || undefined}
                initialLng={parseFloat(longitude) || undefined}
            />
        </DashboardLayout>
    );
}
