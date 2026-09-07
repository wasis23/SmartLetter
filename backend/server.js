const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { pool, initializeDatabase } = require('./db');
const { generateLetterPDF, formatDateIndo } = require('./pdfGenerator');
const QRCode = require('qrcode');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart_letter_jwt_secret_key_2026_xyz';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// JWT Authentication Middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Akses ditolak. Token otentikasi tidak ditemukan.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Sesi Anda telah kedaluwarsa. Silakan login kembali.' });
    }
    return res.status(403).json({ message: 'Token tidak valid atau tidak memiliki otorisasi.' });
  }
};

// Helper to dynamically resolve frontend URL for links, QR codes, and PDF verification
function getFrontendUrl(req) {
  let frontendUrl = process.env.APP_URL || process.env.CLIENT_BASE_URL;
  if (!frontendUrl && req) {
    const origin = req.get('origin');
    if (origin) {
      frontendUrl = origin;
    } else {
      const referer = req.get('referer');
      if (referer) {
        try {
          const parsedUrl = new URL(referer);
          frontendUrl = parsedUrl.origin;
        } catch (e) {
          // Ignore parse error
        }
      }
    }
  }
  return frontendUrl || 'http://localhost:5173';
}

// ----------------------------------------------------
// PUBLIC API ENDPOINTS
// ----------------------------------------------------

// Get public validation data for letter scan verification (no auth)
app.get('/api/public/pengajuan/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.status,
        p.nomor_surat,
        p.tanggal_surat,
        p.created_at,
        m.nim,
        m.nama as nama_mahasiswa,
        m.prodi,
        m.angkatan,
        m.email,
        s.nama_surat,
        s.kode_surat,
        s.template_text,
        p.data_dinamis
      FROM pengajuan_surat p
      JOIN mahasiswa m ON p.mahasiswa_id = m.id
      JOIN master_surat s ON p.surat_id = s.id
      WHERE p.id = ? AND p.status = 'disetujui'
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Surat tidak ditemukan atau belum disetujui.' });
    }

    const row = rows[0];
    row.data_dinamis = typeof row.data_dinamis === 'string' ? JSON.parse(row.data_dinamis) : row.data_dinamis;
    
    res.json(row);
  } catch (error) {
    console.error('Error fetching public validation:', error);
    res.status(500).json({ message: 'Gagal memproses validasi surat.' });
  }
});

