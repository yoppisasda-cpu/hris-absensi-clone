import { useState, useEffect } from 'react';
import './App.css';

// Mock icons to avoid lucide-react dependency issues if install fails
const Sparkles = ({ size }: any) => <span style={{ fontSize: size }}>✨</span>;
const Brain = ({ className }: any) => <span className={className} style={{ fontSize: '24px' }}>🧠</span>;
const MessageSquare = ({ className }: any) => <span className={className} style={{ fontSize: '24px' }}>💬</span>;
const LineChart = ({ className }: any) => <span className={className} style={{ fontSize: '24px' }}>📈</span>;
const Zap = ({ size }: any) => <span style={{ fontSize: size }}>⚡</span>;
const ChevronRight = ({ size }: any) => <span style={{ fontSize: size }}>›</span>;
const Star = ({ className }: any) => <span className={className} style={{ fontSize: '20px' }}>⭐</span>;

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 48 46">
    <path fill="#863bff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z" style={{ fill: '#863bff' }} />
  </svg>
);

const PromotionBanner = () => (
  <div className="promo-banner">
    <div className="promo-content">
      <Sparkles className="promo-icon" size={14} />
      <span>PROMO: Dapatkan <b>AI Co-Pilot & WhatsApp Auto-Reply</b> GRATIS di Paket PRO Tahunan!</span>
      <a href="#pricing" className="promo-link">Lihat Promo Sekarang <ChevronRight size={14} /></a>
    </div>
  </div>
);

const Header = () => (
  <nav className="header-nav">
    <div className="logo-container">
      <Logo />
      <span className="logo-text">aivola</span>
      <span className="logo-badge">AI Powered</span>
    </div>
    <div className="nav-links">
      <a href="#features">Fitur</a>
      <a href="#ai-showcase" className="nav-ai-link">AI Co-Pilot</a>
      <a href="#finance" className="nav-finance-link">Finance & POS</a>
      <a href="#pricing">Harga</a>
      <a href="https://admin.aivola.id" className="btn-login">Masuk</a>
    </div>
  </nav>
);

const Hero = () => (
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
        <a href="https://admin.aivola.id/register" className="btn-primary">Coba Gratis 14 Hari</a>
        <a href="https://wa.me/6287882716935" className="btn-secondary">Konsultasi Gratis</a>
      </div>
    </div>
  </section>
);

const AIShowcase = () => {
  const aiFeatures = [
    {
      icon: <MessageSquare className="ai-icon-large text-indigo-500" />,
      title: "WhatsApp AI Co-Pilot",
      desc: "Klien pilih paket di landing page? AI kami yang membalas WhatsApp mereka secara instan dan profesional 24/7.",
      tag: "Otomasi"
    },
    {
      icon: <Brain className="ai-icon-large text-purple-500" />,
      title: "Smart Morning Brief",
      desc: "Laporan dashboard dikirim langsung ke pikiran Anda (via admin dashboard). Ringkasan performa bisnis dalam satu paragraf cerdas.",
      tag: "Intelligence"
    },
    {
      icon: <LineChart className="ai-icon-large text-emerald-500" />,
      title: "Strategic Finance Analysis",
      desc: "Bukan sekadar angka. AI kami menganalisa arus kas dan memberikan rekomendasi strategis untuk meningkatkan profit Anda.",
      tag: "Strategic"
    }
  ];

  return (
    <section id="ai-showcase" className="ai-showcase-section">
      <div className="ai-container">
        <div className="ai-header">
            <div className="hero-badge animate-pulse">
                <Zap size={14} className="fill-amber-400 text-amber-400" /> NEW: AIVOLA MIND AI
            </div>
            <h2>Kelola Bisnis dengan <span className="text-gradient">Kekuatan AI</span></h2>
            <p>Hanya di Aivola, bisnis Anda dikelola oleh asisten cerdas yang bekerja 24 jam penuh tanpa lelah.</p>
        </div>

        <div className="ai-grid">
            {aiFeatures.map((f, i) => (
                <div key={i} className="ai-card group">
                    <div className="ai-card-inner">
                        <div className="ai-icon-wrapper">
                            {f.icon}
                        </div>
                        <div className="ai-tag">{f.tag}</div>
                        <h3>{f.title}</h3>
                        <p>{f.desc}</p>
                        <div className="ai-card-footer">
                            <span className="ai-learn-more">Pelajari Cara Kerjanya <ChevronRight size={16} /></span>
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="ai-card-glow"></div>
                </div>
            ))}
        </div>

        <div className="ai-bottom-promo">
            <div className="ai-promo-content">
                <Star className="text-amber-400" fill="currentColor" />
                <p>Fitur AI saat ini tersedia eksklusif untuk pengguna <b>Paket PRO & Enterprise</b></p>
                <a href="#pricing" className="btn-ai-upgrade">Aktifkan AI Sekarang</a>
            </div>
        </div>
      </div>
    </section>
  );
};

