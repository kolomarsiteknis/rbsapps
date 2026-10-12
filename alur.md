# Alur Penggunaan Aplikasi

Berikut adalah alur penggunaan fitur-fitur utama aplikasi:

## 1. Alur Autentikasi
1. Pengguna membuka aplikasi.
2. Aplikasi memeriksa status login. Jika belum, tampilkan `LoginPage`.
3. Pengguna memasukkan kredensial.
4. Aplikasi memvalidasi di Firebase Auth.
5. Jika berhasil, dialihkan ke `DashboardView`.

## 2. Alur Pengaturan Profil Perusahaan
1. Pengguna masuk ke menu **Profil Perusahaan**.
2. Aplikasi memuat data dari Firestore. Jika logo tidak ditemukan, muat dari IndexedDB sebagai *fallback*.
3. Pengguna mengubah data atau mengunggah logo baru.
4. Aplikasi melakukan kompresi gambar dan menyimpan ke IndexedDB (fallback) dan Firestore Storage.
5. Aplikasi menyimpan profil ke Firestore.

## 3. Alur Manajemen Logistik & Inventaris
1. Pengguna masuk ke menu **Logistik**.
2. Pengguna dapat menambah, mengedit, atau menghapus item inventaris.
3. Untuk mencetak laporan, pengguna menekan tombol cetak.
4. Aplikasi memproses data dan membuka `LogisticsPrintModal` atau `PdfReportModal` untuk pratinjau.
5. Pengguna mengunduh/mencetak laporan PDF.

## 4. Alur Persetujuan Manajer (Approval Flow)
1. Pengguna dengan hak akses operasional mengajukan tindakan.
2. Manajer menerima notifikasi atau masuk ke **ManagerApprovalView**.
3. Manajer meninjau detail tindakan.
4. Manajer memberikan **Setuju** atau **Tolak**.
5. Status tindakan diperbarui di Firestore dan tercatat di Audit Log.

## 5. Alur Pemantauan Lapangan (Supervisor)
1. Supervisor masuk ke **SupervisorToolsView**.
2. Supervisor memasukkan data atau observasi lapangan.
3. Data dikirim ke Firestore secara *real-time*.
4. Direktur memantau melalui **DirectorFieldMonitorView**.

## 6. Alur PWA & Instalasi
1. Pengguna mengakses aplikasi melalui browser.
2. Jika memenuhi syarat, aplikasi menampilkan prompt instalasi (melalui `PWAInstallButton`).
3. Pengguna mengonfirmasi instalasi.
4. Aplikasi terinstal di perangkat untuk akses *offline* terbatas.
