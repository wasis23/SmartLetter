import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { FileText, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed.');
      }

      // Store auth state
      localStorage.setItem('adminToken', result.token);
      localStorage.setItem('adminUser', JSON.stringify(result.user));

      // Redirect to dashboard
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Back button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 text-sm font-bold text-slate-600 hover:text-indigo-900 flex items-center gap-1.5 transition-colors no-print"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Pengajuan
      </Link>

      <div className="w-full max-w-md animate-fade-in">
        {/* Branding Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-indigo-950 tracking-tight">SmartLetter Admin</h2>
          <p className="text-sm text-slate-600 mt-1.5 font-semibold">Sign in to manage, approve, and print letters</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-100/40 border border-blue-100">
          
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-bold"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-8 font-semibold">
          Demo Credentials: <span className="text-indigo-900 font-extrabold underline">admin / admin</span>
        </p>
      </div>
    </div>
  );
}
