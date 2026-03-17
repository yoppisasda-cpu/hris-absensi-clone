import { useState } from 'react'
import logoImg from './assets/logo.png'
import heroImg from './assets/hero.png'
import demoVideo from './assets/demo.webp'
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
          <a href="https://admin.aivola.id" className="btn-login">Login Admin</a>
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
              <button className="btn-primary">Coba Gratis 14 Hari</button>
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
      </main>

      {isVideoOpen && <VideoModal onClose={() => setIsVideoOpen(false)} />}

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
  const plans = [
    {
      name: 'Starter',
      price: 'Rp 25.000',
      period: '/karyawan/bulan',
      desc: 'Cocok untuk UKM yang baru mulai mendigitalkan HR.',
      features: ['Absensi GPS & Selfie', 'Manajemen Cuti & Izin', 'Database Karyawan', 'Slip Gaji Digital'],
      btnText: 'Mulai Sekarang',
      highlight: false
    },
    {
      name: 'Professional',
      price: 'Rp 45.000',
      period: '/karyawan/bulan',
      desc: 'Solusi lengkap untuk perusahaan yang sedang berkembang.',
      features: ['Semua Fitur Starter', 'Hitung Payroll & Pajak', 'Manajemen Shift & Lembur', 'KPI & Performance Appraisal', 'Prioritas Support'],
      btnText: 'Paling Populer',
      highlight: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'Fitur kustom dan integrasi mendalam untuk korporasi besar.',
      features: ['Semua Fitur Professional', 'White-label Mobile App', 'Dedicated Account Manager', 'Integrasi API Kustom', 'SLA 99.9%'],
      btnText: 'Hubungi Sales',
      highlight: false
    }
  ];

  return (
    <section id="pricing" className="pricing-section">
      <div className="section-header">
        <div className="hero-badge">Daftar Harga</div>
        <h2>Pilih Paket yang Sesuai untuk Anda</h2>
        <p>Investasi cerdas untuk efisiensi dan transparansi operasional tim Anda.</p>
      </div>

      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <div key={i} className={`pricing-card ${plan.highlight ? 'highlighted' : ''}`}>
            {plan.highlight && <div className="card-badge">Terpopuler</div>}
            <h3>{plan.name}</h3>
            <div className="price-box">
              <span className="price">{plan.price}</span>
              <span className="period">{plan.period}</span>
            </div>
            <p className="plan-desc">{plan.desc}</p>
            <ul className="plan-features">
              {plan.features.map((f, j) => (
                <li key={j}><span className="check">✓</span> {f}</li>
              ))}
            </ul>
            <button className={`btn-plan ${plan.highlight ? 'btn-primary' : 'btn-secondary'}`}>
              {plan.btnText}
            </button>
          </div>
        ))}
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
