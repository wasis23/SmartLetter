const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'admin',
  database: process.env.DB_NAME || 'smart_letter',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database: ' + process.env.DB_NAME);

    // 1. Create mahasiswa table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS mahasiswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nim VARCHAR(20) UNIQUE NOT NULL,
        nama VARCHAR(150) NOT NULL,
        prodi VARCHAR(100) NOT NULL,
        angkatan INT NOT NULL,
        email VARCHAR(100) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "mahasiswa" checked/created.');

    // 2. Create master_surat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS master_surat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_surat VARCHAR(150) NOT NULL,
        kode_surat VARCHAR(20) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "master_surat" checked/created.');

    // 3. Create pengajuan_surat table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pengajuan_surat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mahasiswa_id INT NOT NULL,
        surat_id INT NOT NULL,
        data_dinamis JSON NOT NULL,
        status ENUM('pending', 'disetujui', 'ditolak') DEFAULT 'pending',
        nomor_surat VARCHAR(100) NULL,
        tanggal_surat DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id) ON DELETE CASCADE,
        FOREIGN KEY (surat_id) REFERENCES master_surat(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "pengajuan_surat" checked/created.');

    // 4. Create admin table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "admin" checked/created.');

    // 5. Create settings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key_name VARCHAR(50) PRIMARY KEY,
        value_text LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table "settings" checked/created.');

    // Add template_text to master_surat if not exists
    try {
      await connection.query('ALTER TABLE master_surat ADD COLUMN template_text TEXT NULL');
      console.log('Column "template_text" added to "master_surat".');
    } catch (e) {
      // Column might already exist, ignore error
    }

    // Seed master_surat
    const [suratCount] = await connection.query('SELECT COUNT(*) as count FROM master_surat');
    if (suratCount[0].count === 0) {
      await connection.query(`
        INSERT INTO master_surat (nama_surat, kode_surat) VALUES 
        ('Surat Pengantar Kerja Praktik', 'SPKP'),
        ('Surat Izin Penelitian', 'SIP'),
        ('Surat Keterangan Aktif Kuliah', 'SKAK'),
        ('Surat Keterangan Magang', 'SKM')
      `);
      console.log('Default master_surat data seeded.');
    }

    // Seed/Update default HTML templates
    await connection.query(`
      UPDATE master_surat SET template_text = '<p class="text-justify indent-8 mb-4">Dalam rangka memenuhi kurikulum akademik pada Program Studi {prodi} Politeknik Indonusa Surakarta, kami bermaksud menghadapkan mahasiswa kami untuk dapat melaksanakan mata kuliah <strong>Kerja Praktik (KP) / Magang Industri</strong> pada perusahaan/instansi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Mengingat pentingnya kegiatan ini guna menyelaraskan kompetensi akademis mahasiswa dengan praktik nyata di industri, kami mohon kiranya Bapak/Ibu berkenan menerima pengajuan Kerja Praktik mahasiswa kami di bawah ini:</p>'
      WHERE kode_surat = 'SPKP' AND (template_text IS NULL OR template_text = \'\')
    `);
    await connection.query(`
      UPDATE master_surat SET template_text = '<p class="text-justify indent-8 mb-4">Sehubungan dengan penyusunan tugas akhir / skripsi mahasiswa Politeknik Indonusa Surakarta, kami bermaksud mengajukan permohonan izin penelitian dan pengambilan data bagi mahasiswa kami di perusahaan / instansi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Adapun fokus penelitian yang diajukan berjudul <strong>"{nama_kegiatan}"</strong>. Penelitian direncanakan mulai dilaksanakan pada {tgl_kegiatan}. Terkait hal tersebut, mohon perkenan Bapak/Ibu untuk memberikan izin kepada mahasiswa kami:</p>'
      WHERE kode_surat = 'SIP' AND (template_text IS NULL OR template_text = \'\')
    `);
    await connection.query(`
      UPDATE master_surat SET template_text = '<p class="text-justify indent-8 mb-4">Direktur Politeknik Indonusa Surakarta dengan ini menerangkan bahwa mahasiswa yang namanya tercantum di bawah ini adalah benar-benar mahasiswa aktif terdaftar pada Tahun Akademik {tahun_akademik_1}/{tahun_akademik_2} dan berkelakuan baik:</p>'
      WHERE kode_surat = 'SKAK' AND (template_text IS NULL OR template_text = \'\')
    `);
    await connection.query(`
      UPDATE master_surat SET template_text = '<p class="text-justify indent-8 mb-4">Dengan hormat, sehubungan dengan pelaksanaan kegiatan mahasiswa di luar kampus, kami mengajukan permohonan rekomendasi / izin bagi mahasiswa kami untuk menyelenggarakan kegiatan <strong>"{nama_kegiatan}"</strong> pada lokasi yang Bapak/Ibu pimpin.</p><p class="text-justify indent-8 mb-4">Berikut adalah identitas mahasiswa pemohon beserta anggota kelompok pelaksana kegiatan tersebut:</p>'
      WHERE kode_surat = 'SKM' AND (template_text IS NULL OR template_text = \'\')
    `);
    console.log('Default letter templates seeded/updated.');

    // Seed admin
    const [adminCount] = await connection.query('SELECT COUNT(*) as count FROM admin');
    if (adminCount[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin', 10);
      await connection.query('INSERT INTO admin (username, password) VALUES (?, ?)', ['admin', hashedPassword]);
      console.log('Default admin account seeded (username: admin, password: admin).');
    }

    // Seed settings (default empty kop_surat)
    const [settingsCount] = await connection.query('SELECT COUNT(*) as count FROM settings WHERE key_name = ?', ['kop_surat']);
    if (settingsCount[0].count === 0) {
      await connection.query('INSERT INTO settings (key_name, value_text) VALUES (?, ?)', ['kop_surat', '']);
      console.log('Default settings seeded.');
    }

    connection.release();
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

module.exports = {
  pool,
  initializeDatabase
};