// Download / Stream Letter as Server-Side Generated PDF
app.get('/api/pengajuan/:id/pdf', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.status,
        p.nomor_surat,
        p.tanggal_surat,
        p.created_at,
        m.nim,
        m.nama as nama_mahasiswa,
        m.prodi,
        m.angkatan,
        m.email,
        s.nama_surat,
        s.kode_surat,
        s.template_text,
        p.data_dinamis
      FROM pengajuan_surat p
      JOIN mahasiswa m ON p.mahasiswa_id = m.id
      JOIN master_surat s ON p.surat_id = s.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Surat tidak ditemukan.' });
    }

    const row = rows[0];
    if (row.status !== 'disetujui') {
      return res.status(400).json({ message: 'Hanya surat yang berstatus disetujui yang dapat diunduh dalam format PDF.' });
    }

    row.data_dinamis = typeof row.data_dinamis === 'string' ? JSON.parse(row.data_dinamis) : row.data_dinamis;

    // Retrieve kop_surat from settings
    let kopSurat = '';
    const [kopRows] = await pool.query('SELECT value_text FROM settings WHERE key_name = ?', ['kop_surat']);
    if (kopRows.length > 0 && kopRows[0].value_text) {
      kopSurat = kopRows[0].value_text;
    }

    // Determine client base URL
    const clientBaseUrl = getFrontendUrl(req);
    const pdfBuffer = await generateLetterPDF(row, kopSurat, clientBaseUrl);

    const safeFilename = `Surat_${row.kode_surat}_${(row.nomor_surat || 'Resmi').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Gagal men-generate dokumen PDF.', error: error.message });
  }
});

// Offline Local QR Code generator for letter verification
app.get('/api/pengajuan/:id/qrcode', async (req, res) => {
  const { id } = req.params;
  try {
    const clientBaseUrl = getFrontendUrl(req);
    const validationUrl = `${clientBaseUrl}/validasi/${id}`;
    const qrBuffer = await QRCode.toBuffer(validationUrl, {
      margin: 1,
      width: 140,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    res.setHeader('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (error) {
    console.error('Error generating QRCode:', error);
    res.status(500).json({ message: 'Gagal membuat QRCode.' });
  }
});

// Public Get settings (e.g. for Kop Surat image)
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const [rows] = await pool.query('SELECT value_text FROM settings WHERE key_name = ?', [key]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json({ key_name: key, value_text: rows[0].value_text });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ message: 'Failed to fetch setting' });
  }
});

// Get master surat list (for the dropdown)
app.get('/api/master-surat', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama_surat, kode_surat FROM master_surat');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching master_surat:', error);
    res.status(500).json({ message: 'Failed to fetch letter types' });
  }
});

// Submit a new letter request (Mahasiswa)
app.post('/api/pengajuan', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      nim,
      nama,
      prodi,
      angkatan,
      email,
      surat_id,
      data_dinamis
    } = req.body;

    // Validation
    if (!nim || !nama || !prodi || !angkatan || !email || !surat_id || !data_dinamis) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Validate data_dinamis structure
    const {
      nama_kegiatan,
      tgl_kegiatan,
      email_ketua,
      anggota_kelompok,
      nama_tempat,
      alamat,
      nama_pihak_mitra,
      jabatan_di_mitra
    } = data_dinamis;

    if (!nama_kegiatan || !tgl_kegiatan || !email_ketua || !nama_tempat || !alamat || !nama_pihak_mitra || !jabatan_di_mitra) {
      return res.status(400).json({ message: 'Missing fields in dynamic activities payload.' });
    }

    // Check if mahasiswa exists by NIM
    const [existingMahasiswa] = await connection.query('SELECT id FROM mahasiswa WHERE nim = ?', [nim]);
    
    let mahasiswaId;
    if (existingMahasiswa.length > 0) {
      // Update existing student details in case they changed
      mahasiswaId = existingMahasiswa[0].id;
      await connection.query(
        'UPDATE mahasiswa SET nama = ?, prodi = ?, angkatan = ?, email = ? WHERE id = ?',
        [nama, prodi, angkatan, email, mahasiswaId]
      );
    } else {
      // Insert new student
      const [insertResult] = await connection.query(
        'INSERT INTO mahasiswa (nim, nama, prodi, angkatan, email) VALUES (?, ?, ?, ?, ?)',
        [nim, nama, prodi, angkatan, email]
      );
      mahasiswaId = insertResult.insertId;
    }

    // Insert pengajuan_surat
    const [pengajuanResult] = await connection.query(
      'INSERT INTO pengajuan_surat (mahasiswa_id, surat_id, data_dinamis, status) VALUES (?, ?, ?, ?)',
      [mahasiswaId, surat_id, JSON.stringify(data_dinamis), 'pending']
    );

    await connection.commit();
    res.status(201).json({
      message: 'Letter request submitted successfully!',
      pengajuan_id: pengajuanResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting application:', error);
    res.status(500).json({ message: 'Internal Server Error while submitting request.' });
  } finally {
    connection.release();
  }
});

// ----------------------------------------------------
// ADMIN API ENDPOINTS (AUTHENTICATED)
// ----------------------------------------------------

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM admin WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Generate signed JWT Token valid for 24 hours
    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin.id,
        username: admin.username
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// Admin stats
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'disetujui' THEN 1 ELSE 0 END) as approvedCount,
        SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) as rejectedCount,
        COUNT(*) as totalCount
      FROM pengajuan_surat
    `);
    
    res.json({
      pending: rows[0].pendingCount || 0,
      approved: rows[0].approvedCount || 0,
      rejected: rows[0].rejectedCount || 0,
      total: rows[0].totalCount || 0
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ message: 'Failed to fetch statistics.' });
  }
});

