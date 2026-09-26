import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  PlusCircle,
  HardHat,
  Fuel,
  FileText,
  Printer,
  Wifi,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Layers,
  ShieldCheck,
  Check,
  RotateCcw,
  Sparkles,
  Truck,
  Info,
  Flame,
  Wrench,
  Droplet,
  Compass,
  HelpCircle,
  PhoneCall,
  Activity,
  Award
} from 'lucide-react';
import { TabKey } from './Header';
import { AuthUser } from '../types';

interface SupervisorTutorialViewProps {
  onNavigateTab: (tab: TabKey) => void;
  authUser?: AuthUser | null;
}

interface StepItem {
  stepNumber: number;
  title: string;
  badge?: string;
  summary: string;
  details: string[];
  fieldTip: string;
  warning?: string;
}

interface SupervisorModuleSection {
  id: string;
  tabKey?: TabKey;
  numberPrefix: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  timeEstimate: string;
  keyActionLabel?: string;
  steps: StepItem[];
  practicalRules: string[];
  sampleChecklist?: string[];
}

export const SupervisorTutorialView: React.FC<SupervisorTutorialViewProps> = ({
  onNavigateTab,
  authUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'wizard': true,
    'supervisor-tools': true,
    'logistics': false,
    'reports': false,
    'official-pdf': false,
    'offline-cloud': false,
    'zero-burning-sop': false,
    'faq': false,
  });

  // Daily field SOP interactive checklist state
  const [completedDailySop, setCompletedDailySop] = useState<Record<string, boolean>>({
    'sop-1': true,
    'sop-2': true,
  });

  const toggleSopItem = (id: string) => {
    setCompletedDailySop((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    tutorialModules.forEach((m) => (allExpanded[m.id] = true));
    allExpanded['zero-burning-sop'] = true;
    allExpanded['faq'] = true;
    setExpandedSections(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed: Record<string, boolean> = {};
    tutorialModules.forEach((m) => (allCollapsed[m.id] = false));
    allCollapsed['zero-burning-sop'] = false;
    allCollapsed['faq'] = false;
    setExpandedSections(allCollapsed);
  };

  const resetSopChecklist = () => {
    setCompletedDailySop({});
  };

  // Comprehensive list of modules accessible by Field Supervisors
  const tutorialModules: SupervisorModuleSection[] = [
    {
      id: 'wizard',
      tabKey: 'wizard',
      numberPrefix: 'MODUL 1',
      title: 'Formulir Input Laporan Harian (6-Langkah Wizard)',
      badge: 'Tugas Utama Harian',
      badgeColor: 'bg-amber-500 text-slate-950',
      icon: PlusCircle,
      description: 'Panduan lengkap pengisian lembar laporan kerja harian mandor & alat berat melalui panduan bertahap (wizard) ramah sentuhan (touch-friendly) untuk kondisi lapangan.',
      timeEstimate: '5 - 10 Menit Setiap Sore (17.00 - 18.30 WIB)',
      keyActionLabel: 'Buka Form Input Laporan',
      steps: [
        {
          stepNumber: 1,
          title: 'Langkah 1: Informasi Proyek, Penugasan & Kondisi Cuaca',
          badge: 'Identitas & Cuaca',
          summary: 'Verifikasi identitas proyek kebun, tanggal kerja, shift, serta kondisi presipitasi cuaca di blok kerja.',
          details: [
            'Pilih Klien / PT Proyek: Untuk akun pengawas, PT penugasan otomatis terkunci pada perusahaan tempat Anda ditugaskan oleh Direktur.',
            'Pilih Blok Kerja: Tentukan blok penempatan aktif (misal: Blok AB, Blok A1) sesuai instruksi kerja hari ini.',
            'Kondisi Cuaca: Pilih salah satu kondisi (Cerah, Berawan, Gerimis, Hujan Lebat, atau Banjir). Data ini menjadi dasar perhitungan toleransi downtime cuaca.',
            'Nama Mandor & Shift Kerja: Tuliskan nama mandor pemegang regu dan pilih Shift Pagi (07.00 - 16.00) atau Shift Tambahan/Lembur.'
          ],
          fieldTip: 'Jika terjadi hujan lebat di siang hari yang menghentikan operasional, pastikan memilih opsi cuaca "Hujan Lebat" atau "Gerimis" agar selaras dengan downtime di Langkah 2.',
          warning: 'Pastikan kode blok yang dipilih tepat sesuai patok batas lapangan agar rekapitulasi progres hektar tidak tertukar.'
        },
        {
          stepNumber: 2,
          title: 'Langkah 2: Jam Kerja Alat Berat (HM) & Pencatatan Downtime',
          badge: 'HM & Downtime',
          summary: 'Catat pembacaan Hour Meter (HM) awal dan akhir tiap unit alat berat serta rincian jam kendala.',
          details: [
            'Hour Meter Start (Awal) & Stop (Akhir): Input angka desimal pada meteran kabin unit (contoh: 3450.0 ke 3458.5 = 8.5 Jam).',
            'Kategori Downtime Cuaca (Hujan): Masukkan berapa jam alat berhenti bekerja akibat hujan deras atau tanah terlalu licin/berlumpur.',
            'Kategori Downtime Kerusakan (Breakdown): Masukkan jam henti kerja akibat masalah teknis (selang hidrolik bocor, mesin overheat, rantai lepas).',
            'Kalkulasi Otomatis Jam Efektif: Sistem otomatis menghitung [HM Kotor - Downtime Hujan - Downtime Breakdown = Jam Kerja Efektif].'
          ],
          fieldTip: 'Selalu foto angka Hour Meter di dashboard alat berat saat pagi jam 06.45 dan sore jam 17.00 sebagai bukti fisik jika ada selisih.',
          warning: 'Total jam downtime tidak boleh melebihi selisih HM kotor. Jika terjadi demikian, sistem akan menandai baris input berwarna merah.'
        },
        {
          stepNumber: 3,
          title: 'Langkah 3: Konsumsi Bahan Bakar (BBM Solar B35) & Rasio L/HM',
          badge: 'Efisiensi BBM',
          summary: 'Catat volume pengisian solar dari tangki/bowser dan monitor indikator efisiensi konsumsi bahan bakar.',
          details: [
            'Pengisian Solar (Liter): Input jumlah liter solar industri B35 yang diisikan ke tangki alat berat dari flowmeter bowser.',
            'Jam Pengisian: Catat jam dilakukannya pengisian (misal: 06.30 sebelum kerja, atau 12.00 saat istirahat siang).',
            'Rasio Konsumsi Bahan Bakar (L/HM): Sistem otomatis menghitung konsumsi solar per jam efektif [Liter ÷ HM Efektif].',
            'Peringatan Deviasi / Boros (Fuel Alert): Jika rasio melebihi standar (Excavator > 20.0 L/HM, Bulldozer > 22.0 L/HM), sistem otomatis memunculkan peringatan kuning/merah.'
          ],
          fieldTip: 'Jika muncul notifikasi Fuel Alert akibat medan tanah berbatu keras atau rawa gambut amblas, tuliskan penjelasannya di kolom catatan agar Direktur dapat memaklumi deviasi saat verifikasi.',
        },
        {
          stepNumber: 4,
          title: 'Langkah 4: Progres Fisik Land Clearing (Metode Zero Burning)',
          badge: 'Zero Burning',
          summary: 'Laporkan luas areal (Hektar) yang telah diselesaikan berdasarkan tahapan standar perkebunan ramah lingkungan.',
          details: [
            'Target Harian (Ha): Sistem menampilkan target luas yang ditetapkan Direktur untuk blok tersebut (misal: 4.0 Ha/hari).',
            'Realisasi Hari Ini (Ha): Input capaian riil hasil pengukuran fisik patok blok (misal: 3.8 Ha).',
            'Pekerjaan Rintis Tebas (Underbrushing): Babat habis semak belukar, pakis liar, dan anakan kayu sebelum alat berat masuk.',
            'Penumbangan (Felling) & Pencincangan (Chipping): Tumbang pohon hutan searah gawangan dan potong batang maksimal panjang 4-6 meter.',
            'Perumpukan / Stacking: Rumpuk kayu dan seresah di jalur gawangan mati dengan jarak antar rumpukan 15-20 meter tanpa dibakar sama sekali.',
            'Saluran Drainase / Parit: Pembuatan parit tepi blok dan outlet air untuk menjaga stabilitas tanah gambut/mineral.'
          ],
          fieldTip: 'DILARANG KERAS membakar kayu atau sisa vegetasi apa pun. Seluruh material kayu wajib dirumpuk rapi di gawangan mati (Zero Burning Policy).',
          warning: 'Pelanggaran metode tanpa bakar dapat membatalkan kontrak kerja PT. RBS Group dengan pihak Klien perkebunan.'
        },
        {
          stepNumber: 5,
          title: 'Langkah 5: Dokumentasi Foto Lapangan Ber-Watermark GPS Otomatis',
          badge: 'Watermark Satelit',
          summary: 'Ambil foto dokumentasi hasil kerja langsung di lapangan. Sistem otomatis menyematkan stempel koordinat satelit.',
          details: [
            'Pengambilan Foto: Klik tombol kamera untuk memotret unit bekerja, rintisan jalur, atau tumpukan kayu hasil stacking.',
            'Pencetakan Watermark Otomatis: Sistem seketika mencetak teks permanen di sudut bawah foto: Tanggal, Jam WIB, Koordinat GPS Satelit (Latitude & Longitude), Akurasi Satelit (± meter), Blok, dan Nama Proyek PT.',
            'Pilihan Kategori Foto: Berikan label kategori pada tiap foto (Tebas Rintis, Tumbang Cincang, Rumpukan Kayu, Saluran Air, atau Kondisi Alat).',
            'Kapasitas Multi-Foto: Anda dapat mengunggah hingga 8 foto hasil dokumentasi lapangan per laporan harian.'
          ],
          fieldTip: 'Pastikan fitur Lokasi (GPS) pada smartphone Anda dalam posisi AKTIF dengan mode Akurasi Tinggi (High Accuracy) sebelum membuka kamera.',
          warning: 'Jangan mematikan izin lokasi browser/kamera agar koordinat satelit dapat tercetak akurat sebagai bukti otentik pengawasan lapangan.'
        },
        {
          stepNumber: 6,
          title: 'Langkah 6: Review, Catatan Khusus, Tanda Tangan & Pengiriman',
          badge: 'Tanda Tangan Digital',
          summary: 'Periksa ringkasan seluruh input, bubuhkan tanda tangan digital pengawas, dan simpan laporan ke sistem.',
          details: [
            'Ringkasan Akhir: Tinjau total HM efektif seluruh alat berat, total solar yang digunakan, dan persentase pencapaian target fisik.',
            'Catatan Khusus Lapangan: Tulis kendala medan berat, keterlambatan operator, kebutuhan suku cadang, atau arahan mandor.',
            'Tanda Tangan Digital Pengawas: Goreskan tanda tangan Anda pada kotak canvas tanda tangan yang tersedia di layar sentuh ponsel.',
            'Simpan Dokumen: Klik "Simpan Laporan". Data langsung tersimpan di memori lokal (IndexedDB) dan otomatis tersinkronisasi ke Google Cloud Firestore jika online.'
          ],
          fieldTip: 'Setelah disimpan, status laporan akan menjadi "Menunggu Verifikasi Direktur". Pengawas dapat memantau statusnya di menu Rekap Laporan.',
        }
      ],
      practicalRules: [
        'Laporan wajib diinput setiap hari sebelum pergantian shift malam (maksimal pukul 19.30 WIB).',
        'Laporan yang telah disetujui oleh Direktur akan otomatis terkunci dari pengeditan ulang.',
        'Jika bekerja di blank spot tanpa sinyal HP, laporan tetap bisa disimpan dan akan otomatis terunggah saat kembali ke camp posko.'
      ]
    },
    {
      id: 'supervisor-tools',
      tabKey: 'supervisor-tools',
      numberPrefix: 'MODUL 2',
      title: 'Fitur Cepat Lapangan (P2H, Geotag, HM Calc, Bowser & K3)',
      badge: 'Alat Operasional Harian',
      badgeColor: 'bg-emerald-500 text-slate-950',
      icon: HardHat,
      description: '5 alat cepat mandiri yang dirancang khusus untuk rutinitas pengawas di lapangan sebelum, saat, dan sesudah alat berat beroperasi.',
      timeEstimate: 'Akses Kapan Saja di Lapangan',
      keyActionLabel: 'Buka Fitur Cepat Pengawas',
      steps: [
        {
          stepNumber: 1,
          title: '1. Checklist P2H (Pemeriksaan Pra-Operasi Harian)',
          badge: 'Wajib 06.30 WIB',
          summary: 'Inspeksi 12 titik keselamatan dan kondisi mekanis unit sebelum operator menyalakan mesin setiap pagi.',
          details: [
            'Pilih Unit Alat Berat: Pilih nomor lambung alat (misal: EX-01 Caterpillar 320D, D6R-02 Komatsu D85ESS).',
            'Pemeriksaan 12 Titik Kritis: Cek Level Oli Mesin, Level Oli Hidrolik, Air Radiator & Coolant, Indikator Filter Udara, Kebocoran Hose & Silinder, Kekencangan Rantai Track Undercarriage, Tabung APAR Pemadam Api, Sabuk Pengaman Kabin, Klakson & Alarm Mundur, Lampu Kerja, Kebocoran BBM/Solar, dan Kebersihan Kabin dari material mudah terbakar.',
            'Tentukan Status Kelayakan: Beri status "Normal / Siap Operasi" jika seluruh item aman, atau "Kritis / Rusak (Breakdown)" jika ada kebocoran fatal atau rem rusak.',
            'Simpan Riwayat: Rekam riwayat P2H harian agar Direktur dapat memantau kepatuhan pemeliharaan preventif.'
          ],
          fieldTip: 'Unit dengan selang hidrolik retak atau rantai kendor DILARANG masuk ke semak rintisan untuk mencegah mesin terbakar atau terbalik.',
          warning: 'Item P2H yang dinilai "Kritis" akan otomatis memberi sinyal peringatan ke Dashboard Audit Direktur.'
        },
        {
          stepNumber: 2,
          title: '2. Smart Geotag Camera Mandiri',
          badge: 'Foto Cepat Ber-GPS',
          summary: 'Kamera foto mandiri dengan cap otomatis tanggal, jam WIB, dan koordinat satelit tanpa perlu membuat laporan penuh.',
          details: [
            'Pengambilan Instan: Berguna untuk memotret temuan khusus seperti patok batas kebun, kondisi pohon roboh, kayu besar yang perlu chainsaw, atau ban bocor.',
            'Informasi Watermark Tersemat: Waktu real-time, koordinat lintang/bujur (Latitude/Longitude desimal), estimasi akurasi satelit (misal ±3 meter), dan nama penugasan PT.',
            'Simpan ke Galeri & Ekspor: Foto yang diambil dapat disimpan ke memori HP atau diunduh untuk dikirimkan via WhatsApp ke Direktur atau Mandor.'
          ],
          fieldTip: 'Gunakan fitur ini jika Direktur meminta bukti visual cepat saat inspeksi mendadak melalui grup koordinasi lapangan.',
        },
        {
          stepNumber: 3,
          title: '3. Kalkulator Hour Meter (HM) & Efisiensi Bahan Bakar',
          badge: 'Hitung Cepat Lapangan',
          summary: 'Simulasi kalkulasi selisih jam kerja, pengelompokan downtime cuaca vs mesin, dan pengecekan rasio L/HM sebelum dicatat.',
          details: [
            'Input HM Awal & Akhir: Menghitung selisih jam total operasional alat berat secara instan.',
            'Input Jam Henti (Downtime): Masukkan durasi hujan lebat dan durasi perbaikan mekanik di lapangan.',
            'Hitung Rasio BBM: Masukkan rencana liter solar yang diisikan, dan kalkulator langsung menampilkan nilai Rasio L/HM beserta status indikator (Efisien / Standar / Boros).',
            'Tombol Terapkan ke Laporan: Anda dapat langsung menyalin angka hasil perhitungan ke Formulir Laporan Harian.'
          ],
          fieldTip: 'Gunakan kalkulator ini saat operator mengklaim jam kerja berlebih, untuk mencocokkan dengan catatan jam kerja mandor tebas.',
        },
        {
          stepNumber: 4,
          title: '4. Catatan Penerimaan Solar Bowser Lapangan',
          badge: 'Distribusi BBM Mobil',
          summary: 'Pencatatan pengisian bahan bakar unit bergerak (Fuel Bowser Truck) yang mengantarkan solar langsung ke tengah blok perkebunan.',
          details: [
            'Nomor Surat Jalan / DO: Catat nomor bukti pengiriman solar dari supplier atau posko induk.',
            'Volume Pengisian: Catat angka flowmeter sebelum dan sesudah solar dipompakan ke tangki alat berat.',
            'Identitas Pengemudi & Alat: Catat nama driver bowser serta nomor lambung alat berat yang menerima pengisian.',
            'Foto Bukti Pengisian: Ambil foto nomor meteran bowser dengan watermark GPS sebagai arsip pertanggungjawaban BBM.'
          ],
          fieldTip: 'Pastikan flowmeter bowser selalu dikalibrasi pada angka nol (zeroing) sebelum membuka nozzle pengisian solar.',
        },
        {
          stepNumber: 5,
          title: '5. Log Insiden Lahan & Keselamatan K3',
          badge: 'Keselamatan & Darurat',
          summary: 'Pencatatan insiden khusus lapangan seperti unit amblas di rawa gambut, pohon patah menimpa kanopi cabin, atau sengatan lebah liar.',
          details: [
            'Kategori Insiden: Pilih jenis insiden (Unit Amblas Gambut, Tabrakan/Benturan Kayu, Kebakaran Semak, Bahaya Satwa/Sengatan, Kerusakan Struktur Tanggul).',
            'Tingkat Keparahan (Severity): Ringan (Downtime < 1 Jam), Sedang (Downtime 1-4 Jam), atau Kritis (Butuh unit lain untuk penarikan/winch).',
            'Tindakan Pemulihan (Recovery): Tulis kronologi penanganan, apakah membutuhkan bantuan unit Excavator lain atau mekanik darurat.',
            'HM Terbuang: Catat berapa jam produktivitas alat berat yang hilang akibat insiden tersebut.'
          ],
          fieldTip: 'Jika unit amblas di gambut basah, DILARANG memaksakan putaran track shoe karena akan membuat alat semakin tenggelam. Segera buat log insiden dan koordinasikan unit penolong.',
          warning: 'Setiap insiden K3 otomatis terekam ke sistem audit Direktur untuk evaluasi SOP keselamatan kerja.'
        }
      ],
      practicalRules: [
        'P2H wajib dilakukan setiap hari sebelum jam kerja dimulai (maksimal pukul 07.00 WIB).',
        'Foto geotagging harus diambil di lokasi terbuka dengan akurasi GPS satelit maksimal 15 meter.',
        'Insiden keselamatan berat wajib dicatat pada hari yang sama agar tercatat resmi dalam Berita Acara.'
      ]
    },
    {
      id: 'logistics',
      tabKey: 'logistics',
      numberPrefix: 'MODUL 3',
      title: 'Logistik & Tangki Solar Lapangan (Inbound & Outflow)',
      badge: 'BBM & Material',
      badgeColor: 'bg-blue-500 text-white',
      icon: Fuel,
      description: 'Monitoring persediaan Solar Industri B35 pada tangki posko/pangkalan kebun, pencatatan pasokan masuk dari supplier, dan alur persetujuan resmi Direktur.',
      timeEstimate: 'Saat Mobil Tangki Supplier Datang',
      keyActionLabel: 'Buka Logistik & BBM',
      steps: [
        {
          stepNumber: 1,
          title: '1. Memantau Sisa Stok Tangki Lapangan & Pelumas',
          badge: 'Stok Terkini',
          summary: 'Lihat status volume riil Solar Industri B35, drum oli mesin SAE 15W-40, drum oli hidrolik ISO VG 68, dan gemuk chassis.',
          details: [
            'Kartu Saldo Solar: Menampilkan sisa liter solar di tangki pangkalan posko (kapasitas 10.000 L).',
            'Indikator Ambang Batas (Threshold Warning): Jika stok solar berada di bawah 1.000 liter atau drum oli menipis, sistem akan menampilkan lencana kuning peringatan "Stok Kritis".',
            'Riwayat Pengeluaran (Outflow): Setiap pengisian solar yang dicatat di form laporan harian otomatis mengurangi volume sisa di tangki.'
          ],
          fieldTip: 'Lakukan pengukuran fisik celup (dipstick) tangki posko setiap sore untuk memverifikasi kesesuaian antara saldo sistem dengan volume fisik di lapangan.',
        },
        {
          stepNumber: 2,
          title: '2. Mengajukan Penerimaan Solar Masuk (Inbound Delivery)',
          badge: 'Barang Masuk',
          summary: 'Saat mobil tangki Pertamina / agen rekanan mengantar solar ke posko kebun, pengawas wajib menginput bukti penerimaan.',
          details: [
            'Klik Tombol "+ Catat Solar / Barang Masuk": Buka form penerimaan stok masuk.',
            'Pilih Kategori: Pilih "BBM" (Solar Industri B35) atau "Pelumas" (Oli Mesin, Oli Hidrolik, Grease).',
            'Input Volume Liter: Masukkan jumlah liter yang diterima sesuai angka flowmeter pengisian tangki.',
            'Nomor Delivery Order (DO) & PO: Masukkan nomor Surat Jalan resmi dari sopir tangki dan nomor PO perusahaan.',
            'Nama Sopir & Plat Nomor Truk Tangki: Masukkan identitas pengantar dan armada tangki pengangkut.',
            'Foto Bukti Fisik Surat Jalan: Unggah foto Surat Jalan bertanda tangan sopir dan pengawas lapangan.'
          ],
          fieldTip: 'Pastikan mengambil sampel solar dalam botol bening untuk memeriksa kejernihan BBM (bebas air dan lumpur) sebelum kran tangki dibongkar.',
        },
        {
          stepNumber: 3,
          title: '3. Memahami Alur Persetujuan Direktur (Approval Inbound)',
          badge: 'Wewenang Direktur',
          summary: 'Stok fisik di sistem baru akan bertambah setelah transaksi penerimaan disetujui secara resmi oleh Direktur.',
          details: [
            'Status "Menunggu Persetujuan Direktur": Setelah pengawas menyimpan data penerimaan solar, status awal adalah Pending Approval.',
            'Verifikasi Dokumen oleh Direktur: Direktur akan meninjau nomor DO, kesesuaian liter PO, dan foto bukti fisik dari kantor pusat.',
            'Status "Disetujui" (Approved): Begitu Direktur menyetujui, volume tangki posko otomatis bertambah dan tercatat di buku besar akuntansi.',
            'Status "Ditolak" (Rejected): Jika surat jalan blur atau jumlah liter tidak cocok, Direktur akan menolak dengan menyertakan alasan revisi.'
          ],
          fieldTip: 'Pengawas tidak memiliki tombol "Setujui/Tolak". Tombol otorisasi tersebut hanya muncul pada akun Direktur (Superadmin).',
          warning: 'Jangan mencampur adukkan solar industri non-subsidi dengan solar subsidi karena melanggar kepatuhan hukum proyek PT. RBS Group.'
        }
      ],
      practicalRules: [
        'Setiap liter solar masuk wajib disertai foto Surat Jalan (DO) sah dari supplier.',
        'Stok tangki solar tidak akan bertambah sebelum disahkan oleh Direktur via sistem.',
        'Pengawas wajib segera menginput penerimaan solar maksimal 2 jam setelah pembongkaran mobil tangki selesai.'
      ]
    },
    {
      id: 'reports',
      tabKey: 'reports',
      numberPrefix: 'MODUL 4',
      title: 'Rekap Laporan & Status Approval Direktur',
      badge: 'Arsip & Verifikasi',
      badgeColor: 'bg-violet-500 text-white',
      icon: FileText,
      description: 'Memantau arsip seluruh laporan harian yang telah dikirimkan, memeriksa catatan koreksi Direktur, dan memahami pembatasan akses data isolasi.',
      timeEstimate: 'Pengecekan Harian',
      keyActionLabel: 'Buka Rekap Laporan',
      steps: [
        {
          stepNumber: 1,
          title: '1. Pembatasan Akses Data Pengawas (Data Isolation)',
          badge: 'Keamanan Data',
          summary: 'Sistem melindungi privasi proyek dengan memastikan pengawas hanya melihat laporan milik PT dan blok penugasannya.',
          details: [
            'Isolasi Otomatis: Anda hanya akan melihat baris laporan untuk PT Klien tempat Anda ditugaskan (misal: PT. A). Laporan milik PT. B atau PT. D tidak akan tampil.',
            'Filter Blok Kerja: Gunakan dropdown filter blok untuk melihat riwayat pengerjaan pada petak blok tertentu (misal: Blok AB).',
            'Pencarian Cepat: Cari laporan berdasarkan tanggal kerja, nama mandor, atau nomor registrasi laporan.'
          ],
          fieldTip: 'Jika Anda ditugaskan ke blok baru oleh Direktur, blok tersebut akan langsung muncul pada daftar filter Anda.',
        },
        {
          stepNumber: 2,
          title: '2. Membaca Status Dokumen Laporan Harian',
          badge: 'Arti Status',
          summary: 'Kenali 3 status penting pada setiap baris laporan yang Anda kirimkan:',
          details: [
            '🟡 Menunggu Verifikasi Direktur (Pending): Laporan baru berhasil diinput dan tersimpan di sistem, sedang menunggu audit dan otorisasi Direktur.',
            '🟢 Terverifikasi Direktur (Approved): Laporan telah disahkan resmi oleh Direktur lengkap dengan stempel tanggal otorisasi. Laporan ini terkunci dari pengeditan ulang.',
            '🔴 Perlu Revisi / Ditolak (Rejected): Laporan dikembalikan oleh Direktur karena terdapat ketidakcocokan data HM, downtime tidak wajar, atau foto tidak jelas.'
          ],
          fieldTip: 'Jika laporan berstatus "Perlu Revisi", klik tombol Mata (Detail) untuk membaca Catatan Koreksi Direktur.',
          warning: 'Laporan yang telah disetujui (Approved) tidak dapat diubah maupun dihapus oleh pengawas untuk menjaga keabsahan audit.'
        },
        {
          stepNumber: 3,
          title: '3. Melihat Rincian Dokumen & Menghapus Laporan Salah',
          badge: 'Detail Laporan',
          summary: 'Buka modal detail untuk meninjau rekaman jam alat berat, foto ber-watermark, dan opsi hapus jika terjadi kesalahan input.',
          details: [
            'Ikon Mata (Lihat Detail): Menampilkan lembar rincian lengkap: jam kerja alat, rasio solar, daftar operator yang hadir, dan galeri foto.',
            'Catatan Koreksi Direktur: Jika status ditolak, kotak peringatan merah di detail laporan akan menampilkan catatan khusus dari Direktur.',
            'Menghapus Laporan (Ikon Tong Sampah): Pengawas hanya diizinkan menghapus laporan yang berstatus Draft / Menunggu Verifikasi jika terjadi kesalahan input ganda.',
            'Tombol Cetak PDF: Klik ikon printer untuk membuka lembar format resmi siap cetak.'
          ],
          fieldTip: 'Sebelum menghapus laporan yang salah, pastikan Anda telah mencatat kembali jam HM agar tidak lupa saat membuat laporan pengganti.',
        }
      ],
      practicalRules: [
        'Pengawas dilarang meminjamkan akun kepada pengawas dari PT lain.',
        'Laporan yang ditolak Direktur wajib diperbaiki dan dikirim ulang pada hari yang sama.',
        'Hanya laporan yang berstatus Terverifikasi Direktur yang sah digunakan untuk klaim penagihan ke Klien.'
      ]
    },
    {
      id: 'official-pdf',
      tabKey: 'official-pdf',
      numberPrefix: 'MODUL 5',
      title: 'Cetak Lembar Laporan Resmi (Official PDF)',
      badge: 'Format Standar A4',
      badgeColor: 'bg-slate-800 text-amber-400',
      icon: Printer,
      description: 'Penerbitan dokumen resmi Berita Acara Harian Land Clearing berlogo PT. RBS GROUP siap cetak atau disimpan dalam format PDF.',
      timeEstimate: '2 Menit untuk Unduh / Cetak',
      keyActionLabel: 'Buka Cetak PDF Resmi',
      steps: [
        {
          stepNumber: 1,
          title: '1. Memilih Dokumen Laporan yang Hendak Dicetak',
          badge: 'Pemilihan Laporan',
          summary: 'Buka menu Cetak PDF, pilih tanggal kerja laporan yang ingin diterbitkan lembar resminya.',
          details: [
            'Dropdown Pemilih Laporan: Pilih tanggal laporan dari riwayat laporan yang tersedia.',
            'Verifikasi Status: Pastikan laporan yang dipilih idealnya telah berstatus "Disetujui Direktur" agar stempel otorisasi resmi tertera di bagian tanda tangan.',
            'Preview Instan: Layar menampilkan lembar pratinjau dokumen persis seperti yang akan keluar dari mesin printer.'
          ],
          fieldTip: 'Jika membutuhkan printout cepat untuk rapat sore di posko sebelum Direktur sempat approval, laporan pending tetap bisa dipratinjau dengan tanda tangan pengawas.',
        },
        {
          stepNumber: 2,
          title: '2. Susunan Struktur Tata Letak Dokumen Berita Acara',
          badge: 'Standar Dokumen',
          summary: 'Format dokumen telah dirancang memenuhi standar teknis audit perkebunan dan perusahaan kehutanan nasional:',
          details: [
            'Header & Kop Surat Resmi: Logo resmi PT. RBS GROUP, alamat kantor pusat, nomor registrasi dokumen, dan nomor SPK kontrak.',
            'Tabel Jam Operasional Alat Berat: Nomor Seri Unit, Nama Operator, HM Start, HM Stop, HM Kotor, Downtime Hujan, Downtime Breakdown, dan HM Efektif.',
            'Ringkasan Efisiensi Bahan Bakar: Total konsumsi liter solar B35, jam pengisian, dan Rasio L/HM tiap alat berat.',
            'Tabel Progres Fisik: Hektar realisasi per tahapan (Rintis, Tumbang, Cincang, Rumpuk Gawangan, Parit Drainase) vs Target Harian.',
            'Lampiran Dokumentasi Foto: Foto ber-watermark GPS satelit, tanggal, jam WIB, dan kategori pekerjaan.',
            'Kolom Pengesahan Tanda Tangan: Tanda tangan digital Pengawas Lapangan pembuat dokumen dan stempel verifikasi Direktur.'
          ],
          fieldTip: 'Gunakan kertas ukuran A4 dengan orientasi Portrait saat dialog cetak printer muncul.',
        },
        {
          stepNumber: 3,
          title: '3. Menyimpan File PDF atau Mencetak Fisik',
          badge: 'Download / Print',
          summary: 'Cara mengunduh file ke memori smartphone/laptop atau mencetak via printer posko kebun.',
          details: [
            'Tombol "Cetak / Simpan PDF": Klik tombol oranye di sudut atas halaman.',
            'Pilihan "Save as PDF": Pada menu printer browser, ubah tujuan (Destination) menjadi "Save as PDF" / "Simpan sebagai PDF".',
            'Pengaturan Skala (Scale): Pilih opsi "Fit to printable area" atau Skala 100% agar tabel rapi dan tidak terpotong tepi halaman.',
            'Kirim via WhatsApp / Email: File PDF hasil unduhan dapat langsung dikirimkan ke perwakilan Klien atau pengawas kebun.'
          ],
          fieldTip: 'Jika mencetak dari ponsel Android menggunakan kabel OTG atau WiFi Direct ke printer posko, pilih opsi ukuran kertas A4.',
        }
      ],
      practicalRules: [
        'Dokumen resmi ini bersifat rahasia perusahaan PT. RBS Group.',
        'Hanya serahkan salinan PDF kepada perwakilan resmi Klien perkebunan yang berwenang.',
        'Simpan satu salinan cetak fisik di binder posko lapangan sebagai arsip bukti kerja mandor.'
      ]
    },
    {
      id: 'offline-cloud',
      numberPrefix: 'MODUL 6',
      title: 'Operasional Mode Lahan (Offline-First) & Sinkronisasi Cloud',
      badge: 'Teknologi Lapangan',
      badgeColor: 'bg-emerald-600 text-white',
      icon: Wifi,
      description: 'Panduan bekerja tanpa gangguan di tengah blok hutan/perkebunan pelosok yang tidak memiliki jangkauan sinyal internet seluler.',
      timeEstimate: 'Otomatis Bekerja 24 Jam',
      steps: [
        {
          stepNumber: 1,
          title: '1. Arsitektur Offline-First (Tetap Berjalan Tanpa Sinyal)',
          badge: 'Anti Blank Spot',
          summary: 'Aplikasi RBS dirancang khusus untuk kondisi ekstrem perkebunan Indonesia:',
          details: [
            'Penyimpanan Lokal Mandiri: Saat berada di tengah hutan tanpa sinyal 4G/Edge, seluruh form laporan harian, checklist P2H, kalkulator HM, dan foto watermark tetap dapat diisi dan disimpan secara normal.',
            'Basis Data IndexedDB: Data tersimpan secara terenkripsi di dalam memori penyimpanan browser smartphone pengawas.',
            'Tidak Ada Data Hilang: Tidak perlu khawatir kehabisan kuota atau hilang sinyal saat sedang mengetik laporan.'
          ],
          fieldTip: 'Buka aplikasi terlebih dahulu saat masih berada di camp posko yang ada sinyal sebelum berangkat ke petak blok pengerjaan.',
        },
        {
          stepNumber: 2,
          title: '2. Memahami Indikator Status di Header Atas',
          badge: 'Indikator Status',
          summary: 'Perhatikan tombol status koneksi di bilah navigasi atas layar:',
          details: [
            '🟢 Cloud Synced (Hijau): Terhubung ke Google Cloud Firestore. Setiap data yang disimpan langsung terunggah secara real-time ke laptop Direktur.',
            '🟡 Offline Lahan (Kuning): Sedang bekerja dalam mode penyimpanan lokal offline perangkat. Tombol ini juga dapat diklik manual untuk simulasi uji coba.',
            'Badge Angka Antrean (Pending Sync): Menampilkan berapa jumlah dokumen atau foto yang tersimpan lokal dan sedang menunggu sinyal untuk terunggah.'
          ],
          fieldTip: 'Jika badge antrean menunjukkan angka (misal: "2"), artinya ada 2 dokumen yang menunggu diunggah saat Anda kembali ke camp.',
        },
        {
          stepNumber: 3,
          title: '3. Proses Auto-Sinkronisasi Saat Kembali ke Posko / Camp',
          badge: 'Otomatis Unggah',
          summary: 'Begitu ponsel pengawas mendeteksi sinyal WiFi posko atau 4G seluler di sore hari:',
          details: [
            'Auto-Upload Latar Belakang: Sistem secara otomatis mengunggah seluruh antrean laporan, checklist P2H, dan foto ber-watermark ke Cloud.',
            'Notifikasi Berhasil: Muncul pesan hijau "Data berhasil disinkronkan ke Cloud Firestore".',
            'Stempel Waktu Asli Terjaga: Waktu pencatatan laporan yang terunggah tetap mengacu pada jam saat pengawas menginput di lapangan, bukan jam saat sinyal tersambung.'
          ],
          fieldTip: 'Saat tiba di posko sore hari, cukup sambungkan ponsel ke WiFi camp posko dan buka aplikasi sebentar agar proses sinkronisasi tuntas.',
          warning: 'PERINGATAN KERAS: DILARANG melakukan "Hapus Data Browser (Clear Site Data / Cookies)" pada browser ponsel saat masih ada antrean offline pending, karena dapat menghapus laporan lokal.'
        }
      ],
      practicalRules: [
        'Aplikasi tidak memerlukan instalasi aplikasi tambahan, cukup simpan pintasan (Add to Home Screen) di Google Chrome.',
        'Pastikan baterai smartphone terisi penuh atau bawa power bank saat berangkat ke blok lahan terpencil.',
        'Sebelum tidur di posko, pastikan indikator status di header telah berubah menjadi hijau "Cloud Synced".'
      ]
    },
    {
      id: 'zero-burning-sop',
      numberPrefix: 'PANDUAN KHUSUS',
      title: 'SOP Kepatuhan Lapangan & Metode Zero Burning (Tanpa Bakar)',
      badge: 'Regulasi Lingkungan & K3',
      badgeColor: 'bg-amber-600 text-white',
      icon: Flame,
      description: 'Ketentuan mutlak operasional pembukaan lahan perkebunan kelapa sawit PT. RBS GROUP yang wajib ditaati oleh seluruh Pengawas Lapangan.',
      timeEstimate: 'Wajib Dipatuhi Setiap Hari',
      steps: [
        {
          stepNumber: 1,
          title: '1. Larangan Mutlak Pembakaran Lahan (Zero Burning Policy)',
          badge: 'Hukum & Lingkungan',
          summary: 'PT. RBS Group berkomitmen pada kepatuhan RSPO/ISPO dan regulasi Kementerian Lingkungan Hidup dan Kehutanan (KLHK):',
          details: [
            'Dilarang Membakar: Dilarang keras menyulut api sekecil apa pun untuk membersihkan semak belukar, cabang kayu, atau seresah.',
            'Sanksi Tegas: Pelanggaran pembakaran lahan merupakan tindak pidana dan sanksi pemutusan hubungan kerja seketika.',
            'Penyiapan Jalur Rumpukan: Seluruh kayu hasil penebangan wajib dirumpuk (stacking) memanjang pada gawangan mati dengan jarak antar tumpukan 15-20 meter sejajar kontur lahan.'
          ],
          fieldTip: 'Rumpukan kayu di gawangan mati dibiarkan melapuk secara alami menjadi kompos penyubur tanah (organik mulching).',
        },
        {
          stepNumber: 2,
          title: '2. Tahapan Teknis Land Clearing Ramah Lingkungan',
          badge: 'Urutan Kerja',
          summary: 'Urutan baku pekerjaan lapangan yang wajib diawasi oleh pengawas:',
          details: [
            'Tahap 1 - Underbrushing (Rintis Tebas): Mandor dan regu tebas membabat vegetasi bawah (semak liar, pakis, anak kayu diameter < 10 cm).',
            'Tahap 2 - Felling (Penumbangan): Operator Excavator / Chainsaw menumbangkan pohon searah jalur rumpukan agar memudahkan proses berikutnya.',
            'Tahap 3 - Bucking & Chipping (Pencincangan): Batang kayu besar dipotong-potong sepanjang 4 - 6 meter agar mudah didorong dan tidak menghalangi jalan alat.',
            'Tahap 4 - Stacking (Perumpukan Rapi): Bulldozer merumpuk sisa kayu ke jalur gawangan mati dengan kerapian tinggi, meninggalkan jalur tanam yang bersih.',
            'Tahap 5 - Drainage & Parit: Pembuatan parit perimeter (keliling), saluran kolektor, dan saluran drainase air untuk pencegahan banjir dan penurunan muka air gambut.'
          ],
          fieldTip: 'Pastikan jalur rintis tebas bersih sebelum unit Excavator masuk untuk mencegah kayu menusuk ke radiator atau kabin operator.',
        },
        {
          stepNumber: 3,
          title: '3. Ambang Batas Efisiensi BBM & Jam Kerja Alat Berat',
          badge: 'Standar Teknis',
          summary: 'Toleransi konsumsi bahan bakar yang diaudit ketat oleh Direktur:',
          details: [
            'Excavator Kelas 20 Ton (Komatsu PC200 / CAT 320D): Konsumsi bahan bakar wajar adalah 16.0 - 20.0 Liter/HM.',
            'Bulldozer Kelas 15-20 Ton (Komatsu D65 / D85 / CAT D6R): Konsumsi bahan bakar wajar adalah 18.0 - 22.0 Liter/HM.',
            'Motor Grader & Vibro Roller: Konsumsi bahan bakar wajar adalah 12.0 - 15.0 Liter/HM.',
            'Pencegahan Penyusupan / Penggelapan Solar: Selalu segel kran tangki bowser dan cocokkan pembacaan flowmeter harian dengan total HM efektif seluruh alat.'
          ],
          fieldTip: 'Jika tanah berlumpur dalam menyebabkan rasio BBM naik hingga 23 L/HM, catat secara rinci di kolom catatan khusus laporan agar diakui Direktur.',
        }
      ],
      practicalRules: [
        'Dilarang merokok di area semak rintisan kering yang berpotensi memicu percikan api.',
        'Wajib melengkapi setiap alat berat dengan 1 unit tabung APAR serbuk kimia kering 6 Kg aktif.',
        'Setiap pekerja lapangan wajib mengenakan APD lengkap: Helm Safety, Sepatu Boot Sol Baja, dan Rompi Reflektor.'
      ]
    }
  ];

  // Daily Routine SOP items for Field Supervisor
  const dailySopRoutine = [
    {
      id: 'sop-1',
      time: '06.30 - 07.00 WIB',
      title: 'Pemeriksaan Pra-Operasi (P2H)',
      desc: 'Inspeksi 12 titik kritis alat berat (oli, radiator, hose, track, APAR) & catat di menu Fitur Cepat P2H.',
      tab: 'supervisor-tools' as TabKey,
    },
    {
      id: 'sop-2',
      time: '07.00 - 07.15 WIB',
      title: 'Safety Toolbox Meeting (K3) & Penugasan Blok',
      desc: 'Briefing operator & mandor tebas, ingatkan Zero Burning, cek kelengkapan APD & pembagian jalur gawangan.',
    },
    {
      id: 'sop-3',
      time: '07.15 WIB',
      title: 'Catat Hour Meter (HM) Awal Seluruh Alat',
      desc: 'Foto dan catat angka HM awal pada kabin unit Excavator, Bulldozer, dan Dump Truck sebelum mulai kerja.',
      tab: 'supervisor-tools' as TabKey,
    },
    {
      id: 'sop-4',
      time: '12.00 - 13.00 WIB',
      title: 'Pengawasan Pengisian BBM Solar Bowser',
      desc: 'Catat liter solar yang diisikan flowmeter bowser & periksa apakah ada insiden amblas atau downtime.',
      tab: 'supervisor-tools' as TabKey,
    },
    {
      id: 'sop-5',
      time: '16.45 - 17.15 WIB',
      title: 'Catat HM Akhir & Ambil Foto Geotagging Ber-GPS',
      desc: 'Catat HM stop, periksa hasil hektar tebas/rumpukan, dan foto bukti lapangan dengan Smart Geotag Camera.',
      tab: 'supervisor-tools' as TabKey,
    },
    {
      id: 'sop-6',
      time: '17.30 - 18.30 WIB',
      title: 'Input & Simpan Formulir Laporan Harian (Wizard)',
      desc: 'Input form 6-langkah di aplikasi, bubuhkan tanda tangan digital pengawas, dan simpan (offline/online).',
      tab: 'wizard' as TabKey,
    },
    {
      id: 'sop-7',
      time: '19.00 - 20.00 WIB',
      title: 'Sinkronisasi Data di Posko Camp & Cek Status Direktur',
      desc: 'Sambungkan ponsel ke WiFi camp posko, pastikan status "Cloud Synced", dan cek tanggapan approval Direktur.',
      tab: 'reports' as TabKey,
    },
  ];

  // Frequently Asked Field Questions (FAQ)
  const fieldFaqList = [
    {
      q: 'Bagaimana jika sinyal internet hilang sama sekali di petak kebun?',
      a: 'Aplikasi RBS dirancang dengan teknologi Offline-First. Anda tetap dapat membuka formulir laporan, checklist P2H, kalkulator HM, dan mengambil foto ber-watermark. Semua data tersimpan aman di memori HP. Saat Anda kembali ke camp posko yang ada WiFi/4G, sistem akan otomatis mengunggah seluruh antrean data ke Cloud Firestore.'
    },
    {
      q: 'Mengapa GPS pada foto tidak akurat atau muncul koordinat default?',
      a: 'Pastikan fitur Lokasi (GPS) di smartphone Anda telah dinyalakan dengan mode Akurasi Tinggi (High Accuracy). Saat berada di bawah pohon kanopi hutan yang sangat rimbun, satelit GPS membutuhkan waktu 5-10 detik untuk mengunci posisi. Bergeserlah sedikit ke area rintisan yang lebih terbuka lalu klik tombol "Segarkan GPS".'
    },
    {
      q: 'Apa yang harus dilakukan jika terjadi hujan deras di siang hari?',
      a: 'Operasional wajib dihentikan sementara demi keselamatan alat dan mencegah tanah rusak parah. Di Langkah 1 Laporan Harian, pilih cuaca "Hujan Lebat". Pada Langkah 2, catat durasi berhentinya alat di kolom "Downtime Cuaca (Hujan)". Sistem akan otomatis memotong jam henti tersebut dari jam kerja efektif.'
    },
    {
      q: 'Mengapa muncul peringatan kuning/merah "Fuel Alert" saat input solar?',
      a: 'Peringatan deviasi bahan bakar muncul otomatis jika rasio konsumsi solar melebihi batas wajar pabrik (Excavator > 20 L/HM, Bulldozer > 22 L/HM). Jika ini disebabkan medan berbatu, tanah rawa berat, atau alat amblas, cukup jelaskan kondisi tersebut pada kolom "Catatan Khusus Lapangan" di Langkah 6 agar Direktur dapat memverifikasinya dengan baik.'
    },
    {
      q: 'Laporan saya berstatus "Perlu Revisi / Ditolak" oleh Direktur, apa yang harus saya lakukan?',
      a: 'Buka menu "Rekap Laporan", cari laporan yang berstatus ditolak, lalu klik tombol Mata (Detail). Baca catatan koreksi dari Direktur yang tertera di kotak merah (misal: "HM akhir tidak cocok dengan P2H" atau "lampirkan foto gawangan"). Buat laporan koreksi yang sesuai dan kirimkan kembali.'
    },
    {
      q: 'Apakah saya bisa melihat laporan dari pengawas di PT perkebunan lain?',
      a: 'Tidak. Sistem menerapkan Data Isolation ketat demi kerahasiaan kontrak klien. Akun Pengawas Anda dikunci khusus hanya untuk PT dan blok penugasan Anda. Anda tidak dapat melihat atau mengubah data milik PT lain.'
    },
    {
      q: 'Kapan laporan harian paling lambat harus dikirimkan?',
      a: 'Laporan harian wajib disimpan maksimal pukul 19.30 WIB setiap sore agar Direktur dapat memeriksa rekapitulasi progres dan efisiensi BBM pada malam hari sebelum rapat evaluasi esok pagi.'
    }
  ];

  // Filter sections by search query and category
  const filteredModules = tutorialModules.filter((module) => {
    const matchesSearch =
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.steps.some(
        (st) =>
          st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          st.details.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()))
      ) ||
      module.practicalRules.some((pr) => pr.toLowerCase().includes(searchQuery.toLowerCase()));

    if (activeCategory === 'all') return matchesSearch;
    if (activeCategory === 'wizard') return matchesSearch && module.id === 'wizard';
    if (activeCategory === 'tools') return matchesSearch && module.id === 'supervisor-tools';
    if (activeCategory === 'logistics') return matchesSearch && module.id === 'logistics';
    if (activeCategory === 'reports') return matchesSearch && (module.id === 'reports' || module.id === 'official-pdf');
    if (activeCategory === 'offline') return matchesSearch && (module.id === 'offline-cloud' || module.id === 'zero-burning-sop');
    return matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto py-5 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Top Welcome & Context Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-amber-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-52 h-52 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1.5 shadow-md">
                <HardHat className="w-3.5 h-3.5" />
                Khusus Pengawas Lapangan
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800/90 text-amber-300 border border-slate-700 flex items-center gap-1">
                <Compass className="w-3 h-3 text-amber-400" />
                SOP Zero Burning & Panduan Terpadu
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-400" />
                Offline-First Ready
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Buku Panduan & Tutorial Pengawas Lapangan
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Panduan operasional praktis bagi Pengawas Lapangan PT. RBS GROUP untuk penginputan Laporan Harian 6-Langkah, inspeksi P2H alat berat, foto geotagging GPS satelit, kalkulator HM/solar, penerimaan BBM tangki, serta penanganan mode offline di perkebunan pelosok.
            </p>

            {/* Supervisor Assignment Callout */}
            {authUser && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 border border-amber-500/40 text-xs">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300">
                  Akun Anda: <strong className="text-white">{authUser.displayName || authUser.username}</strong>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-amber-300 font-semibold">
                  Penugasan: {authUser.assignedClientName || 'PT. Proyek Penempatan'}
                </span>
                {authUser.assignedBlockCodes && authUser.assignedBlockCodes.length > 0 && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-200 font-mono text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded">
                      {authUser.assignedBlockCodes.join(', ')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick Jump Action Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('wizard')}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all duration-200 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 cursor-pointer text-left"
            >
              <div className="p-2 rounded-xl bg-slate-950/20 text-slate-950">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-xs">Mulai Input Laporan</div>
                <div className="text-[10px] text-slate-900/80 font-semibold">Form 6-Langkah Lapangan</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('supervisor-tools')}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer text-left"
            >
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <HardHat className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-white">Buka Fitur Cepat</div>
                <div className="text-[10px] text-slate-400 font-medium">P2H, Geotag, HM, K3</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Field Supervisor Daily SOP Checklist Widget */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Alur Kerja Rutin Harian Pengawas (Interactive Checklist)
              </h2>
              <p className="text-xs text-slate-500">
                Tandai checklist langkah kerja harian dari jam 06.30 pagi hingga 20.00 malam di lapangan kebun.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {Object.values(completedDailySop).filter(Boolean).length} / {dailySopRoutine.length} Selesai
            </span>
            <button
              type="button"
              onClick={resetSopChecklist}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Reset Checklist
            </button>
          </div>
        </div>

        {/* Routine Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {dailySopRoutine.map((item, idx) => {
            const isChecked = !!completedDailySop[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleSopItem(item.id)}
                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isChecked
                    ? 'bg-emerald-50/80 border-emerald-200 text-slate-900 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {item.time}
                    </span>
                    <span className="text-[10px] font-black text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                    isChecked
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300 text-transparent hover:border-emerald-500'
                  }`}>
                    <Check className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div>
                  <h4 className={`text-xs font-bold leading-snug ${isChecked ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {item.tab && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab(item.tab!);
                    }}
                    className="self-start text-[10px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 mt-1 hover:underline cursor-pointer"
                  >
                    <span>Akses Fitur Terkait</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci (misal: solar, p2h, jam kerja, watermark, downtime, zero burning)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Expand / Collapse All */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Buka Semua Modul
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { key: 'all', label: 'Semua Modul Pengawas' },
            { key: 'wizard', label: '1. Form Laporan (6-Langkah)' },
            { key: 'tools', label: '2. Fitur Cepat (P2H & K3)' },
            { key: 'logistics', label: '3. Logistik & Solar Tangki' },
            { key: 'reports', label: '4. Rekap & Cetak PDF' },
            { key: 'offline', label: '5. Offline Lahan & Zero Burning' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                activeCategory === cat.key
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tutorial Modules List */}
      <div className="space-y-4">
        {filteredModules.map((module) => {
          const Icon = module.icon;
          const isExpanded = !!expandedSections[module.id];

          return (
            <div
              key={module.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-md overflow-hidden transition-all duration-200"
            >
              {/* Module Header Accordion Trigger */}
              <div
                onClick={() => toggleSection(module.id)}
                className="p-4 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
              >
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 mt-0.5 sm:mt-0">
                    <Icon className="w-6 h-6 text-amber-600" />
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 font-mono">
                        {module.numberPrefix}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${module.badgeColor}`}>
                        {module.badge}
                      </span>
                      <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1 hidden sm:inline-flex">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {module.timeEstimate}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                      {module.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 max-w-4xl">
                      {module.description}
                    </p>
                  </div>
                </div>

                {/* Right Action Button & Chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {module.tabKey && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateTab(module.tabKey!);
                      }}
                      className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 text-amber-700 hover:text-slate-950 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
                    >
                      <span>{module.keyActionLabel || 'Buka Fitur'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Collapsible Content Body */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-6 animate-fadeIn">
                  {/* Action Bar inside Expanded */}
                  {module.tabKey && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-950">
                          Ingin langsung mempraktikkan modul ini?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateTab(module.tabKey!)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                      >
                        <span>{module.keyActionLabel || 'Buka Halaman Ini'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Step by Step Breakdown */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Langkah-Langkah Penggunaan Praktis
                    </h4>

                    <div className="space-y-3.5">
                      {module.steps.map((st) => (
                        <div
                          key={st.stepNumber}
                          className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {st.stepNumber}
                              </span>
                              <h5 className="text-sm font-bold text-slate-900">
                                {st.title}
                              </h5>
                            </div>
                            {st.badge && (
                              <span className="self-start sm:self-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                                {st.badge}
                              </span>
                            )}
                          </div>

                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                            {st.summary}
                          </p>

                          {/* Bullet Points */}
                          <ul className="space-y-1.5 pl-1">
                            {st.details.map((d, dIdx) => (
                              <li key={dIdx} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Field Tip Box */}
                          {st.fieldTip && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-950 flex items-start gap-2">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-black text-amber-900">Tips Pengawas Lapangan: </strong>
                                <span className="text-amber-900/90">{st.fieldTip}</span>
                              </div>
                            </div>
                          )}

                          {/* Warning Box */}
                          {st.warning && (
                            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-950 flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                              <div>
                                <strong className="font-black text-rose-900">Peringatan Kritis: </strong>
                                <span className="text-rose-900/90">{st.warning}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Rules for This Module */}
                  {module.practicalRules && module.practicalRules.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
                      <div className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        Ketentuan Wajib Pengawas ({module.numberPrefix})
                      </div>
                      <ul className="space-y-1.5">
                        {module.practicalRules.map((rule, rIdx) => (
                          <li key={rIdx} className="text-xs text-slate-300 flex items-start gap-2">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Zero Burning SOP Guide Accordion */}
      <div className="bg-white rounded-3xl border border-amber-200 shadow-md overflow-hidden">
        <div
          onClick={() => toggleSection('zero-burning-sop')}
          className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-amber-50/50 transition-colors select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Regulasi Mutlak
                </span>
                <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                  ISPO / RSPO & K3 Perkebunan
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-900">
                Standar Operasional Prosedur (SOP) Metode Zero Burning (Tanpa Bakar)
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Panduan teknis penumbangan, perumpukan kayu di gawangan mati, dan pencegahan bahaya kebakaran semak.
              </p>
            </div>
          </div>

          <div className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-transform duration-200 ${expandedSections['zero-burning-sop'] ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {expandedSections['zero-burning-sop'] && (
          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-amber-100 space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">1</span>
                  Rintis Tebas (Underbrushing)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Babat vegetasi bawah (semak belukar, pakis liar, anak kayu kecil) manual dengan parang/babat sebelum alat berat masuk agar jarak pandang operator luas dan terhindar dari tunggul tersembunyi.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">2</span>
                  Penumbangan & Pencincangan
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pohon ditumbangkan searah jalur kontur gawangan mati. Batang pohon dengan diameter &gt; 15 cm wajib dicincang (potong) maksimal panjang 4-6 meter agar mudah didorong Bulldozer.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black flex items-center justify-center">3</span>
                  Perumpukan Rapi (Stacking)
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kayu dan seresah dirumpuk memanjang di jalur gawangan mati dengan lebar rumpukan maksimal 3 meter dan jarak antar rumpukan 15-20 meter. DILARANG KERAS membakar kayu tersebut.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Pernyataan Integritas PT. RBS GROUP</span>
              </div>
              <p className="text-xs text-amber-900/90 leading-relaxed">
                Setiap laporan harian yang memuat bukti foto dokumentasi wajib menunjukkan hasil perumpukan kayu rapi yang bebas dari bekas abu atau api. Pelanggaran pembakaran lahan akan dikenakan sanksi berat sesuai hukum perundang-undangan perkebunan dan kehutanan Republik Indonesia.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Troubleshooting & Frequently Asked Questions (FAQ) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
        <div
          onClick={() => toggleSection('faq')}
          className="p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Tanya Jawab Kendala
                </span>
                <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                  Solusi Masalah Lapangan
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-black text-slate-900">
                Tanya Jawab (FAQ) & Solusi Kendala di Lapangan
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pertanyaan yang paling sering dihadapi pengawas saat operasional di perkebunan terpencil.
              </p>
            </div>
          </div>

          <div className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 transition-transform duration-200 ${expandedSections['faq'] ? 'rotate-180' : ''}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {expandedSections['faq'] && (
          <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 space-y-3 animate-fadeIn">
            {fieldFaqList.map((faq, fIdx) => (
              <div
                key={fIdx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
              >
                <div className="text-xs font-bold text-slate-900 flex items-start gap-2">
                  <span className="text-amber-600 font-black shrink-0">Q{fIdx + 1}:</span>
                  <span>{faq.q}</span>
                </div>
                <div className="text-xs text-slate-600 pl-6 leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-600 font-black shrink-0">A:</span>
                  <span>{faq.a}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Support & Navigation Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-5 sm:p-6 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs font-bold text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Kepatuhan Standar Lapangan PT. RBS GROUP</span>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Jika membutuhkan bantuan lebih lanjut mengenai kendala teknis aplikasi atau koordinasi darurat unit amblas, hubungi Koordinator Lapangan atau Direktur Operasional.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateTab('wizard')}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buka Form Laporan Harian</span>
          </button>
        </div>
      </div>
    </div>
  );
};
