import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { ArrowLeft, User, FileText, Calendar, Building, Users, CheckCircle, XCircle, Printer, Loader2, Send } from 'lucide-react';

export default function AdminDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [error, setError] = useState('');
  
  // Input fields for approval
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState('');

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pengajuan/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil rincian data.');
      }
      const result = await response.json();
      setData(result);
      if (result.nomor_surat) setNomorSurat(result.nomor_surat);
      if (result.tanggal_surat) {
        // Format YYYY-MM-DD for date input
        const d = new Date(result.tanggal_surat);
        const formatted = d.toISOString().split('T')[0];
        setTanggalSurat(formatted);
      } else {
        // Default to today
        setTanggalSurat(new Date().toISOString().split('T')[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Gagal memuat detail pengajuan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (status === 'disetujui' && (!nomorSurat || !tanggalSurat)) {
      alert('Silakan isi Nomor Surat dan Tanggal Surat terlebih dahulu.');
      return;
    }

    setUpdating(true);
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pengajuan/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          nomor_surat: status === 'disetujui' ? nomorSurat : null,
          tanggal_surat: status === 'disetujui' ? tanggalSurat : null
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengubah status.');
      }

      alert(`Pengajuan berhasil diperbarui menjadi: ${status.toUpperCase()}`);
      
      // If approved, redirect straight to print page!
      if (status === 'disetujui') {
        navigate(`/admin/cetak/${id}`);
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pengajuan/${id}/kirim-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal mengirim email.');
      }
      
      alert('Surat dinas PDF berhasil dikirim ke email mahasiswa!');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Terjadi kesalahan saat mengirim email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <AdminLayout title="Memuat Detail...">
        <div className="flex justify-center items-center py-24">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="Detail Pengajuan">
        <div className="bg-white rounded-2xl p-8 text-center border border-red-200 shadow-md">
          <p className="text-red-650 text-sm font-bold">{error || 'Pengajuan tidak ditemukan.'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm"
          >
            Kembali
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Detail Pengajuan #${data.id}`}>
      <div className="space-y-6 animate-fade-in">
        
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:text-indigo-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Profil Pemohon */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-100">
              <div className="flex items-center gap-2.5 border-b border-blue-50 pb-3.5 mb-4">
                <User className="w-4.5 h-4.5 text-blue-600" />
                <h4 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider">Profil Mahasiswa Pemohon</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">NIM Pemohon</span>
                  <span className="font-mono font-black text-indigo-950 text-base">{data.nim}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Nama Lengkap</span>
                  <span className="font-extrabold text-slate-900 text-base">{data.nama_mahasiswa}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Program Studi</span>
                  <span className="font-extrabold text-slate-800">{data.prodi}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Angkatan / Email</span>
                  <span className="text-slate-800 font-bold">{data.angkatan} • {data.email}</span>
                </div>
              </div>
            </div>

            {/* 2. Detail Dinamis Surat */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-100">
              <div className="flex items-center gap-2.5 border-b border-blue-50 pb-3.5 mb-4">
                <FileText className="w-4.5 h-4.5 text-blue-600" />
                <h4 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider">Isi Data Dinamis Kegiatan</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Jenis Surat</span>
                  <span className="font-extrabold text-slate-900">{data.nama_surat} ({data.kode_surat})</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Nama Kegiatan</span>
                  <span className="font-extrabold text-blue-700">{data.data_dinamis?.nama_kegiatan}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Tanggal Pelaksanaan</span>
                  <span className="font-bold text-slate-800">{formatDate(data.data_dinamis?.tgl_kegiatan)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Email Ketua</span>
                  <span className="text-slate-800 font-bold font-mono">{data.data_dinamis?.email_ketua}</span>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-start gap-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <Building className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 font-bold block">Penerima Surat di Mitra</span>
                      <span className="font-extrabold text-indigo-950 block">{data.data_dinamis?.nama_pihak_mitra}</span>
                      <span className="text-xs text-slate-600 italic block mt-0.5 font-semibold">{data.data_dinamis?.jabatan_di_mitra}</span>
                      <span className="text-xs text-indigo-900 font-black block mt-2">{data.data_dinamis?.nama_tempat}</span>
                      <p className="text-xs text-slate-700 mt-1 whitespace-pre-line leading-relaxed font-semibold">{data.data_dinamis?.alamat}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Anggota Kelompok */}
            <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-100">
              <div className="flex items-center gap-2.5 border-b border-blue-50 pb-3.5 mb-4">
                <Users className="w-4.5 h-4.5 text-blue-600" />
                <h4 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider">Daftar Anggota Kelompok</h4>
              </div>
              {data.data_dinamis?.anggota_kelompok?.length > 0 ? (
                <div className="overflow-hidden border border-blue-100 rounded-xl bg-white">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-blue-50/50 text-indigo-950 text-xs font-black border-b border-blue-100">
                        <th className="py-2.5 px-4 w-12 text-slate-500">No</th>
                        <th className="py-2.5 px-4">NIM</th>
                        <th className="py-2.5 px-4">Nama Anggota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-700 font-bold">
                      {data.data_dinamis.anggota_kelompok.map((member, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/30">
                          <td className="py-2.5 px-4 text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-2.5 px-4 font-mono font-extrabold text-xs text-blue-700">{member.nim}</td>
                          <td className="py-2.5 px-4 text-slate-900">{member.nama}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 font-bold italic">Pengajuan bersifat individu (tidak ada anggota kelompok).</p>
              )}
            </div>

          </div>

          {/* Admin Processing Actions Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-blue-100 sticky top-24">
              
              {/* Status Badge */}
              <div className="mb-6 text-center">
                <span className="text-xs text-slate-500 block mb-1.5 uppercase font-bold">Status Pengajuan</span>
                {data.status === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-250 px-4 py-1.5 rounded-full text-xs font-black animate-pulse">
                    Menunggu Verifikasi
                  </span>
                )}
                {data.status === 'disetujui' && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-250 px-4 py-1.5 rounded-full text-xs font-black">
                    Disetujui
                  </span>
                )}
                {data.status === 'ditolak' && (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-250 px-4 py-1.5 rounded-full text-xs font-black">
                    Ditolak
                  </span>
                )}
              </div>

              {/* Action Form */}
              <div className="space-y-5 border-t border-blue-50 pt-5">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">Verifikasi & Penomoran</h5>
                
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Nomor Surat Resmi</label>
                  <input
                    type="text"
                    disabled={data.status !== 'pending' && updating}
                    placeholder="Contoh: 142/POLTEK-IN/AK/2026"
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">Tanggal Penerbitan</label>
                  <input
                    type="date"
                    disabled={data.status !== 'pending' && updating}
                    value={tanggalSurat}
                    onChange={(e) => setTanggalSurat(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold cursor-pointer"
                  />
                </div>

                {data.status === 'pending' ? (
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => handleUpdateStatus('disetujui')}
                      disabled={updating}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Setujui & Terbitkan Nomor
                    </button>
                    
                    <button
                      onClick={() => handleUpdateStatus('ditolak')}
                      disabled={updating}
                      className="w-full py-2.5 bg-red-650 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak Pengajuan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {data.status === 'disetujui' && (
                      <>
                        <button
                          onClick={() => navigate(`/admin/cetak/${data.id}`)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-md shadow-blue-600/10 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          Pratinjau & Cetak Surat
                        </button>

                        <button
                          onClick={handleSendEmail}
                          disabled={sendingEmail}
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
                        >
                          {sendingEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Mengirim Email...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Kirim Surat ke Email
                            </>
                          )}
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => handleUpdateStatus('pending')}
                      disabled={updating}
                      className="w-full py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-sm"
                    >
                      Kembalikan ke Antrean
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
