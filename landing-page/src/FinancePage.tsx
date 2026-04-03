import { useState, useEffect } from 'react';
import './Finance.css';

const Header = () => (
  <nav className="f-header">
    <div className="f-logo">
      <img src="/logo.png" alt="Aivola Logo" />
      <span>aivola finance</span>
    </div>
    <div className="f-links">
      <a href="/">Kembali ke HR</a>
      <a href="#features">Fitur</a>
      <a href="#pricing">Harga</a>
      <a href="https://admin.aivola.id" className="f-btn-login">Masuk Admin</a>
    </div>
  </nav>
);

const FinanceHero = () => (
  <section className="f-hero">
    <div className="f-badge">🧬 Aivola AI Mind - Finance Module</div>
    <h1>
      Kelola Keuangan & POS <br />
      <span className="f-gradient">dengan Analisis AI Strategis</span>
    </h1>
    <p className="f-subtitle">
      Bukan sekadar kasir digital. Aivola Finance membantu Anda mengoptimalkan profit, 
      memprediksi stok, dan menganalisis margin secara real-time.
    </p>
    <div className="f-cta">
      <a href="https://wa.me/6287882716935" className="f-btn-primary">Coba Finance & POS</a>
      <a href="#demo" className="f-btn-secondary">Lihat Demo</a>
    </div>
  </section>
);

const FinanceAI = () => (
  <section className="f-ai-section">
    <div className="f-ai-grid">
      <div className="f-ai-text">
        <div className="f-badge">Kecerdasan Buatan</div>
        <h2>Optimasi Profit <br/> Hingga ke Unit Terkecil</h2>
        <div className="f-perks">
          <div className="f-perk">
            <span>🎯</span>
            <div>
              <h4>Margin Optimizer</h4>
              <p>AI memantau fluktuasi harga bahan baku dan memberikan rekomendasi supplier terbaik.</p>
            </div>
          </div>
          <div className="f-perk">
            <span>🔮</span>
            <div>
              <h4>Stock Forecasting</h4>
              <p>Prediksi kapan stok akan habis berdasarkan tren penjualan untuk mencegah "Lost Sale".</p>
            </div>
          </div>
        </div>
      </div>
      <div className="f-ai-visual">
        <div className="f-brain-orb">
          <div className="f-orb-core"></div>
        </div>
      </div>
    </div>
  </section>
);

