import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { Save, AlertTriangle, CheckCircle, Loader2, Info, Eye, Clipboard, RefreshCw, Code } from 'lucide-react';

export default function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingText, setEditingText] = useState('');
  const [kopSurat, setKopSurat] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Mock data for previewing placeholders
  const mockData = {
    nim: '2201418001',
    nama_mahasiswa: 'Budi Handoko',
    prodi: 'Teknik Informatika',
    created_at: new Date().toISOString(),
    data_dinamis: {
      nama_kegiatan: 'Magang Software Engineer',
      tgl_kegiatan: new Date().toISOString(),
      nama_pihak_mitra: 'Ahmad Subarjo',
      jabatan_di_mitra: 'Manager HRD',
      nama_tempat: 'PT. Telkom Indonesia Divre IV',
      alamat: 'Jl. Pahlawan No.10, Kota Semarang',
      anggota_kelompok: [
        { nim: '2201418002', nama: 'Siti Aminah' },
        { nim: '2201418003', nama: 'Rian Hidayat' },
        { nim: '2201418004', nama: 'Dewi Lestari' },
        { nim: '2201418005', nama: 'Fajar Nugroho' },
        { nim: '2201418006', nama: 'Larasati Putri' }
      ]
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchKopSurat();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        if (data.length > 0) {
          setEditingText(data[0].template_text || '');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat template surat.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKopSurat = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/kop_surat`);
      if (response.ok) {
        const data = await response.json();
        setKopSurat(data.value_text || '');
      }
    } catch (err) {
      console.error('Error fetching kop:', err);
    }
  };

  const handleSelectTemplate = (index) => {
    setSelectedIdx(index);
    setEditingText(templates[index]?.template_text || '');
    setMessage('');
    setError('');
  };

  const handleSave = async () => {
    if (selectedIdx === -1) return;
    setSaving(true);
    setMessage('');
    setError('');
    const token = localStorage.getItem('adminToken');
    const selectedTemplate = templates[selectedIdx];

    try {
      const response = await fetch(`${API_BASE_URL}/admin/templates/${selectedTemplate.kode_surat}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ template_text: editingText })
      });

      if (!response.ok) {
        throw new Error('Gagal memperbarui template.');
      }

      // Update local state list
      const updated = [...templates];
      updated[selectedIdx].template_text = editingText;
      setTemplates(updated);

      setMessage(`Template ${selectedTemplate.kode_surat} berhasil disimpan!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    let defaultText = '';
    const code = templates[selectedIdx]?.kode_surat;
    if (code === 'SPKP') {
      defaultText = `<p class="text-justify indent-8 mb-4">Dalam rangka memenuhi kurikulum akademik pada Program Studi {prodi} Politeknik Indonusa Surakarta, kami bermaksud menghadapkan mahasiswa kami untuk dapat melaksanakan mata kuliah <strong>Kerja Praktik (KP) / Magang Industri</strong> pada perusahaan/instansi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Mengingat pentingnya kegiatan ini guna menyelaraskan kompetensi akademis mahasiswa dengan praktik nyata di industri, kami mohon kiranya Bapak/Ibu berkenan menerima pengajuan Kerja Praktik mahasiswa kami di bawah ini:</p>`;
    } else if (code === 'SIP') {
      defaultText = `<p class="text-justify indent-8 mb-4">Sehubungan dengan penyusunan tugas akhir / skripsi mahasiswa Politeknik Indonusa Surakarta, kami bermaksud mengajukan permohonan izin penelitian dan pengambilan data bagi mahasiswa kami di perusahaan / instansi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Adapun fokus penelitian yang diajukan berjudul <strong>"{nama_kegiatan}"</strong>. Penelitian direncanakan mulai dilaksanakan pada {tgl_kegiatan}. Terkait hal tersebut, mohon perkenan Bapak/Ibu untuk memberikan izin kepada mahasiswa kami:</p>`;
    } else if (code === 'SKAK') {
      defaultText = `<p class="text-justify indent-8 mb-4">Direktur Politeknik Indonusa Surakarta dengan ini menerangkan bahwa mahasiswa yang namanya tercantum di bawah ini adalah benar-benar mahasiswa aktif terdaftar pada Tahun Akademik {tahun_akademik_1}/{tahun_akademik_2} dan berkelakuan baik:</p>`;
    } else {
      defaultText = `<p class="text-justify indent-8 mb-4">Dengan hormat, sehubungan dengan pelaksanaan kegiatan mahasiswa di luar kampus, kami mengajukan permohonan rekomendasi / izin bagi mahasiswa kami untuk menyelenggarakan kegiatan <strong>"{nama_kegiatan}"</strong> pada lokasi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Berikut adalah identitas mahasiswa pemohon beserta anggota kelompok pelaksana kegiatan tersebut:</p>`;
    }
    
    setEditingText(defaultText);
    setMessage('Teks template di-reset ke bawaan (Jangan lupa klik Simpan untuk memperbarui database).');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage(`Kode placeholder ${text} berhasil disalin ke clipboard!`);
    setTimeout(() => setMessage(''), 3000);
  };

  const formatDateIndo = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Replace placeholders helper
  const compileTemplate = (template, item) => {
    if (!template) return '';
    const year1 = item.created_at ? new Date(item.created_at).getFullYear() : new Date().getFullYear();
    const year2 = year1 + 1;
    const tglKegiatanFormatted = item.data_dinamis?.tgl_kegiatan ? formatDateIndo(item.data_dinamis.tgl_kegiatan) : '';

    return template
      .replace(/{prodi}/g, item.prodi || '')
      .replace(/{nama_kegiatan}/g, item.data_dinamis?.nama_kegiatan || '')
      .replace(/{tgl_kegiatan}/g, tglKegiatanFormatted)
      .replace(/{tahun_akademik_1}/g, year1)
      .replace(/{tahun_akademik_2}/g, year2);
  };

  const currentTemplate = templates[selectedIdx];
  const compiledPreviewHtml = currentTemplate ? compileTemplate(editingText, mockData) : '';

  return (
    <AdminLayout title="Kelola Template Surat">
      <div className="space-y-6 animate-fade-in pb-16">
        
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-indigo-950">Kelola Template Surat</h3>
            <p className="text-xs text-slate-600 mt-1 font-semibold">
              Gunakan kolom editor teks di sebelah kiri untuk menyesuaikan isi surat secara manual, dan pantau hasilnya langsung pada pratinjau A4 di sebelah kanan.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetDefault}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-350 text-slate-700 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset ke Bawaan</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/15 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Simpan Template</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {message && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-sm font-bold flex items-center gap-2 shadow-sm transition-all">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            {message}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-sm transition-all">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Template Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl, index) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(index)}
                  className={`px-5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    index === selectedIdx
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tpl.nama_surat} ({tpl.kode_surat})
                </button>
              ))}
            </div>

            {/* Split Grid: Left Editor, Right Preview */}
            {currentTemplate && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Editor Form */}
                <div className="xl:col-span-5 space-y-6">
                  <div className="bg-white rounded-2xl p-6 border border-blue-100 shadow-md shadow-blue-100/30 space-y-5">
                    
                    <div className="flex items-center gap-2 pb-3 border-b border-blue-50">
                      <Code className="w-5 h-5 text-blue-600" />
                      <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wide">Kolom Edit Text ({currentTemplate.kode_surat})</h4>
                    </div>

                    {/* Placeholder Reference Box */}
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-2">
                      <h5 className="text-[10px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600" /> Kode Placeholder
                      </h5>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                        Klik untuk menyalin kode placeholder, kemudian tempelkan ke dalam kolom edit teks di bawah:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { code: '{prodi}', label: 'Prodi' },
                          { code: '{nama_kegiatan}', label: 'Kegiatan' },
                          { code: '{tgl_kegiatan}', label: 'Tanggal' },
                          { code: '{tahun_akademik_1}', label: 'Thn Awal' },
                          { code: '{tahun_akademik_2}', label: 'Thn Akhir' }
                        ].map((ph) => (
                          <button
                            key={ph.code}
                            onClick={() => copyToClipboard(ph.code)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-blue-100 rounded-lg font-mono text-[9px] font-bold text-blue-800 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Clipboard className="w-3 h-3 text-blue-600" />
                            <span>{ph.code}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Editor Textarea */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-700">Isi Paragraf Surat</label>
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={14}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed"
                        placeholder="Ketik isi template surat dinas disini..."
                      />
                    </div>

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Simpan Perubahan</span>
                    </button>

                  </div>
                </div>

                {/* Right Side: Live A4 Preview */}
                <div className="xl:col-span-7 space-y-4">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-950">Pratinjau Hasil Cetak (A4)</span>
                  </div>

                  {/* Simulated Workspace Background Canvas */}
                  <div className="bg-slate-200/60 rounded-3xl p-4 md:p-6 border border-slate-300 overflow-x-auto shadow-inner">
                    <div className="min-w-fit flex justify-center">
                      
                      {/* Visual A4 Document Box */}
                      <div 
                        className="w-[794px] min-h-[1123px] bg-white shadow-2xl pt-0 px-16 pb-16 border border-slate-350 flex flex-col justify-between text-black leading-relaxed relative shrink-0"
                        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}
                      >
                        
                        <div>
                          {/* Top Letterhead Area */}
                          {kopSurat ? (
                            <div className="w-full border-b-[3px] border-black pb-3 mb-6">
                              <img src={kopSurat} alt="Kop Surat" className="w-full max-h-20 object-contain" />
                            </div>
                          ) : (
                            <div className="border-b-[3px] border-black pb-3 mb-6 text-center">
                              <h4 className="font-sans font-black text-sm uppercase leading-none">Politeknik Indonusa Surakarta</h4>
                              <p className="font-sans text-[10px] mt-1 text-slate-500">Jl. KH Samanhudi No.3-5 Surakarta</p>
                            </div>
                          )}

                          {/* 2. Reference Number & Date Line */}
                          <table className="w-full mb-6 border-collapse text-black" style={{ fontSize: '12pt' }}>
                            <tbody>
                              <tr className="align-top font-bold">
                                <td className="w-20 py-0.5">Nomor</td>
                                <td className="w-4 py-0.5 text-center">:</td>
                                <td className="py-0.5">456/UN37.1.5/KP/2026</td>
                                <td className="text-right py-0.5 whitespace-nowrap shrink-0" rowSpan={3} style={{ width: '220px' }}>
                                  Surakarta, 22 Juni 2026
                                </td>
                              </tr>
                              <tr className="align-top font-bold">
                                <td className="py-0.5">Lampiran</td>
                                <td className="text-center py-0.5">:</td>
                                <td className="py-0.5">-</td>
                              </tr>
                              <tr className="align-top font-bold">
                                <td className="py-0.5">Hal</td>
                                <td className="text-center py-0.5">:</td>
                                <td className="py-0.5">Permohonan {currentTemplate.nama_surat}</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Addressee Info */}
                          <div className="mb-6 font-bold text-black" style={{ fontSize: '12pt' }}>
                            <p className="mb-1 font-medium">Kepada Yth.</p>
                            <p className="font-bold">{mockData.data_dinamis.nama_pihak_mitra} selaku {mockData.data_dinamis.jabatan_di_mitra}</p>
                            <p className="font-medium">{mockData.data_dinamis.alamat}</p>
                          </div>

                          {/* DYNAMIC PARAGRAPH BLOCK */}
                          <div className="mb-6">
                            {compiledPreviewHtml ? (
                              <div 
                                className="space-y-3 leading-relaxed text-justify text-black"
                                style={{ fontSize: '12pt' }}
                                dangerouslySetInnerHTML={{ __html: compiledPreviewHtml }} 
                              />
                            ) : (
                              <p className="text-slate-400 italic text-center py-4 font-sans text-xs">Isi paragraf kosong.</p>
                            )}
                          </div>

                          {/* Table showing details of students (Simplified - No Prodi & Angkatan) */}
                          <div className="mb-6 pl-8">
                            <table className="w-full border-collapse border border-black text-black text-left" style={{ fontSize: '12pt' }}>
                              <thead>
                                <tr className="bg-slate-100 font-extrabold">
                                  <th className="py-2 px-3 border border-black w-12 text-center">No</th>
                                  <th className="py-2 px-3 border border-black w-40">NIM</th>
                                  <th className="py-2 px-3 border border-black">Nama Lengkap</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="font-bold">
                                  <td className="py-2 px-3 border border-black text-center">1</td>
                                  <td className="py-2 px-3 border border-black font-mono">{mockData.nim}</td>
                                  <td className="py-2 px-3 border border-black">{mockData.nama_mahasiswa} (Ketua)</td>
                                </tr>
                                {mockData.data_dinamis.anggota_kelompok.map((member, index) => (
                                  <tr key={index} className="font-medium">
                                    <td className="py-2 px-3 border border-black text-center">{index + 2}</td>
                                    <td className="py-2 px-3 border border-black font-mono">{member.nim}</td>
                                    <td className="py-2 px-3 border border-black">{member.nama}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Closing template preview */}
                          <p className="text-justify indent-8 mb-8 text-black" style={{ fontSize: '12pt' }}>
                            Demikian surat permohonan ini kami sampaikan. Atas bantuan, kerja sama, dan perhatian Bapak/Ibu dalam memfasilitasi kebutuhan akademik mahasiswa kami, kami menyampaikan terima kasih yang sebesar-besarnya.
                          </p>
                        </div>

                        {/* Signature Section (Kajur/Kaprodi) */}
                        <div className="flex justify-end text-black" style={{ fontSize: '12pt' }}>
                          <div className="w-80 text-left space-y-1 relative">
                            <p className="font-bold">a.n. Kepala Program Studi,</p>
                            <p className="font-bold">D4 Teknologi Rekayasa Perangkat Lunak,</p>
                            
                            {/* Mock QR Validation Badge */}
                            <div className="my-2 p-1.5 border border-slate-200 rounded flex items-center gap-2 bg-slate-50 font-sans">
                              <div className="w-8 h-8 bg-slate-200 rounded border border-slate-350 flex items-center justify-center font-bold text-[7px] shrink-0">QR</div>
                              <div className="leading-tight">
                                <p className="font-bold text-[7px] text-indigo-900">VALIDASI DIGITAL</p>
                                <p className="text-[6.5px] text-slate-500">Scan QR Code untuk verifikasi.</p>
                              </div>
                            </div>

                            <p className="font-bold text-black underline">Dwi Iskandar, M.Kom</p>
                            <p className="text-black text-xs font-bold leading-none">NIDN. 0603048802</p>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </AdminLayout>
  );
}
