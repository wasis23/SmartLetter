import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { 
  Upload, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Image as ImageIcon, 
  PenTool, 
  FileText, 
  BookOpen, 
  GraduationCap, 
  ClipboardCheck, 
  ClipboardList,
  Info
} from 'lucide-react';

const SIGNATURE_CATEGORIES = [
  {
    id: 'SURAT_DINAS',
    categoryTitle: 'Surat Dinas Mahasiswa (KP / Riset / Aktif)',
    categorySubtitle: 'Tanda tangan Kaprodi / Pejabat Penandatangan Surat Dinas',
    icon: FileText,
    color: 'indigo',
    items: [
      {
        key: 'ttd_kaprodi_trpl',
        label: 'Tanda Tangan Kaprodi TRPL',
        signerTitle: 'a.n. Kepala Program Studi D4 TRPL',
        signerNameDefault: 'Dwi Iskandar, M.Kom',
        signerNidnDefault: 'NIDN. 0603048802',
        description: 'Tampil pada surat dinas pengantar KP, Surat Izin Penelitian, dll.'
      }
    ]
  },
  {
    id: 'SKM',
    categoryTitle: 'Surat Kesanggupan Mengajar (SKM)',
    categorySubtitle: 'Tanda tangan default pengajar / Dosen Pembuat Surat',
    icon: BookOpen,
    color: 'blue',
    items: [
      {
        key: 'ttd_skm_dosen',
        label: 'Tanda Tangan Dosen / Pengajar (SKM)',
        signerTitle: 'Yang Membuat Pernyataan',
        signerNameDefault: 'Dosen Pengampu Mata Kuliah',
        signerNidnDefault: 'NIDN Pengajar',
        description: 'Tampil pada kolom tanda tangan Yang Membuat di bagian bawah SKM.'
      }
    ]
  },
  {
    id: 'FORM_INTEGRASI',
    categoryTitle: 'Form Integrasi PPM',
    categorySubtitle: '4 Tanda Tangan Pengesahan (Gugus Mutu, PPM Prodi, UPM, LPPM)',
    icon: GraduationCap,
    color: 'emerald',
    items: [
      {
        key: 'ttd_integrasi_gugus_mutu',
        label: '1. Tanda Tangan Gugus Mutu',
        signerTitle: 'Gugus Mutu',
        signerNameDefault: 'Prasiwi Citra Resmi, M.Par',
        signerNidnDefault: '',
        description: 'Tampil pada kolom Gugus Mutu (Kiri Atas).'
      },
      {
        key: 'ttd_integrasi_ppm_prodi',
        label: '2. Tanda Tangan PPM Program Studi',
        signerTitle: 'PPM Program Studi',
        signerNameDefault: 'Yohanes Martono Widagdo, S.ST,. M.M.Par.',
        signerNidnDefault: '',
        description: 'Tampil pada kolom PPM Program Studi (Kanan Atas).'
      },
      {
        key: 'ttd_integrasi_ketua_upm',
        label: '3. Tanda Tangan Ketua UPM',
        signerTitle: 'Ketua Unit Penjaminan Mutu',
        signerNameDefault: 'Agustyarum Pradiska Budi, M.E.',
        signerNidnDefault: '',
        description: 'Tampil pada kolom Ketua Unit Penjaminan Mutu (Kiri Bawah).'
      },
      {
        key: 'ttd_integrasi_ketua_lppm',
        label: '4. Tanda Tangan Ketua LPPM',
        signerTitle: 'Ketua Unit LPPM',
        signerNameDefault: 'Dr. Ratna Susanti, SS., M.Pd',
        signerNidnDefault: '',
        description: 'Tampil pada kolom Ketua LPPM (Kanan Bawah).'
      }
    ]
  },
  {
    id: 'FORM_PENILAIAN_PROPOSAL',
    categoryTitle: 'Form Penilaian Proposal Penelitian',
    categorySubtitle: 'Tanda tangan Penilai / Reviewer Proposal',
    icon: ClipboardCheck,
    color: 'amber',
    items: [
      {
        key: 'ttd_penilai_proposal',
        label: 'Tanda Tangan Penilai Proposal',
        signerTitle: 'Penilai Proposal Penelitian',
        signerNameDefault: 'Dr. Ratna Susanti, S.S., M.Pd',
        signerNidnDefault: '',
        description: 'Tampil pada lembar evaluasi penilaian proposal.'
      }
    ]
  },
  {
    id: 'FORM_MONEV',
    categoryTitle: 'Form Monev Penelitian Hibah Internal',
    categorySubtitle: 'Tanda tangan Pemonev Kegiatan Penelitian',
    icon: ClipboardList,
    color: 'purple',
    items: [
      {
        key: 'ttd_pemonev_penelitian',
        label: 'Tanda Tangan Pemonev',
        signerTitle: 'Pemonev Penelitian Hibah',
        signerNameDefault: 'Dr, Ratna Susanti, S.S., M.Pd',
        signerNidnDefault: '',
        description: 'Tampil pada lembar kedua Formulir Monev Poin 12.'
      }
    ]
  },
  {
    id: 'SURAT_TUGAS',
    categoryTitle: 'Surat Tugas (UPPM / Dosen / Mahasiswa)',
    categorySubtitle: 'Tanda tangan Ketua UPPM dan Pihak Mitra',
    icon: FileCheck,
    color: 'teal',
    items: [
      {
        key: 'ttd_surtug_ketua_uppm',
        label: 'Tanda Tangan Ketua UPPM',
        signerTitle: 'Ketua Unit Penelitian dan Pengabdian Masyarakat (UPPM)',
        signerNameDefault: 'Dr. Ratna Susanti, S.S., M.Pd.',
        signerNidnDefault: 'NIDN 0617067301',
        description: 'Tampil pada bagian tanda tangan Ketua UPPM di Surat Tugas.'
      },
      {
        key: 'ttd_surtug_mitra',
        label: 'Tanda Tangan Pihak Mitra (Opsional)',
        signerTitle: 'Pihak Mitra',
        signerNameDefault: 'Pihak Mitra',
        signerNidnDefault: '',
        description: 'Tampil pada bagian tanda tangan Mengetahui Pihak Mitra (jika diunggah).'
      }
    ]
  }
];

