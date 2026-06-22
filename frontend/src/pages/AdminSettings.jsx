import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { Upload, Trash2, CheckCircle, AlertTriangle, Loader2, Image as ImageIcon } from 'lucide-react';

export default function AdminSettings() {
  const [base64Kop, setBase64Kop] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchKopSurat();
  }, []);

  const fetchKopSurat = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/kop_surat`);
      if (response.ok) {
        const data = await response.json();
        setBase64Kop(data.value_text || '');
      }
    } catch (err) {
      console.error('Error fetching kop:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
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
      setBase64Kop(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          key_name: 'kop_surat',
          value_text: base64Kop
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menyimpan Kop Surat.');
      }

      setMessage('Kop Surat berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Kop Surat gambar dan kembali ke Kop Surat teks default?')) {
      setBase64Kop('');
      setError('');
      setMessage('');
    }
  };

  return (
    <AdminLayout title="Pengaturan Kop Surat">
      <div className="space-y-6 max-w-3xl animate-fade-in">
        
        <div>
          <h3 className="text-xl font-black text-indigo-950">Kelola Kop Surat Resmi</h3>
          <p className="text-sm text-slate-600 mt-1 font-semibold">Unggah gambar Kop Surat resmi Politeknik Indonusa Surakarta. Gambar ini akan menggantikan Kop Surat teks default pada halaman cetak A4.</p>
        </div>

        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-blue-100 shadow-md shadow-blue-100/30 space-y-6">
            
            {/* Image Preview Box */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Pratinjau Kop Surat Saat Ini</label>
              {base64Kop ? (
                <div className="border border-blue-100 rounded-xl p-4 bg-white flex justify-center items-center max-h-56 overflow-y-auto shadow-inner">
                  <img 
                    src={base64Kop} 
                    alt="Kop Surat Resmi" 
                    className="max-h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-10 bg-blue-50/20 text-center text-slate-700">
                  <ImageIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <p className="font-extrabold text-indigo-950">Belum Ada Kop Gambar</p>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">Sistem saat ini menggunakan Kop Surat teks bawaan (HTML template).</p>
                </div>
              )}
            </div>

            {/* Upload Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-blue-50">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Unggah File Baru</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="px-4 py-4 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-center text-sm font-bold text-slate-700 transition-all flex items-center justify-center gap-2 group-hover:bg-slate-50 shadow-sm">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>Pilih Gambar Kop</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block font-semibold">Format: PNG, JPG, JPEG. Ukuran maks: 2MB. Disarankan lebar minimal 800px.</span>
              </div>

              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-600/15 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
                {base64Kop && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-3.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl transition-all cursor-pointer shadow-sm"
                    title="Hapus Kop Gambar"
                  >
                    <Trash2 className="w-5 h-5" />
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
