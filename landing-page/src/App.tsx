import { useState, useEffect } from 'react';
import './App.css';

const Header = () => (
  <nav className="header-nav">
    <div className="logo-container">
      <img src="/logo.png" alt="Aivola Logo" className="logo-img" />
      <span className="logo-text">aivola</span>
    </div>
    <div className="nav-links">
      <a href="#features">Fitur</a>
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
          { icon: '🚀', title: 'Efisiensi Tanpa Batas', desc: 'Automasi payroll, absensi wajah, dan administrasi HR dalam satu platform terintegrasi.' },
          { icon: '📊', title: 'Keputusan Berbasis Data', desc: 'Analisis real-time dan "Pulse of Company" untuk memahami kesehatan organisasi Anda.' },
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
        { icon: '🚚', name: 'Logistik', desc: 'Solusi HR bagi tim dengan operasional 24/7 dan mobilitas tinggi.' },
        { icon: '🏭', name: 'Manufaktur', desc: 'Kelola shift dan upah pekerja dalam jumlah besar di pabrik.' },
        { icon: '📦', name: 'Trading', desc: 'Solusi HCM terintegrasi untuk real sector dan operasi lapangan.' },
        { icon: '🛒', name: 'Ritel', desc: 'Optimalkan pengaturan shift, absensi, dan payroll multi-cabang.' },
        { icon: '☕', name: 'F&B', desc: 'Tingkatkan efisiensi HR untuk operasional restoran dan outlet.' },
        { icon: '🏨', name: 'Hospitality', desc: 'Permudah kelola absensi dan shift perhotelan yang dinamis.' },
        { icon: '💼', name: 'Jasa Profesional', desc: 'Pantau kinerja dan KPI tim ahli dengan data yang akurat.' },
        { icon: '💻', name: 'Teknologi', desc: 'Manajemen talenta dan kolaborasi untuk startup dan tech-firm.' }
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

const PricingSection = () => (
  <section id="pricing" className="pricing-section">
    <div className="section-header">
      <h2>Harga Transparan</h2>
      <p>Pilih Paket Sesuai Kebutuhan</p>
    </div>

    <div className="pricing-main-card">
      <div className="card-badge-top">✨ All-in-One</div>
      <h3>Aivola HR Core</h3>
      <div className="price-display">
        <span className="currency">Rp</span>
        <span className="amount">7.000</span>
        <span className="unit">/karyawan/bulan</span>
      </div>
      <p className="price-meta">(Dibayar tahunan)</p>

      <div className="pricing-features-grid">
        <div className="price-col">
          <div className="col-header"><span className="col-icon">⏰</span> KEHADIRAN & JADWAL</div>
          <ul>
            <li>✓ Absensi Wajah & GPS</li>
            <li>✓ Manajemen Cuti & Izin</li>
            <li>✓ Manajemen Shift</li>
            <li>✓ Lembur dengan Approval</li>
          </ul>
        </div>
        <div className="price-col">
          <div className="col-header"><span className="col-icon">💰</span> PENGGAJIAN & KEUANGAN</div>
          <ul>
            <li>✓ Hitung Payroll Otomatis</li>
            <li>✓ Slip Gaji Digital</li>
            <li>✓ Bonus & THR</li>
            <li>✓ Reimbursement</li>
            <li>✓ Pinjaman Karyawan</li>
          </ul>
        </div>
        <div className="price-col">
          <div className="col-header"><span className="col-icon">👥</span> DATA & ASET SDM</div>
          <ul>
            <li>✓ Database Karyawan Aman</li>
            <li>✓ Kelola Aset Perusahaan</li>
            <li>✓ Hari Libur & Kalender</li>
          </ul>
        </div>
        <div className="price-col">
          <div className="col-header"><span className="col-icon">🏢</span> ORGANISASI</div>
          <ul>
            <li>✓ Multi Cabang</li>
            <li>✓ Pengumuman Perusahaan</li>
          </ul>
        </div>
        <div className="price-col">
          <div className="col-header"><span className="col-icon">💬</span> ENGAGEMENT</div>
          <ul>
            <li>✓ Pulse of Company</li>
          </ul>
        </div>
      </div>

      <div className="card-footer-info">
        <strong>15+ fitur</strong> dalam satu paket sederhana
      </div>
      <a href="https://admin.aivola.id/register" className="btn-cta-big">🚀 Mulai 14 Hari Gratis</a>
      <p className="cta-meta">Tanpa kartu kredit. Batalkan kapan saja.</p>
    </div>

    <div className="power-ups-container">
      <div className="hero-badge">⚡ Power-ups</div>
      <h2>Tambah Kemampuan Tim Anda</h2>
      <p className="power-up-sub">Add-on per karyawan untuk fitur spesialis.</p>
      
      <div className="power-ups-grid">
        <div className="power-card">
          <span className="p-icon">📊</span>
          <h4>KPI Management</h4>
          <div className="p-price">Rp 1.500<span>/kar/bln</span></div>
          <p>Pantau performa tim dengan KPI terukur & dashboard real-time.</p>
        </div>
        <div className="power-card">
          <span className="p-icon">🎓</span>
          <h4>Learning & Development</h4>
          <div className="p-price">Rp 2.000<span>/kar/bln</span></div>
          <p>Pusat pelatihan, modul belajar mandiri & sertifikasi internal.</p>
        </div>
        <div className="power-card best-value">
          <div className="best-badge">BEST VALUE</div>
          <span className="p-icon">🚀</span>
          <h4>Performance Bundle</h4>
          <div className="p-price">Rp 3.000<span>/kar/bln</span></div>
          <p>KPI + Learning & Development dalam satu paket hemat.</p>
          <div className="save-badge">Hemat Rp 500 vs terpisah</div>
        </div>
      </div>

      <div className="promo-banner">
        <span className="gift-icon">🎁</span>
        <div className="promo-text">
          <strong>Promo Early Adopter!</strong>
          <p>Dapatkan tambahan storage 10GB dan sesi konsultasi HR gratis untuk pendaftaran paket tahunan minggu ini!</p>
        </div>
        <button className="btn-claim">Klaim Promo</button>
      </div>
    </div>
  </section>
);

const RenewalSection = () => (
  <section className="renewal-section">
    <div className="hero-badge">🔄 Perpanjang / Upgrade Langganan</div>
    <h2>Pulihkan Akses Akun Anda</h2>
    <p>Jika langganan Anda habis, pilih paket di bawah dan hubungi kami via WhatsApp.</p>

    <div className="renewal-grid">
      <div className="renewal-card">
        <h4>Paket Bulanan</h4>
        <div className="r-price">Rp 9.000<span>/karyawan/bulan</span></div>
        <p>Fleksibel, bayar bulan ke bulan.</p>
        <button className="btn-wa">💬 Perpanjang via WhatsApp</button>
      </div>
      <div className="renewal-card featured">
        <div className="best-badge">BEST VALUE</div>
        <h4>Paket Tahunan</h4>
        <div className="r-price">Rp 7.000<span>/karyawan/bulan</span></div>
        <p>Hemat Rp 2.000/karyawan vs bulanan. Tagih sekali setahun.</p>
        <button className="btn-wa primary">💬 Perpanjang via WhatsApp</button>
      </div>
    </div>

    <div className="r-steps">
      <h4>Cara Perpanjang — 3 Langkah Mudah</h4>
      <div className="steps-grid">
        <div className="step-item">
          <span className="step-icon">💬</span>
          <p><strong>Chat WhatsApp</strong><br/>Klik tombol di atas, pilih paket, dan kirim pesan ke tim kami.</p>
        </div>
        <div className="step-item">
          <span className="step-icon">💳</span>
          <p><strong>Proses Pembayaran</strong><br/>Kami kirimkan invoice dan instruksi transfer yang jelas.</p>
        </div>
        <div className="step-item">
          <span className="step-icon">✅</span>
          <p><strong>Akses Pulih</strong><br/>Konfirmasi pembayaran → akun Anda aktif kembali dalam menit.</p>
        </div>
      </div>
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
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Pantau mood dan produktivitas tim secara instan.</p>
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
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Pusat peningkatan kompetensi dan verifikasi pemahaman SOP.</p>
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
                    {t: 'AI: OPTIMALISASI MARGIN', c: 'Berdasarkan korelasi HPP dan Penjualan, Anda bisa menghemat 12% biaya.', color: '#4ade80'},
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
    <p className="hero-subtitle">Pantau kehadiran, payroll, dan performa tim dalam satu dashboard modern.</p>
    
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
      <Header />
      <Hero />
      <FeaturesShowcase />
      <DemoSection onPlay={() => setIsVideoOpen(true)} />
      <AboutSection />
      <IndustrySection />
      <PricingSection />
      <RenewalSection />
      <Footer />
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </div>
  );
}

import FinancePage from './FinancePage';

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
    </>
  );
}

export default App;