// Admin list pengajuan
app.get('/api/admin/pengajuan', adminAuth, async (req, res) => {
  const { status } = req.query; // pending, disetujui, ditolak (comma separated support)
  
  try {
    let query = `
      SELECT 
        p.id,
        p.mahasiswa_id,
        p.surat_id,
        p.status,
        p.nomor_surat,
        p.tanggal_surat,
        p.created_at,
        m.nim,
        m.nama as nama_mahasiswa,
        m.prodi,
        m.angkatan,
        m.email,
        s.nama_surat,
        s.kode_surat,
        p.data_dinamis
      FROM pengajuan_surat p
      JOIN mahasiswa m ON p.mahasiswa_id = m.id
      JOIN master_surat s ON p.surat_id = s.id
    `;
    
    const params = [];
    if (status) {
      const statusList = status.split(',');
      query += ` WHERE p.status IN (${statusList.map(() => '?').join(',')})`;
      params.push(...statusList);
    }
    
    query += ` ORDER BY p.created_at DESC`;
    
    const [rows] = await pool.query(query, params);
    
    // Parse JSON data_dinamis before returning
    const formattedRows = rows.map(row => ({
      ...row,
      data_dinamis: typeof row.data_dinamis === 'string' ? JSON.parse(row.data_dinamis) : row.data_dinamis
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching pengajuan list:', error);
    res.status(500).json({ message: 'Failed to fetch applications.' });
  }
});

// Admin get detailed single pengajuan
app.get('/api/admin/pengajuan/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.mahasiswa_id,
        p.surat_id,
        p.status,
        p.nomor_surat,
        p.tanggal_surat,
        p.created_at,
        m.nim,
        m.nama as nama_mahasiswa,
        m.prodi,
        m.angkatan,
        m.email,
        s.nama_surat,
        s.kode_surat,
        s.template_text,
        p.data_dinamis
      FROM pengajuan_surat p
      JOIN mahasiswa m ON p.mahasiswa_id = m.id
      JOIN master_surat s ON p.surat_id = s.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const row = rows[0];
    row.data_dinamis = typeof row.data_dinamis === 'string' ? JSON.parse(row.data_dinamis) : row.data_dinamis;
    
    res.json(row);
  } catch (error) {
    console.error('Error fetching application detail:', error);
    res.status(500).json({ message: 'Failed to fetch application detail.' });
  }
});

// Admin update pengajuan status and numbering (approve or reject)
app.put('/api/admin/pengajuan/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status, nomor_surat, tanggal_surat } = req.body;

  if (!status || !['disetujui', 'ditolak', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid or missing status.' });
  }

  try {
    // If status is disetujui, number and date are required
    if (status === 'disetujui') {
      if (!nomor_surat || !tanggal_surat) {
        return res.status(400).json({ message: 'Nomor Surat and Tanggal Surat are required for approval.' });
      }
      
      await pool.query(
        'UPDATE pengajuan_surat SET status = ?, nomor_surat = ?, tanggal_surat = ? WHERE id = ?',
        [status, nomor_surat, tanggal_surat, id]
      );
    } else {
      // Rejecting or resetting to pending
      await pool.query(
        'UPDATE pengajuan_surat SET status = ?, nomor_surat = NULL, tanggal_surat = NULL WHERE id = ?',
        [status, id]
      );
    }

    res.json({ message: `Application status updated to ${status} successfully!` });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ message: 'Failed to update application status.' });
  }
});

// Admin Save/Upload settings (e.g., Kop Surat base64)
app.post('/api/admin/settings', adminAuth, async (req, res) => {
  const { key_name, value_text } = req.body;
  if (!key_name) {
    return res.status(400).json({ message: 'key_name is required' });
  }
  try {
    await pool.query(
      'INSERT INTO settings (key_name, value_text) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_text = ?',
      [key_name, value_text || '', value_text || '']
    );
    res.json({ message: `Setting ${key_name} updated successfully` });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Failed to save setting' });
  }
});

// Admin Get all letter templates
app.get('/api/admin/templates', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nama_surat, kode_surat, template_text FROM master_surat');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// Admin Update a letter template by kode_surat
app.put('/api/admin/templates/:kode_surat', adminAuth, async (req, res) => {
  const { kode_surat } = req.params;
  const { template_text } = req.body;
  try {
    await pool.query('UPDATE master_surat SET template_text = ? WHERE kode_surat = ?', [template_text || '', kode_surat]);
    res.json({ message: `Template for ${kode_surat} updated successfully` });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ message: 'Failed to update template' });
  }
});

