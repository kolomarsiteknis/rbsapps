# Rencana Database (Firestore)

Berikut adalah struktur koleksi database Firestore untuk sistem Suryaland Management.

## 1. Koleksi `users`
Menyimpan profil dan informasi akses pengguna.
- `uid` (string): ID unik Firebase Auth.
- `email` (string): Alamat email pengguna.
- `displayName` (string): Nama lengkap pengguna.
- `role` (string): Peran pengguna ('admin', 'manager', 'supervisor', 'staff').
- `isActive` (boolean): Status aktif akun.
- `createdAt` (timestamp): Waktu pembuatan akun.

## 2. Koleksi `company_profile`
Menyimpan konfigurasi profil perusahaan.
*Dokumen: `config` (singleton)*
- `companyName` (string): Nama perusahaan.
- `logoUrl` (string): URL logo perusahaan (dari Firebase Storage).
- `address` (string): Alamat perusahaan.
- `phone` (string): Nomor telepon.
- `updatedAt` (timestamp): Waktu pembaruan terakhir.

## 3. Koleksi `inventory`
Menyimpan data stok barang/logistik.
- `id` (string): ID unik barang.
- `itemName` (string): Nama barang.
- `quantity` (number): Jumlah stok.
- `unit` (string): Satuan barang (misal: 'kg', 'pcs').
- `lastUpdated` (timestamp): Waktu perubahan terakhir.
- `updatedBy` (string): UID pengguna yang melakukan update.

## 4. Koleksi `approvals`
Menyimpan permintaan persetujuan untuk tindakan kritis.
- `id` (string): ID unik permintaan.
- `type` (string): Jenis permintaan (contoh: 'STOCK_ADJUSTMENT').
- `details` (map): Objek berisi detail perubahan.
- `status` (string): 'pending', 'approved', 'rejected'.
- `requestedBy` (string): UID pemohon.
- `processedBy` (string): UID manajer yang memproses.
- `createdAt` (timestamp): Waktu pengajuan.

## 5. Koleksi `audit_logs`
Menyimpan catatan aktivitas pengguna untuk keamanan.
- `id` (string): ID unik log.
- `userId` (string): UID pengguna.
- `action` (string): Deskripsi tindakan.
- `targetId` (string): ID objek yang terpengaruh (opsional).
- `timestamp` (timestamp): Waktu kejadian.

## 6. Koleksi `activities`
Menyimpan aktivitas lapangan (dari supervisor).
- `id` (string): ID unik aktivitas.
- `userId` (string): UID supervisor.
- `description` (string): Deskripsi kegiatan.
- `location` (string): Lokasi/titik koordinat.
- `timestamp` (timestamp): Waktu kejadian.