export default function AdminSignatures() {
  const [signatures, setSignatures] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [savingAll, setSavingAll] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    fetchAllSignatures();
  }, []);

  const fetchAllSignatures = async () => {
    setLoading(true);
    const loaded = {};
    try {
      const allItems = SIGNATURE_CATEGORIES.flatMap(c => c.items);
      await Promise.all(
        allItems.map(async (item) => {
          try {
            const res = await fetch(`${API_BASE_URL}/settings/${item.key}`);
            if (res.ok) {
              const data = await res.json();
              if (data.value_text) {
                loaded[item.key] = data.value_text;
              }
            }
          } catch (e) {
            console.error(`Error loading signature ${item.key}:`, e);
          }
        })
      );
      setSignatures(loaded);
    } catch (err) {
      console.error('Error fetching signatures:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('File harus berupa gambar (PNG/JPG/JPEG). Disarankan PNG transparan.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran file maksimal adalah 2MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setSignatures(prev => ({
        ...prev,
        [key]: reader.result
      }));
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
        value_text: valueText || ''
      })
    });
    if (!response.ok) {
      throw new Error(`Gagal menyimpan tanda tangan ${keyName}`);
    }
    return response.json();
  };

  const handleSaveSingle = async (item) => {
    setSavingKey(item.key);
    setMessage('');
    setError('');
    try {
      await saveSetting(item.key, signatures[item.key] || '');
      setMessage(`Tanda tangan untuk "${item.label}" berhasil disimpan!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan tanda tangan.');
    } finally {
      setSavingKey('');
    }
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    setMessage('');
    setError('');
    try {
      const allItems = SIGNATURE_CATEGORIES.flatMap(c => c.items);
      await Promise.all(
        allItems.map(item => saveSetting(item.key, signatures[item.key] || ''))
      );
      setMessage('Seluruh tanda tangan untuk semua jenis surat/form berhasil disimpan!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan seluruh tanda tangan.');
    } finally {
      setSavingAll(false);
    }
  };

  const filteredCategories = selectedCategory === 'ALL'
    ? SIGNATURE_CATEGORIES
    : SIGNATURE_CATEGORIES.filter(c => c.id === selectedCategory);

  return (
    <AdminLayout title="Kelola Tanda Tangan Surat & Form">
      <div className="space-y-6 max-w-7xl animate-fade-in pb-16">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-indigo-950 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <span>Upload & Kelola Tanda Tangan Resmi</span>
            </h3>
            <p className="text-xs text-slate-600 font-medium max-w-3xl leading-relaxed">
              Unggah file gambar tanda tangan basah / digital (format <strong>PNG transparan</strong> disarankan) untuk setiap surat atau formulir. Tanda tangan yang diunggah akan otomatis disematkan pada lembar cetak dokumen dan ekspor PDF.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={savingAll || !!savingKey}
            className="shrink-0 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {savingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Semua...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Simpan Semua Tanda Tangan</span>
              </>
            )}
          </button>
        </div>

        {/* Notifications */}
        {message && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs md:text-sm font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Category Tabs Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Semua Dokumen ({SIGNATURE_CATEGORIES.flatMap(c => c.items).length} Slot)
          </button>
          {SIGNATURE_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const count = cat.items.length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.categoryTitle.split('(')[0]}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center items-center py-20 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {filteredCategories.map((category) => {
              const CatIcon = category.icon;
              return (
                <div key={category.id} className="space-y-4">
                  
                  {/* Category Section Header */}
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 leading-tight">
                        {category.categoryTitle}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        {category.categorySubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Signatures Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                    {category.items.map((item) => {
                      const sigBase64 = signatures[item.key] || '';
                      const isSavingThis = savingKey === item.key;

                      return (
                        <div
                          key={item.key}
                          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between hover:border-indigo-200 transition-all"
                        >
                          <div className="space-y-4">
                            
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">
                                  {item.signerTitle}
                                </span>
                                <h5 className="font-extrabold text-slate-900 text-sm">
                                  {item.label}
                                </h5>
                                {item.signerNameDefault && (
                                  <p className="text-xs font-semibold text-slate-500">
                                    Pejabat default: <u>{item.signerNameDefault}</u> {item.signerNidnDefault ? `(${item.signerNidnDefault})` : ''}
                                  </p>
                                )}
                              </div>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                                sigBase64 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {sigBase64 ? 'Terpasang' : 'Kosong'}
                              </span>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              {item.description}
                            </p>

                            {/* Preview Signature Box */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
                                Pratinjau Tanda Tangan:
                              </label>
                              {sigBase64 ? (
                                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px] max-h-48 relative group">
                                  <img 
                                    src={sigBase64} 
                                    alt={item.label} 
                                    className="max-h-36 max-w-full object-contain filter drop-shadow-sm"
                                  />
                                </div>
                              ) : (
                                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50/40 text-center text-slate-500 flex flex-col items-center justify-center min-h-[140px]">
                                  <ImageIcon className="w-8 h-8 text-slate-400 mb-1.5 opacity-60" />
                                  <p className="font-bold text-slate-700 text-xs">Belum Ada Tanda Tangan</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Dokumen akan menampilkan spasi kosong untuk tanda tangan manual.</p>
                                </div>
                              )}
                            </div>

                            {/* File Upload Input */}
                            <div>
                              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Unggah Gambar Tanda Tangan:
                              </label>
                              <div className="relative group">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileChange(e, item.key)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-center text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 group-hover:bg-indigo-50/30 shadow-sm">
                                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{sigBase64 ? 'Ganti File Tanda Tangan (PNG/JPG)' : 'Pilih File Tanda Tangan (PNG/JPG)'}</span>
                                </div>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 block">Format PNG transparan sangat direkomendasikan agar menyatu rapi dengan kertas dokumen.</span>
                            </div>

                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleSaveSingle(item)}
                              disabled={isSavingThis || savingAll}
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isSavingThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Menyimpan...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Simpan Tanda Tangan</span>
                                </>
                              )}
                            </button>
                            {sigBase64 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Hapus tanda tangan untuk "${item.label}"?`)) {
                                    setSignatures(prev => ({ ...prev, [item.key]: '' }));
                                  }
                                }}
                                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer transition-colors"
                                title="Hapus Gambar Tanda Tangan"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Tip Box */}
        <div className="bg-indigo-50/60 rounded-3xl p-6 border border-indigo-100 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs text-indigo-950 font-medium leading-relaxed">
            <h5 className="font-black text-sm text-indigo-950">Informasi Integrasi Tanda Tangan</h5>
            <p>
              1. Gambar tanda tangan yang tersimpan otomatis dimuat saat Anda membuka halaman <strong>Generate Surat</strong> (SKM, Form Integrasi PPM, Form Penilaian Proposal, Form Monev Penelitian), serta saat mencetak atau mengekspor PDF/ZIP.
            </p>
            <p>
              2. Pada <strong>Surat Dinas Mahasiswa</strong> (KP/Magang/Riset), tanda tangan disandingkan secara elegan dengan QR Code Validasi Digital agar dokumen sah dan dapat diverifikasi secara publik.
            </p>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
