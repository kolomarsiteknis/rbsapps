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
  Truck
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
    'master': false,
    'audit': false,
    'logistics': false,
    'reports': false,
    'pdf': false,
    'users': false,
    'activity': false,
    'firestore': false,
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
      description: 'Suryaland Land Clearing membagi hak akses secara ketat antara Superadmin (Direktur/Owner) dan Pengawas Lapangan untuk memastikan integritas data dan keamanan operasional.',
      targetRole: 'Superadmin & Direktur',
      steps: [
        {
          title: 'Peran Superadmin / Direktur (Akses Penuh)',
          desc: 'Memiliki visibilitas 360° ke seluruh PT/klien, berhak menambah/mengubah Master Data, menyetujui (Approve) laporan harian dan inbound logistik BBM, mengelola akun staf, serta memeriksa audit GPS & log aktivitas.',
          tips: 'Hanya Superadmin yang dapat melakukan otorisasi sah yang menerbitkan tanda tangan digital pada PDF laporan resmi.'
        },
        {
          title: 'Peran Pengawas Lapangan (Data Isolation)',
          desc: 'Akun pengawas dikunci (terisolasi) hanya pada 1 PT penempatan dan blok kerja tertentu. Pengawas hanya dapat mengisi laporan, checklist P2H, foto geotagging, dan transaksi solar bowser.',
          tips: 'Pengawas tidak memiliki akses ke Dashboard Konsolidasi, Master Data Klien, Manajemen User, maupun Otorisasi Direktur.'
        },
        {
          title: 'Pemisahan Jalur Kerja Lapangan vs Manajemen',
          desc: 'Pengawas bekerja di lapangan mengisi form 6-langkah. Setelah laporan terkirim, status laporan menjadi "Menunggu Verifikasi Direktur". Direktur memverifikasi di menu Audit dan Rekap Laporan.',
        }
      ],
      keyRules: [
        'Prinsip Zero Burning: Seluruh operasional land clearing wajib ramah lingkungan tanpa pembakaran lahan.',
        'Prinsip Data Isolation: Pengawas PT. A dilarang dan tidak bisa melihat data milik PT. B atau PT. D.',
        'Prinsip Otorisasi Direktur: Setiap laporan atau logistik masuk wajib di-approve Direktur sebelum sah dicetak.'
      ]
    },
    {
      id: 'dashboard',
      tabKey: 'dashboard',
      title: '1. Dashboard & Analisis KPI Eksekutif',
      badge: 'Modul Utama',
      icon: LayoutDashboard,
      description: 'Pusat visualisasi metrik bisnis, progres pembukaan lahan (Ha), efisiensi konsumsi BBM alat berat (L/HM), dan status tangki solar lapangan.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Memilih Portofolio PT menggunakan Dropdown',
          desc: 'Gunakan dropdown "Pilih Klien / PT Proyek" di bagian atas dashboard. Anda dapat memilih "Konsolidasi Semua Proyek" untuk melihat total seluruh perkebunan, atau memilih PT tertentu (misal: PT. A, PT. B) untuk inspeksi mendalam.',
          tips: 'Pilihan dropdown mempermudah navigasi saat perusahaan menangani puluhan hingga ratusan PT klien tanpa perlu scrolling panjang.'
        },
        {
          title: 'Membaca KPI Fisik & Target Hektar (Ha)',
          desc: 'Lihat kartu akumulasi Luas Hektar yang telah dibuka (cleared), sisa target, persentase kemajuan fisik, dan estimasi waktu penyelesaian proyek.',
        },
        {
          title: 'Menganalisis Efisiensi BBM (Fuel Ratio)',
          desc: 'Perhatikan bagan "Tren Rasio BBM Mingguan (L/HM)" dan kartu peringatan deviasi. Jika suatu alat berat mengonsumsi solar melebihi batas standar pabrik, kartu merah ALERT akan muncul secara otomatis.',
          tips: 'Peringatan deviasi membantu Direktur mengidentifikasi indikasi kebocoran bahan bakar, operator ugal-ugalan, atau medan tanah berat.'
        },
        {
          title: 'Memantau Tangki Solar Lapangan & Pelumas',
          desc: 'Kartu ringkasan logistik menampilkan sisa liter Solar Industri B35 pada tangki 10.000 L, stok drum oli mesin, hidrolik, dan jumlah transaksi inbound yang butuh persetujuan.',
        }
      ],
      keyRules: [
        'Konsolidasi mencakup seluruh laporan approved dan pending dari semua klien.',
        'Rasio BBM aman adalah ≤ 20.0 L/HM untuk Excavator standard dan ≤ 22.0 L/HM untuk Bulldozer.'
      ]
    },
    {
      id: 'master',
      tabKey: 'master',
      title: '2. Master Data (Klien, Blok, Unit & Tim)',
      badge: 'Konfigurasi',
      icon: Database,
      description: 'Pengaturan pondasi data perusahaan yang menjadi acuan pengisian laporan, kalkulasi target, dan inventaris alat berat.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Kelola Data Klien / PT Kontrak',
          desc: 'Tambahkan klien baru dengan mengklik tab "Klien & Proyek", isi Nama Klien, Nama Resmi PT, Nomor Kontrak, Lokasi Kebun, dan Total Luas Kontrak (Ha).',
        },
        {
          title: 'Kelola Blok Lahan & Target Harian',
          desc: 'Atur kode blok (misal: Blok A1, Blok AB), status vegetasi, dan target pembukaan hektar per hari. Blok yang dibuat di sini akan muncul pada opsi laporan pengawas.',
        },
        {
          title: 'Kelola Armada Alat Berat (Heavy Equipments)',
          desc: 'Daftarkan unit Excavator, Bulldozer, Dump Truck, Grader, atau Vibro Roller. Wajib tentukan Serial Number, Brand/Model, Jam HM Terakhir, dan Standar Rasio BBM (L/HM).',
          tips: 'Standar rasio BBM di sini menjadi batas toleransi (threshold) alarm deviasi di Dashboard dan Laporan Harian.'
        },
        {
          title: 'Kelola Daftar Tenaga Kerja Lapangan',
          desc: 'Input daftar Mandor, Operator Alat Berat, Helper/Mekanik, dan Tim Rintis Tebas beserta nomor kontak aktif.',
        }
      ],
      keyRules: [
        'Menghapus Master Klien yang memiliki laporan tersimpan akan dicegah sistem untuk melindungi arsip transaksi.',
        'Kode Blok harus unik pada masing-masing PT penempatan.'
      ]
    },
    {
      id: 'audit',
      tabKey: 'director-field-monitor',
      title: '3. Audit Hasil Pengawas (P2H, Geotag, Solar & K3)',
      badge: 'Audit Lapangan',
      icon: ClipboardCheck,
      description: 'Halaman khusus Direktur untuk menginspeksi kepatuhan pengawas di lapangan sebelum mengesahkan laporan harian.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Pemeriksaan Hasil P2H (Pra-Operasi Harian)',
          desc: 'Cek kondisi fisik alat berat sebelum jam kerja dimulai: level oli mesin, oli hidrolik, air radiator, kebocoran selang, kelonggaran track rantai undercarriage, fungsi rem, dan ketersediaan tabung APAR.',
          tips: 'Jika ada item P2H yang dinilai "Kritis / Rusak", unit wajib dihentikan (Breakdown) hingga mekanik menyelesaikan perbaikan.'
        },
        {
          title: 'Inspeksi Galeri Geotagging Lapangan',
          desc: 'Lihat foto dokumentasi hasil kerja pengawas dengan watermark tertera: Tanggal, Jam WIB, Koordinat GPS (Latitude/Longitude), Akurasi Satelit (meter), dan Kategori Kerja (Underbrushing, Tumbang, Cincang, Rumpuk/Stacking).',
        },
        {
          title: 'Audit Penerimaan Solar Bowser Lapangan',
          desc: 'Cek bukti transfer solar dari tangki ke unit keliling (Fuel Bowser): Nomor DO Supplier, Plat Mobil Tangki, Volume Liter, dan Nama Driver.',
        },
        {
          title: 'Audit Log Insiden Lahan & Keselamatan K3',
          desc: 'Pantau catatan insiden medan berat seperti alat amblas di rawa gambut, pohon patah menimpa kanopi cabin, atau hewan liar, beserta waktu penanganan recovery (HM terbuang).',
        }
      ],
      keyRules: [
        'Foto dokumentasi tanpa tag GPS akurat akan ditandai berisiko tinggi.',
        'Unit dengan status P2H Rusak dilarang beroperasi untuk menghindari kebakaran mesin di semak belukar.'
      ]
    },
    {
      id: 'logistics',
      tabKey: 'logistics',
      title: '4. Logistik & Approval Solar BBM',
      badge: 'Material & Fuel',
      icon: Fuel,
      description: 'Manajemen pergerakan Solar Industri B35, Drum Pelumas (Mesin/Hidrolik/Transmisi), Grease Chassis, dan Suku Cadang Kritis.',
      targetRole: 'Superadmin (Approval) & Pengawas (Pengajuan)',
      steps: [
        {
          title: 'Memeriksa Permintaan Inbound (Barang Masuk)',
          desc: 'Saat pengawas menerima pasokan solar dari Pertamina/supplier, pengawas menginput transaksi penerimaan berstatus "Menunggu Persetujuan Direktur".',
        },
        {
          title: 'Otorisasi Direktur (Approve / Reject)',
          desc: 'Direktur memeriksa nomor Surat Jalan (DO), jumlah liter/unit barang, dan foto bukti fisik. Klik tombol "Setujui" (Approve) untuk menambah stok tangki induk, atau "Tolak" (Reject) jika dokumen tidak valid.',
          tips: 'Stok fisik di sistem TIDAK AKAN bertambah sebelum disetujui secara resmi oleh Direktur.'
        },
        {
          title: 'Pelacakan Pengeluaran Otomatis (Outflow)',
          desc: 'Setiap kali pengawas menginput pengisian bahan bakar alat berat di Formulir Laporan Harian atau Bowser Solar, stok tangki otomatis berkurang secara proporsional.',
        },
        {
          title: 'Pemberitahuan Stok Menipis (Threshold Alert)',
          desc: 'Bila stok solar turun di bawah 1.000 liter atau oli di bawah ambang batas minimal, sistem otomatis menampilkan lencana kuning peringatan untuk segera melakukan PO baru.',
        }
      ],
      keyRules: [
        'Transparansi Solar: Volume solar masuk wajib dicocokkan dengan flowmeter tangki dan delivery order supplier.',
        'Hanya Direktur yang memiliki tombol Setujui dan Tolak pada transaksi inbound.'
      ]
    },
    {
      id: 'reports',
      tabKey: 'reports',
      title: '5. Rekap Laporan & Otorisasi Direktur',
      badge: 'Verifikasi Laporan',
      icon: FileText,
      description: 'Daftar rekapitulasi seluruh laporan harian yang masuk dari pengawas berbagai blok kerja dengan fasilitas approval digital.',
      targetRole: 'Superadmin & Pengawas',
      steps: [
        {
          title: 'Filter Laporan Berdasarkan Klien & Blok',
          desc: 'Gunakan filter drop-down untuk memilah laporan per PT, kode blok, atau filter khusus "Hanya yang memiliki Fuel Alert".',
        },
        {
          title: 'Melihat Rincian Laporan (Detail View)',
          desc: 'Klik ikon Mata (Detail) pada baris laporan untuk meninjau rekaman jam kerja alat, kondisi cuaca, downtime hujan, nama operator, dan catatan lapangan pengawas.',
        },
        {
          title: 'Melakukan Otorisasi Direktur (Approve / Reject)',
          desc: 'Jika data valid, klik tombol "Setujui Laporan". Status berubah menjadi "Terverifikasi Direktur" lengkap dengan stempel digital waktu otorisasi. Jika data keliru, klik "Tolak" dan masukkan alasan revisi.',
          tips: 'Laporan yang telah disetujui Direktur terkunci dari pengeditan ulang oleh pengawas untuk mencegah manipulasi data.'
        },
        {
          title: 'Ekspor Data ke Spreadsheet (CSV / Excel)',
          desc: 'Klik tombol "Ekspor Excel (CSV)" untuk mengunduh seluruh data tabel dalam format spreadsheet kompatibel Microsoft Excel untuk keperluan audit akuntansi eksternal.',
        }
      ],
      keyRules: [
        'Laporan berstatus "Draft" atau "Menunggu Verifikasi" belum dapat diserahkan ke pihak Klien.',
        'Hanya laporan terverifikasi yang sah dilampirkan dalam pengajuan penagihan termin (invoicing).'
      ]
    },
    {
      id: 'pdf',
      tabKey: 'official-pdf',
      title: '6. Cetak PDF Resmi & Dokumen Berita Acara',
      badge: 'Output Cetak',
      icon: Printer,
      description: 'Penerbitan dokumen resmi berformat standar A4 berlogo PT. Suryaland Group siap cetak atau simpan ke PDF.',
      targetRole: 'Superadmin & Pengawas',
      steps: [
        {
          title: 'Pilih Laporan yang Hendak Dicetak',
          desc: 'Buka menu Cetak PDF, pilih tanggal laporan dan PT terkait dari daftar dokumen yang tersedia.',
        },
        {
          title: 'Struktur Tata Letak Dokumen Resmi',
          desc: 'Lembar PDF mencakup: Kop Surat Resmi PT. SURYALAND GROUP, Ringkasan Proyek & Blok, Tabel Jam Kerja Tiap Alat (HM Start, HM End, HM Efektif, Downtime), Konsumsi Solar & Rasio L/HM, Daftar Operator Hadir, Kondisi Cuaca, serta Dokumentasi Foto Geotagging Ber-GPS.',
        },
        {
          title: 'Kolom Tanda Tangan Pengawas & Direktur',
          desc: 'Pada bagian bawah laporan tercetak kolom tanda tangan pengawas pembuat laporan dan tanda tangan/stempel verifikasi Direktur (Superadmin).',
          tips: 'Gunakan tombol shortcut Ctrl+P atau tombol "Cetak Lembar Laporan" untuk mencetak langsung atau menyimpannya sebagai file PDF.'
        }
      ],
      keyRules: [
        'Dokumen PDF secara otomatis dioptimasi untuk kertas standar A4 vertikal tanpa terpotong.',
        'Pastikan memilih orientasi Portrait saat dialog cetak printer muncul.'
      ]
    },
    {
      id: 'users',
      tabKey: 'user-management',
      title: '7. Manajemen User',
      badge: 'Akses & Kredensial',
      icon: Users,
      description: 'Pengelolaan akun login karyawan, kredensial password, hak akses level user, jabatan, dan status aktif akun.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Menambah Pengguna Baru',
          desc: 'Klik tombol "+ Tambah Pengguna Baru", isi Nama Lengkap, Alamat, Nomor WhatsApp aktif, Email, Jabatan, Level Pengguna (Superadmin atau Pengawas), serta kredensial Username dan Password.',
        },
        {
          title: 'Otomatisasi Password Kuat (Generate)',
          desc: 'Gunakan tombol "Generate" pada form password untuk membuat kata sandi acak yang aman dan teruji standar keamanannya.',
          tips: 'Gunakan tombol "Salin" pada kartu pengguna untuk membagikan kredensial akun kepada staf yang bersangkutan.'
        },
        {
          title: 'Kelola Jabatan Kustom (Job Title)',
          desc: 'Anda dapat memilih jabatan standar atau mengetikkan nama jabatan baru di kolom Tambah Jabatan Baru untuk dimasukkan ke master opsi.',
        },
        {
          title: 'Nonaktifkan Akun Pengguna',
          desc: 'Jika seorang karyawan sedang cuti panjang, dimutasi, atau berhenti bekerja, cukup ubah statusnya menjadi "Nonaktif". Akun tersebut seketika tidak dapat login ke aplikasi.',
        }
      ],
      keyRules: [
        'Hanya Superadmin yang memiliki akses ke modul Manajemen User.',
        'Username bersifat unik dan tidak boleh ganda dengan pengguna lain.'
      ]
    },
    {
      id: 'activity',
      tabKey: 'user-activity-log',
      title: '8. Log Aktivitas & Pelacakan GPS (Audit Trail)',
      badge: 'Audit Forensik',
      icon: Activity,
      description: 'Pencatatan riwayat digital tanpa manipulasi (audit trail) untuk setiap aksi yang dilakukan oleh seluruh pengguna.',
      targetRole: 'Khusus Superadmin',
      steps: [
        {
          title: 'Memantau Aktivitas Pengguna Real-Time',
          desc: 'Setiap aksi penting (Login, Tambah Laporan, Edit Laporan, Hapus Data, Otorisasi Direktur, Tambah User) otomatis dicatat ke riwayat log.',
        },
        {
          title: 'Memeriksa Tag Lokasi Koordinat GPS',
          desc: 'Log mencatat koordinat Latitude dan Longitude saat pengawas menginput laporan di lapangan, membuktikan bahwa pengawas benar-benar berada di lokasi kerja blok perkebunan.',
        },
        {
          title: 'Filter & Pencarian Log Audit',
          desc: 'Filter log berdasarkan nama pengguna, jenis aktivitas, atau tanggal kejadian untuk investigasi cepat bila terjadi selisih solar atau ketidaksesuaian data.',
        }
      ],
      keyRules: [
        'Log aktivitas disimpan secara otomatis dan tidak dapat dihapus oleh pengawas biasa.',
        'Setiap log memuat cap waktu akurat zona Waktu Indonesia Barat (WIB).'
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
    if (activeCategory === 'core') return matchesSearch && ['overview', 'dashboard', 'master'].includes(section.id);
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
