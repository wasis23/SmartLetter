const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const QRCode = require('qrcode');

// Helper: Find valid Chrome executable
function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const possiblePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  throw new Error('Chrome/Chromium executable not found. Please install Google Chrome or set CHROME_PATH.');
}

// Helper: Format date in Indonesian
function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Helper: Replace dynamic template placeholders
function compileTemplate(template, data) {
  if (!template) return '';
  const year1 = data.created_at ? new Date(data.created_at).getFullYear() : new Date().getFullYear();
  const year2 = year1 + 1;
  const tglKegiatanFormatted = data.data_dinamis?.tgl_kegiatan ? formatDateIndo(data.data_dinamis.tgl_kegiatan) : '';

  return template
    .replace(/{prodi}/g, data.prodi || '')
    .replace(/{nama_kegiatan}/g, data.data_dinamis?.nama_kegiatan || '')
    .replace(/{tgl_kegiatan}/g, tglKegiatanFormatted)
    .replace(/{tahun_akademik_1}/g, year1)
    .replace(/{tahun_akademik_2}/g, year2);
}

// Helper: Generate body text
function generateBodyHtml(data) {
  if (data.template_text) {
    return `<div style="text-align: justify; line-height: 1.6;">${compileTemplate(data.template_text, data)}</div>`;
  }

  switch (data.kode_surat) {
    case 'SPKP':
      return `
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Dalam rangka memenuhi kurikulum akademik pada Program Studi ${data.prodi} Politeknik Indonusa Surakarta, kami bermaksud menghadapkan mahasiswa kami untuk dapat melaksanakan mata kuliah <strong>Kerja Praktik (KP) / Magang Industri</strong> pada perusahaan/instansi yang Bapak/Ibu pimpin.
        </p>
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Mengingat pentingnya kegiatan ini guna menyelaraskan kompetensi akademis mahasiswa dengan praktik nyata di industri, kami mohon kiranya Bapak/Ibu berkenan menerima pengajuan Kerja Praktik mahasiswa kami di bawah ini:
        </p>
      `;
    case 'SIP':
      return `
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Sehubungan dengan penyusunan tugas akhir / skripsi mahasiswa Politeknik Indonusa Surakarta, kami bermaksud mengajukan permohonan izin penelitian dan pengambilan data bagi mahasiswa kami di perusahaan / instansi yang Bapak/Ibu pimpin.
        </p>
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Adapun fokus penelitian yang diajukan berjudul <strong>"${data.data_dinamis?.nama_kegiatan || ''}"</strong>. Penelitian direncanakan mulai dilaksanakan pada ${formatDateIndo(data.data_dinamis?.tgl_kegiatan)}. Terkait hal tersebut, mohon perkenan Bapak/Ibu untuk memberikan izin kepada mahasiswa kami:
        </p>
      `;
    case 'SKAK':
      const yr = data.created_at ? new Date(data.created_at).getFullYear() : new Date().getFullYear();
      return `
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Direktur Politeknik Indonusa Surakarta dengan ini menerangkan bahwa mahasiswa yang namanya tercantum di bawah ini adalah benar-benar mahasiswa aktif terdaftar pada Tahun Akademik ${yr}/${yr + 1} dan berkelakuan baik:
        </p>
      `;
    default:
      return `
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Dengan hormat, sehubungan dengan pelaksanaan kegiatan mahasiswa di luar kampus, kami mengajukan permohonan rekomendasi / izin bagi mahasiswa kami untuk menyelenggarakan kegiatan <strong>"${data.data_dinamis?.nama_kegiatan || ''}"</strong> pada lokasi yang Bapak/Ibu pimpin.
        </p>
        <p style="text-align: justify; text-indent: 2rem; margin-bottom: 12px; line-height: 1.6;">
          Berikut adalah identitas mahasiswa pemohon beserta anggota kelompok pelaksana kegiatan tersebut:
        </p>
      `;
  }
}

