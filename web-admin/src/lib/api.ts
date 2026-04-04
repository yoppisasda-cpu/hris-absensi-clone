import axios from 'axios';

// Ini akan merujuk ke API Backend Node.js yang sudah kita buat sebelumnya
// Helper to determine the backend URL
const getBaseURL = () => {
    // Priority 1: Use Environment Variable (Defined in Vercel/Railway Dashboard)
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

    // Priority 2: Client-side detection based on current domain
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        // If testing on aivola.id domains
        if (host.includes('aivola.id')) {
            return 'https://api.aivola.id/api';
        }
        // If testing on your current Railway deployment URL, use its own backend port 5000 if same domain
        // Or simply fallback to the primary API if we know it.
    }
    
    return 'https://api.aivola.id/api'; // Default Production API
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 30000, // Extend timeout to 30s for heavy reports
});

// Interceptor otomatis menyisipkan Token JWT (Bearer) Admin yang sedang login
api.interceptors.request.use((config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor untuk menangani error (terutama 401 Token Expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // --- MULTI-LAYER AUTH PROTECTION ---
        if (error.response && error.response.status === 401) {
            const errorMsg = error.response.data?.error || "";
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            
            // Only logout if it's a DEFINITIVE invalid token error (not 401 from something else)
            const isDefinitiveAuthError = errorMsg.includes('Token tidak valid') || errorMsg.includes('kadaluarsa') || errorMsg.includes('Login');

            if (isDefinitiveAuthError && currentPath !== '/' && typeof window !== 'undefined') {
                console.error("[API REDIRECT] Force Logout due to definitive 401:", errorMsg);
                localStorage.clear(); // Clear all to be safe
                window.location.href = '/?error=session_expired'; 
            } else {
                console.warn("[API WARNING] Received 401 but it might be transient or specific. Staying logged in. Error:", errorMsg);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
