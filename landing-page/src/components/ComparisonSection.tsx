import React, { useState } from 'react';
import './ComparisonSection.css';

interface FeatureRow {
  category: 'pos' | 'hr' | 'inventory' | 'finance' | 'hybrid';
  name: string;
  description: string;
  aivola: { status: 'full' | 'partial' | 'none'; text: string };
  moka: { status: 'full' | 'partial' | 'none'; text: string };
  majoo: { status: 'full' | 'partial' | 'none'; text: string };
  esb: { status: 'full' | 'partial' | 'none'; text: string };
  mekari: { status: 'full' | 'partial' | 'none'; text: string };
}

export const ComparisonSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const bentoItems = [
    {
      icon: '💸',
      title: 'Biaya Langganan Membengkak',
      subtitle: 'Total Cost of Ownership (TCO)',
      pain: 'Bayar 3 software terpisah (Moka POS Rp 299rb + Mekari Talenta Rp 500rb+ + Jurnal Rp 499rb). Total mencapai Rp 1.300.000 - Rp 3.000.000 setiap bulan.',
      solution: 'AiVola menyatukan POS + HRIS + Akuntansi dalam 1 langganan flat terjangkau mulai Rp 149rb/bulan. Hemat biaya operasional hingga 70%.'
    },
    {
      icon: '⚖️',
      title: 'Laporan Keuangan & Kasir Selisih',
      subtitle: 'Data Silo & Rekap Manual',
      pain: 'Angka penjualan di mesin kasir tidak cocok dengan pembukuan laba rugi bulanan akibat sinkronisasi gagal atau rekap manual Excel yang rawan human error.',
      solution: 'Setiap struk keluar di kasir AiVola otomatis menjurnal ke Buku Besar, Laba Rugi, dan Neraca secara real-time detik itu juga.'
    },
    {
      icon: '🧪',
      title: 'Kebocoran Bahan Baku & Resep',
      subtitle: 'Inventory BOM & WIP',
      pain: 'Stok sirup, biji kopi, daging, dan cup kemasan sering habis mendadak atau hilang tanpa terlacak karena kasir biasa tidak menghitung resep bertingkat.',
      solution: 'Manajemen resep Bill of Materials (BOM) & Work in Progress (WIP) memotong gramatur bahan mentah dan bahan jadi secara otomatis dan presisi.'
    },
    {
      icon: '🛡️',
      title: 'Kecurangan Kasir & Titip Absen',
      subtitle: 'Fraud Watchdog & Geofencing',
      pain: 'Karyawan titip absen karena mesin absen cuma pakai PIN tablet kasir. Kasir melakukan pembatalan (void) atau manipulasi diskon setelah pelanggan bayar.',
      solution: 'Absensi selfie kamera dengan validasi GPS ketat anti-fake GPS di HP staf. Audit trail real-time mendeteksi pembatalan transaksi dan buka laci kasir.'
    }
  ];

  const categories = [
    { id: 'all', label: 'Semua Fitur' },
    { id: 'pos', label: 'POS & Kasir' },
    { id: 'hr', label: 'Absensi & HRIS' },
    { id: 'inventory', label: 'BOM & Stok' },
    { id: 'finance', label: 'Akuntansi & Keuangan' },
    { id: 'hybrid', label: 'Hybrid F&B + Sport Venue' },
  ];

  const featureRows: FeatureRow[] = [
    {
      category: 'pos',
      name: 'Kasir Offline-First & Auto Sync',
      description: 'Kasir tetap bisa jualan & cetak struk meski internet mati, sinkron otomatis saat online',
      aivola: { status: 'full', text: '✅ Native (Background Sync)' },
      moka: { status: 'partial', text: '⚠️ Terbatas (Rawan duplikat)' },
      majoo: { status: 'partial', text: '⚠️ Terbatas' },
      esb: { status: 'full', text: '✅ Ya (Hardware Khusus)' },
      mekari: { status: 'none', text: '❌ Tidak Ada POS' }
    },
    {
      category: 'hr',
      name: 'Absensi GPS Geofencing & Foto Selfie',
      description: 'Validasi radius GPS akurat dan verifikasi kamera ponsel karyawan',
      aivola: { status: 'full', text: '✅ Bawaan Lengkap (Mobile App)' },
      moka: { status: 'none', text: '❌ Hanya PIN di Tablet' },
      majoo: { status: 'partial', text: '⚠️ Dasar (Tanpa GPS ketat)' },
      esb: { status: 'none', text: '❌ Tidak Ada' },
      mekari: { status: 'full', text: '✅ Sangat Lengkap (Talenta)' }
    },
    {
      category: 'hr',
      name: 'Manajemen Shift & Payroll Otomatis',
      description: 'Perhitungan lembur, keterlambatan, dan slip gaji langsung terhubung absensi',
      aivola: { status: 'full', text: '✅ Terintegrasi Otomatis' },
      moka: { status: 'none', text: '❌ Tidak Ada' },
      majoo: { status: 'partial', text: '⚠️ Terbatas' },
      esb: { status: 'none', text: '❌ Tidak Ada' },
      mekari: { status: 'full', text: '✅ Lengkap (Biaya per kepala)' }
    },
    {
      category: 'inventory',
      name: 'Resep Bertingkat (BOM) & WIP',
      description: 'Pengurangan otomatis bahan mentah, bahan setengah jadi (WIP), dan kemasan',
      aivola: { status: 'full', text: '✅ Mendalam (BOM + WIP + Mod)' },
      moka: { status: 'partial', text: '⚠️ Tambahan Biaya Add-on' },
      majoo: { status: 'partial', text: '⚠️ Resep Dasar' },
      esb: { status: 'full', text: '✅ Sangat Lengkap' },
      mekari: { status: 'none', text: '❌ Tidak Spesifik F&B' }
    },
    {
      category: 'finance',
      name: 'Jurnal Akuntansi Otomatis dari POS',
      description: 'Setiap transaksi kasir otomatis menjurnal ke Buku Besar tanpa rekap ulang',
      aivola: { status: 'full', text: '✅ Real-time Otomatis' },
      moka: { status: 'none', text: '❌ Butuh Sinkron Eksternal' },
      majoo: { status: 'partial', text: '⚠️ Pembukuan Sederhana' },
      esb: { status: 'partial', text: '⚠️ Tambahan Modul ERP' },
      mekari: { status: 'full', text: '✅ Lengkap (Jurnal Mekari)' }
    },
    {
      category: 'finance',
      name: 'Laporan Laba Rugi, Neraca & Arus Kas',
      description: 'Standar akuntansi keuangan lengkap dengan analisis margin HPP riil',
      aivola: { status: 'full', text: '✅ Standar Akuntansi Penuh' },
      moka: { status: 'none', text: '❌ Hanya Laporan Kasir' },
      majoo: { status: 'partial', text: '⚠️ Ringkasan Terbatas' },
      esb: { status: 'partial', text: '⚠️ Butuh ERP Enterprise' },
      mekari: { status: 'full', text: '✅ Sangat Lengkap' }
    },
    {
      category: 'hybrid',
      name: 'Dukungan Bisnis Hybrid (Sport Venue + F&B)',
      description: 'Sewa lapangan (padel/badminton) dan order kafe digabung dalam satu nota transaksi',
      aivola: { status: 'full', text: '✅ Native (Single Open Bill)' },
      moka: { status: 'none', text: '❌ Hanya F&B / Ritel' },
      majoo: { status: 'none', text: '❌ Hanya F&B / Ritel' },
      esb: { status: 'none', text: '❌ Hanya Restoran' },
      mekari: { status: 'none', text: '❌ Tidak Ada' }
    },
    {
      category: 'pos',
      name: 'Member Loyalitas & Diskon Khusus Karyawan',
      description: 'Poin belanja pelanggan otomatis terpisah dari diskon khusus staf karyawan',
      aivola: { status: 'full', text: '✅ QR Khusus Karyawan + Poin' },
      moka: { status: 'partial', text: '⚠️ Hanya Member Biasa' },
      majoo: { status: 'partial', text: '⚠️ Poin Biasa' },
      esb: { status: 'partial', text: '⚠️ Modul Member Standar' },
      mekari: { status: 'none', text: '❌ Tidak Ada' }
    },
    {
      category: 'pos',
      name: 'AI Business Co-Pilot & Daily Briefing',
      description: 'Analisis cerdas HPP, menu terlaris, dan evaluasi shift dikirim langsung ke WhatsApp',
      aivola: { status: 'full', text: '✅ AI Mind Terintegrasi' },
      moka: { status: 'none', text: '❌ Dashboard Statis' },
      majoo: { status: 'none', text: '❌ Dashboard Statis' },
      esb: { status: 'none', text: '❌ Laporan Tabel Standar' },
      mekari: { status: 'none', text: '❌ Tidak Ada AI Alert POS' }
    },
    {
      category: 'pos',
      name: 'Anti-Fraud & Loss Prevention Watchdog',
      description: 'Alert instan jika kasir melakukan void setelah cetak struk atau buka laci kasir',
      aivola: { status: 'full', text: '✅ Notifikasi & Jejak Audit' },
      moka: { status: 'partial', text: '⚠️ Otorisasi Supervisor Saja' },
      majoo: { status: 'partial', text: '⚠️ Riwayat Saja' },
      esb: { status: 'full', text: '✅ Audit Ketat' },
      mekari: { status: 'none', text: '❌ Tidak Relevan' }
    }
  ];

  const filteredRows = activeCategory === 'all'
    ? featureRows
    : featureRows.filter(r => r.category === activeCategory);

  const renderBadge = (item: { status: 'full' | 'partial' | 'none'; text: string }) => {
    return (
      <span className={`status-pill ${item.status}`}>
        {item.text}
      </span>
    );
  };

  return (
    <section id="comparison" className="comparison-section">
      <div className="comparison-container">
        
        {/* Header */}
        <div className="comp-header">
          <div className="comp-badge">
            <span>⚡</span>
            <span>Benchmark Pasar & Komparasi Objektif</span>
          </div>
          <h2>
            Kenapa Memilih AiVola Dibanding <br />
            <span className="text-gradient">Menggabungkan Banyak Aplikasi?</span>
          </h2>
          <p>
            Banyak pengusaha F&B dan retail membayar jutaan rupiah tiap bulan untuk 3 aplikasi terpisah 
            (Kasir, Absensi, dan Akuntansi) yang datanya sering tidak sinkron. AiVola hadir menyelesaikan semua masalah 
            itu dalam <strong>satu ekosistem native terpadu</strong>.
          </p>
        </div>

        {/* Bento Grid: Masalah Nyata vs Solusi AiVola */}
        <div className="bento-grid">
          {bentoItems.map((item, index) => (
            <div key={index} className="bento-card">
              <div className="bento-header">
                <div className="bento-icon">{item.icon}</div>
                <div className="bento-title">
                  <span>{item.subtitle}</span>
                  <h3>{item.title}</h3>
                </div>
              </div>
              <div className="bento-body">
                <div className="pain-point">
                  <span className="pain-icon">✕</span>
                  <div>
                    <strong>Kendala Tanpa AiVola:</strong> {item.pain}
                  </div>
                </div>
                <div className="solution-point">
                  <span className="solution-icon">✓</span>
                  <div>
                    <strong>Solusi Terpadu AiVola:</strong> {item.solution}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Head-to-Head Brief Cards */}
        <div className="h2h-section">
          <div className="h2h-header">
            <h3>Perbandingan Langsung dengan Brand Besar</h3>
            <p style={{ color: '#94a3b8', margin: 0 }}>Lihat bagaimana AiVola memberikan nilai lebih tinggi untuk investasi bisnis Anda</p>
          </div>
          <div className="h2h-grid">
            <div className="h2h-card">
              <div className="h2h-target">Vs Moka POS</div>
              <h4>AiVola vs Moka</h4>
              <p className="h2h-summary">
                Moka unggul pada popularitas kasir dasar, namun tidak memiliki modul akuntansi buku besar dan absensi mobile GPS bawaan. Anda harus membayar langganan aplikasi ketiga.
              </p>
              <div className="h2h-verdict">
                <strong>Kesimpulan:</strong> AiVola jauh lebih lengkap dan hemat untuk bisnis yang butuh kontrol operasional menyeluruh.
              </div>
            </div>

            <div className="h2h-card">
              <div className="h2h-target">Vs Majoo</div>
              <h4>AiVola vs Majoo</h4>
              <p className="h2h-summary">
                Majoo menyasar UMKM umum berbiaya rendah, tetapi perincian resep bertingkat (WIP) dan akuntansi mendalam sangat terbatas untuk bisnis multi-cabang.
              </p>
              <div className="h2h-verdict">
                <strong>Kesimpulan:</strong> AiVola menghadirkan stabilitas industri dan logika BOM presisi untuk bisnis berkembang.
              </div>
            </div>

            <div className="h2h-card">
              <div className="h2h-target">Vs ESB Restaurant</div>
              <h4>AiVola vs ESB</h4>
              <p className="h2h-summary">
                ESB sangat matang untuk jaringan restoran franchise raksasa, namun biayanya puluhan hingga ratusan juta dengan setup yang kaku dan rumit.
              </p>
              <div className="h2h-verdict">
                <strong>Kesimpulan:</strong> AiVola memberikan kapabilitas setara enterprise tanpa kerumitan setup dan biaya selangit.
              </div>
            </div>

            <div className="h2h-card">
              <div className="h2h-target">Vs Mekari (Talenta/Jurnal)</div>
              <h4>AiVola vs Mekari</h4>
              <p className="h2h-summary">
                Mekari unggul untuk korporasi besar tanpa POS kasir langsung. Biaya per kepala karyawan di Talenta sangat mahal untuk kafe dengan pergantian staf tinggi.
              </p>
              <div className="h2h-verdict">
                <strong>Kesimpulan:</strong> AiVola memadukan kasir POS, absensi staf, dan akuntansi langsung tanpa biaya lisensi per orang.
              </div>
            </div>
          </div>
        </div>

        {/* Filter Category Bar */}
        <div className="matrix-filter-bar">
          {categories.map(c => (
            <button
              key={c.id}
              className={`filter-btn ${activeCategory === c.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Interactive Feature Table */}
        <div className="table-wrapper">
          <div className="table-scroll">
            <table className="comp-table">
              <thead>
                <tr>
                  <th className="th-feature">Fitur & Kapabilitas Sistem</th>
                  <th className="th-aivola">
                    <div className="aivola-badge-wrap">
                      <span className="aivola-col-pill">Pilihan Terlengkap</span>
                      <span className="aivola-col-title">AiVola.id</span>
                    </div>
                  </th>
                  <th className="th-comp">Moka POS</th>
                  <th className="th-comp">Majoo</th>
                  <th className="th-comp">ESB</th>
                  <th className="th-comp">Mekari</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="feature-title-cell">
                      {row.name}
                      <span className="feature-sub-desc">{row.description}</span>
                    </td>
                    <td className="aivola-cell">
                      {renderBadge(row.aivola)}
                    </td>
                    <td className="comp-cell">
                      {renderBadge(row.moka)}
                    </td>
                    <td className="comp-cell">
                      {renderBadge(row.majoo)}
                    </td>
                    <td className="comp-cell">
                      {renderBadge(row.esb)}
                    </td>
                    <td className="comp-cell">
                      {renderBadge(row.mekari)}
                    </td>
                  </tr>
                ))}
                
                {/* Pricing / TCO Benchmark Row */}
                <tr className="tr-pricing">
                  <td className="feature-title-cell">
                    <strong>Estimasi Biaya Software / Bulan (TCO)</strong>
                    <span className="feature-sub-desc">Biaya untuk Kasir + Absensi Karyawan + Laporan Keuangan Lengkap</span>
                  </td>
                  <td className="aivola-cell">
                    <div className="price-aivola">
                      <span>Mulai Rp 149.000</span>
                      <small>All-in-One Tanpa Biaya Tersembunyi</small>
                    </div>
                  </td>
                  <td className="comp-cell">
                    <div className="price-comp">
                      <span>Rp 299.000+</span>
                      <small>Belum termasuk software HR & Akuntansi</small>
                    </div>
                  </td>
                  <td className="comp-cell">
                    <div className="price-comp">
                      <span>Rp 149.000 - Rp 499.000</span>
                      <small>Fitur akuntansi & resep terbatas</small>
                    </div>
                  </td>
                  <td className="comp-cell">
                    <div className="price-comp">
                      <span>Rp 1.500.000++</span>
                      <small>Biaya instalasi puluhan juta</small>
                    </div>
                  </td>
                  <td className="comp-cell">
                    <div className="price-comp">
                      <span>Rp 1.200.000 - Rp 3.000.000+</span>
                      <small>Jurnal + Talenta (tanpa POS)</small>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Spotlight Validation */}
        <div className="client-spotlight">
          <div className="spotlight-info">
            <span style={{ fontSize: '0.8rem', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
              Studi Kasus Nyata di Lapangan
            </span>
            <h4>Terbukti Mengelola Bisnis F&B & Sport Arena Sekaligus</h4>
            <p>
              Digunakan langsung oleh <strong>Sevenbillion Coffee HO Sukmajaya</strong> (multi-menu coffee shop dengan stok resep WIP) 
              dan <strong>7B Padelplay</strong> (arena olahraga dengan transaksi open bill booking lapangan & F&B dalam satu faktur).
            </p>
          </div>
          <div className="spotlight-tags">
            <span className="spotlight-tag">☕ Multi-Outlet Coffee Shop</span>
            <span className="spotlight-tag">🎾 Sport Venue & Padel Arena</span>
            <span className="spotlight-tag">📦 Resep Bahan Baku WIP</span>
            <span className="spotlight-tag">📊 Laporan Neraca Real-time</span>
          </div>
        </div>

        {/* Section Conversion Banner */}
        <div className="comp-cta-banner">
          <h3>Siap Memiliki Sistem Bisnis Paling Rapi & Efisien?</h3>
          <p>
            Tinggalkan kerepotan memakai banyak aplikasi yang saling bertabrakan. 
            Mulai uji coba gratis AiVola sekarang dan rasakan kendali bisnis penuh dalam genggaman Anda.
          </p>
          <div className="comp-btn-group">
            <a href="https://admin.Aivola.id/register" className="btn-comp-primary">
              Coba Gratis 6 Bulan
            </a>
            <a 
              href="https://wa.me/6287882716935?text=Halo%20AiVola,%20saya%20ingin%20konsultasi%20mengenai%20sistem%20POS%20dan%20HRIS%20untuk%20bisnis%20saya" 
              className="btn-comp-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Konsultasi WhatsApp Gratis
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