const FeaturesShowcase = () => {
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
      ],
      linkText: 'Lihat semua fitur Attendance →'
    },
    { id: 'payroll', name: 'Payroll & Benefit', icon: '💰', features: [] },
    { id: 'admin', name: 'HR Administration', icon: '📋', features: [] },
    { id: 'talent', name: 'Talent & KPI', icon: '🚀', features: [] },
    { id: 'ai', name: 'AI & Analytics', icon: '📊', features: [] },
    { id: 'assets', name: 'Asset Management', icon: '💻', features: [] },
  ];

  const [activeTab, setActiveTab] = useState('attendance');

  return (
    <section id="features" className="features-container">
      <div className="section-header">
        <div className="hero-badge">Fitur Unggulan</div>
        <h2>Solusi HR Paling Lengkap</h2>
        <p>Kelola seluruh aspek sumber daya manusia dalam satu platform terintegrasi.</p>
      </div>

      <div className="features-showcase-box">
        <div className="features-sidebar">
          {categories.map(cat => (
            <button key={cat.id} className={`sidebar-item ${activeTab === cat.id ? 'active' : ''}`} onClick={() => setActiveTab(cat.id)}>
              <span className="sidebar-icon">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
        <div className="features-content">
          <div className="content-grid">
            {categories.find(c => c.id === activeTab)?.features.map((f, i) => (
              <div key={i} className="feature-item">
                <span className="check">✓</span>
                <div className="feature-info">
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          {activeTab === 'attendance' && (
            <div className="content-footer">
              <a href="#" className="explore-link">Lihat semua fitur Attendance →</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const pricingData = {
    starter: isAnnual ? 1500000 : 150000,
    pro: isAnnual ? 3500000 : 350000,
    enterprise: isAnnual ? 7500000 : 750000,
  };

  return (
    <section id="pricing" className="pricing-section" style={{ background: '#0a0a0f', padding: '8rem 5%' }}>
      <div className="section-header">
        <div className="hero-badge">Harga Transparan</div>
        <h2 style={{ color: 'white' }}>Satu Harga untuk Seluruh Bisnis</h2>
        <p style={{ color: '#94a3b8' }}>Pilih paket dengan batas kuota yang sesuai dengan skala operasional Anda.</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
        <span style={{ color: isAnnual ? '#94a3b8' : '#8b5cf6', fontWeight: 700 }}>Bulanan</span>
        <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
          <input type="checkbox" checked={isAnnual} onChange={() => setIsAnnual(!isAnnual)} style={{ opacity: 0, width: 0, height: 0 }} />
          <span className="slider" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: '#1a1a24', transition: '.4s', borderRadius: '34px', border: '1px solid rgba(255,255,255,0.1)' }}></span>
        </label>
        <span style={{ color: isAnnual ? '#8b5cf6' : '#94a3b8', fontWeight: 700 }}>Tahunan <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem' }}>Hemat 20%</span></span>
      </div>

      <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* STARTER */}
        <div className="price-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem 2rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', position: 'relative' }}>
          <div style={{ color: '#8b5cf6', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '1rem' }}>STARTER</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px' }}>Rp</span>
            {pricingData.starter.toLocaleString('id-ID')}
            <span style={{ fontSize: '0.9rem', color: '#444', fontWeight: 400 }}>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Cocok untuk UMKM pemula yang ingin mulai digitalisasi.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> <b>Maks 10</b> Karyawan</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 1 Terminal Digital POS</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 2 Admin Slot</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> Absensi Wajah & GPS</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> Laporan Penjualan Dasar</li>
          </ul>
          <a 
            href={"https://wa.me/6287882716935?text=Halo Aivola, saya tertarik dengan Paket STARTER (" + (isAnnual ? 'Tahunan' : 'Bulanan') + "). Mohon info lebih lanjut."}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-cta-big" 
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', color: 'white', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Mulai Starter
          </a>
        </div>

        {/* PRO */}
        <div className="price-card" style={{ background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(10, 10, 15, 0.1) 100%)', padding: '3rem 2rem', borderRadius: '32px', border: '2px solid #8b5cf6', textAlign: 'left', position: 'relative', transform: 'scale(1.05)' }}>
          <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#8b5cf6', color: 'white', padding: '4px 12px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 800 }}>PALING POPULER</div>
          <div style={{ color: '#a78bfa', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '1rem' }}>PRO</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px' }}>Rp</span>
            {pricingData.pro.toLocaleString('id-ID')}
            <span style={{ fontSize: '0.9rem', color: '#444', fontWeight: 400 }}>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Solusi lengkap untuk manajemen stok & profit bisnis.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> <b>Maks 50</b> Karyawan</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 5 Terminal Digital POS</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 5 Admin Slot</li>
            <li style={{ marginBottom: '1rem', color: 'white' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> <b>Inventory & Stock (Incl)</b></li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> Laba Rugi (P&L) Real-time</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> AI Stock Forecasting</li>
          </ul>
          <a 
            href={"https://wa.me/6287882716935?text=Halo Aivola, saya tertarik dengan Paket PRO (" + (isAnnual ? 'Tahunan' : 'Bulanan') + "). Mohon info lebih lanjut."}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-cta-big" 
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '1rem', background: '#8b5cf6', borderRadius: '14px', color: 'white', fontWeight: 700, textDecoration: 'none', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.3)' }}
          >
            Pilih Paket Pro
          </a>
        </div>

        {/* ENTERPRISE */}
        <div className="price-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '3rem 2rem', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', position: 'relative' }}>
          <div style={{ color: '#ec4899', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '1rem' }}>ENTERPRISE</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: 'white', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem', verticalAlign: 'top', marginRight: '4px' }}>Rp</span>
            {pricingData.enterprise.toLocaleString('id-ID')}
            <span style={{ fontSize: '0.9rem', color: '#444', fontWeight: 400 }}>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>Otomasi skala korporasi dengan batas kuota terbesar.</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> <b>Maks 100</b> Karyawan</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 10 Terminal Digital POS</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> 10 Admin Slot</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> <b>Warehouse Management</b></li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> Audit Log & Anti Fraud Dasar</li>
            <li style={{ marginBottom: '1rem' }}><span style={{ color: '#4ade80', marginRight: '8px' }}>✓</span> Prioritas Support 24/7</li>
          </ul>
          <a 
            href={"https://wa.me/6287882716935?text=Halo Aivola, saya tertarik dengan Paket ENTERPRISE (" + (isAnnual ? 'Tahunan' : 'Bulanan') + "). Mohon info lebih lanjut."}
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-cta-big" 
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', color: 'white', fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Hubungi Sales
          </a>
        </div>
      </div>

      {/* POWER-UPS / SPECIALIST ADD-ONS */}
      <div style={{ marginTop: '6rem', maxWidth: '1200px', margin: '6rem auto 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="hero-badge">⚡ Power-ups</div>
          <h2 style={{ color: 'white', fontSize: '2.5rem' }}>Personalize Your Base Plan</h2>
          <p style={{ color: '#94a3b8' }}>Gunakan Add-on untuk menambah fitur spesifik sesuai kebutuhan tanpa harus berpindah paket.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* HR Add-ons */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#8b5cf6', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(139, 92, 246, 0.2)', paddingBottom: '0.5rem' }}>HR & TALENT MANAGEMENT</div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 700 }}>🎯 KPI & Penilaian Kinerja</span>
                <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Rp 1.500/kar</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Fitur pembuatan KPI, penilaian, and laporan performa tim.</p>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 700 }}>📚 Learning & Development</span>
                <span style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Rp 2.000/kar</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Modul pelatihan, ujian online, and tracking kompetensi.</p>
            </div>
          </div>

          {/* Finance Add-ons */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ color: '#ec4899', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(236, 72, 153, 0.2)', paddingBottom: '0.5rem' }}>FINANCE & AI MANAGEMENT</div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 700 }}>📦 Inventory & Stock</span>
                <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Rp 20.000/bln</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Manajemen stok bahan. <b style={{color: '#4ade80'}}>Gratis di paket PRO</b>.</p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 700 }}>🧠 Aivola Mind (AI Advisor)</span>
                <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Rp 20.000/bln</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Penasehat bisnis AI strategis untuk seluruh level paket Anda.</p>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 700 }}>🛡️ Anti-Fraud Face Check</span>
                <span style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem' }}>Rp 10.000/bln</span>
              </div>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>Verifikasi wajah ketat saat absensi & transaksi sensitif.</p>
            </div>
          </div>

          {/* Expansion Add-on */}
          <div style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(74, 222, 128, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px', marginBottom: '1rem' }}>SISTEM EKSPANSI</div>
            <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '1rem' }}>Expansion Pack (Staff)</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', marginBottom: '1rem' }}>Rp 7.000 <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/kar /bln</span></div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Tambah kuota karyawan pada paket apapun tanpa harus ganti plan.</p>
            <a href="https://wa.me/6287882716935" style={{ textDecoration: 'none', color: '#4ade80', fontWeight: 700, fontSize: '0.9rem' }}>Tambah Kapasitas Sekarang →</a>
          </div>
        </div>
      </div>
    </section>
  );
};

const AboutSection = () => (
  <section id="about" className="about-section">
    <div className="section-header">
      <div className="hero-badge">Tentang Aivola</div>
      <h2>Masa Depan Manajemen SDM Indonesia</h2>
      <p>Solusi cerdas untuk mengelola aset paling berharga perusahaan Anda: Karyawan.</p>
    </div>
    <div className="about-grid">
      <div className="about-text">
        <p>Aivola lahir dari kebutuhan mendalam akan sistem manajemen sumber daya manusia yang tidak hanya efisien, tetapi juga cerdas. Kami menggabungkan teknologi cloud SaaS terdepan dengan integrasi AI untuk membantu perusahaan dari berbagai industri...</p>
        <div className="vision-card">
          <h4>Visi Kami</h4>
          <p>Menjadi mitra strategis bagi setiap HRD di Indonesia dalam menciptakan lingkungan kerja yang produktif, transparan, dan terautomasi sepenuhnya.</p>
        </div>
      </div>
      <div className="about-perks">
        {[
          { icon: '🚀', title: 'Efisiensi Tanpa Batas', desc: 'Automasi payroll, absensi wajah, and administrasi HR dalam satu platform terintegrasi.' },
          { icon: '📊', title: 'Keputusan Berbasis Data', desc: 'Analisis real-time and "Pulse of Company" untuk memahami kesehatan organisasi Anda.' },
          { icon: '🏗️', title: 'Skalabilitas Tinggi', desc: 'Dirancang untuk tumbuh bersama bisnis Anda, dari UKM hingga korporasi besar.' }
        ].map((p, i) => (
          <div key={i} className="perk-card">
            <span className="perk-icon-inner">{p.icon}</span>
            <div className="perk-info">
              <h4>{p.title}</h4>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const IndustrySection = () => (
  <section className="industry-section">
    <div className="section-header">
      <h2>Cocok untuk Berbagai Jenis Bisnis</h2>
      <p>Fleksibilitas Aivola telah terbukti membantu efisiensi operasional di berbagai sektor industri.</p>
    </div>
    <div className="industry-grid">
      {[
        { icon: '🚚', name: 'Logistik', desc: 'Solusi HR bagi tim dengan operasional 24/7 and mobilitas tinggi.' },
        { icon: '🏭', name: 'Manufaktur', desc: 'Kelola shift and upah pekerja dalam jumlah besar di pabrik.' },
        { icon: '📦', name: 'Trading', desc: 'Solusi HCM terintegrasi untuk real sector and operasi lapangan.' },
        { icon: '🛒', name: 'Ritel', desc: 'Optimalkan pengaturan shift, absensi, and payroll multi-cabang.' },
        { icon: '☕', name: 'F&B', desc: 'Tingkatkan efisiensi HR untuk operasional restoran dan outlet.' },
        { icon: '🏨', name: 'Hospitality', desc: 'Permudah kelola absensi and shift perhotelan yang dinamis.' },
        { icon: '💼', name: 'Jasa Profesional', desc: 'Pantau kinerja and KPI tim ahli dengan data yang akurat.' },
        { icon: '💻', name: 'Teknologi', desc: 'Manajemen talenta and kolaborasi untuk startup and tech-firm.' }
      ].map((ind, i) => (
        <div key={i} className="industry-card">
          <span className="ind-icon">{ind.icon}</span>
          <div className="ind-info">
            <h4>{ind.name}</h4>
            <p>{ind.desc}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const VideoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState('attendance');
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.92)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(15px)'
    }}>
      <div style={{
        position: 'relative',
        width: '95%',
        maxWidth: '1100px',
        background: '#0a0a0f',
        borderRadius: '32px',
        overflow: 'hidden',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 0 100px rgba(139, 92, 246, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div style={{display: 'flex', gap: '1rem'}}>
            {['attendance', 'learning', 'executive'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '12px',
                  background: activeTab === tab ? '#8b5cf6' : 'transparent',
                  border: 'none',
                  color: activeTab === tab ? 'white' : '#94a3b8',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '0.3s all'
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} {tab === 'executive' ? 'AI' : ''}
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.8rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{padding: '3rem', height: '600px', overflowY: 'auto'}}>
          {activeTab === 'attendance' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0, color: 'white'}}>Laporan Absensi Real-time</h3>
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Pantau mood and produktivitas tim secara instan.</p>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  {['Senang', 'Netral', 'Lelah', 'Stres'].map((mood) => (
                    <div key={mood} style={{padding: '1rem', background: '#111', borderRadius: '16px', textAlign: 'center', minWidth: '80px', border: '1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>{mood === 'Senang' ? '😊' : mood === 'Netral' ? '😐' : mood === 'Lelah' ? '😩' : '😵'}</div>
                      <div style={{fontSize: '0.7rem', color: '#94a3b8'}}>{mood}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div style={{background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem', color: '#94a3b8', fontSize: '0.8rem'}}>
                  <div>KARYAWAN</div>
                  <div>JAM MASUK</div>
                  <div>VERIFIKASI</div>
                </div>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', alignItems: 'center', padding: '0.8rem 0', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.02)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.8rem'}}>
                      <div style={{width: '32px', height: '32px', borderRadius: '50%', background: '#222'}}></div>
                      <span>Staff {i} - PT. Maju Jaya</span>
                    </div>
                    <div>08:0{i} AM</div>
                    <div style={{color: '#4ade80', fontSize: '0.8rem'}}>✅ GPS & Face OK</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'learning' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0, color: 'white'}}>Learning & Development</h3>
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Pusat peningkatan kompetensi and verifikasi pemahaman SOP.</p>
                </div>
                <button style={{padding: '0.8rem 1.5rem', background: '#8b5cf6', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 700}}>+ Upload SOP (AI Exam)</button>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem'}}>
                {[
                  {label: 'TOTAL OBJECTIVES', val: '12', icon: '📖'},
                  {label: 'COMPLETED', val: '8', icon: '✅'},
                  {label: 'AVG SCORE', val: '92%', icon: '🥇'},
                  {label: 'IN PROGRESS', val: '4', icon: '⏳'}
                ].map((stat, i) => (
                  <div key={i} style={{padding: '1.5rem', background: '#111', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)'}}>
                    <div style={{fontSize: '1.5rem', marginBottom: '1rem'}}>{stat.icon}</div>
                    <div style={{fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem'}}>{stat.label}</div>
                    <div style={{fontSize: '1.5rem', fontWeight: 800, color: 'white'}}>{stat.val}</div>
                  </div>
                ))}
              </div>

              <div style={{padding: '2rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '24px', border: '1px solid rgba(139, 92, 246, 0.2)'}}>
                <div style={{color: '#a78bfa', fontWeight: 700, marginBottom: '1rem'}}>Aivola Skill Mentor (AI):</div>
                <p style={{color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6}}>
                  "Sistem AI mendeteksi 5 karyawan baru belum menyelesaikan ujian SOP Kebersihan. Disarankan untuk mengirimkan notifikasi pengingat via WhatsApp."
                </p>
              </div>
            </div>
          )}

          {activeTab === 'executive' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0, color: 'white'}}>Aivola Cloud System Intelligence</h3>
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Executive summary & AI-powered strategic insights.</p>
                </div>
                <div style={{padding: '0.6rem 1.2rem', background: '#111', borderRadius: '12px', color: '#8b5cf6', fontSize: '0.8rem', border: '1px solid #8b5cf6'}}>ENTER TV MODE</div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                <div style={{padding: '2rem', background: '#111', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)'}}>
                  <div style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1rem'}}>HISTORICAL CASHFLOW</div>
                  <div style={{height: '150px', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', paddingBottom: '1rem'}}>
                    {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                      <div key={i} style={{flex: 1, background: i===5 ? '#8b5cf6' : '#222', height: `${h}%`, borderRadius: '4px'}}></div>
                    ))}
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#444'}}>
                    <span>01 Apr</span>
                    <span>15 Apr</span>
                    <span>30 Apr</span>
                  </div>
                </div>

                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {[
                    {t: 'AI: OPTIMALISASI MARGIN', c: 'Berdasarkan korelasi HPP and Penjualan, Anda bisa menghemat 12% biaya.', color: '#4ade80'},
                    {t: 'AI: DETEKSI BURNOUT', c: 'Terditeksi peningkatan pola keterlambatan di Departemen Ops. Risiko resign naik 15%.', color: '#f87171'}
                  ].map((insight, i) => (
                    <div key={i} style={{padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: `1px solid ${insight.color}33`}}>
                      <div style={{color: insight.color, fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem'}}>{insight.t}</div>
                      <p style={{fontSize: '0.85rem', color: '#94a3b8', margin: 0}}>{insight.c}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div style={{padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', fontSize: '0.8rem', color: '#444', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
          Demo Aivola SaaS System v1.0 • Built with Intelligent AI
        </div>
      </div>
    </div>
  );
};

const DemoSection = ({ onPlay }: { onPlay: () => void }) => (
  <section id="demo" className="demo-section" style={{padding: '8rem 5%', textAlign: 'center', background: '#0a0a0f'}}>
    <div className="hero-badge">Demo Aplikasi HR</div>
    <h2>Kelola Karyawan <br/> Secepat Kilat</h2>
    <p className="hero-subtitle">Pantau kehadiran, payroll, and performa tim dalam satu dashboard modern.</p>
    
    <div className="demo-player-container" style={{maxWidth: '1000px', margin: '4rem auto', position: 'relative'}}>
      <div style={{
        background: '#1a1a24',
        padding: '1rem',
        borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(255,255,255,0.1)',
        borderBottom: 'none'
      }}>
        <div style={{display: 'flex', gap: '0.5rem', marginBottom: '0.5rem'}}>
          <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56'}}></div>
          <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e'}}></div>
          <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f'}}></div>
        </div>
      </div>
      <div style={{
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        background: '#11111a',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{textAlign: 'center', color: '#8b5cf6', opacity: 0.5}}>
          <span style={{fontSize: '5rem'}}>📊</span>
          <h3>Aivola HR Dashboard</h3>
          <p>Visualisasi Data Karyawan & Payroll</p>
        </div>
        
        <div 
          onClick={onPlay}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px',
            height: '80px',
            background: 'rgba(139, 92, 246, 0.8)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.4)',
            zIndex: 5
          }}
        >
          <div style={{
            width: '0',
            height: '0',
            borderTop: '15px solid transparent',
            borderBottom: '15px solid transparent',
            borderLeft: '25px solid white',
            marginLeft: '5px'
          }}></div>
        </div>
      </div>
      <div style={{
        background: '#2d2d3a',
        height: '15px',
        width: '105%',
        margin: '0 -2.5%',
        borderRadius: '0 0 100px 100px'
      }}></div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer-content">
      <div className="footer-brand">
        <span className="logo-text">aivola</span>
        <p>Sistem Manajemen Bisnis yang Cerdas & Terintegrasi.</p>
      </div>
      <div className="footer-links">
        <div className="link-group">
          <h4>Produk</h4>
          <a href="#">HR Core</a>
          <a href="#">Add-ons</a>
          <a href="#">Enterprise</a>
        </div>
        <div className="link-group">
          <h4>Perusahaan</h4>
          <a href="#">Tentang Kami</a>
          <a href="#">Kontak</a>
          <a href="#">Karir</a>
        </div>
      </div>
    </div>
    <div className="footer-bottom">
      &copy; 2026 Aivola. Built with ❤️ in Indonesia.
    </div>
  </footer>
);

function AttendancePage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  return (
    <div className="app-container">
      <PromotionBanner />
      <Header />
      <Hero />
      <AIShowcase />
      <FeaturesShowcase />
      <DemoSection onPlay={() => setIsVideoOpen(true)} />
      <AboutSection />
      <IndustrySection />
      <PricingSection />
      <Footer />
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </div>
  );
}

import FinancePage from './FinancePage';
import { ChatWidget } from './components/ChatWidget';

function App() {
  const [activePage, setActivePage] = useState('attendance');

  useEffect(() => {
    // Basic hash-based "routing" or just state
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#finance') setActivePage('finance');
      else setActivePage('attendance');
    };

    window.addEventListener('hashchange', handleHash);
    handleHash(); // init

    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return (
    <>
      {activePage === 'finance' ? <FinancePage /> : <AttendancePage />}
      <ChatWidget />
    </>
  );
}

export default App;
