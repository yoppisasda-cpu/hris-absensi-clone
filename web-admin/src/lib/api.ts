import axios from 'axios';

// Ini akan merujuk ke API Backend Node.js yang sudah kita buat sebelumnya
// Helper to determine the backend URL
const getBaseURL = () => {
    // Priority 1: Use Environment Variable (Defined in Vercel/Railway Dashboard)
    if (process.env.NEXT_PUBLIC_API_URL) {
        console.log("[API] Hits Backend at (ENV):", process.env.NEXT_PUBLIC_API_URL);
        return process.env.NEXT_PUBLIC_API_URL;
    }

    // Priority 2: Client-side detection based on current domain
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        // If testing on aivola.id domains
        if (host.includes('aivola.id')) {
            console.log("[API] Hits Backend at (Aivola): https://api.aivola.id/api");
            return 'https://api.aivola.id/api';
        }

        // If on Railway, usually the API is a different service. 
        // We warn the user to set the ENV variable.
        if (host.includes('railway.app')) {
            console.warn("[API WARNING] NEXT_PUBLIC_API_URL IS MISSING! This might cause 401 logouts.");
        }
    }
    
    const defaultApi = 'https://api.aivola.id/api';
    console.log("[API] Hits Backend at (Default):", defaultApi);
    return defaultApi; 
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
            
            // SECURITY OVERRIDE: We temporarly DISABLE aggressive logout to debug the "kick out" issue.
            // If it's a 401, we just log it aggressively. But if it's the login page, we let it pass.
            console.error("🚨 [API 401 ERROR CAUGHT] Backend menolak token Anda!", {
                url: error.config?.url,
                message: errorMsg,
                tokenSent: !!error.config?.headers?.Authorization
            });

            // We do NOT clear localStorage or window.location.href here anymore.
            // This prevents the "ditendang pas refresh" issue completely.
        }
        return Promise.reject(error);
    }
);

export default api;
