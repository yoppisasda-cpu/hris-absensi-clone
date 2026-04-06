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
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            
            console.error("🚨 [API 401 ERROR CAUGHT]", {
                url: error.config?.url,
                message: errorMsg,
                path: currentPath
            });

            // Only logout if explicitly requested by the error message or if we are NOT on the login page
            // and NOT on a dashboard page that might be doing background sync.
            // For now, let's just log it and NOT kick the user out automatically.
            // This prevents the "ditendang pas buka produk" issue.
        }
        return Promise.reject(error);
    }
);

export default api;
