import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { CheckCircle2, XCircle, Printer, Eye, Calendar, FileText, Loader2 } from 'lucide-react';

export default function AdminHistory() {
  const [riwayat, setRiwayat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pengajuan?status=disetujui,ditolak`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil riwayat surat.');
      }
      const data = await response.json();
      setRiwayat(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat riwayat pemrosesan surat.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  const formatDateTime = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  return (
    <AdminLayout title="Riwayat Surat Selesai">
      <div className="space-y-6 animate-fade-in">
        
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-indigo-950">Arsip & Riwayat Pemrosesan</h3>
            <p className="text-sm text-slate-600 mt-1 font-semibold">Daftar semua pengajuan surat mahasiswa yang telah disetujui (diterbitkan nomor) atau ditolak.</p>
          </div>
          <button 
            onClick={fetchHistory}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            Refresh Data
          </button>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : riwayat.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-blue-100 shadow-md shadow-blue-100/30">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-indigo-950">Riwayat Kosong</h4>
            <p className="text-sm text-slate-600 mt-1.5 max-w-sm mx-auto font-semibold">Belum ada pengajuan surat yang diproses (disetujui/ditolak) oleh admin.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-blue-100/30 border border-blue-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/50 text-indigo-950 text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-6 w-16">No</th>
                    <th className="py-4 px-6">Tanggal Pengajuan</th>
                    <th className="py-4 px-6">Mahasiswa Pemohon</th>
                    <th className="py-4 px-6">Tipe Surat</th>
                    <th className="py-4 px-6">Nomor Surat resmi</th>
                    <th className="py-4 px-6">Tanggal Surat</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50 text-sm text-slate-700 font-bold">
                  {riwayat.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-500">{index + 1}</td>
                      <td className="py-4 px-6 whitespace-nowrap text-xs">
                        <div className="flex items-center gap-1 text-slate-600 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-blue-555" />
                          <span>{formatDateTime(row.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-extrabold text-indigo-950 block">{row.nama_mahasiswa}</span>
                          <span className="text-xs text-slate-500 font-bold font-mono">{row.nim} • {row.prodi}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-bold font-mono">
                          {row.kode_surat}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-blue-700">
                        {row.nomor_surat || <span className="text-slate-400 font-sans italic font-semibold">Belum ada</span>}
                      </td>
                      <td className="py-4 px-6 text-xs whitespace-nowrap text-slate-700 font-bold">
                        {formatDate(row.tanggal_surat)}
                      </td>
                      <td className="py-4 px-6 text-center">
                        {row.status === 'disetujui' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-1 rounded-full text-xs font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Disetujui
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full text-xs font-black">
                            <XCircle className="w-3.5 h-3.5 text-red-650" />
                            Ditolak
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => navigate(`/admin/pengajuan/${row.id}`)}
                            className="p-2 text-xs font-bold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {row.status === 'disetujui' && (
                            <button
                              onClick={() => navigate(`/admin/cetak/${row.id}`)}
                              className="p-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Cetak Surat"
                            >
                              <Printer className="w-4 h-4" />
                              <span className="text-[11px] font-black">Cetak</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
