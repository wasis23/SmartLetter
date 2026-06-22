import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { Printer, ArrowLeft, Loader2, QrCode } from 'lucide-react';

export default function AdminCetak() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [kopSurat, setKopSurat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDetail();
    fetchKopSurat();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    try {
      const url = token 
        ? `${API_BASE_URL}/admin/pengajuan/${id}` 
        : `${API_BASE_URL}/public/pengajuan/${id}`;
      
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error('Gagal mengambil data detail pengajuan surat.');
      }
      const result = await response.json();
      if (result.status !== 'disetujui') {
        throw new Error('Hanya surat yang disetujui yang dapat dicetak.');
      }
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Gagal memuat surat.');
    } finally {
      setLoading(false);
    }
  };

  const fetchKopSurat = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/kop_surat`);
      if (response.ok) {
        const result = await response.json();
        setKopSurat(result.value_text || '');
      }
    } catch (err) {
      console.error('Gagal mengambil gambar kop surat:', err);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <span className="text-slate-200 text-sm font-medium">Menyiapkan Dokumen Surat...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
        <div className="glass-card rounded-2xl p-6 text-center max-w-sm border border-red-500/20">
          <p className="text-red-400 text-sm font-bold mb-4">{error || 'Surat tidak ditemukan.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Validation Link pointing to validation page
  const validationUrl = `${window.location.origin}/validasi/${data.id}`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(validationUrl)}`;

  // Compile template placeholders
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

  // Generate Letter Body Text dynamically based on code
  const renderLetterBody = () => {
    if (data.template_text) {
      const htmlContent = compileTemplate(data.template_text, data);
      return (
        <div 
          className="dynamic-letter-body leading-relaxed text-justify"
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      );
    }

    switch (data.kode_surat) {
      case 'SPKP': // Surat Pengantar Kerja Praktik
        return (
          <>
            <p className="text-justify indent-8 mb-4">
              Dalam rangka memenuhi kurikulum akademik pada Program Studi {data.prodi} Politeknik Indonusa Surakarta, kami bermaksud menghadapkan mahasiswa kami untuk dapat melaksanakan mata kuliah <strong>Kerja Praktik (KP) / Magang Industri</strong> pada perusahaan/instansi yang Bapak/Ibu pimpin.
            </p>
            <p className="text-justify indent-8 mb-4">
              Meningat pentingnya kegiatan ini guna menyelaraskan kompetensi akademis mahasiswa dengan praktik nyata di industri, kami mohon kiranya Bapak/Ibu berkenan menerima pengajuan Kerja Praktik mahasiswa kami di bawah ini:
            </p>
          </>
        );
      case 'SIP': // Surat Izin Penelitian
        return (
          <>
            <p className="text-justify indent-8 mb-4">
              Sehubungan dengan penyusunan tugas akhir / skripsi mahasiswa Politeknik Indonusa Surakarta, kami bermaksud mengajukan permohonan izin penelitian dan pengambilan data bagi mahasiswa kami di perusahaan / instansi yang Bapak/Ibu pimpin.
            </p>
            <p className="text-justify indent-8 mb-4">
              Adapun fokus penelitian yang diajukan berjudul <strong>"{data.data_dinamis?.nama_kegiatan}"</strong>. Penelitian direncanakan mulai dilaksanakan pada {formatDateIndo(data.data_dinamis?.tgl_kegiatan)}. Terkait hal tersebut, mohon perkenan Bapak/Ibu untuk memberikan izin kepada mahasiswa kami:
            </p>
          </>
        );
      case 'SKAK': // Surat Keterangan Aktif Kuliah
        return (
          <>
            <p className="text-justify indent-8 mb-4">
              Direktur Politeknik Indonusa Surakarta dengan ini menerangkan bahwa mahasiswa yang namanya tercantum di bawah ini adalah benar-benar mahasiswa aktif terdaftar pada Tahun Akademik {new Date(data.created_at).getFullYear()}/{new Date(data.created_at).getFullYear() + 1} dan berkelakuan baik:
            </p>
          </>
        );
      default: // Generic / Default
        return (
          <>
            <p className="text-justify indent-8 mb-4">
              Dengan hormat, sehubungan dengan pelaksanaan kegiatan mahasiswa di luar kampus, kami mengajukan permohonan rekomendasi / izin bagi mahasiswa kami untuk menyelenggarakan kegiatan <strong>"{data.data_dinamis?.nama_kegiatan}"</strong> pada lokasi yang Bapak/Ibu pimpin.
            </p>
            <p className="text-justify indent-8 mb-4">
              Berikut adalah identitas mahasiswa pemohon beserta anggota kelompok pelaksana kegiatan tersebut:
            </p>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-blue-50/50 text-slate-800 flex justify-center py-8 md:py-12 px-4 relative">
      
      {/* Floating Action Menu - Hidden during printing */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur shadow-2xl border border-slate-200 px-6 py-4 rounded-2xl flex gap-4 items-center z-50 no-print">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <div className="w-px h-6 bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-900">Nomor: {data.nomor_surat}</span>
        </div>
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Cetak Surat (PDF)
        </button>
      </div>

      {/* A4 Paper Container */}
      <div 
        className="print-page w-[210mm] min-h-[297mm] bg-white border border-slate-300 pt-0 px-[20mm] pb-[20mm] shadow-2xl relative leading-relaxed flex flex-col justify-between text-black"
        style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12pt' }}
      >
        
        <div>
          {/* 1. Official Kop Surat Header */}
          {kopSurat ? (
            <div className="w-full border-b-[3px] border-double border-black pb-4 mb-6">
              <img src={kopSurat} alt="Kop Surat Resmi" className="w-full max-h-[120px] object-contain" />
            </div>
          ) : (
            <div className="flex items-center gap-4 border-b-[3px] border-double border-black pb-4 mb-6">
              {/* Fallback Text-based Kop */}
              <div className="w-20 h-20 bg-slate-100 border-2 border-black rounded-full flex flex-col items-center justify-center text-center shrink-0">
                <span className="text-[9px] font-black font-sans leading-none">POLTEK</span>
                <span className="text-[8px] font-bold font-sans leading-none mt-1">INDONUSA</span>
              </div>
              <div className="text-center flex-1 font-sans">
                <h3 className="text-[10pt] font-extrabold uppercase leading-tight tracking-wider text-black">Yayasan Indonesia Surakarta</h3>
                <h2 className="text-[13pt] font-black uppercase leading-tight tracking-wide text-black mt-0.5">Politeknik Indonusa Surakarta</h2>
                <p className="text-[8pt] text-black leading-tight mt-1.5 font-medium font-sans">
                  Kampus I: Jl. KH. Samanhudi No. 3-5, Bumi, Laweyan, Surakarta 57148<br />
                  Telp: (0271) 712345 • Email: info@poltekindonusa.ac.id • Web: www.poltekindonusa.ac.id
                </p>
              </div>
            </div>
          )}

          {/* 2. Reference Number & Date Line */}
          <table className="w-full mb-6 border-collapse text-black" style={{ fontSize: '12pt' }}>
            <tbody>
              <tr className="align-top font-bold">
                <td className="w-20 py-0.5">Nomor</td>
                <td className="w-4 py-0.5 text-center">:</td>
                <td className="py-0.5">{data.nomor_surat}</td>
                <td className="text-right py-0.5 whitespace-nowrap shrink-0" rowSpan={3} style={{ width: '220px' }}>
                  Surakarta, {formatDateIndo(data.tanggal_surat)}
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
                <td className="py-0.5">Permohonan {data.nama_surat}</td>
              </tr>
            </tbody>
          </table>

          {/* 3. Addressee details */}
          <div className="mb-6 font-bold text-black" style={{ fontSize: '12pt' }}>
            <p className="mb-1 font-medium">Kepada Yth.</p>
            <p className="font-bold">{data.data_dinamis?.nama_pihak_mitra} selaku {data.data_dinamis?.jabatan_di_mitra}</p>
            <p className="whitespace-pre-line leading-snug font-medium">{data.data_dinamis?.alamat}</p>
          </div>

          {/* 4. Body Content */}
          <div className="text-black leading-relaxed" style={{ fontSize: '12pt' }}>
            {renderLetterBody()}
          </div>

          {/* 5. Applicant student detail / list */}
          <div className="my-6 pl-8">
            <table className="w-full text-left border-collapse border border-black" style={{ fontSize: '12pt' }}>
              <thead>
                <tr className="bg-slate-100 font-extrabold">
                  <th className="py-2 px-3 border border-black w-12 text-center">No</th>
                  <th className="py-2 px-3 border border-black w-40">NIM</th>
                  <th className="py-2 px-3 border border-black">Nama Lengkap</th>
                </tr>
              </thead>
              <tbody>
                {/* Chief Student (Applicant) */}
                <tr className="font-bold">
                  <td className="py-2 px-3 border border-black text-center">1</td>
                  <td className="py-2 px-3 border border-black font-mono">{data.nim}</td>
                  <td className="py-2 px-3 border border-black">{data.nama_mahasiswa} (Ketua)</td>
                </tr>
                {/* Other members */}
                {data.data_dinamis?.anggota_kelompok?.map((member, index) => (
                  <tr key={index} className="font-medium">
                    <td className="py-2 px-3 border border-black text-center">{index + 2}</td>
                    <td className="py-2 px-3 border border-black font-mono">{member.nim}</td>
                    <td className="py-2 px-3 border border-black">{member.nama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 6. Closing paragraph */}
          <div className="text-black" style={{ fontSize: '12pt' }}>
            <p className="text-justify indent-8 font-medium">
              Demikian surat permohonan ini kami sampaikan. Atas bantuan, kerja sama, dan perhatian Bapak/Ibu dalam memfasilitasi kebutuhan akademik mahasiswa kami, kami menyampaikan terima kasih yang sebesar-besarnya.
            </p>
          </div>
        </div>

        {/* 7. Barcode Signature Block */}
        <div className="flex justify-end mt-8 text-black" style={{ fontSize: '12pt' }}>
          <div className="w-80 text-left space-y-1 relative">
            <p className="font-bold">a.n. Kepala Program Studi,</p>
            <p className="font-bold">D4 Teknologi Rekayasa Perangkat Lunak,</p>
            
            {/* Signature Barcode (QR Code Validation Link) */}
            <div className="py-4 flex items-center gap-3">
              <div className="border border-black p-1 bg-white shrink-0">
                <img src={qrCodeApiUrl} alt="Tanda Tangan QR Barcode" className="w-24 h-24" />
              </div>
              <div className="leading-tight text-[8pt] text-black font-bold font-sans">
                <span className="text-[8.5pt] font-black block text-indigo-900 border-b border-black pb-0.5 mb-1">VALIDASI DIGITAL</span>
                <span className="block font-mono">ID: {data.id}</span>
                <span className="block mt-0.5 text-slate-500 font-medium">Scan barcode untuk verifikasi keabsahan dokumen.</span>
              </div>
            </div>

            <p className="font-bold text-black underline">Dwi Iskandar, M.Kom</p>
            <p className="text-black text-xs font-bold leading-none">NIDN. 0603048802</p>
          </div>
        </div>

      </div>
    </div>
  );
}
