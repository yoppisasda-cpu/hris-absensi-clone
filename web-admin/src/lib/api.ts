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
    
    return 'http://127.0.0.1:5000/api'; // Local development fallback
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
        if (error.response && error.response.status === 401) {
            // Jika Unauthorized, kemungkinan token expired. Hapus data & balik ke login.
            if (typeof window !== 'undefined') {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                window.location.href = '/'; // Balik ke halaman login
            }
        }
        return Promise.reject(error);
    }
);

export default api;