/**
 * Generate PDF buffer for an approved letter
 * @param {Object} data - Letter and dynamic data
 * @param {string} kopSuratBase64 - Kop surat base64 string or null
 * @param {string} clientBaseUrl - Base frontend URL for QR code (default http://localhost:5173)
 * @returns {Promise<Buffer>} PDF Buffer
 */
async function generateLetterPDF(data, kopSuratBase64 = '', clientBaseUrl = 'http://localhost:5173') {
  const chromePath = getChromePath();
  const validationUrl = `${clientBaseUrl}/validasi/${data.id}`;

  // Generate offline QR Code directly in data URL format
  const qrDataUrl = await QRCode.toDataURL(validationUrl, {
    margin: 1,
    width: 140,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  const bodyHtml = generateBodyHtml(data);
  const anggotaList = data.data_dinamis?.anggota_kelompok || [];

  // Build members table rows
  let membersRows = `
    <tr style="font-weight: bold;">
      <td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">1</td>
      <td style="border: 1px solid #000; padding: 6px 10px; font-family: monospace;">${data.nim}</td>
      <td style="border: 1px solid #000; padding: 6px 10px;">${data.nama_mahasiswa} (Ketua)</td>
    </tr>
  `;

  anggotaList.forEach((m, idx) => {
    membersRows += `
      <tr>
        <td style="border: 1px solid #000; padding: 6px 10px; text-align: center;">${idx + 2}</td>
        <td style="border: 1px solid #000; padding: 6px 10px; font-family: monospace;">${m.nim}</td>
        <td style="border: 1px solid #000; padding: 6px 10px;">${m.nama}</td>
      </tr>
    `;
  });

  // Kop surat HTML
  let kopHtml = '';
  if (kopSuratBase64) {
    kopHtml = `
      <div style="width: 100%; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; text-align: center;">
        <img src="${kopSuratBase64}" style="max-width: 100%; max-height: 110px; object-fit: contain;" />
      </div>
    `;
  } else {
    kopHtml = `
      <div style="display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; font-family: Arial, sans-serif;">
        <div style="width: 75px; height: 75px; border: 2px solid #000; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex-shrink: 0; margin-right: 15px;">
          <span style="font-size: 10px; font-weight: 900; line-height: 1;">POLTEK</span>
          <span style="font-size: 8px; font-weight: bold; line-height: 1; margin-top: 2px;">INDONUSA</span>
        </div>
        <div style="text-align: center; flex: 1;">
          <h3 style="margin: 0; font-size: 12pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Yayasan Indonesia Surakarta</h3>
          <h2 style="margin: 2px 0 0 0; font-size: 15pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Politeknik Indonusa Surakarta</h2>
          <p style="margin: 4px 0 0 0; font-size: 8.5pt; font-weight: 500; line-height: 1.3;">
            Kampus I: Jl. KH. Samanhudi No. 3-5, Bumi, Laweyan, Surakarta 57148<br />
            Telp: (0271) 712345 • Email: info@poltekindonusa.ac.id • Web: www.poltekindonusa.ac.id
          </p>
        </div>
      </div>
    `;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Surat Resmi - ${data.nomor_surat || ''}</title>
      <style>
        @page {
          size: A4;
          margin: 18mm 20mm 18mm 20mm;
        }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000000;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
        }
        table {
          border-collapse: collapse;
        }
        p {
          margin-top: 0;
        }
      </style>
    </head>
    <body>
      ${kopHtml}

      <!-- Nomor, Tanggal, Perihal -->
      <table style="width: 100%; font-size: 12pt; margin-bottom: 20px;">
        <tr style="vertical-align: top; font-weight: bold;">
          <td style="width: 90px; padding: 2px 0;">Nomor</td>
          <td style="width: 15px; padding: 2px 0; text-align: center;">:</td>
          <td style="padding: 2px 0;">${data.nomor_surat || '-'}</td>
          <td style="width: 200px; text-align: right; padding: 2px 0; white-space: nowrap;">
            Surakarta, ${formatDateIndo(data.tanggal_surat)}
          </td>
        </tr>
        <tr style="vertical-align: top; font-weight: bold;">
          <td style="padding: 2px 0;">Lampiran</td>
          <td style="padding: 2px 0; text-align: center;">:</td>
          <td style="padding: 2px 0;">-</td>
          <td></td>
        </tr>
        <tr style="vertical-align: top; font-weight: bold;">
          <td style="padding: 2px 0;">Hal</td>
          <td style="padding: 2px 0; text-align: center;">:</td>
          <td style="padding: 2px 0;">Permohonan ${data.nama_surat || ''}</td>
          <td></td>
        </tr>
      </table>

      <!-- Tujuan Surat -->
      <div style="font-size: 12pt; margin-bottom: 20px;">
        <p style="margin: 0 0 2px 0;">Kepada Yth.</p>
        <p style="margin: 0 0 2px 0; font-weight: bold;">${data.data_dinamis?.nama_pihak_mitra || ''} selaku ${data.data_dinamis?.jabatan_di_mitra || ''}</p>
        <p style="margin: 0; white-space: pre-line; line-height: 1.3;">${data.data_dinamis?.alamat || ''}</p>
      </div>

      <!-- Isi Surat -->
      <div style="font-size: 12pt; margin-bottom: 16px;">
        ${bodyHtml}
      </div>

      <!-- Tabel Anggota -->
      <div style="margin: 16px 0 16px 25px;">
        <table style="width: 100%; border: 1px solid #000; font-size: 11pt;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <th style="border: 1px solid #000; padding: 6px 10px; width: 40px; text-align: center;">No</th>
              <th style="border: 1px solid #000; padding: 6px 10px; width: 140px; text-align: left;">NIM</th>
              <th style="border: 1px solid #000; padding: 6px 10px; text-align: left;">Nama Lengkap</th>
            </tr>
          </thead>
          <tbody>
            ${membersRows}
          </tbody>
        </table>
      </div>

      <!-- Penutup -->
      <p style="text-align: justify; text-indent: 2rem; margin-bottom: 25px; line-height: 1.6; font-size: 12pt;">
        Demikian surat permohonan ini kami sampaikan. Atas bantuan, kerja sama, dan perhatian Bapak/Ibu dalam memfasilitasi kebutuhan akademik mahasiswa kami, kami menyampaikan terima kasih yang sebesar-besarnya.
      </p>

      <!-- Titimangsa & Tanda Tangan QR Barcode -->
      <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
        <div style="width: 300px; text-align: left; font-size: 12pt;">
          <p style="margin: 0; font-weight: bold;">a.n. Kepala Program Studi,</p>
          <p style="margin: 0 0 10px 0; font-weight: bold;">D4 Teknologi Rekayasa Perangkat Lunak,</p>
          
          <div style="display: flex; align-items: center; gap: 12px; margin: 12px 0;">
            <div style="border: 1px solid #000; padding: 4px; background: #fff; display: inline-block;">
              <img src="${qrDataUrl}" style="width: 90px; height: 90px; display: block;" />
            </div>
            <div style="font-family: Arial, sans-serif; font-size: 8pt; line-height: 1.3;">
              <strong style="display: block; font-size: 8.5pt; color: #1e1b4b; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 4px;">VALIDASI DIGITAL</strong>
              <span style="display: block; font-family: monospace;">ID: ${data.id}</span>
              <span style="display: block; color: #475569; margin-top: 2px;">Dokumen ini sah dan diverifikasi secara elektronik.</span>
            </div>
          </div>

          <p style="margin: 0; font-weight: bold; text-decoration: underline;">Dwi Iskandar, M.Kom</p>
          <p style="margin: 2px 0 0 0; font-size: 10pt; font-weight: bold;">NIDN. 0603048802</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Launch headless browser with puppeteer-core
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

module.exports = {
  generateLetterPDF,
  formatDateIndo
};
