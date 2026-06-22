import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import AdminLayout from '../components/AdminLayout';
import { Clock, Eye, FileText, Calendar, ArrowRight, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [pengajuan, setPengajuan] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    setLoading(true);
    const token = localStorage.getItem('adminToken');
    try {
      const response = await fetch(`${API_BASE_URL}/admin/pengajuan?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Gagal mengambil data antrean surat.');
      }
      const data = await response.json();
      setPengajuan(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat antrean surat masuk.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
  };

  return (
    <AdminLayout title="Antrean Surat Masuk">
      <div className="space-y-6 animate-fade-in">
        
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-indigo-950">Antrean Pengajuan Baru</h3>
            <p className="text-sm text-slate-600 mt-1 font-semibold">Daftar pengajuan surat dari mahasiswa yang membutuhkan verifikasi dan nomor surat resmi.</p>
          </div>
          <button 
            onClick={fetchPendingRequests}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            Refresh Data
          </button>
        </div>

        {/* Data Table / Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : pengajuan.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-blue-100 shadow-md shadow-blue-100/30">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-black text-indigo-950">Antrean Kosong</h4>
            <p className="text-sm text-slate-600 mt-1.5 max-w-sm mx-auto font-semibold">Semua pengajuan surat mahasiswa telah selesai diproses. Tidak ada surat pending saat ini.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-md shadow-blue-100/30 border border-blue-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-blue-100 bg-blue-50/50 text-indigo-950 text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-6 w-16">No</th>
                    <th className="py-4 px-6">Tanggal Masuk</th>
                    <th className="py-4 px-6">Mahasiswa Pemohon</th>
                    <th className="py-4 px-6">Tipe Surat</th>
                    <th className="py-4 px-6">Nama Kegiatan</th>
                    <th className="py-4 px-6 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50 text-sm text-slate-700 font-bold">
                  {pengajuan.map((row, index) => (
                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-500">{index + 1}</td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>{formatDate(row.created_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <span className="font-extrabold text-indigo-950 block">{row.nama_mahasiswa}</span>
                          <span className="text-xs text-slate-500 font-bold font-mono">{row.nim} • {row.prodi}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                          <FileText className="w-3.5 h-3.5" />
                          {row.kode_surat}
                        </span>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate">
                        <span className="text-slate-800 font-bold">{row.data_dinamis?.nama_kegiatan}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => navigate(`/admin/pengajuan/${row.id}`)}
                          className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-md shadow-blue-600/10 flex items-center gap-1 mx-auto transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          Proses
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
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
