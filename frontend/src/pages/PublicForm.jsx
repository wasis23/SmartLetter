import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Plus, Trash2, Send, CheckCircle, FileText, Loader2, User, Users, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PublicForm() {
  const [letterTypes, setLetterTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [nim, setNim] = useState('');
  const [nama, setNama] = useState('');
  const [prodi, setProdi] = useState('');
  const [angkatan, setAngkatan] = useState('');
  const [email, setEmail] = useState('');
  const [suratId, setSuratId] = useState('');

  // Dynamic activity data
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [tglKegiatan, setTglKegiatan] = useState('');
  const [emailKetua, setEmailKetua] = useState('');
  const [namaTempat, setNamaTempat] = useState('');
  const [alamat, setAlamat] = useState('');
  const [namaPihakMitra, setNamaPihakMitra] = useState('');
  const [jabatanDiMitra, setJabatanDiMitra] = useState('');
  
  // Dynamic Group Members: [{ nim: '', nama: '' }]
  const [anggotaKelompok, setAnggotaKelompok] = useState([{ nim: '', nama: '' }]);

  // Fetch letter types
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE_URL}/master-surat`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load letter types');
        return res.json();
      })
      .then(data => {
        setLetterTypes(data);
        if (data.length > 0) setSuratId(data[0].id.toString());
      })
      .catch(err => {
        console.error(err);
        setError('Gagal memuat jenis surat. Pastikan backend server aktif.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddAnggota = () => {
    setAnggotaKelompok([...anggotaKelompok, { nim: '', nama: '' }]);
  };

  const handleRemoveAnggota = (index) => {
    const updated = anggotaKelompok.filter((_, i) => i !== index);
    setAnggotaKelompok(updated);
  };

  const handleAnggotaChange = (index, field, value) => {
    const updated = [...anggotaKelompok];
    updated[index][field] = value;
    setAnggotaKelompok(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // E-mail format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !emailRegex.test(emailKetua)) {
      setError('Format email pemohon atau email ketua tidak valid.');
      setSubmitting(false);
      return;
    }

    // Domain validation (must be @poltekindonusa.ac.id)
    const requiredDomain = '@poltekindonusa.ac.id';
    if (!email.toLowerCase().endsWith(requiredDomain)) {
      setError('Email Pemohon harus menggunakan domain resmi mahasiswa: @poltekindonusa.ac.id');
      setSubmitting(false);
      return;
    }

    if (!emailKetua.toLowerCase().endsWith(requiredDomain)) {
      setError('Email Ketua Kelompok harus menggunakan domain resmi mahasiswa: @poltekindonusa.ac.id');
      setSubmitting(false);
      return;
    }

    // Filter out empty group members
    const validAnggota = anggotaKelompok.filter(a => a.nim.trim() !== '' && a.nama.trim() !== '');

    const payload = {
      nim,
      nama,
      prodi,
      angkatan: parseInt(angkatan),
      email,
      surat_id: parseInt(suratId),
      data_dinamis: {
        nama_kegiatan: namaKegiatan,
        tgl_kegiatan: tglKegiatan,
        email_ketua: emailKetua,
        anggota_kelompok: validAnggota,
        nama_tempat: namaTempat,
        alamat: alamat,
        nama_pihak_mitra: namaPihakMitra,
        jabatan_di_mitra: jabatanDiMitra
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/pengajuan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengirim pengajuan.');
      }

      setSuccess(true);
      // Reset form
      setNim('');
      setNama('');
      setProdi('');
      setAngkatan('');
      setEmail('');
      setNamaKegiatan('');
      setTglKegiatan('');
      setEmailKetua('');
      setNamaTempat('');
      setAlamat('');
      setNamaPihakMitra('');
      setJabatanDiMitra('');
      setAnggotaKelompok([{ nim: '', nama: '' }]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-slate-100 text-slate-800 flex flex-col">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center border-b border-blue-100 shadow-sm shadow-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-indigo-900 m-0 leading-none">
              SmartLetter
            </h1>
            <p className="text-[10px] text-blue-600 font-extrabold mt-1 tracking-wider uppercase">Politeknik Indonusa Surakarta</p>
          </div>
        </div>
        <Link 
          to="/admin/login" 
          className="px-4 py-2 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-600/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Portal Admin
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black text-indigo-950 tracking-tight leading-tight">
            Pengajuan Surat Kegiatan Mahasiswa
          </h2>
          <p className="text-slate-600 font-semibold mt-3 max-w-2xl mx-auto text-base">
            Isi formulir di bawah ini dengan lengkap untuk mengajukan surat dinas kegiatan kelompok atau individu secara otomatis di lingkungan kampus Politeknik Indonusa Surakarta.
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3 shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {success ? (
          <div className="bg-white p-8 md:p-12 rounded-3xl text-center shadow-xl border border-blue-100 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-indigo-950 mb-3">Pengajuan Berhasil Dikirim!</h3>
            <p className="text-slate-600 font-medium max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
              Surat Anda telah berhasil dikirim ke antrean sistem. Admin Jurusan/BAAK Politeknik Indonusa Surakarta akan memproses verifikasi, pemberian nomor surat resmi, dan mengirimkannya ke email mahasiswa Anda.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              Buat Pengajuan Baru
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Step 1: Profil Mahasiswa */}
            <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-md border border-blue-100/60">
              <div className="flex items-center gap-3 border-b border-blue-50 pb-4">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-indigo-950">1. Profil Mahasiswa Pemohon</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">NIM Pemohon</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan NIM Anda (Contoh: 220101)"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap sesuai KTM"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Program Studi</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: D3 Teknologi Informasi"
                    value={prodi}
                    onChange={(e) => setProdi(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Angkatan</label>
                    <input
                      type="number"
                      required
                      placeholder="Contoh: 2024"
                      value={angkatan}
                      onChange={(e) => setAngkatan(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Email Mahasiswa</label>
                    <input
                      type="email"
                      required
                      placeholder="nim@poltekindonusa.ac.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Jenis Surat */}
            <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-md border border-blue-100/60">
              <div className="flex items-center gap-3 border-b border-blue-50 pb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-indigo-950">2. Jenis Surat Pengajuan</h3>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Pilih Tipe Surat</label>
                {loading ? (
                  <div className="flex items-center gap-2 text-slate-600 py-2 font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm">Memuat daftar tipe surat...</span>
                  </div>
                ) : (
                  <select
                    value={suratId}
                    onChange={(e) => setSuratId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold appearance-none cursor-pointer"
                  >
                    {letterTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-white text-slate-900 font-semibold">
                        {type.nama_surat} ({type.kode_surat})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Step 3: Detail Kegiatan & Mitra */}
            <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-md border border-blue-100/60">
              <div className="flex items-center gap-3 border-b border-blue-50 pb-4">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-indigo-950">3. Detail Dinamis Kegiatan & Mitra</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nama Kegiatan / Skripsi / Penelitian</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kerja Praktik Pembuatan Sistem POS Minimarket"
                    value={namaKegiatan}
                    onChange={(e) => setNamaKegiatan(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    required
                    value={tglKegiatan}
                    onChange={(e) => setTglKegiatan(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Email Ketua Kelompok</label>
                  <input
                    type="email"
                    required
                    placeholder="ketua@poltekindonusa.ac.id"
                    value={emailKetua}
                    onChange={(e) => setEmailKetua(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nama Penerima Surat di Mitra</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso (Kepala HRD) / PT. Solusi IT Indonesia"
                    value={namaPihakMitra}
                    onChange={(e) => setNamaPihakMitra(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Jabatan Penerima Surat di Mitra</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kepala HRD / Direktur Operasional"
                    value={jabatanDiMitra}
                    onChange={(e) => setJabatanDiMitra(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Nama Lokasi / Tempat Kegiatan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kantor Utama PT. Solusi IT cabang Surakarta"
                    value={namaTempat}
                    onChange={(e) => setNamaTempat(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Alamat Lengkap Tujuan Surat</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Masukkan alamat lengkap kantor/mitra tujuan agar surat tercetak presisi..."
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-semibold resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Anggota Kelompok */}
            <div className="bg-white rounded-2xl p-6 md:p-8 space-y-6 shadow-md border border-blue-100/60">
              <div className="flex justify-between items-center border-b border-blue-50 pb-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-indigo-950">4. Daftar Anggota Kelompok (Opsional)</h3>
                </div>
                <button
                  type="button"
                  onClick={handleAddAnggota}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-550 hover:bg-blue-600 text-white rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>

              <p className="text-xs text-slate-600 font-semibold">
                Isi bagian ini jika surat diajukan untuk kelompok. Kosongkan baris atau abaikan saja jika pengajuan dilakukan untuk kebutuhan individu.
              </p>

              <div className="space-y-4">
                {anggotaKelompok.map((anggota, index) => (
                  <div key={index} className="flex gap-4 items-center animate-fade-in">
                    <span className="text-xs font-bold text-slate-500 w-6">#{index + 1}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                      <input
                        type="text"
                        placeholder="NIM Anggota"
                        value={anggota.nim}
                        onChange={(e) => handleAnggotaChange(index, 'nim', e.target.value)}
                        className="px-4 py-2.5 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-semibold"
                      />
                      <input
                        type="text"
                        placeholder="Nama Lengkap Anggota"
                        value={anggota.nama}
                        onChange={(e) => handleAnggotaChange(index, 'nama', e.target.value)}
                        className="px-4 py-2.5 bg-slate-50/50 border border-blue-100 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm font-semibold"
                      />
                    </div>
                    {anggotaKelompok.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAnggota(index)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-base cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim Pengajuan...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Kirim Pengajuan Surat
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 font-semibold border-t border-blue-100 mt-12 bg-white shadow-inner">
        <p>© 2026 SmartLetter Politeknik Indonusa Surakarta. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}
