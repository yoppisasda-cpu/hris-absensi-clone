'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import api from "@/lib/api";
import { 
    Search, 
    ShoppingCart, 
    Trash2, 
    Plus, 
    Minus, 
    CheckCircle2, 
    CreditCard, 
    Wallet, 
    User,
    Tag, 
    Printer,
    Monitor,
    Scan,
    X,
    ShieldCheck,
    Tv,
    ExternalLink,
    Maximize,
    Minimize,
    ArrowRight,
    ArrowLeft,
    Banknote,
    Check,
    Clock,
    PauseCircle,
    PlayCircle,
    Smartphone,
    RefreshCw,
    AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface Product {
    id: number;
    name: string;
    price: number;
    stock: number;
    image?: string;
    categoryId?: number;
    category?: { name: string };
    unit: string;
    trackStock?: boolean;
    isAutoDeduct?: boolean;
    isDiscountable?: boolean;
    type?: string;
    customizations?: any[];
}

interface CartItem extends Product {
    qty: number;
    modifiers?: any;
    cartId: string;
}

import QrScanner from "@/components/pos/QrScanner";

export default function POSPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastSale, setLastSale] = useState<any>(null);
    const [lastCart, setLastCart] = useState<CartItem[]>([]);
    const [taxRate, setTaxRate] = useState<number>(0);

    // MODIFIER MODAL
    const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
    const [modifierSelections, setModifierSelections] = useState<Record<number, any[]>>({});


    // NEW CHECKOUT FIELDS
    const [saleType, setSaleType] = useState<string>('WALK_IN');
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [paymentReference, setPaymentReference] = useState("");
    const [voucherCode, setVoucherCode] = useState("");
    const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);

    // MODAL & TAB STATES FOR TOUCH/POS SCREEN
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'cart' | 'payment'>('cart');
    const [isPosFullscreen, setIsPosFullscreen] = useState(false);
    const [cashReceived, setCashReceived] = useState<number | ''>('');

    // PENDING BILLS (HOLD BILL)
    const [pendingBills, setPendingBills] = useState<any[]>([]);
    const [activePendingBillId, setActivePendingBillId] = useState<number | null>(null);
    const [activePendingBillLabel, setActivePendingBillLabel] = useState<string>('');
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [showPendingBillsModal, setShowPendingBillsModal] = useState(false);
    const [holdLabel, setHoldLabel] = useState('');
    const [holdLoading, setHoldLoading] = useState(false);
    const isFirstPendingFetch = useRef(true);
    const prevPendingCountRef = useRef(0);

    // MOBILE ORDERS (AIVOLA GO / ONLINE / QR MEJA)
    const [activeMobileOrders, setActiveMobileOrders] = useState<any[]>([]);
    const [showMobileOrdersModal, setShowMobileOrdersModal] = useState(false);
    const [mobileOrdersLoading, setMobileOrdersLoading] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const isFirstMobileFetch = useRef(true);
    const prevMobileCountRef = useRef(0);

    // NEW EMPLOYEE DISCOUNT FIELDS
    const [employeeDiscount, setEmployeeDiscount] = useState<{value: number, label: string} | null>(null);
    const [scannedQRToken, setScannedQRToken] = useState("");
    const [showScanModal, setShowScanModal] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [salespersons, setSalespersons] = useState<any[]>([]);
    const [selectedSalesperson, setSelectedSalesperson] = useState<string>("");
    const [companyName, setCompanyName] = useState<string>('');
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);

    const togglePosFullscreen = () => {
        const nextState = !isPosFullscreen;
        setIsPosFullscreen(nextState);
        try {
            if (nextState) {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                }
            } else {
                if (document.fullscreenElement) {
                    document.exitFullscreen().catch(() => {});
                }
            }
        } catch (err) {}
    };

    // Effect for Fullscreen POS mode - hides sidebar and dashboard header
    useEffect(() => {
        const sidebar = document.getElementById('main-sidebar');
        const header = document.getElementById('main-header');
        const mainEl = document.querySelector('main');

        if (isPosFullscreen) {
            if (sidebar) sidebar.style.display = 'none';
            if (header) header.style.display = 'none';
            if (mainEl) {
                mainEl.style.padding = '8px';
                mainEl.style.maxWidth = '100%';
            }
        } else {
            if (sidebar) sidebar.style.display = '';
            if (header) header.style.display = '';
            if (mainEl) {
                mainEl.style.padding = '';
                mainEl.style.maxWidth = '';
            }
        }
        return () => {
            if (sidebar) sidebar.style.display = '';
            if (header) header.style.display = '';
            if (mainEl) {
                mainEl.style.padding = '';
                mainEl.style.maxWidth = '';
            }
        };
    }, [isPosFullscreen]);

    const openCustomerDisplay = () => {
        const width = 1024;
        const height = 768;
        const left = window.screen.availWidth || 1920;
        window.open(
            '/dashboard/pos/customer-display',
            'AivolaCustomerDisplay',
            `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,location=no,status=no`
        );
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, catRes, accRes, usersRes] = await Promise.all([
                api.get('/pos/products'),
                api.get('/pos/categories'),
                api.get('/finance/accounts'),
                api.get('/users')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setAccounts(accRes.data);
            setSalespersons(usersRes.data);
            
            // Force manual selection to prevent accidental usage of default account
            setSelectedAccount(null);

            // Fetch company profile for customer display header
            try {
                const compRes = await api.get('/companies/my');
                if (compRes.data?.name) {
                    setCompanyName(compRes.data.name);
                    setCompanyLogo(compRes.data.logoUrl || null);
                }
            } catch (e) {
                try {
                    const compRes = await api.get('/companies/accessible');
                    const tId = localStorage.getItem('currentTenantId');
                    const currentComp = compRes.data?.find((c: any) => c.id.toString() === tId);
                    if (currentComp?.name) setCompanyName(currentComp.name);
                } catch (err) {}
            }

            // Fetch pending bills list & mobile orders
            fetchPendingBills();
            fetchActiveMobileOrders();
        } catch (error) {
            console.error("Failed to fetch POS data", error);
            toast.error("Gagal mengambil data produk");
        } finally {
            setLoading(false);
        }
    };

    const playChime = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        } catch (e) {}
    };

    const fetchPendingBills = async (isSilent = false) => {
        try {
            const userBranchId = typeof window !== 'undefined' ? localStorage.getItem('userBranchId') : null;
            const endpoint = '/pos/pending' + (userBranchId ? `?branchId=${userBranchId}` : '');
            const res = await api.get(endpoint);
            const data = res.data || [];

            if (isSilent && !isFirstPendingFetch.current && data.length > prevPendingCountRef.current) {
                const diff = data.length - prevPendingCountRef.current;
                playChime();
                toast.success(`Ada ${diff} pesanan baru dari Tablet Satelit / Meja!`, {
                    icon: '🛎️',
                    duration: 4000
                });
            }

            isFirstPendingFetch.current = false;
            prevPendingCountRef.current = data.length;
            setPendingBills(data);
        } catch (e) {
            if (!isSilent) console.error("Gagal mengambil pending bills:", e);
        }
    };

    const fetchActiveMobileOrders = async (isSilent = false) => {
        try {
            if (!isSilent) setMobileOrdersLoading(true);
            const userBranchId = typeof window !== 'undefined' ? localStorage.getItem('userBranchId') : null;
            let endpoint = '/sales?status=PENDING,PROCESSING,READY&saleType=ONLINE&includeItems=true';
            if (userBranchId) endpoint += `&branchId=${userBranchId}`;
            const res = await api.get(endpoint);
            const data = Array.isArray(res.data) ? res.data : [];

            if (isSilent && !isFirstMobileFetch.current && data.length > prevMobileCountRef.current) {
                const diff = data.length - prevMobileCountRef.current;
                playChime();
                toast.success(`Ada ${diff} pesanan baru dari Mobile Order / Web!`, {
                    icon: '📱',
                    duration: 5000
                });
            }

            isFirstMobileFetch.current = false;
            prevMobileCountRef.current = data.length;
            setActiveMobileOrders(data);
        } catch (e) {
            if (!isSilent) console.error("Gagal mengambil pesanan mobile aktif:", e);
        } finally {
            if (!isSilent) setMobileOrdersLoading(false);
        }
    };

    const handleUpdateMobileOrderStatus = async (orderId: number, newStatus: string) => {
        setUpdatingOrderId(orderId);
        try {
            const payload: any = { status: newStatus };
            if (newStatus === 'PAID' || newStatus === 'PROCESSING') {
                if (selectedAccount) payload.accountId = selectedAccount;
            }
            await api.patch(`/sales/${orderId}/status`, payload);
            toast.success(`Status pesanan berhasil diubah ke ${newStatus}`);
            await fetchActiveMobileOrders(true);
        } catch (e: any) {
            toast.error("Gagal mengubah status: " + (e.response?.data?.error || e.message));
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handlePrintMobileOrder = (order: any) => {
        const formattedCart: CartItem[] = (order.items || []).map((it: any, idx: number) => ({
            id: it.productId || it.id || idx,
            cartId: `mobile_${order.id}_${idx}`,
            name: it.name || it.product?.name || 'Item',
            price: Number(it.price) || 0,
            qty: Number(it.quantity || it.qty) || 1,
            stock: 999,
            unit: 'pcs',
            modifiers: it.modifiers
        }));
        setLastCart(formattedCart);
        setLastSale({
            ...order,
            items: formattedCart,
            cashierName: order.salespersonName || 'Pesanan Online',
            paidAmount: order.totalAmount,
            changeAmount: 0
        });
        setShowReceipt(true);
    };

    // Auto-sync polling every 8 detik dari tablet satelit & pesanan mobile online
    useEffect(() => {
        fetchActiveMobileOrders(true);
        const timer = setInterval(() => {
            fetchPendingBills(true);
            fetchActiveMobileOrders(true);
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const handleHoldBill = async () => {
        if (cart.length === 0) {
            toast.error("Keranjang masih kosong");
            return;
        }

        const finalLabel = holdLabel.trim() || (customerName && customerName !== 'Pelanggan Walk-in' ? customerName : `Meja #${pendingBills.length + 1}`);
        setHoldLoading(true);
        try {
            // Jika sebelumnya melanjutkan pending bill, hapus bill lama agar tidak dobel
            if (activePendingBillId) {
                try {
                    await api.delete(`/pos/pending/${activePendingBillId}`);
                } catch (e) {}
            }

            const userBranchId = typeof window !== 'undefined' ? localStorage.getItem('userBranchId') : null;
            const res = await api.post('/pos/hold', {
                label: finalLabel,
                items: cart.map(item => ({
                    id: item.id,
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    quantity: item.qty,
                    image: item.image,
                    modifiers: item.modifiers,
                    cartId: item.cartId
                })),
                saleType,
                branchId: userBranchId ? Number(userBranchId) : undefined
            });

            toast.success(`Pesanan "${finalLabel}" berhasil ditahan! Antrean #${res.data?.queueNumber || '-'}`);
            setCart([]);
            setActivePendingBillId(null);
            setActivePendingBillLabel('');
            setHoldLabel('');
            setShowHoldModal(false);
            fetchPendingBills();
            broadcastToCustomerDisplay({ type: 'RESET' });
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Gagal menahan pesanan");
        } finally {
            setHoldLoading(false);
        }
    };

    const handleResumePendingBill = (bill: any) => {
        let parsedItems: any[] = [];
        if (typeof bill.items === 'string') {
            try { parsedItems = JSON.parse(bill.items); } catch(e) {}
        } else if (Array.isArray(bill.items)) {
            parsedItems = bill.items;
        }

        if (!parsedItems || parsedItems.length === 0) {
            toast.error("Data pesanan tidak valid atau kosong.");
            return;
        }

        if (cart.length > 0) {
            if (!confirm("Keranjang saat ini berisi item aktif. Timpa keranjang dengan pesanan tertunda ini?")) {
                return;
            }
        }

        const restoredCart: CartItem[] = parsedItems.map((item: any, idx: number) => {
            const prodId = Number(item.id || item.productId);
            const existingProd = products.find(p => p.id === prodId);
            return {
                id: prodId,
                name: item.name || existingProd?.name || 'Produk',
                price: Number(item.price || existingProd?.price || 0),
                qty: Number(item.qty || item.quantity || 1),
                stock: existingProd?.stock ?? 999,
                unit: existingProd?.unit || 'pcs',
                image: item.image || existingProd?.image,
                category: existingProd?.category,
                categoryId: existingProd?.categoryId,
                modifiers: item.modifiers || null,
                cartId: item.cartId || `${prodId}-${Date.now()}-${idx}`,
                isDiscountable: item.isDiscountable !== undefined ? item.isDiscountable : (existingProd?.isDiscountable ?? true)
            };
        });

        setCart(restoredCart);
        setActivePendingBillId(bill.id);
        setActivePendingBillLabel(bill.label || `Antrean #${bill.queueNumber}`);
        if (bill.label && !bill.label.startsWith('Meja #') && !bill.label.startsWith('Pesanan #')) {
            setCustomerName(bill.label);
        }
        if (bill.saleType) {
            setSaleType(bill.saleType);
        }
        setShowPendingBillsModal(false);
        toast.success(`Pesanan "${bill.label || `Antrean #${bill.queueNumber}`}" berhasil dimuat!`);
    };

    const handleDeletePendingBill = async (id: number) => {
        if (!confirm("Hapus pesanan tertunda ini?")) return;
        try {
            await api.delete(`/pos/pending/${id}`);
            toast.success("Pending bill berhasil dihapus.");
            if (activePendingBillId === id) {
                setActivePendingBillId(null);
                setActivePendingBillLabel('');
            }
            fetchPendingBills();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Gagal menghapus pending bill");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
            return matchSearch && matchCat;
        });
    }, [products, searchTerm, selectedCategory]);

    const addToCart = (product: Product, withModifiers: any = null) => {
        if (product.trackStock !== false && product.stock <= 0) {
            toast.error("Stok habis!");
            return;
        }

        if (!withModifiers && product.customizations && product.customizations.length > 0) {
            setModifierProduct(product);
            setModifierSelections({});
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => 
                item.id === product.id && 
                JSON.stringify(item.modifiers || null) === JSON.stringify(withModifiers || null)
            );
            if (existing) {
                if (product.trackStock !== false && existing.qty >= product.stock) {
                    toast.error("Stok tidak cukup");
                    return prev;
                }
                return prev.map(item => 
                    item.cartId === existing.cartId ? { ...item, qty: item.qty + 1 } : item
                );
            }
            return [...prev, { ...product, qty: 1, modifiers: withModifiers, cartId: Date.now().toString() + Math.random().toString() }];
        });
    };

    const updateQty = (cartId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return item;
                if (item.trackStock !== false && newQty > item.stock) {
                    toast.error("Stok tidak cukup");
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (cartId: string) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
    };

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [cart]);

    const discountableSubtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            const isDisc = item.isDiscountable !== false;
            return sum + (isDisc ? (item.price * item.qty) : 0);
        }, 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        if (!employeeDiscount) return 0;
        return Math.round(discountableSubtotal * (employeeDiscount.value / 100));
    }, [discountableSubtotal, employeeDiscount]);

    const subtotalAfterDiscount = useMemo(() => {
        return Math.max(0, subtotal - discountAmount - voucherDiscountAmount);
    }, [subtotal, discountAmount, voucherDiscountAmount]);

    const taxAmount = useMemo(() => {
        return Math.round(subtotalAfterDiscount * taxRate / 100);
    }, [subtotalAfterDiscount, taxRate]);

    const finalTotalAmount = useMemo(() => {
        return subtotalAfterDiscount + taxAmount;
    }, [subtotalAfterDiscount, taxAmount]);

    const cashChange = useMemo(() => {
        if (typeof cashReceived !== 'number' || cashReceived < finalTotalAmount) return 0;
        return cashReceived - finalTotalAmount;
    }, [cashReceived, finalTotalAmount]);

    const cashShortcuts = useMemo(() => {
        if (finalTotalAmount <= 0) return [];
        const suggestions = new Set<number>();
        suggestions.add(finalTotalAmount); // Uang Pas
        
        const denominations = [10000, 20000, 50000, 100000, 200000, 500000];
        for (const d of denominations) {
            if (d > finalTotalAmount && suggestions.size < 5) {
                suggestions.add(d);
            }
        }
        if (finalTotalAmount > 50000) {
            const nextFifty = Math.ceil(finalTotalAmount / 50000) * 50000;
            const nextHundred = Math.ceil(finalTotalAmount / 100000) * 100000;
            suggestions.add(nextFifty);
            suggestions.add(nextHundred);
        }
        return Array.from(suggestions).filter(v => v >= finalTotalAmount).sort((a, b) => a - b).slice(0, 5);
    }, [finalTotalAmount]);

    // Customer Display Broadcaster
    const broadcastToCustomerDisplay = (overridePayload?: any) => {
        const payload = overridePayload || {
            type: 'CART_UPDATE',
            tenantName: companyName,
            logoUrl: companyLogo,
            saleType,
            customerName,
            items: cart.map(item => ({
                id: item.id,
                cartId: item.cartId,
                name: item.name,
                price: item.price,
                qty: item.qty,
                modifiers: item.modifiers,
                total: item.price * item.qty
            })),
            featuredProducts: products.slice(0, 4).map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                category: p.category?.name || 'MENU'
            })),
            subtotal,
            discountAmount: discountAmount + voucherDiscountAmount,
            taxAmount,
            totalAmount: finalTotalAmount,
            paymentMethod: accounts.find(a => a.id === selectedAccount)?.name || null,
            isCompleted: showReceipt,
            lastSale: lastSale ? {
                invoiceNumber: lastSale.invoiceNumber,
                queueNumber: lastSale.queueNumber,
                totalAmount: lastSale.totalAmount,
                paidAmount: lastSale.paidAmount,
                changeAmount: lastSale.changeAmount,
                paymentMethod: lastSale.paymentMethod
            } : null
        };

        // 1. BroadcastChannel API (Native local sync)
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                const channel = new BroadcastChannel('aivola_customer_display');
                channel.postMessage(payload);
                channel.close();
            }
        } catch (e) {}

        // 2. LocalStorage Persistence fallback
        try {
            localStorage.setItem('aivola_pos_customer_state', JSON.stringify({
                ...payload,
                timestamp: Date.now()
            }));
        } catch (e) {}
    };

    // Auto-broadcast on any cart or checkout state changes
    useEffect(() => {
        broadcastToCustomerDisplay();
    }, [cart, subtotal, discountAmount, voucherDiscountAmount, taxAmount, finalTotalAmount, selectedAccount, customerName, saleType, showReceipt, lastSale, companyName, companyLogo, products]);

    // Listen for sync requests from newly opened customer display
    useEffect(() => {
        let channel: BroadcastChannel | null = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('aivola_customer_display');
                channel.onmessage = (event) => {
                    if (event.data?.type === 'REQUEST_SYNC') {
                        broadcastToCustomerDisplay();
                    }
                };
            }
        } catch (e) {}

        return () => {
            if (channel) channel.close();
        };
    }, [cart, subtotal, discountAmount, voucherDiscountAmount, taxAmount, finalTotalAmount, selectedAccount, customerName, saleType, showReceipt, lastSale, companyName, companyLogo, products]);

    const handleApplyVoucher = async (overrideCode?: string) => {
        const codeToApply = overrideCode || voucherCode;
        if (!codeToApply.trim()) {
            setVoucherDiscountAmount(0);
            return;
        }
        try {
            const res = await api.post('/pos/calculate', {
                subtotal,
                discountableSubtotal: discountableSubtotal,
                voucherCode: codeToApply,
                totalQuantity: cart.reduce((sum, item) => sum + item.qty, 0)
            });
            setVoucherDiscountAmount(res.data.voucherDiscountAmount || 0);
            toast.success("Voucher berhasil diaplikasikan!");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Gagal mengaplikasikan voucher");
            setVoucherDiscountAmount(0);
        }
    };

    const handleScanQR = async (tokenOverride?: string) => {
        const finalToken = tokenOverride || scannedQRToken;
        if (!finalToken.trim()) return;
        setScanLoading(true);
        try {
            const res = await api.post('/pos/scan-employee-qr', { token: finalToken });
            setEmployeeDiscount(res.data.discount);
            setCustomerName(res.data.customer.name);
            setCustomerPhone(res.data.customer.phone);
            toast.success("ID Karyawan Valid! Diskon diterapkan.");
            setShowScanModal(false);
            setScannedQRToken("");
        } catch (err: any) {
            // Jika gagal discan sebagai Karyawan, coba jadikan Voucher
            setVoucherCode(finalToken);
            setShowScanModal(false);
            setScannedQRToken("");
            await handleApplyVoucher(finalToken);
        } finally {
            setScanLoading(false);
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!selectedAccount) {
            toast.error("Pilih metode pembayaran terlebih dahulu!");
            setShowCheckoutModal(true);
            return;
        }

        const paid = typeof cashReceived === 'number' && cashReceived >= finalTotalAmount ? cashReceived : finalTotalAmount;
        const change = typeof cashReceived === 'number' && cashReceived >= finalTotalAmount ? cashReceived - finalTotalAmount : 0;
        const finalCustName = customerName.trim() || 'Pelanggan Walk-in';

        setCheckoutLoading(true);
        try {
            const payload = {
                items: cart.map(item => ({
                    productId: item.id,
                    quantity: item.qty,
                    price: item.price,
                    modifiers: item.modifiers || null
                })),
                accountId: selectedAccount,
                totalAmount: finalTotalAmount,
                taxRate,
                taxAmount,
                saleType,
                paymentMethod: accounts.find(a => a.id === selectedAccount)?.name || 'Bayar di Kasir',
                paymentReference: paymentReference.trim() || null,
                customerName: finalCustName,
                customerPhone: customerPhone.trim() || null,
                voucherCode,
                voucherDiscountAmount,
                memberDiscountAmount: discountAmount,
                salespersonId: selectedSalesperson || null,
                pendingBillId: activePendingBillId || null
            };

            const res = await api.post('/pos/checkout', payload);
            setLastSale({
                ...res.data,
                paidAmount: paid,
                changeAmount: change
            });
            toast.success("Transaksi Berhasil!");

            // Broadcast Success to Customer Display
            broadcastToCustomerDisplay({
                type: 'TRANSACTION_SUCCESS',
                tenantName: companyName,
                logoUrl: companyLogo,
                saleType,
                customerName: finalCustName,
                items: cart.map(item => ({
                    id: item.id,
                    cartId: item.cartId,
                    name: item.name,
                    price: item.price,
                    qty: item.qty,
                    modifiers: item.modifiers,
                    total: item.price * item.qty
                })),
                subtotal,
                discountAmount: discountAmount + voucherDiscountAmount,
                taxAmount,
                totalAmount: finalTotalAmount,
                paymentMethod: accounts.find(a => a.id === selectedAccount)?.name || 'Bayar di Kasir',
                isCompleted: true,
                lastSale: {
                    invoiceNumber: res.data?.invoiceNumber,
                    queueNumber: res.data?.queueNumber,
                    totalAmount: res.data?.totalAmount || finalTotalAmount,
                    paidAmount: paid,
                    changeAmount: change,
                    paymentMethod: res.data?.paymentMethod || accounts.find(a => a.id === selectedAccount)?.name
                }
            });
            
            // OPTIMIZATION: Update local stock instantly without full re-fetch flicker
            const cartMap = new Map(cart.map(item => [item.id, item.qty]));
            setProducts(prev => prev.map(p => {
                const qtySold = cartMap.get(p.id);
                return qtySold ? { ...p, stock: p.stock - qtySold } : p;
            }));

            setCustomerPhone("");
            setPaymentReference("");
            setVoucherCode("");
            setVoucherDiscountAmount(0);
            setEmployeeDiscount(null);
            setCashReceived('');
            setShowCheckoutModal(false);
            setLastCart([...cart]);
            setCart([]);
            setActivePendingBillId(null);
            setActivePendingBillLabel('');
            fetchPendingBills();
            setShowReceipt(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Gagal memproses transaksi");
        } finally {
            setCheckoutLoading(false);
        }
    };

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // '/' to search
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('pos-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <DashboardLayout>
            <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-8 overflow-hidden p-2">
                
                {/* LEFT: Product Section */}
                <div className="flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-[40px] border border-white/5 shadow-2xl overflow-hidden backdrop-blur-xl group">
                    {/* Header: Search & Filter */}
                    <div className="p-8 border-b border-white/5 space-y-8 bg-slate-950/30">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform duration-500">
                                    <Monitor className="h-7 w-7 stroke-[2.5px]" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                        Nexus <span className="text-blue-500">Terminal</span>
                                    </h1>
                                    <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase mt-1 italic">Authorized Transaction Interface</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full xl:w-auto">
                                <button
                                    onClick={togglePosFullscreen}
                                    title={isPosFullscreen ? "Keluar Layar Penuh (Tampilkan Menu Admin)" : "Mode POS Layar Penuh (Sembunyikan Menu Admin)"}
                                    className={`flex items-center gap-2 px-4 py-4 border rounded-2xl text-[10px] font-black uppercase tracking-wider italic transition-all active:scale-95 whitespace-nowrap shadow-lg ${
                                        isPosFullscreen
                                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-amber-500/10'
                                        : 'bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-slate-300'
                                    }`}
                                >
                                    {isPosFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                    <span className="hidden sm:inline">{isPosFullscreen ? "Kecilkan" : "Layar Penuh POS"}</span>
                                </button>
                                <button
                                    onClick={() => { fetchPendingBills(); setShowPendingBillsModal(true); }}
                                    title="Daftar Pesanan Tertahan (Pending Bills)"
                                    className="relative flex items-center gap-2 px-4 py-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-[10px] font-black text-amber-400 hover:text-amber-300 transition-all uppercase tracking-wider italic shadow-lg shadow-amber-500/10 active:scale-95 whitespace-nowrap"
                                >
                                    <Clock className="h-4 w-4" />
                                    <span className="hidden sm:inline">Pending Bills</span>
                                    {pendingBills.length > 0 && (
                                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-md animate-pulse">
                                            {pendingBills.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => { fetchActiveMobileOrders(); setShowMobileOrdersModal(true); }}
                                    title="Pesanan Mobile Aktif (Aivola Go / Web Order)"
                                    className="relative flex items-center gap-2 px-4 py-4 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-2xl text-[10px] font-black text-sky-400 hover:text-sky-300 transition-all uppercase tracking-wider italic shadow-lg shadow-sky-500/10 active:scale-95 whitespace-nowrap"
                                >
                                    <Smartphone className="h-4 w-4" />
                                    <span className="hidden sm:inline">Pesanan Mobile</span>
                                    {activeMobileOrders.length > 0 && (
                                        <span className="bg-sky-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-md animate-pulse">
                                            {activeMobileOrders.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={openCustomerDisplay}
                                    title="Buka Layar Pelanggan (Dual-Screen Display)"
                                    className="flex items-center gap-2 px-4 py-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-2xl text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-all uppercase tracking-wider italic shadow-lg shadow-indigo-500/10 active:scale-95 whitespace-nowrap"
                                >
                                    <Tv className="h-4 w-4" />
                                    <span className="hidden sm:inline">Layar Customer</span>
                                </button>
                                <div className="relative w-full xl:w-[350px] group/search">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within/search:text-blue-500 transition-colors z-10" />
                                    <input 
                                        id="pos-search"
                                        type="text" 
                                        placeholder="SCAN_OR_SEARCH_PRODUCT..."
                                        className="w-full pl-12 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-[10px] font-black text-white focus:border-blue-500/50 outline-none transition-all italic tracking-[0.2em] uppercase placeholder:text-slate-800 shadow-inner"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar py-1">
                            <button 
                                onClick={() => setSelectedCategory(null)}
                                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border italic ${
                                    selectedCategory === null 
                                    ? 'bg-blue-600 text-white border-blue-400 shadow-2xl shadow-blue-500/20' 
                                    : 'bg-slate-950 text-slate-600 border-white/5 hover:border-blue-500/50 hover:text-blue-400'
                                }`}
                            >
                                All Schema
                            </button>
                            {categories.map(cat => (
                                <button 
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border italic ${
                                        selectedCategory === cat.id 
                                        ? 'bg-blue-600 text-white border-blue-400 shadow-2xl shadow-blue-500/20' 
                                        : 'bg-slate-950 text-slate-600 border-white/5 hover:border-blue-500/50 hover:text-blue-400'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-1 overflow-y-auto p-8 scrollbar-hide bg-slate-950/10">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="h-56 bg-white/5 rounded-[32px] border border-white/5" />
                                ))}
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredProducts.map(product => (
                                    <div 
                                        key={product.id}
                                        onClick={() => addToCart(product)}
                                        className="group relative flex flex-col bg-slate-900/50 border border-white/5 rounded-[32px] p-5 cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-500/30 transition-all active:scale-95 overflow-hidden"
                                    >
                                        <div className="aspect-square w-full rounded-2xl bg-slate-950/50 mb-4 flex items-center justify-center overflow-hidden border border-white/5 group-hover:border-blue-500/20 transition-colors relative">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Tag className="h-10 w-10 text-slate-800 group-hover:text-blue-500/50 transition-colors group-hover:rotate-12 duration-500" />
                                                    <span className="text-[8px] font-black text-slate-800 tracking-tighter uppercase whitespace-nowrap">NO_MEDIA_SOURCE</span>
                                                </div>
                                            )}
                                            {/* Stock Indicator Overlay */}
                                            <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10">
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${product.stock < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                                                    STK: {product.stock}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 inline-block px-2 py-0.5 rounded-full mb-2 italic">
                                                    {product.category?.name || 'GENERAL'}
                                                </p>
                                                <h3 className="font-black text-white text-xs leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-blue-400 transition-colors duration-300">{product.name}</h3>
                                            </div>
                                            <div className="flex items-end justify-between mt-4">
                                                <p className="font-black text-lg text-white italic tracking-tighter group-hover:scale-110 transition-transform origin-left text-glow-sm">
                                                    Rp {product.price.toLocaleString()}
                                                </p>
                                                <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all shadow-inner">
                                                    <Plus className="h-4 w-4 stroke-[3px]" />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Overlay Badge */}
                                        {cart.find(c => c.id === product.id) && (
                                            <div className="absolute top-3 right-3 bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shadow-2xl border-2 border-slate-900 animate-in zoom-in spin-in-90 duration-300">
                                                {cart.find(c => c.id === product.id)?.qty}
                                            </div>
                                        )}
                                        {/* Glass Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:to-blue-500/5 transition-all duration-500"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-700 uppercase tracking-[0.2em] font-black italic">
                                <Search className="h-20 w-20 mb-6 opacity-5" />
                                <p className="text-glow-sm">Terminal Scan: No Product Matches Detected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Cart & Checkout Section */}
                <div className="w-full lg:w-[460px] xl:w-[500px] flex flex-col bg-slate-900 border border-white/5 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden text-white backdrop-blur-3xl relative shrink-0">
                    {/* Header with Tabs */}
                    <div className="p-4 px-6 border-b border-white/5 bg-slate-950/70 flex items-center justify-between gap-3">
                        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/10 gap-1 flex-1">
                            <button
                                onClick={() => setActiveTab('cart')}
                                className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                    activeTab === 'cart'
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                <span>Pesanan ({cart.reduce((s, c) => s + c.qty, 0)})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('payment')}
                                className={`flex-1 py-2 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                    activeTab === 'payment'
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                <span>Bayar & Tamu</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                                disabled={cart.length === 0}
                                onClick={() => {
                                    if (cart.length === 0) return;
                                    setHoldLabel(customerName && customerName !== 'Pelanggan Walk-in' ? customerName : '');
                                    setShowHoldModal(true);
                                }}
                                title="Tahan Pesanan (Hold Bill / Pending)"
                                className="h-10 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl border border-amber-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                            >
                                <PauseCircle className="h-4 w-4" />
                                <span className="hidden sm:inline">TAHAN</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setCart([]);
                                    setActivePendingBillId(null);
                                    setActivePendingBillLabel('');
                                }}
                                title="Kosongkan Pesanan"
                                className="h-10 w-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-500 rounded-xl border border-white/5 transition-all active:scale-95"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Middle Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-4 pos-touch-scrollbar bg-slate-950/20 space-y-4">
                        {activeTab === 'cart' ? (
                            /* TAB 1: DAFTAR KERANJANG */
                            <>
                                {/* Active Pending Bill Indicator if resumed */}
                                {activePendingBillId && (
                                    <div className="flex items-center justify-between p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-300 text-xs animate-in slide-in-from-top-1">
                                        <div className="flex items-center gap-2">
                                            <PauseCircle className="h-4 w-4 shrink-0 text-amber-400" />
                                            <div>
                                                <span className="text-[9px] uppercase font-bold text-amber-400 block">Melanjutkan Pending Bill:</span>
                                                <span className="font-black text-white">{activePendingBillLabel || `#${activePendingBillId}`}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setActivePendingBillId(null);
                                                setActivePendingBillLabel('');
                                                toast.success("Dilepas dari pending bill (akan checkout sebagai transaksi baru).");
                                            }}
                                            className="text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/30"
                                        >
                                            Lepas
                                        </button>
                                    </div>
                                )}

                                {/* Quick Customer Bar */}
                                <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-2xl border border-white/5 text-xs">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-blue-400" />
                                        <span className="text-slate-400">Pelanggan:</span>
                                        <span className="font-bold text-white truncate max-w-[140px]">{customerName || 'Walk-in / Umum'}</span>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('payment')}
                                        className="text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
                                    >
                                        Ubah
                                    </button>
                                </div>

                                {cart.length === 0 ? (
                                    <div className="h-64 flex flex-col items-center justify-center text-slate-600 uppercase tracking-widest font-black text-[10px] text-center gap-4">
                                        <div className="h-20 w-20 rounded-3xl bg-slate-900 border border-white/5 flex items-center justify-center">
                                            <ShoppingCart className="h-8 w-8 opacity-30 text-slate-500" />
                                        </div>
                                        <p>Keranjang Kosong<br/><span className="text-[9px] text-slate-700">Pilih menu dari katalog di sebelah kiri</span></p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {cart.map(item => (
                                            <div key={item.cartId} className="flex items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                                <div className="h-11 w-11 rounded-xl bg-slate-950 border border-white/5 flex items-center justify-center text-blue-500 font-black text-xs shrink-0 overflow-hidden">
                                                    {item.image ? (
                                                        <img src={item.image} className="w-full h-full object-cover opacity-70" />
                                                    ) : (
                                                        item.name.substring(0, 2).toUpperCase()
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-black text-xs text-white uppercase truncate">{item.name}</h4>
                                                    {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex flex-wrap gap-1">
                                                            {Object.values(item.modifiers).map((mod: any, idx) => (
                                                                <span key={idx} className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                                                    {mod.name} {mod.price > 0 && `(+${mod.price.toLocaleString()})`}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[11px] text-blue-400 font-black">
                                                            Rp {item.price.toLocaleString('id-ID')}
                                                        </p>
                                                        {item.isDiscountable === false && (
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                                                                Non-Diskon
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-slate-950 rounded-xl p-1 gap-1 border border-white/10 shrink-0">
                                                    <button 
                                                        onClick={() => updateQty(item.cartId, -1)}
                                                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95"
                                                    >
                                                        <Minus className="h-3 w-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-xs font-black text-white">{item.qty}</span>
                                                    <button 
                                                        onClick={() => updateQty(item.cartId, 1)}
                                                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-95"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="h-7 w-7 flex items-center justify-center text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 transition-colors"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* TAB 2: PEMBAYARAN & PELANGGAN (SPACIOUS IN-PANEL VIEW) */
                            <div className="space-y-4">
                                {/* TIPE PENJUALAN */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipe Penjualan</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { id: 'WALK_IN', label: 'Walk-in', icon: <User className="h-3 w-3" /> },
                                            { id: 'GOFOOD', label: 'GoFood', icon: <ShoppingCart className="h-3 w-3" /> },
                                            { id: 'GRABFOOD', label: 'GrabFood', icon: <ShoppingCart className="h-3 w-3" /> },
                                            { id: 'SHOPEEFOOD', label: 'ShopeeFood', icon: <ShoppingCart className="h-3 w-3" /> },
                                            { id: 'QPOON', label: 'QPoon', icon: <ShoppingCart className="h-3 w-3" /> }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSaleType(opt.id)}
                                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                                    saleType === opt.id 
                                                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20' 
                                                    : 'bg-slate-900 text-slate-400 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                {opt.icon} {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* DATA PELANGGAN */}
                                <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-2xl border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Data Pelanggan</label>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => { setCustomerName("Pelanggan Walk-in"); setCustomerPhone(""); }}
                                                className="text-[9px] font-black bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/20 transition-all"
                                            >
                                                + Walk-in Umum
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                            <input 
                                                type="text"
                                                placeholder="Nama Pelanggan (Default: Pelanggan Walk-in)"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                            />
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder="Nomor HP Pelanggan (Opsional)"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600 font-medium"
                                        />
                                    </div>
                                </div>

                                {/* METODE PEMBAYARAN */}
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Metode Pembayaran</label>
                                        <span className="text-[9px] font-bold text-slate-500">Pilih salah satu</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {accounts.map(acc => {
                                            let icon = <Banknote className="h-4 w-4" />;
                                            let badgeText = "Tunai";
                                            const isSelected = selectedAccount === acc.id;
                                            if (acc.name.toUpperCase().includes('QRIS')) { badgeText = "QRIS"; icon = <Scan className="h-4 w-4" />; }
                                            else if (acc.type === 'BANK') { badgeText = "Transfer/EDC"; icon = <CreditCard className="h-4 w-4" />; }
                                            
                                            return (
                                                <button 
                                                    key={acc.id}
                                                    onClick={() => setSelectedAccount(acc.id)}
                                                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                                                        isSelected 
                                                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/10' 
                                                        : 'bg-slate-900 border-white/5 text-slate-400 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-black uppercase text-slate-500">{badgeText}</div>
                                                        <div className="text-xs font-bold text-white truncate">{acc.name}</div>
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* JIKA METODE TUNAI */}
                                    {selectedAccount && accounts.find(a => a.id === selectedAccount)?.name.toUpperCase().includes('KAS') && (
                                        <div className="bg-slate-900/80 p-3 rounded-2xl border border-emerald-500/20 space-y-2 mt-2 animate-in fade-in">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                <span>Uang Diterima</span>
                                                {cashReceived && typeof cashReceived === 'number' && cashReceived >= finalTotalAmount && (
                                                    <span className="text-emerald-400 font-bold">Kembalian: Rp {cashChange.toLocaleString('id-ID')}</span>
                                                )}
                                            </div>
                                            {/* Quick Nominal Chips */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {cashShortcuts.map((nominal, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setCashReceived(nominal)}
                                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                                            cashReceived === nominal 
                                                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' 
                                                            : 'bg-slate-950 text-slate-300 border-white/10 hover:border-emerald-500/40'
                                                        }`}
                                                    >
                                                        {nominal === finalTotalAmount ? 'Uang Pas' : `Rp ${nominal.toLocaleString('id-ID')}`}
                                                    </button>
                                                ))}
                                            </div>
                                            <input 
                                                type="number"
                                                placeholder="Ketik nominal tunai..."
                                                value={cashReceived === '' ? '' : cashReceived}
                                                onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    )}

                                    {/* JIKA METODE NON-TUNAI / EDC */}
                                    {selectedAccount && !accounts.find(a => a.id === selectedAccount)?.name.toUpperCase().includes('KAS') && (
                                        <div className="pt-1 animate-in fade-in">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Nomor Referensi / Approval EDC (Opsional)
                                            </label>
                                            <input 
                                                type="text"
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                placeholder="Contoh: 123456..."
                                                className="w-full mt-1 px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* SALESPERSON & VOUCHER ROW */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Salesperson</label>
                                        <select
                                            value={selectedSalesperson}
                                            onChange={(e) => setSelectedSalesperson(e.target.value)}
                                            className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:border-blue-500 outline-none"
                                        >
                                            <option value="">-- Default Kasir --</option>
                                            {salespersons.map(sp => (
                                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voucher</label>
                                        <div className="flex gap-1.5">
                                            <input 
                                                type="text"
                                                placeholder="Kode"
                                                value={voucherCode}
                                                onChange={(e) => setVoucherCode(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white uppercase outline-none focus:border-blue-500"
                                            />
                                            <button 
                                                onClick={() => handleApplyVoucher()} 
                                                className="px-3 py-2 bg-purple-500/20 text-purple-300 font-bold rounded-xl border border-purple-500/30 text-xs hover:bg-purple-500/30"
                                            >
                                                Cek
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Summary & Checkout (Bottom Sticky Footer - Compact & Touch-Friendly) */}
                    <div className="p-4 bg-slate-950/90 border-t border-white/10 space-y-3 shrink-0">
                        <div className="bg-slate-900/90 rounded-2xl p-3 border border-white/5 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-slate-400">
                                <span>Subtotal ({cart.reduce((s, c) => s + c.qty, 0)} item)</span>
                                <span className="font-bold text-white">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            
                            {employeeDiscount && (
                                <div className="flex justify-between items-center text-emerald-400 font-bold">
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        {employeeDiscount.label} ({employeeDiscount.value}%)
                                    </span>
                                    <span>
                                        {discountAmount > 0 
                                            ? `-Rp ${discountAmount.toLocaleString('id-ID')}` 
                                            : (discountableSubtotal === 0 && subtotal > 0 ? "Rp 0 (Produk Non-Diskon)" : "-Rp 0")}
                                    </span>
                                </div>
                            )}

                            {voucherDiscountAmount > 0 && (
                                <div className="flex justify-between items-center text-purple-400 font-bold">
                                    <span>Voucher Diskon</span>
                                    <span>-Rp {voucherDiscountAmount.toLocaleString('id-ID')}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-slate-400">
                                <span className="flex items-center gap-1.5">
                                    Pajak (11%)
                                    <button 
                                        onClick={() => setTaxRate(taxRate === 11 ? 0 : 11)} 
                                        className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                            taxRate === 11 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {taxRate === 11 ? 'AKTIF' : 'OFF'}
                                    </button>
                                </span>
                                <span className="font-bold text-white">Rp {taxAmount.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="border-t border-white/10 pt-2 mt-1 flex justify-between items-baseline">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-300">TOTAL BAYAR</span>
                                <span className="text-2xl font-black text-emerald-400 tracking-tight">Rp {finalTotalAmount.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setShowScanModal(true)}
                                title="Scan ID Karyawan (Aivola ID)"
                                className="h-13 px-3.5 rounded-2xl font-black text-xs text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
                            >
                                <Scan className="w-4 h-4" />
                                <span className="hidden sm:inline text-[10px]">ID KARYAWAN</span>
                            </button>

                            {activeTab === 'cart' ? (
                                <button 
                                    disabled={cart.length === 0 || checkoutLoading}
                                    onClick={() => {
                                        if (cart.length === 0) return;
                                        setShowCheckoutModal(true);
                                    }}
                                    className={`flex-1 h-13 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 italic ${
                                        cart.length === 0 || checkoutLoading
                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-blue-500/25 hover:brightness-110 border border-blue-400/30'
                                    }`}
                                >
                                    <span>BAYAR SEKARANG</span>
                                    <ArrowRight className="h-4 w-4 stroke-[3px]" />
                                </button>
                            ) : (
                                <div className="flex gap-2 flex-1">
                                    <button 
                                        onClick={() => setShowCheckoutModal(true)}
                                        title="Buka Modal Layar Sentuh Lengkap"
                                        className="h-13 px-3 rounded-2xl font-black text-xs text-blue-400 border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1"
                                    >
                                        <Maximize className="w-4 h-4" />
                                        <span className="hidden sm:inline text-[10px]">LAYAR SENTUH</span>
                                    </button>
                                    <button 
                                        disabled={cart.length === 0 || checkoutLoading}
                                        onClick={handleCheckout}
                                        className={`flex-1 h-13 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 italic ${
                                            cart.length === 0 || checkoutLoading
                                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5'
                                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/25 border border-emerald-400/30'
                                        }`}
                                    >
                                        {checkoutLoading ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 stroke-[2.5px]" />
                                                <span>PROSES BAYAR</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* DEDICATED FULL TOUCH-SCREEN CHECKOUT MODAL */}
            {showCheckoutModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[92vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="p-5 px-7 border-b border-white/10 bg-slate-950/70 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Jendela Pembayaran Layar Sentuh</h3>
                                    <p className="text-xs text-slate-400">Total Tagihan: <span className="font-bold text-emerald-400">Rp {finalTotalAmount.toLocaleString('id-ID')}</span> ({cart.reduce((s, c) => s + c.qty, 0)} item)</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCheckoutModal(false)}
                                className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Body - 2 Columns */}
                        <div className="flex-1 overflow-y-auto p-6 pos-touch-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/30">
                            {/* KOLOM KIRI: PELANGGAN & DETAIL ORDER */}
                            <div className="space-y-5">
                                {/* DATA PELANGGAN */}
                                <div className="space-y-3 bg-slate-900/80 p-4 rounded-3xl border border-white/5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-300">Pilihan Pelanggan</label>
                                        <button
                                            type="button"
                                            onClick={() => { setCustomerName("Pelanggan Walk-in"); setCustomerPhone(""); }}
                                            className="text-xs font-bold bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 px-3 py-1 rounded-xl border border-blue-500/30 transition-all flex items-center gap-1"
                                        >
                                            <User className="h-3.5 w-3.5" />
                                            <span>+ Set Walk-in Umum</span>
                                        </button>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nama Pelanggan</label>
                                            <input 
                                                type="text"
                                                placeholder="Ketik nama pelanggan..."
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                className="w-full mt-1 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm font-semibold text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Nomor HP (Opsional)</label>
                                            <input 
                                                type="text"
                                                placeholder="0812xxxxxxxxx"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                className="w-full mt-1 px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm font-semibold text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* TIPE PENJUALAN */}
                                <div className="space-y-2 bg-slate-900/80 p-4 rounded-3xl border border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-300">Tipe Penjualan</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {[
                                            { id: 'WALK_IN', label: 'Walk-in', icon: <User className="h-4 w-4" /> },
                                            { id: 'GOFOOD', label: 'GoFood', icon: <ShoppingCart className="h-4 w-4" /> },
                                            { id: 'GRABFOOD', label: 'GrabFood', icon: <ShoppingCart className="h-4 w-4" /> },
                                            { id: 'SHOPEEFOOD', label: 'ShopeeFood', icon: <ShoppingCart className="h-4 w-4" /> },
                                            { id: 'QPOON', label: 'QPoon', icon: <ShoppingCart className="h-4 w-4" /> }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setSaleType(opt.id)}
                                                className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-bold border transition-all ${
                                                    saleType === opt.id 
                                                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/25' 
                                                    : 'bg-slate-950 text-slate-400 border-white/5 hover:border-white/20'
                                                }`}
                                            >
                                                {opt.icon} <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* SALESPERSON */}
                                <div className="space-y-2 bg-slate-900/80 p-4 rounded-3xl border border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-300">Pilih Salesperson / Kasir</label>
                                    <select
                                        value={selectedSalesperson}
                                        onChange={(e) => setSelectedSalesperson(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm font-semibold text-white focus:border-blue-500 outline-none"
                                    >
                                        <option value="">-- Default Kasir / Tanpa Salesperson --</option>
                                        {salespersons.map(sp => (
                                            <option key={sp.id} value={sp.id}>{sp.name} {sp.jobTitle ? `(${sp.jobTitle})` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* KOLOM KANAN: METODE PEMBAYARAN & TUNAI */}
                            <div className="space-y-5">
                                <div className="space-y-3 bg-slate-900/80 p-4 rounded-3xl border border-white/5">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-300">Pilih Metode Pembayaran</label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {accounts.map(acc => {
                                            let icon = <Banknote className="h-5 w-5" />;
                                            let badgeText = "Tunai";
                                            const isSelected = selectedAccount === acc.id;
                                            if (acc.name.toUpperCase().includes('QRIS')) { badgeText = "QRIS"; icon = <Scan className="h-5 w-5" />; }
                                            else if (acc.type === 'BANK') { badgeText = "Debit/Transfer"; icon = <CreditCard className="h-5 w-5" />; }
                                            
                                            return (
                                                <button 
                                                    key={acc.id}
                                                    onClick={() => setSelectedAccount(acc.id)}
                                                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                                                        isSelected 
                                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/15' 
                                                        : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20'
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}>
                                                        {icon}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[10px] font-black uppercase text-slate-500">{badgeText}</div>
                                                        <div className="text-xs font-bold text-white truncate">{acc.name}</div>
                                                    </div>
                                                    {isSelected && <Check className="h-5 w-5 text-emerald-400 shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* JIKA METODE TUNAI DIPILIH */}
                                {selectedAccount && accounts.find(a => a.id === selectedAccount)?.name.toUpperCase().includes('KAS') && (
                                    <div className="space-y-3 bg-slate-900/90 p-4 rounded-3xl border border-emerald-500/30 animate-in fade-in">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-black uppercase tracking-widest text-emerald-400">Pembayaran Tunai</label>
                                            <span className="text-xs text-slate-400">Tagihan: <b className="text-white">Rp {finalTotalAmount.toLocaleString('id-ID')}</b></span>
                                        </div>

                                        {/* Shortcut Nominal Cepat */}
                                        <div className="grid grid-cols-3 gap-2">
                                            {cashShortcuts.map((nominal, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setCashReceived(nominal)}
                                                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                                        cashReceived === nominal 
                                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md' 
                                                        : 'bg-slate-950 text-slate-300 border-white/10 hover:border-emerald-500/40'
                                                    }`}
                                                >
                                                    {nominal === finalTotalAmount ? 'Uang Pas' : `Rp ${nominal.toLocaleString('id-ID')}`}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="pt-1">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Input Uang Diterima Manual</label>
                                            <div className="relative mt-1">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-500">Rp</span>
                                                <input 
                                                    type="number"
                                                    placeholder="0"
                                                    value={cashReceived === '' ? '' : cashReceived}
                                                    onChange={(e) => setCashReceived(e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-lg font-mono font-bold text-emerald-400 outline-none focus:border-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Kembalian Box */}
                                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                                            typeof cashReceived === 'number' && cashReceived >= finalTotalAmount
                                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                            : typeof cashReceived === 'number' && cashReceived < finalTotalAmount
                                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                            : 'bg-slate-950 border-white/5 text-slate-400'
                                        }`}>
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-wider">
                                                    {typeof cashReceived === 'number' && cashReceived < finalTotalAmount ? 'Uang Kurang' : 'Kembalian'}
                                                </div>
                                                <div className="text-xl font-black font-mono mt-0.5">
                                                    {typeof cashReceived === 'number' && cashReceived < finalTotalAmount
                                                        ? `- Rp ${(finalTotalAmount - cashReceived).toLocaleString('id-ID')}`
                                                        : `Rp ${cashChange.toLocaleString('id-ID')}`
                                                    }
                                                </div>
                                            </div>
                                            {typeof cashReceived === 'number' && cashReceived >= finalTotalAmount && (
                                                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* JIKA NON-TUNAI / EDC */}
                                {selectedAccount && !accounts.find(a => a.id === selectedAccount)?.name.toUpperCase().includes('KAS') && (
                                    <div className="space-y-2 bg-slate-900/80 p-4 rounded-3xl border border-white/5 animate-in fade-in">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-300">
                                            Nomor Approval / Ref EDC (Opsional)
                                        </label>
                                        <input 
                                            type="text"
                                            value={paymentReference}
                                            onChange={(e) => setPaymentReference(e.target.value)}
                                            placeholder="Contoh: 123456 atau No Transaksi EDC..."
                                            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 px-7 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Selesai Dibayar</div>
                                <div className="text-2xl font-black text-emerald-400">Rp {finalTotalAmount.toLocaleString('id-ID')}</div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button 
                                    onClick={() => setShowCheckoutModal(false)}
                                    className="px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    disabled={checkoutLoading}
                                    onClick={handleCheckout}
                                    className="flex-1 sm:flex-initial px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 border border-emerald-400/40"
                                >
                                    {checkoutLoading ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 stroke-[2.5px]" />
                                            <span>SELESAIKAN & CETAK STRUK</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            
            {/* MODIFIER MODAL */}
            {modifierProduct && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#050505]/95 backdrop-blur-2xl sm:p-4 animate-in fade-in duration-500">
                    <div className="bg-slate-900 w-full sm:max-w-xl rounded-t-[48px] sm:rounded-[48px] shadow-[0_0_100px_rgba(59,130,246,0.1)] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-500 border border-white/5 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 bg-slate-950/30 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black italic tracking-tighter text-white uppercase text-glow-sm">
                                    Customization
                                </h3>
                                <p className="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase mt-1 italic">{modifierProduct.name}</p>
                            </div>
                            <button 
                                onClick={() => { setModifierProduct(null); setModifierSelections({}); }}
                                className="h-10 w-10 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        {/* Body */}
                        <div className="p-8 overflow-y-auto space-y-8 flex-1 scrollbar-hide">
                            {modifierProduct.customizations?.map((customization: any) => {
                                const group = customization.Group;
                                if (!group) return null;
                                const isRequired = group.isRequired;
                                const maxSel = group.maxSelections;
                                const selectedInGroup = modifierSelections[group.id] || [];
                                
                                return (
                                    <div key={group.id} className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h4 className="text-sm font-black uppercase text-white tracking-widest">{group.name}</h4>
                                                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 italic mt-1">
                                                    {isRequired ? 'Wajib Pilih' : 'Opsional'} &bull; Max: {maxSel}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded italic">{selectedInGroup.length}/{maxSel}</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {group.options?.map((opt: any) => {
                                                const isSelected = selectedInGroup.some(s => s.id === opt.id);
                                                return (
                                                    <div 
                                                        key={opt.id}
                                                        onClick={() => {
                                                            setModifierSelections(prev => {
                                                                const current = prev[group.id] || [];
                                                                if (isSelected) {
                                                                    return { ...prev, [group.id]: current.filter(c => c.id !== opt.id) };
                                                                } else {
                                                                    if (current.length >= maxSel) {
                                                                        if (maxSel === 1) {
                                                                            return { ...prev, [group.id]: [opt] }; // Replace if max 1
                                                                        }
                                                                        toast.error(`Maksimal ${maxSel} pilihan`);
                                                                        return prev;
                                                                    }
                                                                    return { ...prev, [group.id]: [...current, opt] };
                                                                }
                                                            });
                                                        }}
                                                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                                                            isSelected 
                                                            ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]' 
                                                            : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/10'
                                                        }`}
                                                    >
                                                        <span className="text-[11px] font-black uppercase tracking-wider">{opt.name}</span>
                                                        {opt.price > 0 && <span className="text-[10px] font-bold">+Rp{opt.price.toLocaleString()}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-950/80 shrink-0">
                            <button 
                                onClick={() => {
                                    // Validate Required Groups
                                    for (const customization of modifierProduct.customizations || []) {
                                        const group = customization.Group;
                                        if (group && group.isRequired) {
                                            const selected = modifierSelections[group.id] || [];
                                            if (selected.length < group.minSelections) {
                                                toast.error(`${group.name} minimal ${group.minSelections} pilihan!`);
                                                return;
                                            }
                                        }
                                    }
                                    
                                    // Format modifiers for cart
                                    const finalModifiers: Record<string, any> = {};
                                    let extraPrice = 0;
                                    Object.entries(modifierSelections).forEach(([groupId, opts]) => {
                                        opts.forEach(opt => {
                                            finalModifiers[`${groupId}_${opt.id}`] = { id: opt.id, name: opt.name, price: opt.price };
                                            extraPrice += opt.price;
                                        });
                                    });
                                    
                                    // Create a customized product with accumulated price
                                    const customizedProduct = { ...modifierProduct, price: modifierProduct.price + extraPrice };
                                    
                                    addToCart(customizedProduct, finalModifiers);
                                    setModifierProduct(null);
                                    setModifierSelections({});
                                }}
                                className="w-full py-5 rounded-[24px] bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                SELESAI & MASUKKAN KERANJANG
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* RECEIPT MODAL */}

            {showReceipt && lastSale && (
                <>
                    {/* CSS khusus untuk print struk Thermal */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #thermal-receipt, #thermal-receipt * {
                                visibility: visible;
                            }
                            #thermal-receipt {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 58mm; /* Ukuran thermal standar 58mm */
                                margin: 0;
                                padding: 0;
                                background-color: white !important;
                                color: black !important;
                            }
                            @page {
                                margin: 0;
                            }
                        }
                    `}} />

                    {/* HIDDEN PRINTABLE RECEIPT */}
                    <div id="thermal-receipt" className="hidden print:block font-mono text-[11px] p-2 bg-white text-black w-[58mm] leading-tight">
                        <div className="text-center mb-4">
                            <h2 className="font-bold text-sm uppercase">{companyName || 'AIVOLA POS'}</h2>
                            <p className="text-[10px]">STRUK PEMBAYARAN RESMI</p>
                        </div>
                        
                        <div className="border-t border-dashed border-black py-2 mb-2">
                            <div className="flex justify-between">
                                <span>Tgl: {new Date(lastSale.createdAt).toLocaleDateString('id-ID')}</span>
                                <span>{new Date(lastSale.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div>No: {lastSale.invoiceNumber}</div>
                            <div>Kasir: {lastSale.saleType}</div>
                            {lastSale.customerName && <div>Plg: {lastSale.customerName}</div>}
                        </div>

                        <div className="border-t border-b border-dashed border-black py-2 mb-2">
                            {lastCart.map((item, idx) => (
                                <div key={idx} className="mb-2">
                                    <div className="font-bold">{item.name}</div>
                                    {item.modifiers && Object.keys(item.modifiers).length > 0 && (
                                        <div className="text-[9px] pl-2 text-gray-700 italic">
                                            {Object.entries(item.modifiers).map(([k, v]: [string, any]) => `${k}: ${v.name || v}`).join(', ')}
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>{item.qty} x {item.price.toLocaleString()}</span>
                                        <span>{(item.qty * item.price).toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1 mb-2">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>Rp {(lastSale.totalAmount - lastSale.taxAmount).toLocaleString()}</span>
                            </div>
                            {lastSale.taxAmount > 0 && (
                                <div className="flex justify-between">
                                    <span>Pajak ({lastSale.taxRate}%)</span>
                                    <span>Rp {lastSale.taxAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-[12px] pt-1 border-t border-dashed border-black">
                                <span>TOTAL</span>
                                <span>Rp {lastSale.totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="border-t border-dashed border-black py-2 mt-4 text-center">
                            <p>Metode Pembayaran:</p>
                            <p className="font-bold">{lastSale.paymentMethod || accounts.find(a => a.id === selectedAccount)?.name}</p>
                            {lastSale?.paidAmount && (
                                <div className="text-[11px] mt-1 space-y-0.5">
                                    <div>Tunai Diterima: Rp {Number(lastSale.paidAmount).toLocaleString('id-ID')}</div>
                                    {lastSale.changeAmount > 0 && (
                                        <div className="font-bold">Kembalian: Rp {Number(lastSale.changeAmount).toLocaleString('id-ID')}</div>
                                    )}
                                </div>
                            )}
                            {lastSale?.paymentReference && (
                                <p className="text-[10px] mt-1 font-bold">REF/EDC: {lastSale.paymentReference}</p>
                            )}
                        </div>

                        <div className="text-center mt-4">
                            <p>Terima kasih atas kunjungan Anda!</p>
                            <p className="text-[9px] mt-1">Powered by Aivola</p>
                        </div>
                    </div>

                    {/* ON-SCREEN MODAL */}
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]/95 backdrop-blur-2xl p-4 animate-in fade-in duration-500 print:hidden">
                    <div className="bg-slate-900 w-full max-w-sm rounded-[48px] shadow-[0_0_100px_rgba(59,130,246,0.1)] overflow-hidden animate-in zoom-in-95 duration-500 border border-white/5">
                        <div className="p-10 text-center border-b border-dashed border-white/10 bg-slate-950/30">
                            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[32px] border border-emerald-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="h-10 w-10 stroke-[3px] animate-bounce" />
                            </div>
                            <h3 className="text-2xl font-black italic tracking-tighter text-white uppercase text-glow-sm">Settle Success</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2 italic">AUTH_TRANS_ID: {lastSale.invoiceNumber}</p>
                        </div>
                        <div className="p-10 space-y-6">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                                <span className="text-slate-500">Amount Transferred</span>
                                <span className="text-white text-base tracking-tighter italic">Rp {lastSale.totalAmount.toLocaleString()}</span>
                            </div>
                            {lastSale.taxRate > 0 && (
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic text-amber-500">
                                    <span>Tax Load Protocol ({lastSale.taxRate}%)</span>
                                    <span>Rp {lastSale.taxAmount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic">
                                <span className="text-slate-500">Protocol Method</span>
                                <span className="text-blue-400">{lastSale.paymentMethod || accounts.find(a => a.id === selectedAccount)?.name}</span>
                            </div>
                            {lastSale?.paidAmount && lastSale.changeAmount > 0 && (
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic text-emerald-400">
                                    <span>Kembalian</span>
                                    <span className="font-mono text-sm font-bold">Rp {Number(lastSale.changeAmount).toLocaleString('id-ID')}</span>
                                </div>
                            )}
                            {lastSale?.paymentReference && (
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic text-amber-400">
                                    <span className="text-slate-500">Ref / Approval EDC</span>
                                    <span className="font-mono">{lastSale.paymentReference}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest italic pb-6 border-b border-white/5">
                                <span className="text-slate-500">Timestamp</span>
                                <span className="text-slate-400 font-mono text-[9px]">
                                    {new Date(lastSale.createdAt).toLocaleTimeString('id-ID')}
                                </span>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => window.print()}
                                    className="flex items-center justify-center gap-3 w-full py-5 bg-blue-600 text-white rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-500 shadow-2xl shadow-blue-500/20 transition-all active:scale-95 italic border-b-4 border-blue-900"
                                >
                                    <Printer className="h-4 w-4 stroke-[3px]" />
                                    Generate Receipt
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowReceipt(false);
                                        setLastSale(null);
                                        broadcastToCustomerDisplay({ type: 'RESET' });
                                    }}
                                    className="w-full py-4 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] transition-all italic underline underline-offset-8 decoration-slate-800"
                                >
                                    Close Terminal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}
            {/* SCAN QR MODAL */}
            {showScanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl transform scale-100 animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-tighter mb-1">Scan Aivola ID</h3>
                                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Arahkan scanner ke QR Code di HP karyawan, atau paste token di sini.</p>
                                </div>
                                <button onClick={() => setShowScanModal(false)} className="text-slate-500 hover:text-white transition-colors bg-slate-800/50 p-2 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-slate-950 p-2 rounded-2xl border-2 border-dashed border-slate-800 flex items-center justify-center flex-col min-h-[250px]">
                                    <QrScanner 
                                        onScanSuccess={(decodedText) => {
                                            setScannedQRToken(decodedText);
                                            setTimeout(() => {
                                                handleScanQR(decodedText);
                                            }, 500);
                                        }}
                                        onScanFailure={(error) => {
                                            // Optional: handle failure if needed
                                        }}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Manual Token Input</label>
                                    <input 
                                        type="text"
                                        value={scannedQRToken}
                                        onChange={(e) => setScannedQRToken(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleScanQR();
                                        }}
                                        autoFocus
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono placeholder:text-slate-700"
                                        placeholder="Paste JWT Token here"
                                    />
                                </div>

                                <button 
                                    onClick={() => handleScanQR()}
                                    disabled={scanLoading || !scannedQRToken}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    {scanLoading ? 'Memvalidasi...' : 'Terapkan Diskon'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HOLD BILL MODAL */}
            {showHoldModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-6 text-white animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <PauseCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase text-white">Tahan Pesanan (Hold Bill)</h3>
                                    <p className="text-[10px] text-slate-400">Simpan pesanan sementara untuk dilanjutkan nanti</p>
                                </div>
                            </div>
                            <button onClick={() => setShowHoldModal(false)} className="text-slate-500 hover:text-white p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                                    Label / Nomor Meja / Nama Pelanggan
                                </label>
                                <input 
                                    type="text"
                                    autoFocus
                                    placeholder="Contoh: Meja 4, Bpk Joko, dll."
                                    value={holdLabel}
                                    onChange={(e) => setHoldLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleHoldBill();
                                    }}
                                    className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>

                            {/* Quick Suggestion Chips */}
                            <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saran Cepat:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {['Meja 1', 'Meja 2', 'Meja 3', 'Meja 4', 'Meja 5', 'Takeaway', 'Bungkus'].map(tag => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => setHoldLabel(tag)}
                                            className="px-2.5 py-1 rounded-xl text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-white/5 transition-all"
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cart Summary */}
                            <div className="bg-slate-950 p-3 rounded-2xl border border-white/5 text-xs flex justify-between items-center text-slate-400">
                                <span>Ringkasan Pesanan:</span>
                                <span className="font-bold text-white">{cart.reduce((s, c) => s + c.qty, 0)} item &bull; Rp {finalTotalAmount.toLocaleString('id-ID')}</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowHoldModal(false)}
                                    className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={holdLoading}
                                    onClick={handleHoldBill}
                                    className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    {holdLoading ? (
                                        <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <PauseCircle className="h-4 w-4" />
                                            <span>Simpan & Tahan</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PENDING BILLS LIST MODAL */}
            {showPendingBillsModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-2xl max-h-[85vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 px-6 border-b border-white/10 bg-slate-950/70 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wider text-white">Daftar Pesanan Tertahan (Pending Bills)</h3>
                                    <p className="text-xs text-slate-400">{pendingBills.length} pesanan sedang ditahan</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowPendingBillsModal(false)}
                                className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-5 pos-touch-scrollbar space-y-3 bg-slate-950/20">
                            {pendingBills.length === 0 ? (
                                <div className="h-56 flex flex-col items-center justify-center text-slate-600 text-center gap-3">
                                    <Clock className="h-12 w-12 opacity-30 text-slate-500" />
                                    <p className="text-sm font-bold text-slate-400">Tidak ada pesanan yang sedang ditahan.</p>
                                    <p className="text-xs text-slate-600">Gunakan tombol "TAHAN" pada keranjang untuk menunda pesanan.</p>
                                </div>
                            ) : (
                                pendingBills.map((bill) => {
                                    let itemsList: any[] = [];
                                    if (typeof bill.items === 'string') {
                                        try { itemsList = JSON.parse(bill.items); } catch(e) {}
                                    } else if (Array.isArray(bill.items)) {
                                        itemsList = bill.items;
                                    }
                                    const totalQty = itemsList.reduce((s: number, it: any) => s + (Number(it.qty || it.quantity) || 1), 0);
                                    const totalBill = itemsList.reduce((s: number, it: any) => s + ((Number(it.price) || 0) * (Number(it.qty || it.quantity) || 1)), 0);

                                    return (
                                        <div key={bill.id} className="bg-slate-900/90 border border-white/5 hover:border-amber-500/30 p-4 rounded-3xl transition-all space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="bg-amber-500/20 text-amber-300 font-mono font-black text-xs px-2.5 py-1 rounded-xl border border-amber-500/30">
                                                        #{bill.queueNumber || bill.id}
                                                    </span>
                                                    <div>
                                                        <h4 className="font-black text-sm text-white uppercase">{bill.label || 'Pesanan Tanpa Nama'}</h4>
                                                        <p className="text-[10px] text-slate-400">
                                                            {new Date(bill.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} &bull; Kasir: {bill.user?.name || '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-emerald-400">Rp {totalBill.toLocaleString('id-ID')}</div>
                                                    <div className="text-[10px] text-slate-500 font-bold">{totalQty} item</div>
                                                </div>
                                            </div>

                                            {/* Items preview pills */}
                                            <div className="flex flex-wrap gap-1 bg-slate-950 p-2.5 rounded-2xl border border-white/5 text-[11px] text-slate-300">
                                                {itemsList.map((it: any, idx: number) => (
                                                    <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded-lg border border-white/5">
                                                        {it.name} &times; {it.qty || it.quantity || 1}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex justify-end items-center gap-2 pt-1 border-t border-white/5">
                                                <button
                                                    onClick={() => handleDeletePendingBill(bill.id)}
                                                    className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    Hapus
                                                </button>
                                                <button
                                                    onClick={() => handleResumePendingBill(bill)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95"
                                                >
                                                    <PlayCircle className="h-3.5 w-3.5" />
                                                    <span>Lanjutkan Pesanan</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE MOBILE ORDERS MODAL */}
            {showMobileOrdersModal && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-white/10 w-full max-w-3xl max-h-[85vh] rounded-[36px] shadow-2xl flex flex-col overflow-hidden text-white animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 px-6 border-b border-white/10 bg-slate-950/70 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                                    <Smartphone className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-black uppercase tracking-wider text-white">Pesanan Mobile Aktif</h3>
                                        <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">
                                            Online / QR Meja
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">{activeMobileOrders.length} pesanan aktif memerlukan penanganan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => fetchActiveMobileOrders(false)}
                                    disabled={mobileOrdersLoading}
                                    title="Segarkan Pesanan"
                                    className="h-10 px-3 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-2xl flex items-center gap-2 transition-colors text-xs font-bold disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${mobileOrdersLoading ? 'animate-spin' : ''}`} />
                                    <span className="hidden sm:inline">Segarkan</span>
                                </button>
                                <button 
                                    onClick={() => setShowMobileOrdersModal(false)}
                                    className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-5 pos-touch-scrollbar space-y-4 bg-slate-950/20">
                            {activeMobileOrders.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-slate-600 text-center gap-3">
                                    <Smartphone className="h-14 w-14 opacity-25 text-sky-400" />
                                    <p className="text-sm font-bold text-slate-400">Belum ada pesanan mobile aktif saat ini.</p>
                                    <p className="text-xs text-slate-600 max-w-sm">
                                        Pesanan yang dibuat pelanggan dari web order (QR Meja atau Aivola Go) akan otomatis masuk dan bersuara secara real-time.
                                    </p>
                                </div>
                            ) : (
                                activeMobileOrders.map((order) => {
                                    const status = order.status || 'PENDING';
                                    const isPending = status === 'PENDING';
                                    const isProcessing = status === 'PROCESSING';
                                    const isReady = status === 'READY';
                                    const isPaid = status === 'PAID';

                                    let badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                                    let badgeText = 'PENDING (MENUNGGU)';
                                    if (isProcessing) {
                                        badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                                        badgeText = 'SEDANG DIPROSES';
                                    } else if (isReady) {
                                        badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                                        badgeText = 'SIAP DIAMBIL';
                                    } else if (isPaid) {
                                        badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                                        badgeText = 'SUDAH DIBAYAR';
                                    }

                                    const itemsList = order.items || [];
                                    const totalQty = itemsList.reduce((acc: number, it: any) => acc + (Number(it.quantity || it.qty) || 1), 0);

                                    return (
                                        <div 
                                            key={order.id} 
                                            className={`bg-slate-900/90 border rounded-3xl p-5 transition-all space-y-4 shadow-lg ${
                                                isPending 
                                                    ? 'border-amber-500/40 shadow-amber-500/5' 
                                                    : isProcessing 
                                                        ? 'border-blue-500/40 shadow-blue-500/5' 
                                                        : 'border-white/10 hover:border-sky-500/30'
                                            }`}
                                        >
                                            {/* Header Card */}
                                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-mono font-black text-sm text-sky-400">
                                                            {order.invoiceNumber}
                                                        </span>
                                                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                                                            {badgeText}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                                                        <span className="font-semibold text-white">Pelanggan: {order.customerName || 'Walk-in / Guest'}</span>
                                                        <span>&bull;</span>
                                                        <span>{new Date(order.date || order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-base font-black text-emerald-400">
                                                        Rp {Number(order.totalAmount || 0).toLocaleString('id-ID')}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 font-bold">{totalQty} item pesanan</div>
                                                </div>
                                            </div>

                                            {/* Delivery & Payment Info */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <span className="text-slate-500 font-semibold">Tipe:</span>
                                                    <span className="font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                                                        {order.deliveryMethod || 'Dine-in'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <span className="text-slate-500 font-semibold">Pembayaran:</span>
                                                    <span className="font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-lg border border-sky-500/20">
                                                        {order.paymentMethod || 'Bayar di Kasir'}
                                                    </span>
                                                </div>
                                                {order.notes && (
                                                    <div className="col-span-full flex items-start gap-2 pt-1 text-amber-300 text-[11px] font-medium border-t border-white/5 mt-1">
                                                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                                                        <span>Catatan: {order.notes}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Items Breakdown */}
                                            <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-white/5">
                                                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex justify-between">
                                                    <span>Daftar Menu</span>
                                                    <span>Subtotal</span>
                                                </div>
                                                <div className="divide-y divide-white/5 space-y-2">
                                                    {itemsList.map((item: any, idx: number) => {
                                                        const itemMods = Array.isArray(item.modifiers) ? item.modifiers : (typeof item.modifiers === 'string' ? JSON.parse(item.modifiers || '[]') : []);
                                                        return (
                                                            <div key={idx} className="pt-2 first:pt-0">
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-white">{item.name}</span>
                                                                        <span className="bg-slate-800 text-sky-400 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                                                            &times;{item.quantity || item.qty || 1}
                                                                        </span>
                                                                    </div>
                                                                    <span className="font-bold text-slate-300 text-xs">
                                                                        Rp {Number(item.subtotal || (item.price * (item.quantity || item.qty || 1))).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                                {itemMods && itemMods.length > 0 && (
                                                                    <div className="text-[10px] text-slate-400 italic pl-3 pt-0.5 space-y-0.5">
                                                                        {itemMods.map((mod: any, mIdx: number) => (
                                                                            <div key={mIdx}>+ {mod.optionName || mod.name} {mod.price > 0 ? `(+Rp ${Number(mod.price).toLocaleString('id-ID')})` : ''}</div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                                                <button
                                                    onClick={() => handlePrintMobileOrder(order)}
                                                    className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-white/5"
                                                    title="Cetak Struk Pesanan"
                                                >
                                                    <Printer className="h-3.5 w-3.5 text-sky-400" />
                                                    <span>Cetak Struk</span>
                                                </button>

                                                <div className="flex items-center gap-2">
                                                    {isPending && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateMobileOrderStatus(order.id, 'CANCELLED')}
                                                                disabled={updatingOrderId === order.id}
                                                                className="px-3.5 py-2.5 border border-red-500/40 text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                                                            >
                                                                Tolak
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateMobileOrderStatus(order.id, 'PROCESSING')}
                                                                disabled={updatingOrderId === order.id}
                                                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                                            >
                                                                <Check className="h-3.5 w-3.5 stroke-[3px]" />
                                                                <span>Terima Pesanan</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {isProcessing && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateMobileOrderStatus(order.id, 'READY')}
                                                                disabled={updatingOrderId === order.id}
                                                                className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                                            >
                                                                <span>Siap Diambil</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateMobileOrderStatus(order.id, 'COMPLETED')}
                                                                disabled={updatingOrderId === order.id}
                                                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                                            >
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span>Selesai</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {(isReady || isPaid) && (
                                                        <button
                                                            onClick={() => handleUpdateMobileOrderStatus(order.id, 'COMPLETED')}
                                                            disabled={updatingOrderId === order.id}
                                                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Selesai / Diambil</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

        </DashboardLayout>
    );
}
