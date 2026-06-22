import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { FileText, LayoutDashboard, History, LogOut, User, Menu, X, FileCheck, FileX, Clock, Settings, FileCode } from 'lucide-react';

export default function AdminLayout({ children, title }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [admin, setAdmin] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userStr = localStorage.getItem('adminUser');
    
    if (!token || !userStr) {
      localStorage.clear();
      navigate('/admin/login');
      return;
    }

    setAdmin(JSON.parse(userStr));
    fetchStats(token);
  }, [navigate]);

  const fetchStats = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row">
      
      {/* Mobile Top Bar */}
      <header className="md:hidden bg-white border-b border-blue-100 flex justify-between items-center px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="font-extrabold text-indigo-950 tracking-tight">SmartLetter Admin</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 hover:text-indigo-950"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>
 
      {/* Sidebar Navigation - Deep Indigo to Blue gradient */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-indigo-900 via-blue-800 to-indigo-950 p-6 flex flex-col justify-between transition-transform duration-300 md:relative md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-8">
          {/* Logo / Title */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-indigo-900" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white tracking-tight leading-none">SmartLetter</h2>
              <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block mt-1">Admin Panel</span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <Link
              to="/admin/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/admin/dashboard') 
                  ? 'bg-white text-indigo-950 shadow-md' 
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Antrean Surat</span>
              {stats.pending > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {stats.pending}
                </span>
              )}
            </Link>
            <Link
              to="/admin/riwayat"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/admin/riwayat') 
                  ? 'bg-white text-indigo-950 shadow-md' 
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Surat</span>
            </Link>
            <Link
              to="/admin/templates"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/admin/templates') 
                  ? 'bg-white text-indigo-950 shadow-md' 
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Template Surat</span>
            </Link>
            <Link
              to="/admin/settings"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive('/admin/settings') 
                  ? 'bg-white text-indigo-950 shadow-md' 
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengaturan Kop</span>
            </Link>
          </nav>

          {/* Statistics Summary inside Sidebar */}
          <div className="pt-4 border-t border-indigo-800 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-200 px-2">Statistik Cepat</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
                <Clock className="w-3.5 h-3.5 mx-auto text-amber-300 mb-1" />
                <span className="text-[9px] text-indigo-200 block">Pending</span>
                <span className="text-xs font-black text-white">{stats.pending}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
                <FileCheck className="w-3.5 h-3.5 mx-auto text-emerald-300 mb-1" />
                <span className="text-[9px] text-indigo-200 block">Setuju</span>
                <span className="text-xs font-black text-white">{stats.approved}</span>
              </div>
              <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
                <FileX className="w-3.5 h-3.5 mx-auto text-red-300 mb-1" />
                <span className="text-[9px] text-indigo-200 block">Tolak</span>
                <span className="text-xs font-black text-white">{stats.rejected}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="pt-6 border-t border-indigo-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/10">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white block capitalize">{admin?.username || 'Admin'}</span>
              <span className="text-[10px] text-indigo-200 font-semibold">Administrator</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-300 hover:bg-white/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-blue-50/20">
        
        {/* Top Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-5 border-b border-blue-100 bg-white sticky top-0 z-30 shadow-sm">
          <h2 className="text-xl font-black text-indigo-950 m-0 leading-none">{title}</h2>
          <div className="text-xs text-slate-600 font-bold">
            Sistem Pembuatan Surat Otomatis • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Dynamic content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
