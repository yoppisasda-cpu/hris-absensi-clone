// Removed Prisma import to avoid sync issues during dev
type ChatRole = 'USER' | 'AI' | 'ADMIN';

/**
 * simulatedChatResponse
 * Simulates an AI response for the HRIS CRM Live Chat.
 * In a real production environment, this would call an LLM API (like Gemini).
 */
export async function getAIChatResponse(userMessage: string, history: {role: ChatRole, content: string}[]): Promise<string> {
    const msg = userMessage.toLowerCase();
    
    // Keyword groups for better matching
    const greetings = ['halo', 'hi', 'helo', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'apa kabar'];
    const fakeGPS = ['gps', 'lokasi', 'fakemap', 'fake', 'palsu', 'titip', 'mock', 'manipulasi', 'curang', 'bohong'];
    const security = ['aman', 'curang', 'hack', 'bobol', 'jahat', 'nakal', 'bohong', 'manipulasi', 'fraud', 'security', 'keamanan'];
    const faceAI = ['absen', 'face', 'wajah', 'liveness', 'kesamaan', 'kemiripan', 'foto', 'selfie', 'verifikasi'];
    const pricing = ['harga', 'biaya', 'paket', 'bayar', 'langganan', 'subs', 'murah', 'mahal', 'biaya', 'tagihan'];
    const features = ['fitur', 'keunggulan', 'apa saja', 'menu', 'kemampuan', 'bisa apa', 'manfaat'];
    const payroll = ['gaji', 'payroll', 'slip', 'gajian', 'bpjs', 'potongan', 'bonus', 'lembur'];
    const trial = ['coba', 'demo', 'gratis', 'free', 'test', 'tester', 'mencoba'];
    const leave = ['cuti', 'izin', 'sakit', 'libur', 'alfa'];
    const overtime = ['lembur', 'overtime', 'extra', 'malam'];
    const registration = ['daftar', 'tambah', 'registrasi', 'bikin akun', 'masuk', 'login', 'lupa password'];

    const matches = (keywords: string[]) => keywords.some(k => msg.includes(k));

    if (matches(greetings)) {
        return "Halo! Saya adalah Asisten AI Aivola. Ada yang bisa saya bantu terkait sistem HRIS dan manajemen absensi perusahaan Anda?";
    }

    if (matches(fakeGPS) || (matches(security) && (msg.includes('lokasi') || msg.includes('gps')))) {
        return "Tentu! Aivola punya fitur 'Anti Fakemap'. Sistem kami bisa mendeteksi penggunaan Fake GPS, Mock Location, atau emulator. Jika karyawan mencoba manipulasi lokasi, absensi akan otomatis ditolak. Keamanan data lokasi adalah prioritas kami.";
    }

    if (matches(faceAI) || matches(security)) {
        return "Keamanan absensi Aivola sangat ketat. Selain Anti Fake GPS, kami menggunakan AI Face Similarity dengan Liveness Detection. Foto selfie karyawan akan langsung dibandingkan dengan foto master dengan tingkat akurasi tinggi (kesamaan >75%) untuk mencegah titip absen pakai foto atau video.";
    }
    
    if (matches(payroll)) {
        return "Modul Payroll Aivola sangat lengkap. Penghitungan gaji otomatis terintegrasi dengan data kehadiran, lembur, bonus, dan potongan BPJS secara real-time. Anda bisa memproses ribuan slip gaji hanya dalam hitungan detik!";
    }

    if (matches(leave)) {
        return "Pengajuan cuti di Aivola semudah chatting! Karyawan bisa mengajukan cuti lewat aplikasi mobile, dan atasan bisa menyetujuinya lewat dashboard admin atau notifikasi. Saldo cuti juga terhitung otomatis.";
    }

    if (matches(overtime)) {
        return "Aivola mendukung otomatisasi lembur. Sistem bisa mendeteksi jika karyawan bekerja lebih lama dari shift yang ditentukan, atau karyawan bisa mengajukan request lembur yang akan otomatis menambah penghitungan di payroll.";
    }

    if (matches(registration)) {
        return "Untuk pendaftaran karyawan baru, Anda bisa melakukannya secara bulk (unggah excel) atau satu per satu di menu 'Employee Management' pada Dashboard Admin. Password default akan dikirim via email.";
    }
    
    if (matches(pricing)) {
        return "Aivola sangat terjangkau, mulai dari Rp 10.000 per karyawan/bulan. Kami punya paket Basic, Pro, dan Enterprise yang bisa disesuaikan dengan kebutuhan jumlah karyawan dan fitur perusahaan Anda. Cek detailnya di menu 'Harga'.";
    }

    if (matches(features)) {
        return "Aivola adalah platform HRIS All-in-One yang memiliki fitur: \n1. Manajemen Karyawan & Organisasi \n2. Payroll Otomatis & BPJS \n3. Absensi Anti-Fraud (Wajah + Anti Fakemap) \n4. KPI Tracking (Penilaian berbobot) \n5. Pojok Curhat (Ruang aspirasi anonim) \n6. Learning Center & Portal Karyawan.\nFitur mana yang ingin Anda jelajahi?";
    }

    if (msg.includes('kpi') || msg.includes('performa') || msg.includes('nilai')) {
        return "Fitur KPI Aivola memungkinkan HR untuk mengatur indikator penilaian berbobot bagi setiap divisi. Karyawan bisa melihat rata-rata skor bulanan mereka (Excellent, Good, dsb) beserta feedback langsung dari atasan di aplikasi mobile.";
    }

    if (msg.includes('curhat') || msg.includes('aspirasi') || msg.includes('anonim') || msg.includes('perasaan')) {
        return "Kami punya fitur 'Pojok Curhat' (Vent). Di sini karyawan bisa menyampaikan aspirasi atau perasaan mereka secara 100% anonim. AI kami akan menganalisis tren mood tim (Senang, Stres, Lelah) sehingga perusahaan bisa memberikan dukungan mental yang tepat tanpa melanggar privasi.";
    }

    if (matches(trial)) {
        return "Kabar gembira! Anda bisa mencoba seluruh fitur Aivola secara gratis selama 14 hari tanpa kartu kredit. Cukup klik tombol 'Coba Gratis' di halaman depan untuk memulai.";
    }

    if (msg.includes('terima kasih') || msg.includes('thanks') || msg.includes('makasih') || msg.includes('mantap') || msg.includes('ok')) {
        return "Sama-sama! Senang bisa membantu Anda membangun tim yang lebih transparan dan produktif. Ada lagi yang ingin didiskusikan?";
    }

    // Default fallback - more engaging
    return "Maaf, saya kurang mengerti konteksnya. Tapi saya ahli dalam menjelaskan fitur Absensi Anti-Fraud (Wajah & Fake GPS), sistem Payroll Otomatis, atau cara memulai demo gratis Aivola. Apa ada yang ingin Anda tanyakan lebih spesifik?";
}