// Admin Send letter link/notification to student email
app.post('/api/admin/pengajuan/:id/kirim-email', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    // Get letter details
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.status,
        p.nomor_surat,
        p.tanggal_surat,
        m.nama as nama_mahasiswa,
        m.email as email_mahasiswa,
        s.nama_surat,
        s.kode_surat,
        p.data_dinamis
      FROM pengajuan_surat p
      JOIN mahasiswa m ON p.mahasiswa_id = m.id
      JOIN master_surat s ON p.surat_id = s.id
      WHERE p.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const row = rows[0];
    if (row.status !== 'disetujui') {
      return res.status(400).json({ message: 'Surat belum disetujui. Tidak dapat mengirim email.' });
    }

    const dynamicData = typeof row.data_dinamis === 'string' ? JSON.parse(row.data_dinamis) : row.data_dinamis;
    const studentEmail = row.email_mahasiswa;
    const mailKetua = dynamicData.email_ketua;
    // Build dynamic verification URL
    const frontendUrl = getFrontendUrl(req);
    const validationUrl = `${frontendUrl}/validasi/${row.id}`;

    // Build Email HTML body
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 25px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">Politeknik Indonusa Surakarta</h2>
          <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0; font-weight: 500;">Automatic Mail Delivery System</p>
        </div>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="font-size: 15px; color: #334155; line-height: 1.5;">Halo <strong>${row.nama_mahasiswa}</strong>,</p>
        <p style="font-size: 15px; color: #334155; line-height: 1.5;">Pengajuan surat kegiatan Anda telah disetujui oleh Wakil Dekan Bidang Akademik Politeknik Indonusa Surakarta. Berikut adalah rincian surat resmi Anda:</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: 600;">Jenis Surat</td>
              <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">: ${row.nama_surat} (${row.kode_surat})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Nomor Surat</td>
              <td style="padding: 6px 0; font-weight: bold; color: #4f46e5;">: ${row.nomor_surat}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Tanggal Terbit</td>
              <td style="padding: 6px 0; color: #0f172a;">: ${new Date(row.tanggal_surat).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Nama Kegiatan</td>
              <td style="padding: 6px 0; color: #0f172a;">: ${dynamicData.nama_kegiatan}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.5;">Anda dapat mengunduh dan mencetak berkas surat resmi berformat A4 tersebut melalui tautan berikut:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${validationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">Unduh / Cetak Surat Sekarang</a>
        </div>
        
        <p style="font-size: 12.5px; color: #64748b; line-height: 1.6; background-color: #f1f5f9; padding: 12px; border-radius: 6px;">
          <strong>Validasi Digital:</strong> Surat ini dilengkapi tanda tangan digital berupa Barcode/QR Code untuk verifikasi keabsahan dokumen di tempat tujuan surat. Pihak mitra dapat memindai barcode tersebut untuk diarahkan ke halaman validasi resmi:<br/>
          <a href="${validationUrl}" style="color: #4f46e5; font-weight: 600; text-decoration: none;">${validationUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
          Sistem Otomatis SmartLetter Politeknik Indonusa Surakarta<br/>
          Harap tidak membalas email ini secara langsung karena dikirim oleh sistem robotik.
        </p>
      </div>
    `;

    // 1. Generate official PDF document for attachment
    let pdfBuffer = null;
    try {
      let kopSurat = '';
      const [kopRows] = await pool.query('SELECT value_text FROM settings WHERE key_name = ?', ['kop_surat']);
      if (kopRows.length > 0 && kopRows[0].value_text) {
        kopSurat = kopRows[0].value_text;
      }
      pdfBuffer = await generateLetterPDF(row, kopSurat, frontendUrl);
    } catch (pdfErr) {
      console.error('Warning: Failed to generate PDF attachment, continuing with email:', pdfErr);
    }

    // 2. Save copy locally to sent_emails for audit and instant simulation
    const mailDirectory = path.join(__dirname, 'sent_emails');
    if (!fs.existsSync(mailDirectory)) {
      fs.mkdirSync(mailDirectory);
    }
    const filePath = path.join(mailDirectory, `email_pengajuan_${row.id}.html`);
    fs.writeFileSync(filePath, emailHtml);
    if (pdfBuffer) {
      fs.writeFileSync(path.join(mailDirectory, `surat_resmi_${row.id}.pdf`), pdfBuffer);
    }
    console.log(`[Email Simulated] Saved sent email copy to: ${filePath}`);

    // 3. Transmit via SMTP if configuration variables exist in env
    let mailSent = false;
    let mailError = null;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const recipients = [studentEmail];
        if (mailKetua && mailKetua !== studentEmail) {
          recipients.push(mailKetua);
        }

        const attachments = [];
        if (pdfBuffer) {
          attachments.push({
            filename: `Surat_${row.kode_surat}_${(row.nomor_surat || 'Resmi').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        }

        const info = await transporter.sendMail({
          from: process.env.SMTP_FROM || `"SmartLetter Politeknik Indonusa" <${process.env.SMTP_USER}>`,
          to: recipients.join(','),
          subject: `Surat Resmi ${row.kode_surat} - Politeknik Indonusa Surakarta`,
          text: `Halo ${row.nama_mahasiswa},\n\nPengajuan surat kegiatan Anda telah disetujui oleh Kepala Program Studi Politeknik Indonusa Surakarta.\n\nBerikut adalah rincian surat resmi Anda:\n- Jenis Surat: ${row.nama_surat} (${row.kode_surat})\n- Nomor Surat: ${row.nomor_surat}\n- Tanggal Terbit: ${new Date(row.tanggal_surat).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}\n- Rencana Kegiatan: ${dynamicData.nama_kegiatan}\n\nBerkas surat resmi PDF telah kami lampirkan pada email ini. Anda juga dapat melihat dan memvalidasi surat tersebut melalui tautan:\n${validationUrl}\n\nTerima kasih,\nSistem SmartLetter Politeknik Indonusa Surakarta`,
          html: emailHtml,
          attachments
        });
        
        console.log('Email sent successfully via SMTP:', info.messageId);
        mailSent = true;
      } catch (e) {
        console.error('Failed to send email via SMTP, fallback to simulation:', e);
        mailError = e.message;
      }
    }

    res.json({
      message: 'Proses pengiriman email berhasil dilakukan!',
      simulated: !mailSent,
      simulated_path: filePath,
      pdf_attached: !!pdfBuffer,
      smtp_sent: mailSent,
      smtp_error: mailError
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Gagal memproses pengiriman email surat.' });
  }
});


// Initialize database and start server (reloaded for .env updates)
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT}`);
  });
});
