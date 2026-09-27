import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { Upload, Trash2, CheckCircle, AlertTriangle, Loader2, Image as ImageIcon, Sparkles, History, Calendar } from 'lucide-react';

export default function AdminSettings() {
  const [base64KopLama, setBase64KopLama] = useState('');
  const [base64KopBaru, setBase64KopBaru] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingLama, setSavingLama] = useState(false);
  const [savingBaru, setSavingBaru] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKopSurat();
  }, []);

  const fetchKopSurat = async () => {
    setLoading(true);
    try {
      // 1. Fetch Kop Surat Lama
      const resLama = await fetch(`${API_BASE_URL}/settings/kop_surat_lama`);
      if (resLama.ok) {
        const dataLama = await resLama.json();
        setBase64KopLama(dataLama.value_text || '');
      } else {
        // Fallback default
        const resDef = await fetch(`${API_BASE_URL}/settings/kop_surat`);
        if (resDef.ok) {
          const dataDef = await resDef.json();
          setBase64KopLama(dataDef.value_text || '');
        }
      }

      // 2. Fetch Kop Surat Baru
      const resBaru = await fetch(`${API_BASE_URL}/settings/kop_surat_baru`);
      if (resBaru.ok) {
        const dataBaru = await resBaru.json();
        setBase64KopBaru(dataBaru.value_text || '');
      } else {
        // Fallback default
        const resDef = await fetch(`${API_BASE_URL}/settings/kop_surat`);
        if (resDef.ok) {
          const dataDef = await resDef.json();
          setBase64KopBaru(dataDef.value_text || '');
        }
      }
    } catch (err) {
      console.error('Error fetching kop settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG/JPG/JPEG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal adalah 2MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      if (target === 'lama') {
        setBase64KopLama(reader.result);
      } else {
        setBase64KopBaru(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveSetting = async (keyName, valueText) => {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`${API_BASE_URL}/admin/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        key_name: keyName,
        value_text: valueText
      })
    });
    if (!response.ok) {
      throw new Error(`Gagal menyimpan pengaturan ${keyName}`);
    }
    return response.json();
  };

  const handleSaveLama = async () => {
    setSavingLama(true);
    setMessage('');
    setError('');
    try {
      await saveSetting('kop_surat_lama', base64KopLama);
      setMessage('Kop Surat Versi Lama (< 2025/2026) berhasil disimpan!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan Kop Surat Lama.');
    } finally {
      setSavingLama(false);
    }
  };

  const handleSaveBaru = async () => {
    setSavingBaru(true);
    setMessage('');
    setError('');
    try {
      await saveSetting('kop_surat_baru', base64KopBaru);
      // Sinkronkan juga ke key default 'kop_surat'
      await saveSetting('kop_surat', base64KopBaru);
      setMessage('Kop Surat Versi Baru (≥ 2025/2026) berhasil disimpan!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan Kop Surat Baru.');
    } finally {
      setSavingBaru(false);
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    setMessage('');
    setError('');
    try {
      await Promise.all([
        saveSetting('kop_surat_lama', base64KopLama),
        saveSetting('kop_surat_baru', base64KopBaru),
        saveSetting('kop_surat', base64KopBaru)
      ]);
      setMessage('Semua pengaturan versi Kop Surat berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan seluruh pengaturan kop.');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <AdminLayout title="Pengaturan Kop Surat 2 Versi">
      <div className="space-y-6 max-w-6xl animate-fade-in pb-10">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2">
              <span>Kelola Kop Surat Berdasarkan Tahun Akademik</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Sistem akan otomatis mendeteksi tahun akademik data yang diimpor. Data di bawah tahun akademik <strong>2025/2026</strong> menggunakan <strong>Kop Lama</strong>, sedangkan tahun akademik <strong>2025/2026 ke atas</strong> menggunakan <strong>Kop Baru</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll || savingLama || savingBaru}
            className="shrink-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {savingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Semua...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Semua Versi Kop</span>
              </>
            )}
          </button>
        </div>

        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Card Versi Kop Lama */}
            <div className="bg-white rounded-3xl p-6 md:p-7 border border-amber-200 shadow-sm space-y-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-bold">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">1. Kop Surat Versi Lama</h4>
                      <p className="text-[11px] text-slate-500">Tahun Akademik di bawah 2025/2026</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-[11px] rounded-lg">
                    &lt; 2025/2026
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3 rounded-xl text-xs text-amber-950 font-medium leading-relaxed">
                  Contoh tahun akademik yang otomatis menggunakan kop ini: <strong>2024/2025</strong>, <strong>2023/2024</strong>, <strong>2022/2023</strong>, dll.
                </div>

                {/* Preview Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Pratinjau Kop Lama Saat Ini:
                  </label>
                  {base64KopLama ? (
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex justify-center items-center min-h-[140px] max-h-52 overflow-y-auto">
                      <img 
                        src={base64KopLama} 
                        alt="Kop Surat Versi Lama" 
                        className="max-h-44 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-amber-200 rounded-2xl p-8 bg-amber-50/30 text-center text-slate-600">
                      <ImageIcon className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-70" />
                      <p className="font-extrabold text-slate-800 text-xs">Belum Ada Gambar Kop Lama</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Sistem akan menggunakan kop default /kop.png</p>
                    </div>
                  )}
                </div>

                {/* Upload Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Unggah File Kop Lama:
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'lama')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="px-4 py-3 bg-white border border-slate-200 hover:border-amber-500 rounded-2xl text-center text-xs font-extrabold text-slate-700 transition-all flex items-center justify-center gap-2 group-hover:bg-amber-50/40 shadow-sm">
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>Pilih File Kop Lama (PNG/JPG)</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Ukuran maks: 2MB. Disarankan lebar min: 1000px.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveLama}
                  disabled={savingLama}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingLama ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Simpan Kop Lama</span>
                </button>
                {base64KopLama && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Hapus gambar Kop Surat Versi Lama?')) {
                        setBase64KopLama('');
                      }
                    }}
                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer transition-colors"
                    title="Hapus Kop Lama"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Card Versi Kop Baru */}
            <div className="bg-white rounded-3xl p-6 md:p-7 border border-emerald-200 shadow-sm space-y-5 flex flex-col justify-between relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">2. Kop Surat Versi Baru</h4>
                      <p className="text-[11px] text-slate-500">Tahun Akademik 2025/2026 ke atas</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 font-black text-[11px] rounded-lg">
                    ≥ 2025/2026
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl text-xs text-emerald-950 font-medium leading-relaxed">
                  Contoh tahun akademik yang otomatis menggunakan kop ini: <strong>2025/2026</strong>, <strong>2026/2027</strong>, <strong>2027/2028</strong>, dll.
                </div>

                {/* Preview Box */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Pratinjau Kop Baru Saat Ini:
                  </label>
                  {base64KopBaru ? (
                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex justify-center items-center min-h-[140px] max-h-52 overflow-y-auto">
                      <img 
                        src={base64KopBaru} 
                        alt="Kop Surat Versi Baru" 
                        className="max-h-44 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-8 bg-emerald-50/30 text-center text-slate-600">
                      <ImageIcon className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
                      <p className="font-extrabold text-slate-800 text-xs">Belum Ada Gambar Kop Baru</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Sistem akan menggunakan kop default /kop.png</p>
                    </div>
                  )}
                </div>

                {/* Upload Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Unggah File Kop Baru:
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'baru')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="px-4 py-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl text-center text-xs font-extrabold text-slate-700 transition-all flex items-center justify-center gap-2 group-hover:bg-emerald-50/40 shadow-sm">
                      <Upload className="w-4 h-4 text-emerald-600" />
                      <span>Pilih File Kop Baru (PNG/JPG)</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">Ukuran maks: 2MB. Disarankan lebar min: 1000px.</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveBaru}
                  disabled={savingBaru}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingBaru ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>Simpan Kop Baru</span>
                </button>
                {base64KopBaru && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Hapus gambar Kop Surat Versi Baru?')) {
                        setBase64KopBaru('');
                      }
                    }}
                    className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer transition-colors"
                    title="Hapus Kop Baru"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  );
}

