import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { CheckCircle2, AlertTriangle, FileText, Calendar, User, Users, ShieldAlert, ArrowLeft, Loader2, Printer } from 'lucide-react';

export default function PublicValidation() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchValidationData();
  }, [id]);

  const fetchValidationData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/public/pengajuan/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Data surat tidak ditemukan atau surat belum disetujui resmi.');
        }
        throw new Error('Gagal memproses validasi surat.');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan sistem saat menghubungi database.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 text-slate-800 flex flex-col items-center justify-center p-4">
      {/* Background Decorative Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-2xl my-6 animate-fade-in">
        
        {/* Branding Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto mb-3">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight uppercase">Sistem Validasi Surat Digital</h2>
          <p className="text-xs text-blue-600 font-black mt-1 tracking-widest uppercase">Politeknik Indonusa Surakarta</p>
        </div>

        {/* Content Card */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-blue-100 shadow-md">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-sm font-semibold text-slate-600">Memproses verifikasi tanda tangan digital...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 md:p-10 border border-red-200 text-center shadow-xl space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-200">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-indigo-950">Dokumen Tidak Valid / Tidak Ditemukan</h3>
              <p className="text-sm text-slate-700 mt-2 font-bold leading-relaxed">
                {error}
              </p>
              <p className="text-xs text-red-800 mt-4 leading-relaxed bg-red-50 p-3 rounded-lg border border-red-100 font-bold">
                Peringatan: Pastikan nomor surat dan link validasi berasal dari kode QR resmi yang dicetak pada surat dinas Politeknik Indonusa Surakarta.
              </p>
            </div>
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600" /> Ke Halaman Utama
            </Link>
          </div>
        ) : data ? (
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-blue-100 shadow-xl space-y-6">
            
            {/* Status Banner - High contrast light green */}
            <div className="text-center bg-emerald-50 border border-emerald-250 rounded-2xl p-5 flex flex-col items-center shadow-sm">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mb-2" />
              <h3 className="text-lg font-black text-emerald-800 uppercase tracking-widest">Surat Terverifikasi Asli</h3>
              <p className="text-sm text-slate-700 font-bold mt-1">Dokumen ini sah dan terdaftar resmi di basis data akademik kampus</p>
            </div>

            {/* Letter Metadata */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-blue-50 pb-2">Rincian Dokumen Resmi</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Nomor Surat</span>
                  <span className="font-mono font-black text-indigo-900 text-base">{data.nomor_surat}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Tanggal Terbit Resmi</span>
                  <span className="font-extrabold text-slate-900 text-base">{formatDateIndo(data.tanggal_surat)}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Jenis Surat Dinas</span>
                  <span className="font-extrabold text-slate-900 text-base">{data.nama_surat} ({data.kode_surat})</span>
                </div>
              </div>
            </div>

            {/* Student metadata */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-blue-50 pb-2">Identitas Pemohon Utama</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">NIM Ketua</span>
                  <span className="font-mono font-black text-indigo-900 text-base">{data.nim}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Nama Lengkap</span>
                  <span className="font-extrabold text-slate-900 text-base">{data.nama_mahasiswa}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Program Studi</span>
                  <span className="font-extrabold text-slate-800 text-base">{data.prodi}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Angkatan / Email</span>
                  <span className="font-bold text-slate-800 text-base">{data.angkatan} • {data.email}</span>
                </div>
              </div>
            </div>

            {/* Activity details */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-blue-50 pb-2">Detail Rencana Kegiatan</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="md:col-span-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Nama Kegiatan</span>
                  <span className="font-extrabold text-slate-900 text-base">{data.data_dinamis?.nama_kegiatan}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider font-bold">Penerima Surat di Mitra</span>
                  <span className="font-extrabold text-indigo-900 text-base">{data.data_dinamis?.nama_pihak_mitra}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Jabatan Mitra</span>
                  <span className="font-bold text-slate-800 text-base">{data.data_dinamis?.jabatan_di_mitra}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Alamat Pelaksanaan</span>
                  <span className="font-extrabold text-slate-900 block text-base">{data.data_dinamis?.nama_tempat}</span>
                  <p className="text-sm text-slate-700 mt-1.5 whitespace-pre-line leading-relaxed font-semibold">{data.data_dinamis?.alamat}</p>
                </div>
              </div>
            </div>

            {/* Group Members */}
            {data.data_dinamis?.anggota_kelompok?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 border-b border-blue-50 pb-2">Daftar Anggota Kelompok</h4>
                <div className="overflow-hidden border border-blue-100 rounded-xl bg-white">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-blue-50/50 text-indigo-950 text-xs font-black uppercase tracking-wider border-b border-blue-100">
                        <th className="py-2.5 px-4 w-10 text-center text-slate-500">No</th>
                        <th className="py-2.5 px-4">NIM</th>
                        <th className="py-2.5 px-4">Nama Anggota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-700 font-bold">
                      {data.data_dinamis.anggota_kelompok.map((member, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="py-2.5 px-4 text-slate-500 font-black text-center">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-extrabold text-blue-700">{member.nim}</td>
                          <td className="py-2.5 px-4 text-slate-900">{member.nama}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Download/Print Button */}
            <div className="text-center pt-2">
              <Link
                to={`/cetak/${data.id}`}
                target="_blank"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-lg shadow-blue-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer className="w-5 h-5" />
                <span>Unduh / Cetak Surat Resmi (PDF)</span>
              </Link>
            </div>

            {/* Validation Authority Footnote */}
            <div className="text-center text-xs text-slate-500 font-bold mt-6 border-t border-blue-50 pt-4">
              Dokumen resmi dikeluarkan secara elektronik oleh Politeknik Indonusa Surakarta.<br/>
              Proses verifikasi ini dijamin sah secara hukum berdasarkan data server SmartLetter.
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
