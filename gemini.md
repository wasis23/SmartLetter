# SYSTEM BLUEPRINT: AUTOMATED LETTER GENERATION SYSTEM (REACT JS)

Anda adalah seorang Software Architect dan Senior Full-Stack Developer berpengalaman. Tugas Anda adalah membangun sistem pembuatan surat otomatis berbasis web berdasarkan spesifikasi, alur sistem, sitemap, skema database, dan rancangan API yang tertera di bawah ini.

Sistem ini dirancang agar mahasiswa dapat mengajukan surat kegiatan kelompok/individu secara mandiri, dan Admin dapat mengelola, memberikan nomor surat, serta mencetaknya langsung ke media kertas (A4) melalui browser.

---

## 1. ARCHITECTURE & TECH STACK
- **Frontend:** React.js (Single Page Application / SPA)
- **Styling:** Tailwind CSS (untuk antarmuka modern, bersih, dan responsif)
- **Backend:** Node.js dengan Express.js (RESTful API)
- **Database:** Relational Database (MySQL atau PostgreSQL)
- **Fitur Cetak:** Cetak berbasis browser menggunakan CSS `@media print` atau library `react-to-print` (fokus pada standardisasi ukuran kertas A4).

---

## 2. ALUR SISTEM (WORKFLOW)

Secara garis besar, sistem ini berjalan melalui 5 tahapan utama berikut:

1. **Tahap Pengisian (Mahasiswa):**
   Mahasiswa membuka website -> Memilih Jenis Surat -> Mengisi data profil dasar -> Mengisi 8 komponen data dinamis kegiatan (termasuk input dynamic array untuk anggota kelompok) -> Klik Submit.
2. **Tahap Validasi & Penyimpanan (Backend):**
   Sistem mengecek data mahasiswa. Jika NIM baru, simpan ke tabel `mahasiswa`. Data pengajuan beserta payload kegiatan disimpan ke tabel `pengajuan_surat` dengan status `'pending'`. Kolom `nomor_surat` dan `tanggal_surat` masih bernilai `NULL`.
3. **Tahap Verifikasi (Admin):**
   Admin masuk ke Dashboard -> Melihat daftar antrean surat berstatus `'pending'` -> Membuka detail pengajuan untuk memeriksa keabsahan data kelompok mahasiswa.
4. **Tahap Penomoran (Admin):**
   Admin menyetujui pengajuan -> Menginputkan `Nomor Surat` resmi (sesuai tata kearsipan kampus) dan `Tanggal Surat` -> Klik Simpan. Status berubah menjadi `'disetujui'`.
5. **Tahap Pencetakan (Admin):**
   Admin membuka halaman Pratinjau Surat -> Sistem otomatis menggabungkan kop surat, data mahasiswa, data dinamis, serta nomor/tanggal surat ke dalam template HTML -> Admin klik "Cetak" -> Browser membuka dialog Print to PDF/Kertas.

---

## 3. DAFTAR HALAMAN YANG DIBUTUHKAN (SITEMAP & UI LENGKAP)

### A. Sisi Mahasiswa (Public Access)
1. **Halaman Form Pengajuan (`/` atau `/ajukan-surat`):**
   - Dropdown pilihan jenis surat (diambil dari tabel `master_surat`).
   - Form Input Data Pemohon (NIM, Nama, Prodi, Angkatan).
   - Form Input Data Dinamis Kegiatan:
     - Nama kegiatan (Text)
     - Tgl kegiatan (Date Picker)
     - Email ketua (Email)
     - Nama tempat (Text)
     - Alamat tempat (Text Area)
     - Nama Pihak Mitra (Text)
     - Jabatan di Mitra (Text)
     - Komponen **Anggota Kelompok** (Dynamic Form Input: baris Input NIM & Nama yang bisa ditambah/hapus secara dinamis oleh user).
   - Tombol "Kirim Pengajuan".

### B. Sisi Admin (Authenticated Access)
1. **Halaman Login Admin (`/admin/login`):**
   - Form Input Username/Email dan Password untuk membatasi hak akses.
2. **Halaman Dashboard Antrean Surat (`/admin/dashboard`):**
   - Statistik singkat (Jumlah surat pending, Jumlah surat selesai).
   - Tabel Antrean Surat Masuk (Status `'pending'`). Kolom: No, Tanggal Pengajuan, NIM Ketua, Nama Kegiatan, Jenis Surat, Aksi (Tombol "Proses").
3. **Halaman Riwayat Surat Selesai (`/admin/riwayat`):**
   - Tabel daftar surat yang sudah berstatus `'disetujui'` atau `'ditolak'`. 
   - Kolom tambahan: Nomor Surat, Tanggal Surat.
   - Aksi: Tombol "Cetak Kembali" atau "Lihat Detail".
4. **Halaman Detail & Input Nomor (`/admin/pengajuan/:id`):**
   - Menampilkan detail lengkap data mahasiswa dan isi data dinamis JSON yang dikirimkan.
   - Panel Aksi Admin: Form input text untuk `Nomor Surat` dan input date untuk `Tanggal Surat`. Tombol "Setujui & Terbitkan" dan Tombol "Tolak".
5. **Halaman Cetak/Pratinjau Surat (`/admin/cetak/:id`):**
   - Halaman bersih tanpa komponen navbar/sidebar admin.
   - Menampilkan visual layout Surat Resmi (Kop Surat, Isi Surat Utama yang mengikat data dinamis, tabel daftar anggota kelompok, tanda tangan/titimangsa digital).
   - Tombol melayang (floating button) "Cetak Surat" yang memicu perintah `window.print()`.

---

## 4. DESAIN DATABASE (SKEMA RELASIONAL)

### A. Tabel `mahasiswa`
- `id`: INT (Primary Key, Auto Increment)
- `nim`: VARCHAR(20) (Unique)
- `nama`: VARCHAR(150)
- `prodi`: VARCHAR(100)
- `angkatan`: INT
- `email`: VARCHAR(100)

### B. Tabel `master_surat`
- `id`: INT (Primary Key, Auto Increment)
- `nama_surat`: VARCHAR(150) (Contoh: "Surat Pengantar Kerja Praktik", "Surat Izin Penelitian")
- `kode_surat`: VARCHAR(20) (Contoh: "SPM", "SIP")

### C. Tabel `pengajuan_surat`
- `id`: INT (Primary Key, Auto Increment)
- `mahasiswa_id`: INT (Foreign Key -> `mahasiswa.id`)
- `surat_id`: INT (Foreign Key -> `master_surat.id`)
- `data_dinamis`: JSON
- `status`: ENUM('pending', 'disetujui', 'ditolak') [Default: 'pending']
- `nomor_surat`: VARCHAR(100) (Nullable)
- `tanggal_surat`: DATE (Nullable)
- `created_at`: TIMESTAMP [Default: CURRENT_TIMESTAMP]

---

## 5. SPESIFIKASI DATA DINAMIS (JSON STRUCTURE)
Payload data dinamis kegiatan kelompok wajib dikirim dan disimpan dengan format JSON terstruktur berikut:

```json
{
  "nama_kegiatan": "String",
  "tgl_kegiatan": "YYYY-MM-DD",
  "email_ketua": "String (Valid Email)",
  "anggota_kelompok": [
    { "nim": "String", "nama": "String" }
  ],
  "nama_tempat": "String",
  "alamat": "String",
  "nama_pihak_mitra": "String",
  "jabatan_di_mitra": "String"
}