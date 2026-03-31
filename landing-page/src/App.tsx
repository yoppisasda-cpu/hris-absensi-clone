import { useState } from 'react'
import logoImg from './assets/logo.png'
import heroImg from './assets/hero.png'
import demoVideo from './assets/demo.webp'
import { ChatWidget } from './components/ChatWidget'
import './App.css'

function App() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="app-container">
      <nav>
        <div className="logo-container">
          <img src={logoImg} alt="Aivola Logo" className="logo-img" />
          <span className="logo-text">Aivola</span>
        </div>
        <div className="nav-links">
          <a href="#features">Fitur</a>
          <a href="#solutions">Solusi</a>
          <a href="#pricing">Harga</a>
          <a href="#about">Tentang</a>
          <a href="#renewal" style={{ color: '#f59e0b', fontWeight: '700' }}>🔄 Perpanjang</a>
          <a href="http://localhost:3000" className="btn-login">Login Admin</a>
        </div>
      </nav>

      <main>
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">Sistem Absensi & HR Terbaik di Indonesia</div>
            <h1>
              Kelola Tim Anda dengan <br />
              <span className="text-gradient">Lebih Cerdas & Akurat</span>
            </h1>
            <p className="hero-subtitle">
              Sistem manajemen kehadiran, payroll, dan administrasi karyawan yang terintegrasi. 
              Didesain untuk membantu bisnis Anda tumbuh lebih cepat.
            </p>
            <div className="cta-group">
              <a href="http://localhost:3000/register" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>Coba Gratis 14 Hari</a>
              <button className="btn-secondary" onClick={() => setIsVideoOpen(true)}>Lihat Demo</button>
            </div>
          </div>

          <div className="hero-visual">
            <img src={heroImg} alt="Aivola Dashboard Preview" className="hero-image" />
          </div>
        </section>

        <section id="features" className="features-container">
          <div className="section-header">
            <div className="hero-badge">Fitur Unggulan</div>
            <h2>Solusi HR Paling Lengkap</h2>
            <p>Kelola seluruh aspek sumber daya manusia dalam satu platform terintegrasi.</p>
          </div>

          <FeaturesShowcase />
        </section>

        <AboutSection />

        <section id="solutions" className="solutions-container">
          <div className="section-header">
            <div className="hero-badge">Solusi Industri</div>
            <h2>Cocok untuk Berbagai Jenis Bisnis</h2>
            <p>Fleksibilitas Aivola telah terbukti membantu efisiensi operasional di berbagai sektor industri.</p>
          </div>

          <div className="industry-grid">
            {[
              { icon: '🚚', title: 'Logistik', desc: 'Solusi HR bagi tim dengan operasional 24/7 dan mobilitas tinggi.' },
              { icon: '🏭', title: 'Manufaktur', desc: 'Kelola shift dan upah pekerja dalam jumlah besar di pabrik.' },
              { icon: '📦', title: 'Trading', desc: 'Solusi HCM terintegrasi untuk real sector dan operasi lapangan.' },
              { icon: '🛒', title: 'Ritel', desc: 'Optimalkan pengaturan shift, absensi, dan payroll multi-cabang.' },
              { icon: '☕', title: 'F&B', desc: 'Tingkatkan efisiensi HR untuk operasional restoran dan outlet.' },
              { icon: '🏨', title: 'Hospitality', desc: 'Permudah kelola absensi dan shift perhotelan yang dinamis.' },
              { icon: '💼', title: 'Jasa Profesional', desc: 'Pantau kinerja dan KPI tim ahli dengan data yang akurat.' },
              { icon: '💻', title: 'Teknologi', desc: 'Manajemen talenta dan kolaborasi untuk startup dan tech-firm.' },
            ].map((ind, i) => (
              <div key={i} className="industry-card">
                <span className="industry-icon">{ind.icon}</span>
                <div className="industry-info">
                  <h4>{ind.title}</h4>
                  <p>{ind.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        <PricingSection />
        <RenewalSection />
      </main>

      {isVideoOpen && <VideoModal onClose={() => setIsVideoOpen(false)} />}
      <ChatWidget />
      <Footer />
    </div>
  )
}

function FeaturesShowcase() {
  const [activeCategory, setActiveCategory] = useState('attendance');

  const categories = [
    { 
      id: 'attendance', 
      name: 'Attendance', 
      icon: '📍',
      features: [
        { title: 'Absensi Online', desc: 'Clock in & clock out melalui smartphone dengan verifikasi GPS.' },
        { title: 'Liveness Validation', desc: 'Teknologi verifikasi wajah untuk cegah kecurangan absensi.' },
        { title: 'Overtime & Shift', desc: 'Kelola lembur dan jadwal kerja shift karyawan secara otomatis.' },
        { title: 'Live Tracking', desc: 'Pantau posisi tim lapangan secara real-time di peta.' },
      ]
    },
    { 
      id: 'payroll', 
      name: 'Payroll & Benefit', 
      icon: '💰',
      features: [
        { title: 'Digital Salary Slips', desc: 'Akses slip gaji bulanan kapan saja langsung dari aplikasi.' },
        { title: 'Employee Loans', desc: 'Manajemen pinjaman karyawan yang terintegrasi dengan payroll.' },
        { title: 'Hitung Gaji Otomatis', desc: 'Kalkulasi gaji, pajak, dan iuran BPJS secara instan.' },
        { title: 'Reimbursement', desc: 'Persetujuan klaim biaya operasional yang cepat dan tanpa kertas.' },
      ]
    },
    { 
      id: 'hr', 
      name: 'HR Administration', 
      icon: '📋',
      features: [
        { title: 'Database Karyawan', desc: 'Penyimpanan data profil dan dokumen karyawan yang aman.' },
        { title: 'Leave Management', desc: 'Kelola jatah cuti, izin, dan sakit secara otomatis.' },
        { title: 'Company Calendar', desc: 'Kalender bersama untuk event perusahaan dan jadwal penting.' },
        { title: 'Announcements', desc: 'Siarkan berita perusahaan langsung ke seluruh perangkat tim.' },
      ]
    },
    { 
      id: 'talent', 
      name: 'Talent & KPI', 
      icon: '🚀',
      features: [
        { title: 'KPI Management', desc: 'Tetapkan dan pantau pencapaian KPI individu serta tim.' },
        { title: 'Learning & Development', desc: 'Kelola program pelatihan dan perkembangan skill karyawan.' },
        { title: 'Performance Appraisal', desc: 'Sistem evaluasi kinerja berkala yang terstruktur.' },
      ]
    },
    { 
      id: 'analytics', 
      name: 'AI & Analytics', 
      icon: '📊',
      features: [
        { title: 'Pulse of Company', desc: 'Ukur tingkat kebahagiaan dan engagement tim melalui survei.' },
        { title: 'Business Intelligence', desc: 'Analisis data mendalam untuk pengambilan keputusan strategis.' },
        { title: 'Retention Insights', desc: 'Prediksi tingkat turnover dan kesehatan organisasi.' },
      ]
    },
    { 
      id: 'assets', 
      name: 'Asset Management', 
      icon: '💻',
      features: [
        { title: 'Inventaris Aset', desc: 'Lacak laptop, HP, dan aset perusahaan lainnya.' },
        { title: 'Digital Handover', desc: 'Berita acara serah terima aset secara digital dan sah.' },
      ]
    }
  ];

  const currentCategory = categories.find(c => c.id === activeCategory);

  return (
    <div className="features-showcase">
      <div className="features-sidebar">
        {categories.map(cat => (
          <button 
            key={cat.id}
            className={`sidebar-item ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="sidebar-icon">{cat.icon}</span>
            <span className="sidebar-label">{cat.name}</span>
          </button>
        ))}
      </div>
      
      <div className="features-content">
        <div className="content-grid">
          {currentCategory?.features.map((f, i) => (
            <div key={i} className="feature-item">
              <div className="item-header">
                <span className="item-check">✓</span>
                <h4>{f.title}</h4>
              </div>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="content-footer">
          <a href="https://admin.aivola.id" className="explore-link">Lihat semua fitur {currentCategory?.name} →</a>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="video-wrapper">
          <img 
            src={demoVideo} 
            alt="Aivola Product Walkthrough" 
          />
        </div>
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <section id="about" className="about-section">
      <div className="section-header">
        <div className="hero-badge">Tentang Aivola</div>
        <h2>Masa Depan Manajemen SDM Indonesia</h2>
        <p>Solusi cerdas untuk mengelola aset paling berharga perusahaan Anda: Karyawan.</p>
      </div>
      
      <div className="about-content-wrapper">
        <div className="about-text-block">
          <p>
            Aivola lahir dari kebutuhan mendalam akan sistem manajemen sumber daya manusia yang tidak hanya efisien, tetapi juga cerdas. Kami menggabungkan teknologi cloud SaaS terdepan dengan integrasi AI untuk membantu perusahaan dari berbagai industri—mulai dari logistik hingga manufaktur—untuk mengelola tim mereka secara profesional.
          </p>
          <div className="about-vision-box">
            <h4>Visi Kami</h4>
            <p>Menjadi mitra strategis bagi setiap HRD di Indonesia dalam menciptakan lingkungan kerja yang produktif, transparan, dan terautomasi sepenuhnya.</p>
          </div>
        </div>
        
        <div className="about-features-grid">
          <div className="about-feature-card">
            <div className="about-icon">🚀</div>
            <div className="about-info">
              <h4>Efisiensi Tanpa Batas</h4>
              <p>Automasi payroll, absensi wajah, dan administrasi HR dalam satu platform terintegrasi.</p>
            </div>
          </div>
          <div className="about-feature-card">
            <div className="about-icon">📊</div>
            <div className="about-info">
              <h4>Keputusan Berbasis Data</h4>
              <p>Analisis real-time dan "Pulse of Company" untuk memahami kesehatan organisasi Anda.</p>
            </div>
          </div>
          <div className="about-feature-card">
            <div className="about-icon">🏗️</div>
            <div className="about-info">
              <h4>Skalabilitas Tinggi</h4>
              <p>Dirancang untuk tumbuh bersama bisnis Anda, dari UKM hingga korporasi besar.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const [isYearly, setIsYearly] = useState(true);

  const corePrice = isYearly ? 'Rp 7.000' : 'Rp 9.000';
  const corePeriod = '/karyawan/bulan';
  const yearlyNote = isYearly ? '(Dibayar tahunan)' : '(Dibayar bulanan)';

  const featureCategories = [
    {
      title: 'Kehadiran & Jadwal',
      icon: '🕐',
      color: '#3b82f6',
      items: ['Absensi Wajah & GPS', 'Manajemen Cuti & Izin', 'Manajemen Shift', 'Lembur dengan Approval']
    },
    {
      title: 'Penggajian & Keuangan',
      icon: '💰',
      color: '#10b981',
      items: ['Hitung Payroll Otomatis', 'Slip Gaji Digital', 'Bonus & THR', 'Reimbursement', 'Pinjaman Karyawan']
    },
    {
      title: 'Data & Aset SDM',
      icon: '👥',
      color: '#8b5cf6',
      items: ['Database Karyawan Aman', 'Kelola Aset Perusahaan', 'Hari Libur & Kalender']
    },
    {
      title: 'Organisasi',
      icon: '🏢',
      color: '#f59e0b',
      items: ['Multi Cabang', 'Pengumuman Perusahaan']
    },
    {
      title: 'Engagement',
      icon: '💬',
      color: '#ec4899',
      items: ['Pulse of Company']
    }
  ];

  const hrAddons = [
    { name: 'KPI Management', price: 'Rp 1.500', icon: '📊', desc: 'Pantau performa tim dengan KPI terukur & dashboard real-time.', color: '#3b82f6' },
    { name: 'Learning & Development', price: 'Rp 2.000', icon: '🎓', desc: 'Pusat pelatihan, modul belajar mandiri & sertifikasi internal.', color: '#8b5cf6' },
    { name: 'Performance Bundle', price: 'Rp 3.000', icon: '🚀', desc: 'KPI + Learning & Development dalam satu paket hemat.', highlight: true, color: '#ec4899' }
  ];

  return (
    <section id="pricing" className="pricing-section">
      <div className="pricing-glow-orb pricing-glow-1"></div>
      <div className="pricing-glow-orb pricing-glow-2"></div>

      <div className="section-header">
        <div className="hero-badge">💎 Daftar Harga HR</div>
        <h2>Satu Paket. Semua Fitur HR.</h2>
        <p>Tidak ada biaya tersembunyi. Tidak ada fitur terkunci. Semua sudah termasuk.</p>
      </div>

      <div className="pricing-toggle-wrapper">
        <span className={!isYearly ? 'active' : ''}>Bulanan</span>
        <button 
          className={`pricing-toggle ${isYearly ? 'yearly' : 'monthly'}`}
          onClick={() => setIsYearly(!isYearly)}
          aria-label="Toggle billing period"
        >
          <div className="toggle-ball"></div>
        </button>
        <span className={isYearly ? 'active' : ''}>Tahunan <span className="save-badge">Hemat ~22%</span></span>
      </div>

      <div className="single-pricing-container">
        <div className="pricing-card main-hr-card">
          <div className="hr-card-glow"></div>
          <div className="card-badge">✨ All-in-One</div>
          <h3>Aivola HR Core</h3>
          <div className="price-box">
            <span className="price">{corePrice}</span>
            <span className="period">{corePeriod}</span>
          </div>
          <p className="plan-desc">{yearlyNote}</p>

          <div className="feature-categories">
            {featureCategories.map((cat, i) => (
              <div key={i} className="feature-category">
                <div className="category-header">
                  <span className="category-icon" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.icon}</span>
                  <h4 style={{ color: cat.color }}>{cat.title}</h4>
                </div>
                <ul className="category-features">
                  {cat.items.map((item, j) => (
                    <li key={j}><span className="check-icon" style={{ color: cat.color }}>✓</span>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="total-features-count">
            <span>15+ fitur</span> dalam satu paket sederhana
          </div>
          
            <a href="http://localhost:3000/register" className="btn-plan btn-primary btn-glow" style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span>🚀</span> Mulai 14 Hari Gratis
            </a>
          <p className="no-cc">Tanpa kartu kredit. Batalkan kapan saja.</p>
        </div>
      </div>

      <div className="addons-container">
        <div className="section-header">
          <div className="hero-badge">⚡ Power-ups</div>
          <h2>Tambah Kemampuan Tim Anda</h2>
          <p>Add-on per karyawan untuk fitur spesialis.</p>
        </div>
        <div className="addons-grid">
          {hrAddons.map((addon, i) => (
            <div key={i} className={`addon-card ${addon.highlight ? 'highlight' : ''}`}>
              {addon.highlight && <div className="addon-badge">Best Value</div>}
              <div className="addon-icon" style={{ background: `${addon.color}15`, color: addon.color }}>{addon.icon}</div>
              <h4>{addon.name}</h4>
              <div className="addon-price">{addon.price}<span>/karyawan/bln</span></div>
              <p>{addon.desc}</p>
              {addon.highlight && <div className="addon-savings">Hemat Rp 500 vs terpisah</div>}
            </div>
          ))}
        </div>
      </div>
      
      <div className="promo-banner">
        <div className="promo-content">
          <div className="promo-icon-wrapper">
            <span className="early-bird-icon">🎁</span>
          </div>
          <div className="promo-text">
            <strong>Promo Early Adopter!</strong>
            <p>Dapatkan tambahan storage 10GB dan sesi konsultasi HR gratis untuk pendaftaran paket tahunan minggu ini!</p>
          </div>
          <button className="btn-promo">Klaim Promo</button>
        </div>
      </div>
    </section>
  );
}

function RenewalSection() {
  const WA_NUMBER = '6287882716935';
  const plans = [
    {
      name: 'Bulanan',
      price: 'Rp 9.000',
      unit: '/karyawan/bulan',
      desc: 'Fleksibel, bayar bulan ke bulan.',
      color: '#2563eb',
      waText: 'Halo Admin Aivola, saya ingin perpanjang/berlangganan Paket HR Bulanan @Rp 9.000/karyawan.',
    },
    {
      name: 'Tahunan',
      price: 'Rp 7.000',
      unit: '/karyawan/bulan',
      desc: 'Hemat Rp 2.000/karyawan vs bulanan. Tagih sekali setahun.',
      color: '#059669',
      badge: 'BEST VALUE',
      waText: 'Halo Admin Aivola, saya ingin perpanjang/berlangganan Paket HR Tahunan @Rp 7.000/karyawan.',
    },
  ];

  return (
    <section id="renewal" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      padding: '80px 0',
    }}>
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: '100px', padding: '6px 20px', marginBottom: '16px',
            color: '#fbbf24', fontSize: '13px', fontWeight: '700',
          }}>
            🔄 Perpanjang / Upgrade Langganan
          </div>
          <h2 style={{ color: 'white', fontSize: '36px', fontWeight: '800', margin: '0 0 12px' }}>
            Pulihkan Akses Akun Anda
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '16px', maxWidth: '540px', margin: '0 auto', lineHeight: '1.6' }}>
            Jika langganan Anda habis, pilih paket di bawah dan hubungi kami via WhatsApp.
            Tim kami akan reaktivasi akun Anda dalam hitungan menit.
          </p>
        </div>

        {/* Renewal Plans */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              background: 'rgba(255,255,255,0.05)',
              border: `2px solid ${plan.badge ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '20px',
              padding: '32px',
              position: 'relative',
              backdropFilter: 'blur(10px)',
            }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                  background: '#f59e0b', color: 'white', fontSize: '11px', fontWeight: '800',
                  padding: '4px 16px', borderRadius: '100px', whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                Paket {plan.name}
              </h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ color: 'white', fontSize: '40px', fontWeight: '900' }}>{plan.price}</span>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>{plan.unit}</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '28px' }}>{plan.desc}</p>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(plan.waText)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  width: '100%', background: plan.badge ? '#f59e0b' : plan.color,
                  color: 'white', borderRadius: '12px', padding: '14px', fontWeight: '700', fontSize: '14px',
                  textDecoration: 'none', transition: 'opacity 0.2s',
                  boxSizing: 'border-box',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                💬 Perpanjang via WhatsApp
              </a>
            </div>
          ))}
        </div>

        {/* Process Steps */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', padding: '32px',
        }}>
          <h3 style={{ color: 'white', fontWeight: '700', textAlign: 'center', marginBottom: '28px', fontSize: '18px' }}>
            Cara Perpanjang — 3 Langkah Mudah
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {[
              { step: '1', icon: '💬', title: 'Chat WhatsApp', desc: 'Klik tombol di atas, pilih paket, dan kirim pesan ke tim kami.' },
              { step: '2', icon: '💳', title: 'Proses Pembayaran', desc: 'Kami kirimkan invoice dan instruksi transfer yang jelas.' },
              { step: '3', icon: '✅', title: 'Akses Pulih', desc: 'Konfirmasi pembayaran → akun Anda aktif kembali dalam menit.' },
            ].map((s) => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{s.icon}</div>
                <p style={{ color: 'white', fontWeight: '700', marginBottom: '6px', fontSize: '15px' }}>{s.title}</p>
                <p style={{ color: '#64748b', fontSize: '13px', lineHeight: '1.5' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="logo-container">
            <img src={logoImg} alt="Aivola Logo" className="logo-img" />
            <span className="logo-text">Aivola</span>
          </div>
          <p>Membangun masa depan manajemen SDM dengan integritas dan inovasi.</p>
        </div>
        <div className="footer-links">
          <h4>Produk</h4>
          <a href="#features">Fitur</a>
          <a href="#about">Tentang</a>
          <a href="#pricing">Harga</a>
        </div>
        <div className="footer-links">
          <h4>Dukungan</h4>
          <a href="#">Pusat Bantuan</a>
          <a href="#">Kebijakan Privasi</a>
          <a href="#">Syarat & Ketentuan</a>
        </div>
        <div className="footer-links">
          <h4>Hubungi Kami</h4>
          <p>📧 support@aivola.id</p>
          <p>📍 Jakarta, Indonesia</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 PT Aivola Teknologi Indonesia. Seluruh hak cipta dilindungi.</p>
      </div>
    </footer>
  );
}

export default App