const FinanceFeatures = () => {
  const [activeTab, setActiveTab] = useState('pos');
  const features: Record<'pos' | 'inventory', { t: string; d: string }[]> = {
    pos: [
      { t: 'Multi-Outlet Sync', d: 'Kelola puluhan cabang dalam satu dashboard terpusat.' },
      { t: 'Offline Transaction', d: 'Tetap berjualan meski internet sedang terkendala.' },
      { t: 'Loyalty Program', d: 'Sistem poin dan diskon pelanggan otomatis.' }
    ],
    inventory: [
      { t: 'Recipe/BOM', d: 'Stok bahan baku terpotong otomatis berdasarkan resep tiap porsi.' },
      { t: 'Stock Opname', d: 'Proses opname yang cepat dengan barcode scanner.' }
    ]
  };

  return (
    <section id="features" className="f-features">
      <div className="f-section-header">
        <h2>Fitur Unggulan Finance</h2>
      </div>
      <div className="f-tabs">
        <button onClick={() => setActiveTab('pos')} className={activeTab === 'pos' ? 'active' : ''}>Digital POS</button>
        <button onClick={() => setActiveTab('inventory')} className={activeTab === 'inventory' ? 'active' : ''}>Inventory AI</button>
      </div>
      <div className="f-grid">
        {(features[activeTab as 'pos' | 'inventory']).map((f: { t: string, d: string }, i: number) => (
          <div key={i} className="f-card">
            <h4>{f.t}</h4>
            <p>{f.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const FinancePricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const pricing = {
    starter: isAnnual ? 1500000 : 150000, // example 10 months for 12? or just 12x
    pro: isAnnual ? 3500000 : 350000,
    enterprise: isAnnual ? 7500000 : 750000,
  };

  return (
    <section id="pricing" className="f-pricing">
      <div className="f-pricing-header">
        <div className="f-badge">Pilihan Paket Bisnis</div>
        <h2>Satu Harga untuk <br/> Efisiensi Selamanya</h2>
        <p className="f-subtitle">Pilih paket yang paling sesuai dengan skala operasional bisnis Anda.</p>
      </div>

      <div className="f-toggle-container">
        <span className={`f-toggle-label ${!isAnnual ? 'active' : ''}`}>Bulanan</span>
        <label className="f-switch">
          <input type="checkbox" checked={isAnnual} onChange={() => setIsAnnual(!isAnnual)} />
          <span className="f-slider"></span>
        </label>
        <span className={`f-toggle-label ${isAnnual ? 'active' : ''}`}> Tahunan <span className="f-discount-badge">Hemat 20%</span></span>
      </div>

      <div className="f-pricing-grid">
        {/* STARTER */}
        <div className="f-price-card">
          <div className="f-plan-name">STARTER</div>
          <div className="f-plan-price">
            <span>Rp</span> {pricing.starter.toLocaleString('id-ID')} <span>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <ul className="f-list">
            <li><span>✓</span> <b>2</b> Admin Slot</li>
            <li><span>✓</span> <b>1</b> Digital POS Terminal</li>
            <li><span>✓</span> Absensi Liveness (Wajah)</li>
            <li><span>✓</span> Laporan Penjualan Harian</li>
            <li><span>✓</span> Manajemen Karyawan Dasar</li>
          </ul>
          <a href="https://wa.me/6287882716935" className="f-btn-card">Pilih Starter</a>
        </div>

        {/* PRO */}
        <div className="f-price-card featured">
          <div className="f-plan-name">PRO</div>
          <div className="f-plan-price">
            <span>Rp</span> {pricing.pro.toLocaleString('id-ID')} <span>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <ul className="f-list">
            <li><span>✓</span> <b>5</b> Admin Slot</li>
            <li><span>✓</span> <b>2</b> Digital POS Terminal</li>
            <li><span>✓</span> <b>Full</b> Inventory & Stok</li>
            <li><span>✓</span> AI Stock Forecasting</li>
            <li><span>✓</span> Laporan Laba Rugi (P&L)</li>
            <li><span>✓</span> Multi-Outlet Sync</li>
          </ul>
          <a href="https://wa.me/6287882716935" className="f-btn-card">Mulai Skala Bisnis</a>
        </div>

        {/* ENTERPRISE */}
        <div className="f-price-card">
          <div className="f-plan-name">ENTERPRISE</div>
          <div className="f-plan-price">
            <span>Rp</span> {pricing.enterprise.toLocaleString('id-ID')} <span>/{isAnnual ? 'thn' : 'bln'}</span>
          </div>
          <ul className="f-list">
            <li><span>✓</span> <b>Unlimited</b> Admin & POS</li>
            <li><span>✓</span> Custom Recipe / BOM</li>
            <li><span>✓</span> <b>Aivola Mind</b> AI Advisor</li>
            <li><span>✓</span> <b>Anti-Fraud</b> Protection</li>
            <li><span>✓</span> Prioritas Support 24/7</li>
            <li><span>✓</span> Warehouse Management</li>
          </ul>
          <a href="https://wa.me/6287882716935" className="f-btn-card">Hubungi Sales</a>
        </div>
      </div>

      <div className="f-addons-section">
        <div className="f-badge">Power Up</div>
        <h3>Fitur Spesialis Tambahan</h3>
        <div className="f-addons-grid">
          <div className="f-addon-card">
            <span className="f-addon-name">📦 Inventory Pro</span>
            <div className="f-addon-price">Rp 20.000<span>/bln</span></div>
            <p className="f-subtitle" style={{fontSize: '0.8rem', margin: '0.5rem 0'}}>Manajemen stok bahan baku & resep detail.</p>
          </div>
          <div className="f-addon-card">
            <span className="f-addon-name">🧠 Aivola Mind (AI)</span>
            <div className="f-addon-price">Rp 20.000<span>/bln</span></div>
            <p className="f-subtitle" style={{fontSize: '0.8rem', margin: '0.5rem 0'}}>Analisis profit & rekomendasi bisnis strategis.</p>
          </div>
          <div className="f-addon-card">
            <span className="f-addon-name">🛡️ Anti-Fraud Check</span>
            <div className="f-addon-price">Rp 10.000<span>/bln</span></div>
            <p className="f-subtitle" style={{fontSize: '0.8rem', margin: '0.5rem 0'}}>Verifikasi wajah & deteksi kecurangan kasir.</p>
          </div>
          <div className="f-addon-card" style={{borderColor: '#db2777'}}>
            <span className="f-addon-name">🎯 Performance Bundle</span>
            <div className="f-addon-price">Rp 3.000<span>/kar/bln</span></div>
            <p className="f-subtitle" style={{fontSize: '0.8rem', margin: '0.5rem 0'}}>KPI Management + Learning Center (LMS).</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const VideoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState('invoicing');
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
        background: '#0b0213',
        borderRadius: '32px',
        overflow: 'hidden',
        border: '1px solid rgba(236, 72, 153, 0.3)',
        boxShadow: '0 0 100px rgba(236, 72, 153, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(236, 72, 153, 0.05)'
        }}>
          <div style={{display: 'flex', gap: '1rem'}}>
            {['invoicing', 'report', 'ai'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '12px',
                  background: activeTab === tab ? '#ec4899' : 'transparent',
                  border: 'none',
                  color: activeTab === tab ? 'white' : '#94a3b8',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: '0.3s all'
                }}
              >
                {tab === 'invoicing' ? 'Invoicing' : tab === 'report' ? 'Profit & Loss' : 'Aivola Mind AI'}
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f472b6',
              fontSize: '1.8rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{padding: '3rem', height: '600px', overflowY: 'auto'}}>
          {activeTab === 'invoicing' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h3 style={{margin: 0, color: 'white'}}>Automated Smart Invoicing</h3>
                  <p style={{color: '#94a3b8', margin: '0.5rem 0 0'}}>Generate tagihan otomatis berdasarkan paket & jumlah karyawan.</p>
                </div>
                <button style={{padding: '0.8rem 1.5rem', background: '#ec4899', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 700}}>Download PDF</button>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '3rem',
                color: '#333',
                width: '80%',
                margin: '0 auto',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2rem'}}>
                  <div>
                    <h4 style={{margin: 0, color: '#ec4899'}}>Invoice #2026-001</h4>
                    <p style={{fontSize: '0.8rem', color: '#666'}}>PT. MAJU JAYA</p>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>Date: 3 April 2026</p>
                    <p style={{fontSize: '0.8rem', color: '#666', margin: 0}}>Period: Tahunan</p>
                  </div>
                </div>
                <div style={{borderBottom: '2px solid #f5f5f5', paddingBottom: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.8rem', fontWeight: 700}}>
                  <div>DESKRIPSI</div>
                  <div>QTY</div>
                  <div style={{textAlign: 'right'}}>TOTAL</div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.85rem', marginBottom: '1rem'}}>
                  <div>Paket Starter (Maintenance)</div>
                  <div>1 Thn</div>
                  <div style={{textAlign: 'right'}}>Rp 1.800.000</div>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontSize: '0.85rem', marginBottom: '1rem'}}>
                  <div>Performance Bundle (100 Staff)</div>
                  <div>12 Bln</div>
                  <div style={{textAlign: 'right'}}>Rp 3.600.000</div>
                </div>
                <div style={{borderTop: '2px solid #ec4899', paddingTop: '1rem', marginTop: '2rem', textAlign: 'right'}}>
                  <div style={{fontSize: '1.2rem', fontWeight: 800, color: '#ec4899'}}>TOTAL: Rp 6.000.000</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0, color: 'white'}}>Laporan Laba / Rugi (P&L)</h3>
                <div style={{padding: '0.6rem 1.2rem', background: '#111', borderRadius: '12px', color: '#f472b6', fontSize: '0.8rem', border: '1px solid #ec4899'}}>PERIODE: APRIL 2026</div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem'}}>
                {[
                  {l: 'PENDAPATAN', v: 'Rp 24.000', c: '#4ade80'},
                  {l: 'HPP (BAHAN)', v: 'Rp 0', c: '#94a3b8'},
                  {l: 'BEBAN OPS', v: 'Rp 180.000', c: '#f87171'},
                  {l: 'LABA BERSIH', v: '-Rp 156.000', c: '#fb7185'}
                ].map((s, i) => (
                  <div key={i} style={{padding: '1.5rem', background: '#111', borderRadius: '24px', border: `1px solid ${s.c}33`}}>
                    <div style={{fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.5rem'}}>{s.l}</div>
                    <div style={{fontSize: '1.2rem', fontWeight: 800, color: s.c}}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{background: 'rgba(255,255,255,0.02)', borderRadius: '24px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem', fontWeight: 700}}>RINCIAN OPERASIONAL</div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#94a3b8'}}>
                  <span>Penjualan Produk</span>
                  <span style={{color: 'white'}}>Rp 24,000</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#94a3b8'}}>
                  <span>Pembelian (Auto-PO)</span>
                  <span style={{color: '#f87171'}}>(Rp 180,000)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0, color: 'white'}}>Aivola Mind - AI Intelligence</h3>
                <div style={{color: '#ec4899', fontWeight: 800}}>⚡ OPTIMIZING BUSINESS</div>
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                 <div style={{background: 'linear-gradient(135deg, #2d1b4e, #0b0213)', padding: '2rem', borderRadius: '24px', border: '1px solid rgba(236,72,153,0.3)', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                       <div style={{fontSize: '2rem'}}>📈</div>
                       <div style={{fontWeight: 800, color: '#f472b6'}}>Optimization Strategy</div>
                    </div>
                    <p style={{color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6}}>
                      "Berdasarkan korelasi stok dan harga suplier, Aivola Mind merekomendasikan pembelian **Biji Kopi Robustica** minggu depan untuk menghemat tambahan 15% biaya produksi."
                    </p>
                    <button style={{width: '100%', padding: '1rem', background: '#ec4899', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 800}}>Approve Purchase Strategy</button>
                 </div>

                 <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                    {[
                      {t: 'PREDIKSI PROFIT MEI', d: 'Estimasi kenaikan profit 12% berbasis trend Ramadan.', c: '#4ade80'},
                      {t: 'STOK KRITIS', d: '3 bahan baku diprediksi habis dalam 48 jam.', c: '#fb7185'}
                    ].map((n, i) => (
                      <div key={i} style={{padding: '1.5rem', background: '#111', borderRadius: '20px', borderLeft: `4px solid ${n.c}`}}>
                         <div style={{color: n.c, fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem'}}>{n.t}</div>
                         <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>{n.d}</div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
        
        <div style={{padding: '1.5rem', textAlign: 'center', background: 'rgba(255,255,255,0.01)', fontSize: '0.8rem', color: '#444', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
          Aivola Finance System • Intelligent Profit Optimization
        </div>
      </div>
    </div>
  );
};

const DemoSection = ({ onPlay }: { onPlay: () => void }) => (
  <section id="demo" className="f-demo-section" style={{padding: '8rem 5%', textAlign: 'center', background: '#0a0a10'}}>
    <div className="f-badge">Demo Dashboard</div>
    <h2>Lihat Kemudahan <br/> Manajemen Finance</h2>
    <p className="f-subtitle">Tampilan dashboard admin yang intuitif untuk mengontrol seluruh aspek bisnis Anda.</p>
    
    <div className="f-demo-container" style={{maxWidth: '1000px', margin: '4rem auto', position: 'relative'}}>
      {/* Laptop Frame Mockup */}
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
        boxShadow: '0 50px 100px rgba(0,0,0,0.5)'
      }}>
        <img 
          src="/admin_invoice_demo.png" 
          alt="Aivola Finance Dashboard Demo" 
          style={{width: '100%', display: 'block', opacity: 0.9}}
        />
      </div>
      <div style={{
        background: '#2d2d3a',
        height: '20px',
        width: '110%',
        margin: '0 -5%',
        borderRadius: '0 0 100px 100px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}></div>
      
      {/* Play Overlay */}
      <div 
        onClick={onPlay}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100px',
          height: '100px',
          background: 'rgba(219, 39, 119, 0.8)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 0 50px rgba(219, 39, 119, 0.5)',
          zIndex: 10
        }}
      >
        <div style={{
          width: '0',
          height: '0',
          borderTop: '20px solid transparent',
          borderBottom: '20px solid transparent',
          borderLeft: '35px solid white',
          marginLeft: '8px'
        }}></div>
      </div>
    </div>
    
    <div className="f-demo-features" style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', maxWidth: '1000px', margin: '4rem auto'}}>
      <div className="f-card">
        <h5 style={{color: '#f472b6', marginBottom: '1rem'}}>Terintegrasi HR</h5>
        <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Biaya add-on otomatis sinkron dengan jumlah karyawan di sistem HR.</p>
      </div>
      <div className="f-card">
        <h5 style={{color: '#f472b6', marginBottom: '1rem'}}>Invoice Instan</h5>
        <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Cetak tagihan bulanan atau tahunan dalam hitungan detik.</p>
      </div>
      <div className="f-card">
        <h5 style={{color: '#f472b6', marginBottom: '1rem'}}>Laporan AI</h5>
        <p style={{fontSize: '0.9rem', color: '#94a3b8'}}>Analisis margin dan stok real-time dengan bantuan Aivola Mind AI.</p>
      </div>
    </div>
  </section>
);

export default function FinancePage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="f-app">
      <Header />
      <FinanceHero />
      <FinanceAI />
      <FinanceFeatures />
      <DemoSection onPlay={() => setIsVideoOpen(true)} />
      <FinancePricing />
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </div>
  );
}
