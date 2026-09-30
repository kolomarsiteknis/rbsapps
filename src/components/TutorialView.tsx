import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  LayoutDashboard, 
  Database, 
  ClipboardCheck, 
  Fuel, 
  FileText, 
  Printer, 
  Users, 
  Activity, 
  Wifi, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  HelpCircle, 
  AlertTriangle, 
  Check, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HardHat,
  Lock,
  Layers,
  MapPin,
  Clock,
  Camera,
  Truck,
  Building2
} from 'lucide-react';
import { TabKey } from './Header';

interface TutorialViewProps {
  onNavigateTab: (tab: TabKey) => void;
}

interface TutorialSection {
  id: string;
  tabKey?: TabKey;
  title: string;
  badge: string;
  icon: React.ElementType;
  description: string;
  targetRole: string;
  steps: {
    title: string;
    desc: string;
    tips?: string;
  }[];
  keyRules: string[];
}

export const TutorialView: React.FC<TutorialViewProps> = ({ onNavigateTab }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'overview': true,
    'dashboard': true,
    'company-master': false,
    'master': false,
    'audit': false,
    'approval': false,
    'logistics': false,
    'reports': false,
    'pdf': false,
    'activity': false,
    'tutorial-guide': false,
    'firestore': false,
    'manager-access': false,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    tutorialData.forEach((s) => (allExpanded[s.id] = true));
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    tutorialData.forEach((s) => (allCollapsed[s.id] = false));
    setExpandedSections(allCollapsed);
  };

  const tutorialData: TutorialSection[] = [
    {
      id: 'overview',
      title: 'Arsitektur Sistem & Peran Pengguna (RBAC)',
      badge: 'Prinsip Dasar',
      icon: ShieldCheck,
      description: 'Suryaland Land Clearing membagi hak akses secara ketat antara Superadmin (Direktur/Owner), Manager Operasional, dan Pengawas Lapangan untuk memastikan integritas data dan keamanan operasional.',
      targetRole: 'Seluruh Manajemen & Pengawas',
      steps: [
        {
          title: 'Peran Superadmin / Direktur (Akses Penuh)',
          desc: 'Memiliki visibilitas 360° ke seluruh PT/klien, berhak mengelola Master Data Perusahaan & Proyek, menyetujui (Approve) laporan harian dan logistik BBM, serta memeriksa audit GPS & log aktivitas.',
          tips: 'Hanya Superadmin yang dapat menerbitkan tanda tangan digital resmi dan konfigurasi legalitas perusahaan.'
        },
        {
          title: 'Peran Manager Operasional (Verifikasi & Approval)',
          desc: 'Memvalidasi pekerjaan pengawas lapangan, approval mutasi BBM & pelumas, pemeriksaan P2H dan K3, serta cetak laporan PDF resmi.',
        },
        {
          title: 'Peran Pengawas Lapangan (Data Isolation)',
          desc: 'Akun pengawas dikunci hanya pada penempatan proyek/SPK dan blok kerja tertentu untuk mengisi formulir lapangan 6-langkah, checklist P2H, foto geotagging, dan transaksi bowser.',
        }
      ],
      keyRules: [
        'Prinsip Zero Burning: Seluruh operasional land clearing wajib ramah lingkungan tanpa pembakaran lahan.',
        'Prinsip Data Isolation: Pengawas PT. A dilarang dan tidak bisa melihat data milik PT. B.',
        'Prinsip Otorisasi: Setiap laporan atau logistik masuk wajib di-approve Direktur / Manager sebelum sah dicetak.'
      ]
    },
    {
      id: 'dashboard',
      tabKey: 'dashboard',
      title: '1. Dashboard & Analisis KPI Eksekutif',
      badge: 'Menu 1',
      icon: LayoutDashboard,
      description: 'Pusat visualisasi metrik bisnis, progres pembukaan lahan (Ha), efisiensi konsumsi BBM alat berat (L/HM), dan status tangki solar lapangan.',
      targetRole: 'Khusus Superadmin / Direktur',
      steps: [
        {
          title: 'Memilih Portofolio PT menggunakan Dropdown',
          desc: 'Gunakan dropdown "Pilih Klien / PT Proyek" di bagian atas dashboard untuk konsolidasi semua proyek atau spesifik per PT.',
        },
        {
          title: 'Membaca KPI Fisik & Target Hektar (Ha)',
          desc: 'Lihat kartu akumulasi Luas Hektar yang telah dibuka (cleared), sisa target, persentase kemajuan fisik, dan estimasi waktu penyelesaian proyek.',
        },
        {
          title: 'Menganalisis Efisiensi BBM (Fuel Ratio)',
          desc: 'Perhatikan bagan Tren Rasio BBM Mingguan (L/HM) dan kartu peringatan deviasi alat berat di atas standar toleransi pabrik.',
        }
      ],
      keyRules: [
        'Konsolidasi mencakup seluruh laporan approved dan pending dari semua klien.',
        'Rasio BBM aman adalah ≤ 20.0 L/HM untuk Excavator standard dan ≤ 22.0 L/HM untuk Bulldozer.'
      ]
    },
    {
      id: 'company-master',
      tabKey: 'company-master',
      title: '2. Master Data Perusahaan',
      badge: 'Menu 2',
      icon: Building2,
      description: 'Pengaturan internal perusahaan: 1. Identitas & Logo Apps, 2. Staff, TTD Digital & Kredensial User, 3. Personil Tim pendukung.',
      targetRole: 'Khusus Superadmin / Direktur',
      steps: [
        {
          title: 'Sub-Tab 1: Identitas Perusahaan & Logo Apps',
          desc: 'Ubah Nama Singkat (otomatis jadi Nama Apps), Nama Resmi PT/CV, Slogan, Alamat Kantor, NPWP, Rekening, dan Upload Logo Apps baru yang otomatis tampil di Header, Login, dan Dokumen PDF.',
        },
        {
          title: 'Sub-Tab 2: Staff, TTD Digital & Kredensial User (1 Modul CRUD Terpadu)',
          desc: 'Kelola data staff resmi lengkap dengan kredensial login (Username, Password, Level Hak Akses: Superadmin, Site Manager, Pengawas, Klien) dan TTD Digital (Upload, Canvas, atau Preset) dalam satu modul inputan.',
          tips: 'Gunakan tombol Salin Kredensial pada kartu staff untuk langsung menyalin data username dan password akun ke WhatsApp.'
        },
        {
          title: 'Sub-Tab 3: Personil Tim pendukung',
          desc: 'Kelola personil tim pendukung lapangan: Operator, Mekanik, Logistik, Pendukung, Pengawas. Dilengkapi dropdown kategori dinamis (+ Tambah kategori) dan Penugasan Lokasi Kerja (NO KONTRAK/SPK) format "<NOMOR SPK> - <Nama Singkat Klien>".',
        }
      ],
      keyRules: [
        'Nama Singkat Perusahaan otomatis menjadi branding di seluruh modul dan watermark foto.',
        'Kredensial login akun dapat disalin dengan satu klik untuk dikirimkan melalui WhatsApp kepada personil terkait.'
      ]
    },
    {
      id: 'master',
      tabKey: 'master',
      title: '3. Master Data Proyek',
      badge: 'Menu 3',
      icon: Database,
      description: 'Katalog proyek: 1. Daftar Klien, 2. Lokasi & Pekerjaan, 3. Alat Berat & Batas BBM, 4. Penugasan Kerja, 5. Target Harian.',
      targetRole: 'Direktur (Superadmin)',
      steps: [
        {
          title: 'Sub-Tab 1: Daftar Klien (Multi-Client & Multi-SPK)',
          desc: 'Daftarkan SPK kontrak klien perkebunan, total luas kontrak (Ha), lokasi provinsi/kabupaten, dan PIC perusahaan.',
        },
        {
          title: 'Sub-Tab 2: Lokasi & Pekerjaan (Blok Kerja & Item Land Clearing)',
          desc: 'Atur kode blok (Blok AA, AB, AC, dll), target luas (Ha), serta rincian item pekerjaan: Underbrushing, Felling, Stacking, dll.',
        },
        {
          title: 'Sub-Tab 3: Alat Berat & Batas BBM',
          desc: 'Inventaris unit alat berat (Excavator, Dozer, Grader, Vibro), Serial Number, dan batas jatah BBM (L/HM).',
        },
        {
          title: 'Sub-Tab 4: Penugasan Kerja (Operasional Lapangan)',
          desc: 'Alokasikan penugasan terstruktur: 1. Data Staff penanggung jawab (Level Staff & Nama Lengkap Staff dari Master Data Perusahaan), 2. Data Personel Tim pendukung Lapangan (Operator, Mekanik, Logistik, Pendukung — Pengawas & Site Manager berada pada level Staff di atas), 3. Unit Alat Berat (khusus Operator), 4. No Kontrak / SPK Klien & Blok Kerja, serta 5. Status & Tanggal Penugasan.',
        },
        {
          title: 'Sub-Tab 5: Target Harian',
          desc: 'Tetapkan target harian pembukaan lahan (Ha per hari) untuk setiap blok kerja agar progres terkontrol presisi.',
        }
      ],
      keyRules: [
        'Nomor SPK menjadi identitas unik kontrak proyek.',
        'Batas BBM solar di sini menjadi ambang batas deteksi pemborosan bahan bakar.'
      ]
    },
    {
      id: 'audit',
      tabKey: 'director-field-monitor',
      title: '4. Audit Pengawas',
      badge: 'Menu 4',
      icon: ClipboardCheck,
      description: 'Audit hasil pemeriksaan harian pengawas: P2H Alat Berat, Audit HM & Discrepancy BBM, Solar Bowser & Log K3 Lapangan.',
      targetRole: 'Direktur & Manager',
      steps: [
        {
          title: 'Inspeksi P2H Alat Berat',
          desc: 'Periksa kondisi oli, hidrolik, air radiator, track undercarriage, rem, dan APAR sebelum unit beroperasi.',
        },
        {
          title: 'Audit HM & Discrepancy Alert',
          desc: 'Audit sinkronisasi total putaran jam kerja mesin fisik (HM) vs jam kerja catatan pengawas serta rasio efisiensi konsumsi solar (L/HM).',
        },
        {
          title: 'Monitoring Solar Bowser & Log K3',
          desc: 'Cek transaksi pengisian bahan bakar lapangan keliling dan rekap mitigasi insiden tanah amblas.',
        }
      ],
      keyRules: [
        'Discrepancy HM >= 0.2 Jam akan mendapatkan bendera peringatan warna merah.',
        'Unit rusak pada P2H wajib diservis mekanik sebelum dioperasikan.'
      ]
    },
    {
      id: 'approval',
      tabKey: 'approval',
      title: '5. Approval Pengawas',
      badge: 'Menu 5',
      icon: ShieldCheck,
      description: 'Pusat verifikasi dan otorisasi kerja lapangan: Laporan Harian, P2H Alat Berat, Mutasi Stok BBM, dan Keselamatan K3.',
      targetRole: 'Direktur & Manager',
      steps: [
        {
          title: 'Tinjau Antrean Pengajuan',
          desc: 'Pilih laporan atau transaksi yang diajukan pengawas lapangan berstatus Menunggu Verifikasi.',
        },
        {
          title: 'Otorisasi Persetujuan (Approve) atau Tolak (Reject)',
          desc: 'Klik Setujui untuk mengesahkan dokumen secara resmi, atau Tolak dengan catatan alasan tertulis.',
        }
      ],
      keyRules: [
        'Laporan yang telah diapprove terkunci dari pengeditan ulang.',
        'Stempel dan tanda tangan digital sah hanya diterbitkan setelah persetujuan.'
      ]
    },
    {
      id: 'logistics',
      tabKey: 'logistics',
      title: '6. Logistik & BBM',
      badge: 'Menu 6',
      icon: Fuel,
      description: 'Pusat inventaris Solar Industri B50, pelumas oli (mesin, hidrolik, transmisi), grease, dan spare part alat berat.',
      targetRole: 'Superadmin, Manager & Pengawas',
      steps: [
        {
          title: 'Penerimaan Inbound (Barang Masuk)',
          desc: 'Input DO supplier, volume liter solar/oli yang masuk ke tangki atau gudang.',
        },
        {
          title: 'Pencatatan Otomatis Pengeluaran (Outflow)',
          desc: 'Stok berkurang otomatis saat pengisian alat berat diinput pada laporan harian atau bowser keliling.',
        }
      ],
      keyRules: [
        'Inbound solar memerlukan approval sebelum menambah stok resmi.'
      ]
    },
    {
      id: 'reports',
      tabKey: 'reports',
      title: '7. Rekap Laporan',
      badge: 'Menu 7',
      icon: FileText,
      description: 'Daftar rekapitulasi seluruh laporan harian pembukaan lahan dari pengawas berbagai blok kerja dengan filter komprehensif.',
      targetRole: 'Semua Peran',
      steps: [
        {
          title: 'Filter Multi-Klien & Blok',
          desc: 'Pilah laporan per SPK klien, kode blok, atau status verifikasi.',
        },
        {
          title: 'Ekspor Data ke Excel (CSV)',
          desc: 'Unduh data tabel dalam format spreadsheet kompatibel Microsoft Excel untuk laporan manajemen dan akuntansi.',
        }
      ],
      keyRules: [
        'Hanya laporan yang telah disetujui yang dapat diajukan untuk penagihan termin (invoicing).'
      ]
    },
    {
      id: 'pdf',
      tabKey: 'official-pdf',
      title: '8. Cetak Pdf',
      badge: 'Menu 8',
      icon: Printer,
      description: 'Penerbitan dokumen resmi berformat standar A4 berlogo perusahaan lengkap dengan tanda tangan digital pengawas & direktur.',
      targetRole: 'Semua Peran',
      steps: [
        {
          title: 'Pilih Dokumen yang Hendak Dicetak',
          desc: 'Pilih tanggal dan SPK klien dari daftar laporan yang tersedia.',
        },
        {
          title: 'Tanda Tangan Digital Pengesahan',
          desc: 'Memuat tanda tangan digital resmi pengawas pembuat dan direktur/manager pemeriksa.',
        }
      ],
      keyRules: [
        'Pastikan memilih orientasi Portrait saat dialog cetak printer muncul.'
      ]
    },
    {
      id: 'activity',
      tabKey: 'user-activity-log',
      title: '9. Log Aktivitas & GPS',
      badge: 'Menu 9',
      icon: Activity,
      description: 'Pencatatan riwayat digital tanpa manipulasi (audit trail) untuk setiap aksi yang dilakukan oleh seluruh pengguna.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Pemeriksaan Kronologi Audit Trail',
          desc: 'Pantau siapa yang login, membuat laporan, mengedit master data, atau menghapus data beserta stempel waktu dan IP/perangkat.',
        },
        {
          title: 'Pelacakan Koordinat GPS Pengguna',
          desc: 'Verifikasi lokasi login pengguna saat bertransaksi di dalam area proyek perkebunan.',
        }
      ],
      keyRules: [
        'Log aktivitas disimpan secara otomatis dan permanen.'
      ]
    },
    {
      id: 'tutorial-guide',
      tabKey: 'tutorial',
      title: '10. Tutorial & Dokumentasi',
      badge: 'Menu 10',
      icon: BookOpen,
      description: 'Panduan lengkap modul, fitur, alur kerja standar (SOP), dan arsitektur sistem Suryaland Apps.',
      targetRole: 'Semua Peran',
      steps: [
        {
          title: 'Navigasi Modul Terpadu',
          desc: 'Pelajari fungsi 10 menu utama dan bagaimana setiap modul saling berintegrasi dalam siklus proyek land clearing.',
        }
      ],
      keyRules: [
        'Pedomani SOP Zero Burning dan Keselamatan K3 dalam setiap aktivitas di lapangan.'
      ]
    },
    {
      id: 'firestore',
      title: '9. Sinkronisasi Cloud Firestore & Mode Offline Lahan',
      badge: 'Teknologi Cloud',
      icon: Wifi,
      description: 'Arsitektur database ganda yang memungkinkan aplikasi tetap bekerja normal di area blank spot perkebunan tanpa sinyal internet.',
      targetRole: 'Superadmin & Seluruh Pengguna',
      steps: [
        {
          title: 'Penyimpanan Multi-Perangkat (Cloud Synced)',
          desc: 'Saat perangkat terhubung ke internet, seluruh perubahan data otomatis tersinkronisasi ke Google Cloud Firestore secara real-time. Perubahan di ponsel pengawas seketika terlihat di laptop Direktur.',
        },
        {
          title: 'Operasional Lapangan Tanpa Sinyal (Offline-First)',
          desc: 'Di tengah hutan atau perkebunan pelosok tanpa jaringan seluler, pengawas tetap dapat menginput laporan, mencatat HM, checklist P2H, dan mengambil foto. Data tersimpan aman di database lokal IndexedDB browser.',
        },
        {
          title: 'Sinkronisasi Otomatis saat Kembali Online',
          desc: 'Begitu perangkat kembali memperoleh sinyal WiFi atau 4G di posko/camp, antrean data offline otomatis terunggah ke Cloud Firestore tanpa kehilangan data.',
        },
        {
          title: 'Simulasi Mode Offline di Header',
          desc: 'Klik tombol indikator "Cloud Synced / Offline Lahan" di bar navigasi atas untuk menguji ketangguhan penyimpanan lokal.',
        }
      ],
      keyRules: [
        'Penyimpanan lokal menggunakan persistentLocalCache Firestore berteknologi multi-tab.',
        'Jangan menghapus riwayat data peramban (Clear Site Data) saat masih terdapat antrean pending sync offline.'
      ]
    },
    {
      id: 'manager-access',
      tabKey: 'approval',
      title: 'Portal Akses Khusus Manager & Approval Pengawas',
      badge: 'Level Manager',
      icon: ShieldCheck,
      description: 'Halaman kerja terisolasi bagi peran Manager Operasional untuk memvalidasi seluruh inputan kerja lapangan, stok BBM & pelumas, hasil inspeksi alat berat, dan cetak PDF resmi.',
      targetRole: 'Khusus Akun Manager',
      steps: [
        {
          title: 'Rekapitulasi Laporan Harian Land Clearing',
          desc: 'Manager memiliki akses rekap laporan setara Direktur: memantau semua blok kerja, melihat histori pembukaan lahan, memeriksa detail alat dan cuaca, serta mengekspor berkas ke format CSV/Excel.',
        },
        {
          title: 'Audit Hasil Pengawas Lapangan (Read-Only)',
          desc: 'Akses audit read-only ke Field Operational Suite untuk meninjau checklist P2H alat berat harian, verifikasi foto dokumentasi lapangan ber-watermark GPS dan tanggal, audit deviasi HM mesin, penerimaan fuel bowser, serta pemantauan log insiden K3.',
        },
        {
          title: 'Otoritas Otorisasi Logistik & BBM (Stok Masuk & Stok Keluar)',
          desc: 'Manager berwenang penuh untuk memverifikasi dan menyetujui mutasi stok masuk maupun stok keluar (pemakaian alat), serta menolak pengajuan stok masuk/keluar dengan catatan alasan penolakan tertulis.',
          tips: 'Setiap penolakan stok keluar secara otomatis mengembalikan kuantitas barang ke saldo inventaris aktif sistem.'
        },
        {
          title: 'Halaman Approval Pekerjaan Pengawas Terpadu',
          desc: 'Satu pintu verifikasi bagi Manager dan Direktur untuk memeriksa antrean laporan harian, mutasi logistik BBM, peringatan kerusakan P2H, dan insiden lapangan dengan fitur 1-klik Approve atau Reject ber-catatan.',
        },
        {
          title: 'Cetak Lembar Laporan PDF Resmi',
          desc: 'Mencetak rekapitulasi operasional harian berstandar format resmi perusahaan dengan stempel digital, koordinat lokasi lahan, dan ringkasan tim mekanik/operator.',
        }
      ],
      keyRules: [
        'Hanya pengguna dengan level Manager atau Superadmin yang dapat mengakses modul Approval Pekerjaan Pengawas.',
        'Penolakan stok BBM atau laporan wajib disertai catatan alasan yang jelas agar pengawas dapat melakukan revisi lapangan.'
      ]
    }
  ];

  // Filter sections by search query and category
  const filteredSections = tutorialData.filter((section) => {
    const matchesSearch = 
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.steps.some(st => st.title.toLowerCase().includes(searchQuery.toLowerCase()) || st.desc.toLowerCase().includes(searchQuery.toLowerCase())) ||
      section.keyRules.some(kr => kr.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === 'all') return matchesSearch;
    if (activeCategory === 'core') return matchesSearch && ['overview', 'dashboard', 'master', 'manager-access'].includes(section.id);
    if (activeCategory === 'field') return matchesSearch && ['audit', 'logistics', 'reports'].includes(section.id);
    if (activeCategory === 'admin') return matchesSearch && ['users', 'activity', 'pdf', 'firestore'].includes(section.id);
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Khusus Frontend Superadmin
              </span>
              <span className="text-xs text-amber-300/80 font-medium">
                Panduan Komprehensif Sistem v2.0
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Buku Panduan & Tutorial Penggunaan Seluruh Fitur
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Panduan operasional terpadu bagi Direktur / Superadmin untuk mengelola portofolio proyek land clearing, audit hasil pengawas, approval logistik BBM, manajemen akun staf, dan operasional offline-to-cloud.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex sm:flex-col gap-2 shrink-0 bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80">
            <div className="text-center sm:text-left">
              <div className="text-2xl font-black text-amber-400">9 Modul</div>
              <div className="text-[11px] text-slate-400 font-semibold">Tercakup Lengkap</div>
            </div>
            <div className="border-l sm:border-l-0 sm:border-t border-slate-700 pl-3 sm:pl-0 sm:pt-2 text-center sm:text-left">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> SOP Zero Burning
              </div>
              <div className="text-[10px] text-slate-400">Standar Lingkungan</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari fitur, kata kunci, SOP, atau masalah (misal: BBM, P2H, GPS)..."
              className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Hapus
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'all' 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('core')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'core' 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Dashboard & Master
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('field')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'field' 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Audit & Logistik
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'admin' 
                    ? 'bg-amber-500 text-slate-950' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                User & Cloud
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Tutup Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 sm:gap-3">
        {tutorialData.filter(s => s.tabKey).map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => {
                if (section.tabKey) onNavigateTab(section.tabKey);
              }}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-md transition-all duration-200 text-center group cursor-pointer"
              title={`Langsung lompat ke menu ${section.title}`}
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-amber-500 text-slate-700 group-hover:text-slate-950 flex items-center justify-center transition-colors mb-1.5">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 group-hover:text-amber-700 line-clamp-1">
                {section.title.split('. ')[1] || section.title}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-0.5">
                Buka <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Content Accordion Sections */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Tidak Menemukan Hasil Tutorial</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ada modul atau materi yang cocok dengan pencarian "{searchQuery}". Coba gunakan kata kunci lain seperti "Solar", "P2H", "GPS", atau "User".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          filteredSections.map((section, idx) => {
            const Icon = section.icon;
            const isExpanded = expandedSections[section.id] !== false;

            return (
              <div 
                key={section.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Section Header Toggle */}
                <div
                  onClick={() => toggleSection(section.id)}
                  className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black text-slate-900">
                          {section.title}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          {section.badge}
                        </span>
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          {section.targetRole}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {section.tabKey && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (section.tabKey) onNavigateTab(section.tabKey);
                        }}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95"
                      >
                        <span>Buka Modul</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </div>

                {/* Section Details */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-5">
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                      {section.description}
                    </p>

                    {/* Step-by-step list */}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Panduan Langkah Demi Langkah:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {section.steps.map((step, sIdx) => (
                          <div 
                            key={sIdx}
                            className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 space-y-2 relative"
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-amber-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-slate-900">
                                  {step.title}
                                </h5>
                                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                            {step.tips && (
                              <div className="ml-8 text-[10px] text-amber-800 bg-amber-50/80 border border-amber-200/80 p-2 rounded-lg font-medium">
                                <strong>Tips Penting:</strong> {step.tips}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Rules / SOP Guardrails */}
                    {section.keyRules && section.keyRules.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Ketentuan Wajib & SOP Operasional:
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                          {section.keyRules.map((rule, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{rule}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Direct Action Button on Mobile */}
                    {section.tabKey && (
                      <div className="pt-2 sm:hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (section.tabKey) onNavigateTab(section.tabKey);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xs"
                        >
                          <span>Buka Menu {section.title.split('. ')[1] || section.title}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Corporate Help Desk Footer */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">
              Butuh Penjelasan Teknis Tambahan?
            </h4>
            <p className="text-[11px] text-slate-500">
              Hubungi Tim TI & Operasional Kantor Pusat PT. Suryaland Group untuk panduan konfigurasi lanjutan.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow transition cursor-pointer"
        >
          Kembali ke Dashboard Utama
        </button>
      </div>
    </div>
  );
};
