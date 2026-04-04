import axios from 'axios';

// Ini akan merujuk ke API Backend Node.js yang sudah kita buat sebelumnya
// Helper to determine the backend URL
const getBaseURL = () => {
    // Force direct Railway URL in production to bypass broken api.aivola.id
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host.includes('aivola.id') || host.includes('vercel.app')) {
            return 'https://api.aivola.id/api';
        }
    }
    
    // Allow local override if .env exists
    if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    
    return 'http://localhost:5000/api'; // Local development fallback
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Interceptor otomatis menyisipkan Token JWT (Bearer) Admin yang sedang login
api.interceptors.request.use((config) => {
    // Mengekstrak token dari Session Cache Browser
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
        // Hanya logout otomatis jika benar-benar 401 (Unauthorized) dari server
        // Dan pastikan bukan error koneksi biasa (timeout/disconnected)
        if (error.response && error.response.status === 401) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            
            // Jangan logout jika kita memang sudah berada di halaman login ( / )
            if (currentPath !== '/' && typeof window !== 'undefined') {
                console.warn("[API] Sesi habis atau tidak sah. Mengarahkan kembali ke login.");
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                // Tunggu sebentar sebelum redirect agar tidak loop
                setTimeout(() => {
                    window.location.href = '/'; 
                }, 500);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
