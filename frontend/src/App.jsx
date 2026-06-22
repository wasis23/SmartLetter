import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicForm from './pages/PublicForm';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminHistory from './pages/AdminHistory';
import AdminDetail from './pages/AdminDetail';
import AdminCetak from './pages/AdminCetak';
import AdminSettings from './pages/AdminSettings';
import AdminTemplates from './pages/AdminTemplates';
import PublicValidation from './pages/PublicValidation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public access */}
        <Route path="/" element={<PublicForm />} />
        <Route path="/ajukan-surat" element={<PublicForm />} />
        
        {/* Public QR Code Letter Validation Page (no auth) */}
        <Route path="/validasi/:id" element={<PublicValidation />} />
        <Route path="/cetak/:id" element={<AdminCetak />} />

        {/* Admin portal access */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Authenticated Admin routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/riwayat" element={<AdminHistory />} />
        <Route path="/admin/pengajuan/:id" element={<AdminDetail />} />
        <Route path="/admin/cetak/:id" element={<AdminCetak />} />
        <Route path="/admin/templates" element={<AdminTemplates />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
