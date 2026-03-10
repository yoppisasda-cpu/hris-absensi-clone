import axios from 'axios';

// Ini akan merujuk ke API Backend Node.js yang sudah kita buat sebelumnya
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api',
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
