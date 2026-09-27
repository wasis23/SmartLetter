import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import AdminLayout from '../components/AdminLayout';
import { API_BASE_URL } from '../config';
import { 
  FileSpreadsheet, 
  Download, 
  UploadCloud, 
  Printer, 
  Trash2, 
  Eye, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  X, 
  ChevronRight,
  BookOpen,
  FileCheck,
  UserCheck,
  Files,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Archive,
  Loader2,
  GraduationCap,
  ClipboardList,
  FlaskConical,
  HeartHandshake,
  ClipboardCheck
} from 'lucide-react';

const LETTER_TYPES = [
  {
    id: 'SKM',
    title: 'Surat Kesanggupan Mengajar (SKM)',
    subtitle: 'Format Dosen / Pengajar dengan tabel mata kuliah dinamis',
    icon: BookOpen,
    badge: 'SKM',
    color: 'indigo'
  },
  {
    id: 'FORM_INTEGRASI',
    title: 'Form Integrasi Mata Kuliah (PPM)',
    subtitle: 'Formulir Evaluasi Integrasi Penelitian & Pengabdian Masyarakat',
    icon: GraduationCap,
    badge: 'Integrasi PPM',
    color: 'emerald'
  },
  {
    id: 'FORM_PENILAIAN_PROPOSAL',
    title: 'Form Penilaian Proposal',
    subtitle: 'Formulir Penilaian Proposal Penelitian (Tanpa Kop Surat)',
    icon: ClipboardCheck,
    badge: 'Penilaian Proposal',
    color: 'amber'
  },
  {
    id: 'FORM_MONEV',
    title: 'Form Monev Penelitian Hibah Internal',
    subtitle: 'Instrumen Monitoring dan Evaluasi Kegiatan Penelitian Hibah Internal',
    icon: ClipboardList,
    badge: 'Form Monev',
    color: 'blue'
  }
];

export default function AdminGenerateSurat() {
  const [selectedType, setSelectedType] = useState('SKM');
  const [integrasiCategory, setIntegrasiCategory] = useState('Penelitian'); // 'Penelitian' | 'Pengabdian'
  const [fileName, setFileName] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [kopSuratLama, setKopSuratLama] = useState('');
  const [kopSuratBaru, setKopSuratBaru] = useState('');
  const [signatures, setSignatures] = useState({});
  const [activePreviewItem, setActivePreviewItem] = useState(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [singlePrintItem, setSinglePrintItem] = useState(null);
  const [isSeparatePrintModalOpen, setIsSeparatePrintModalOpen] = useState(false);
  const [printedItemKeys, setPrintedItemKeys] = useState(new Set());
  const [isZipping, setIsZipping] = useState(false);
  const [zipCurrentItem, setZipCurrentItem] = useState(null);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0, percentage: 0, currentItem: '' });
  const [uploadError, setUploadError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef(null);
  const zipRenderItemRef = useRef(null);
  const zipRenderPage1Ref = useRef(null);
  const zipRenderPage2Ref = useRef(null);

  useEffect(() => {
    fetchKopSurat();
    fetchSignatures();
  }, []);

  const urlToBase64 = async (url) => {
    try {
      if (!url || url.startsWith('data:')) return url;
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  const fetchSignatures = async () => {
    const keys = [
      'ttd_skm_dosen',
      'ttd_integrasi_gugus_mutu',
      'ttd_integrasi_ppm_prodi',
      'ttd_integrasi_ketua_upm',
      'ttd_integrasi_ketua_lppm',
      'ttd_penilai_proposal',
      'ttd_pemonev_penelitian'
    ];
    const loaded = {};
    await Promise.all(
      keys.map(async (k) => {
        try {
          const res = await fetch(`${API_BASE_URL}/settings/${k}`);
          if (res.ok) {
            const d = await res.json();
            if (d.value_text) {
              loaded[k] = await urlToBase64(d.value_text);
            }
          }
        } catch (e) {
          console.error(`Error loading signature ${k}:`, e);
        }
      })
    );
    setSignatures(loaded);
  };

  const fetchKopSurat = async () => {
    try {
      // 1. Fetch Kop Surat Lama (< 2025/2026)
      let baseLama = '';
      try {
        const resLama = await fetch(`${API_BASE_URL}/settings/kop_surat_lama`);
        if (resLama.ok) {
          const dataLama = await resLama.json();
          baseLama = await urlToBase64(dataLama.value_text || '');
        }
      } catch (e) {
        console.error(e);
      }

      // 2. Fetch Kop Surat Baru (>= 2025/2026)
      let baseBaru = '';
      try {
        const resBaru = await fetch(`${API_BASE_URL}/settings/kop_surat_baru`);
        if (resBaru.ok) {
          const dataBaru = await resBaru.json();
          baseBaru = await urlToBase64(dataBaru.value_text || '');
        }
      } catch (e) {
        console.error(e);
      }

      // Fallback default 'kop_surat' if missing
      if (!baseLama || !baseBaru) {
        try {
          const resDef = await fetch(`${API_BASE_URL}/settings/kop_surat`);
          if (resDef.ok) {
            const dataDef = await resDef.json();
            const baseDef = await urlToBase64(dataDef.value_text || '/kop.png');
            if (!baseLama) baseLama = baseDef;
            if (!baseBaru) baseBaru = baseDef;
          }
        } catch (e) {}
      }

      if (!baseLama) baseLama = await urlToBase64('/kop.png');
      if (!baseBaru) baseBaru = await urlToBase64('/kop.png');

      setKopSuratLama(baseLama);
      setKopSuratBaru(baseBaru);
    } catch {
      const fallback = await urlToBase64('/kop.png');
      setKopSuratLama(fallback);
      setKopSuratBaru(fallback);
    }
  };

  // Helper untuk menentukan Kop Surat berdasarkan Tahun Akademik:
  // - Di bawah tahun akademik 2025/2026 (< 2025) -> Menggunakan Kop Lama
  // - Tahun akademik 2025/2026 ke atas (>= 2025) -> Menggunakan Kop Baru
  const getKopSuratForTA = (tahunAkademik) => {
    if (!tahunAkademik) return kopSuratBaru || kopSuratLama || '/kop.png';
    const match = String(tahunAkademik).match(/(\d{4})/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      if (startYear < 2025) {
        return kopSuratLama || kopSuratBaru || '/kop.png';
      } else {
        return kopSuratBaru || kopSuratLama || '/kop.png';
      }
    }
    return kopSuratBaru || kopSuratLama || '/kop.png';
  };

  // Helper: Format official PDF export filename
  const getDocumentFileName = (item) => {
    if (!item) return 'Dokumen_Surat';
    if (selectedType === 'SKM') {
      const ta = (item.tahun_akademik || '').replace(/\s*\/\s*/g, '-');
      const sem = item.semester || '';
      return `SKM ${item.nama || ''} ${ta} ${sem}`.replace(/\s+/g, ' ').trim();
    } else if (selectedType === 'FORM_PENILAIAN_PROPOSAL') {
      const nama = item.nama_ketua_pengusul || item.nama || '';
      return `Form Penilaian Proposal ${nama}`.replace(/\s+/g, ' ').trim();
    } else if (selectedType === 'FORM_MONEV') {
      const nama = item.ketua_peneliti || item.nama || '';
      const ta = (item.tahun_akademik || '').replace(/\s*\/\s*/g, '-');
      return `Form Monev ${nama} ${ta}`.replace(/\s+/g, ' ').trim();
    } else {
      const ta = (item.tahun_akademik || '').replace(/\s*\/\s*/g, '-');
      const prodi = item.prodi || '';
      const kat = item.kategori || integrasiCategory;
      return `Form Integrasi ${kat} ${item.nama || ''} ${prodi} ${ta}`.replace(/\s+/g, ' ').trim();
    }
  };

  // Switch Letter Type
  const handleSelectType = (typeId) => {
    if (selectedType === typeId) return;
    setSelectedType(typeId);
    setParsedItems([]);
    setFileName('');
    setSuccessMessage('');
    setUploadError('');
    setPrintedItemKeys(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 1. Download Official Excel Template
  const handleDownloadTemplate = async () => {
    if (selectedType === 'SKM') {
      const sampleData = [
        {
          No: 1,
          Nama: 'Canggih Ajika Pamungkas, M.Kom',
          NIDN: '0628028902',
          No_HP: '-',
          Pengajar: 'Dosen / Praktisi',
          Semester: 'Ganjil',
          Tahun_Akademik: '2025 / 2026',
          Mata_Kuliah: 'Pembelajaran Mesin',
          Kelas_Semester: 'TRPL.C/V',
          Pertemuan: 10,
          SKS: 3,
          Luaran_Mata_Kuliah: 'Penelitian. HKI',
          Kota_Tanggal: 'Surakarta, 8 Juli 2025'
        },
        {
          No: 2,
          Nama: 'Canggih Ajika Pamungkas, M.Kom',
          NIDN: '0628028902',
          No_HP: '-',
          Pengajar: 'Dosen / Praktisi',
          Semester: 'Ganjil',
          Tahun_Akademik: '2025 / 2026',
          Mata_Kuliah: 'Pembelajaran Mesin',
          Kelas_Semester: 'TRPL.C/VIII',
          Pertemuan: 5,
          SKS: 3,
          Luaran_Mata_Kuliah: 'Penelitian. HKI',
          Kota_Tanggal: 'Surakarta, 8 Juli 2025'
        },
        {
          No: 3,
          Nama: 'Dr. Hendra Wijaya, S.Kom., M.Cs',
          NIDN: '0615088501',
          No_HP: '081234567890',
          Pengajar: 'Dosen',
          Semester: 'Ganjil',
          Tahun_Akademik: '2025 / 2026',
          Mata_Kuliah: 'Pemrograman Web Lanjut',
          Kelas_Semester: 'TRPL.A/III',
          Pertemuan: 14,
          SKS: 3,
          Luaran_Mata_Kuliah: 'Modul Ajar & HKI',
          Kota_Tanggal: 'Surakarta, 8 Juli 2025'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      worksheet['!cols'] = [
        { wch: 6 },  // No
        { wch: 32 }, // Nama
        { wch: 16 }, // NIDN
        { wch: 15 }, // No_HP
        { wch: 18 }, // Pengajar
        { wch: 12 }, // Semester
        { wch: 18 }, // Tahun_Akademik
        { wch: 28 }, // Mata_Kuliah
        { wch: 16 }, // Kelas_Semester
        { wch: 12 }, // Pertemuan
        { wch: 8 },  // SKS
        { wch: 22 }, // Luaran_Mata_Kuliah
        { wch: 25 }  // Kota_Tanggal
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_SKM');
      XLSX.writeFile(workbook, 'Template_SKM_Surat_Kesanggupan_Mengajar.xlsx');
    } else if (selectedType === 'FORM_PENILAIAN_PROPOSAL') {
      // Template for Form Penilaian Proposal (Hanya 3 inputan: Nama Ketua Pengusul, Judul Proposal, Tempat dan Tanggal)
      const sampleData = [
        {
          No: 1,
          Nama_Ketua_Pengusul: 'Dr. Ahmad Fauzi, M.Kom',
          Judul_Proposal: 'Penerapan Model Deep Learning untuk Deteksi Dini Penyakit Tanaman Padi',
          Tempat_Tanggal: 'Surakarta, 10 Agustus 2025'
        },
        {
          No: 2,
          Nama_Ketua_Pengusul: 'Ratna Dewi, S.ST., M.T.',
          Judul_Proposal: 'Rancang Bangun Sistem Monitoring Kualitas Air Tambak Berbasis Internet of Things',
          Tempat_Tanggal: 'Surakarta, 10 Agustus 2025'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      worksheet['!cols'] = [
        { wch: 6 },  // No
        { wch: 35 }, // Nama_Ketua_Pengusul
        { wch: 60 }, // Judul_Proposal
        { wch: 30 }  // Tempat_Tanggal
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Penilaian_Proposal');
      XLSX.writeFile(workbook, 'Template_Form_Penilaian_Proposal.xlsx');
    } else if (selectedType === 'FORM_MONEV') {
      // Template for Form Monev Penelitian Hibah Internal dengan Data Validation (Dropdown Otomatis)
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data_Monev');

      worksheet.columns = [
        { header: 'No', key: 'No', width: 6 },
        { header: 'Ketua_Peneliti', key: 'Ketua_Peneliti', width: 32 },
        { header: 'Program_Studi', key: 'Program_Studi', width: 28 },
        { header: 'Bidang_Keahlian', key: 'Bidang_Keahlian', width: 20 },
        { header: 'Judul_Penelitian', key: 'Judul_Penelitian', width: 50 },
        { header: 'Tahun_Akademik', key: 'Tahun_Akademik', width: 16 },
        { header: 'Biaya_Diusulkan', key: 'Biaya_Diusulkan', width: 20 },
        { header: 'Biaya_Disetujui', key: 'Biaya_Disetujui', width: 20 },
        { header: 'Cara_Pemantauan', key: 'Cara_Pemantauan', width: 22 },
        { header: 'Tanggal_Mulai', key: 'Tanggal_Mulai', width: 20 },
        { header: 'Tanggal_Selesai', key: 'Tanggal_Selesai', width: 20 },
        { header: 'Tahap_Penelitian', key: 'Tahap_Penelitian', width: 34 },
        { header: 'Persentase_Capaian', key: 'Persentase_Capaian', width: 20 },
        { header: 'Kesesuaian_Waktu', key: 'Kesesuaian_Waktu', width: 18 },
        { header: 'Alasan_Ketidaksesuaian', key: 'Alasan_Ketidaksesuaian', width: 26 },
        { header: 'Nama_Mitra_Instansi', key: 'Nama_Mitra_Instansi', width: 30 },
        { header: 'Bentuk_Kerjasama', key: 'Bentuk_Kerjasama', width: 25 },
        { header: 'Publikasi_Hasil', key: 'Publikasi_Hasil', width: 16 },
        { header: 'Judul_Artikel', key: 'Judul_Artikel', width: 50 },
        { header: 'Nama_Jurnal', key: 'Nama_Jurnal', width: 35 },
        { header: 'Link_Jurnal', key: 'Link_Jurnal', width: 35 },
        { header: 'Potensi_HKI', key: 'Potensi_HKI', width: 20 },
        { header: 'Mata_Kuliah_Integrasi', key: 'Mata_Kuliah_Integrasi', width: 30 },
        { header: 'Penilaian_Umum', key: 'Penilaian_Umum', width: 50 },
        { header: 'Tempat_Tanggal', key: 'Tempat_Tanggal', width: 25 },
        { header: 'Pemonev', key: 'Pemonev', width: 30 }
      ];

      worksheet.addRow({
        No: 1,
        Ketua_Peneliti: 'Ichwan Prastowo, S.Pd., M.Par.',
        Program_Studi: 'Perhotelan',
        Bidang_Keahlian: '-',
        Judul_Penelitian: 'Penerapan Manajemen Risiko Kesehatan dan Keselamatan Kerja (K3) di Area Umum untuk Menjamin Keselamatan Tamu di Hotel Bintang Lima di Solo',
        Tahun_Akademik: '2024-2025',
        Biaya_Diusulkan: 'Rp. 10.850.000',
        Biaya_Disetujui: 'Rp. 10.850.000',
        Cara_Pemantauan: 'Wawancara',
        Tanggal_Mulai: '04 September 2024',
        Tanggal_Selesai: '09 Agustus 2025',
        Tahap_Penelitian: 'Tahap pengolahan/analisis data',
        Persentase_Capaian: '75 %',
        Kesesuaian_Waktu: 'Sesuai',
        Alasan_Ketidaksesuaian: '-',
        Nama_Mitra_Instansi: '-',
        Bentuk_Kerjasama: '-',
        Publikasi_Hasil: 'Ada',
        Judul_Artikel: 'Implementation of Occupational Health and Safety (Ohs) Risk Management In Public Areas to Ensure Guest Safety at Five-Star Hotels In Solo',
        Nama_Jurnal: 'International Journal of Progressive Sciences and Technologies (IJPSAT)',
        Link_Jurnal: 'https://ijpsat.org/index.php/ijpsat/index',
        Potensi_HKI: 'Hak Cipta',
        Mata_Kuliah_Integrasi: 'Kebersihan, Sanitasi dan K3',
        Penilaian_Umum: 'Pelaksanaan penelitian berjalan dengan baik dan telah mencapai sekitar 75% dari keseluruhan tahapan yang direncanakan, mulai dari pengumpulan hingga pengolahan data dan penyusunan luaran. Penelitian memiliki relevansi yang kuat dengan bidang Perhotelan, khususnya mata kuliah Kebersihan, Sanitasi dan K3, serta telah menghasilkan luaran berupa publikasi artikel ilmiah. Secara umum, kegiatan penelitian berjalan sesuai dengan rencana dan menunjukkan progres yang baik menuju penyelesaian penelitian.',
        Tempat_Tanggal: 'Surakarta, 24 Mei 2025',
        Pemonev: 'Dr, Ratna Susanti, S.S., M.Pd'
      });

      worksheet.addRow({
        No: 2,
        Ketua_Peneliti: 'Canggih Ajika Pamungkas, M.Kom',
        Program_Studi: 'Teknologi Rekayasa Perangkat Lunak',
        Bidang_Keahlian: 'Artificial Intelligence',
        Judul_Penelitian: 'Pengembangan Sistem Klasifikasi Citra Medis Berbasis Kecerdasan Buatan',
        Tahun_Akademik: '2024-2025',
        Biaya_Diusulkan: 'Rp. 12.000.000',
        Biaya_Disetujui: 'Rp. 12.000.000',
        Cara_Pemantauan: 'Wawancara',
        Tanggal_Mulai: '01 Oktober 2024',
        Tanggal_Selesai: '30 Juli 2025',
        Tahap_Penelitian: 'Tahap pengolahan/analisis data',
        Persentase_Capaian: '80 %',
        Kesesuaian_Waktu: 'Sesuai',
        Alasan_Ketidaksesuaian: '-',
        Nama_Mitra_Instansi: 'RSUD dr. Moewardi Surakarta',
        Bentuk_Kerjasama: 'Penyediaan Dataset Citra Medis',
        Publikasi_Hasil: 'Ada',
        Judul_Artikel: 'Medical Image Classification Using Deep Convolutional Neural Networks',
        Nama_Jurnal: 'Journal of Applied Computer Science and Technology',
        Link_Jurnal: 'https://journal.jacst.org/index.php/jacst',
        Potensi_HKI: 'Hak Cipta',
        Mata_Kuliah_Integrasi: 'Pembelajaran Mesin',
        Penilaian_Umum: 'Pelaksanaan penelitian berjalan dengan sangat baik dan telah mencapai 80% dari target tahapan. Relevan dengan program studi TRPL dan mata kuliah Pembelajaran Mesin.',
        Tempat_Tanggal: 'Surakarta, 24 Mei 2025',
        Pemonev: 'Dr, Ratna Susanti, S.S., M.Pd'
      });

      // Style header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }
      };

      // Tambahkan Data Validation (Dropdown Otomatis) ke kolom untuk baris 2 s.d. 200
      for (let r = 2; r <= 200; r++) {
        // Cara Pemantauan (Kolom I / col 9)
        worksheet.getCell(`I${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Wawancara,Peninjauan lapangan,Lainnya"']
        };

        // Tahap Penelitian (Kolom L / col 12)
        worksheet.getCell(`L${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Tahap persiapan,Tahap pengumpulan data penelitian,Tahap pengolahan/analisis data,Tahap penulisan laporan,Tahap menyusun luaran"']
        };

        // Kesesuaian Waktu (Kolom N / col 14)
        worksheet.getCell(`N${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Sesuai,Tidak Sesuai"']
        };

        // Publikasi Hasil (Kolom R / col 18)
        worksheet.getCell(`R${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Ada,Tidak Ada"']
        };

        // Potensi HKI (Kolom V / col 22)
        worksheet.getCell(`V${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Hak Cipta,Hak Paten,Tidak ada"']
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Form_Monev_Penelitian_Hibah_Internal.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Template for Form Integrasi Matakuliah (Penelitian / Pengabdian)
      const sampleData = [
        {
          No: 1,
          Nama_Prodi: 'Perhotelan',
          Nama_Dosen: 'Ichwan Prastowo, S.Pd., M.Par',
          Tahun_Akademik: '2024/2025',
          Judul: 'Penerapan Manajemen Risiko Kesehatan dan Keselamatan Kerja (K3) di Area Umum untuk Menjamin Keselamatan Tamu di Hotel Bintang Lima di Solo',
          Bentuk_Integrasi: 'PPT',
          Luaran: 'Publikasi Jurnal Nasional',
          Mata_Kuliah_Diintegrasikan: 'Kebersihan, Sanitasi dan K3',
          Bukti_Integrasi_Link: '-',
          Gugus_Mutu: 'Prasiwi Citra Resmi, M.Par',
          PPM_Prodi: 'Yohanes Martono Widagdo, S.ST,. M.M.Par.',
          Ketua_UPM: 'Agustyarum Pradiska Budi, M.E.',
          Ketua_LPPM: 'Dr. Ratna Susanti, SS., M.Pd'
        },
        {
          No: 2,
          Nama_Prodi: 'Teknologi Rekayasa Perangkat Lunak',
          Nama_Dosen: 'Canggih Ajika Pamungkas, M.Kom',
          Tahun_Akademik: '2024/2025',
          Judul: 'Pengembangan Sistem Klasifikasi Citra Medis Berbasis Kecerdasan Buatan',
          Bentuk_Integrasi: 'Modul Ajar & Bahan Presentasi',
          Luaran: 'Publikasi Jurnal Nasional Sinta 2 & HKI',
          Mata_Kuliah_Diintegrasikan: 'Pembelajaran Mesin & AI',
          Bukti_Integrasi_Link: 'https://drive.google.com/drive/folders/sample-link',
          Gugus_Mutu: 'Prasiwi Citra Resmi, M.Par',
          PPM_Prodi: 'Yohanes Martono Widagdo, S.ST,. M.M.Par.',
          Ketua_UPM: 'Agustyarum Pradiska Budi, M.E.',
          Ketua_LPPM: 'Dr. Ratna Susanti, SS., M.Pd'
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(sampleData);
      worksheet['!cols'] = [
        { wch: 6 },  // No
        { wch: 28 }, // Nama_Prodi
        { wch: 32 }, // Nama_Dosen
        { wch: 16 }, // Tahun_Akademik
        { wch: 45 }, // Judul
        { wch: 25 }, // Bentuk_Integrasi
        { wch: 25 }, // Luaran
        { wch: 30 }, // Mata_Kuliah_Diintegrasikan
        { wch: 35 }, // Bukti_Integrasi_Link
        { wch: 28 }, // Gugus_Mutu
        { wch: 32 }, // PPM_Prodi
        { wch: 28 }, // Ketua_UPM
        { wch: 30 }  // Ketua_LPPM
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Form_Integrasi');
      XLSX.writeFile(workbook, 'Template_Form_Integrasi_Matakuliah.xlsx');
    }
  };

  // 2. Handle File Upload and Parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError('');
    setSuccessMessage('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          setUploadError('File Excel kosong atau format tidak sesuai.');
          return;
        }

        if (selectedType === 'SKM') {
          // Group rows by Lecturer (using NIDN or Nama)
          const lecturerMap = new Map();

          rows.forEach((row) => {
            const normalized = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.\/]/g, '');
              normalized[cleanKey] = row[key];
            });

            const nama = (normalized['nama'] || normalized['namadosen'] || normalized['namapengajar'] || '').toString().trim();
            let nidn = (normalized['nidn'] || normalized['nip'] || normalized['nik'] || '').toString().trim();
            
            if (nidn.startsWith('6')) {
              nidn = '0' + nidn;
            }

            const no_hp = (normalized['nohp'] || normalized['telepon'] || normalized['hp'] || normalized['notelphp'] || '-').toString().trim();
            const pengajar = (normalized['pengajar'] || normalized['status'] || 'Dosen / Praktisi').toString().trim();
            const semester = (normalized['semester'] || 'Ganjil').toString().trim();
            const tahun_akademik = (normalized['tahunakademik'] || normalized['ta'] || '2025 / 2026').toString().trim();
            const mata_kuliah = (normalized['matakuliah'] || normalized['matkul'] || '').toString().trim();
            const kelas_semester = (normalized['kelassemester'] || normalized['kelas'] || '').toString().trim();
            const pertemuan = normalized['pertemuan'] !== '' ? Number(normalized['pertemuan']) : 10;
            const sks = normalized['sks'] !== '' ? Number(normalized['sks']) : 0;
            const luaran_mata_kuliah = (normalized['luaranmatakuliah'] || normalized['luaran'] || '-').toString().trim();
            const kota_tanggal = (normalized['kotatanggal'] || normalized['tanggalsurat'] || 'Surakarta, 8 Juli 2025').toString().trim();

            if (!nama && !nidn) return;

            const cleanNameKey = nama ? nama.toLowerCase().replace(/\s+/g, ' ').trim() : nidn;
            const groupKey = cleanNameKey;

            if (!lecturerMap.has(groupKey)) {
              lecturerMap.set(groupKey, {
                key: groupKey,
                nama,
                nidn,
                no_hp,
                pengajar,
                semester,
                tahun_akademik,
                kota_tanggal,
                matkulList: []
              });
            }

            const lecturer = lecturerMap.get(groupKey);
            
            if (!lecturer.nama && nama) lecturer.nama = nama;
            if ((!lecturer.nidn || lecturer.nidn === '-') && nidn) lecturer.nidn = nidn;
            if ((!lecturer.no_hp || lecturer.no_hp === '-') && no_hp && no_hp !== '-') lecturer.no_hp = no_hp;
            if ((!lecturer.pengajar || lecturer.pengajar === 'Dosen / Praktisi') && pengajar) lecturer.pengajar = pengajar;
            if (!lecturer.semester && semester) lecturer.semester = semester;
            if (!lecturer.tahun_akademik && tahun_akademik) lecturer.tahun_akademik = tahun_akademik;

            if (mata_kuliah) {
              lecturer.matkulList.push({
                no: lecturer.matkulList.length + 1,
                mata_kuliah,
                kelas_semester,
                pertemuan,
                sks,
                luaran_mata_kuliah
              });
            }
          });

          const groupedArray = Array.from(lecturerMap.values()).map(lec => {
            const total_sks = lec.matkulList.reduce((acc, m) => acc + (Number(m.sks) || 0), 0);
            return { ...lec, total_sks };
          });

          if (groupedArray.length === 0) {
            setUploadError('Tidak dapat menemukan data dosen valid di file Excel.');
            return;
          }

          setParsedItems(groupedArray);
          setSuccessMessage(`Berhasil memproses ${groupedArray.length} data dosen pengajar (${rows.length} baris mata kuliah).`);
        } else if (selectedType === 'FORM_PENILAIAN_PROPOSAL') {
          // Parse Form Penilaian Proposal Penelitian
          const parsedList = [];

          rows.forEach((row, index) => {
            const normalized = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.\/]/g, '');
              normalized[cleanKey] = row[key];
            });

            const nama_ketua_pengusul = (
              normalized['namaketuapengusul'] || 
              normalized['ketuapengusul'] || 
              normalized['nama'] || 
              normalized['namadosen'] || 
              ''
            ).toString().trim();

            const judul_proposal = (
              normalized['judulproposal'] || 
              normalized['judul'] || 
              normalized['judulpenelitian'] || 
              ''
            ).toString().trim();

            const tempat_tanggal = (
              normalized['tempattanggal'] || 
              normalized['kotatanggal'] || 
              normalized['tanggal'] || 
              'Surakarta, 10 Agustus 2025'
            ).toString().trim();

            const penilai = (
              normalized['penilai'] || 
              normalized['namapenilai'] || 
              normalized['reviewer'] || 
              'Dr. Ratna Susanti, S.S., M.Pd'
            ).toString().trim();

            const catatan_penilai = (
              normalized['catatanpenilai'] || 
              normalized['catatan'] || 
              normalized['catatanreviewer'] || 
              normalized['keterangan'] || 
              'Proposal layak dilanjutkan untuk didanai risetnya'
            ).toString().trim();

            if (!nama_ketua_pengusul && !judul_proposal) return;

            // Generate Skor (5-7) dan Nilai (Bobot x Skor) dengan Total 540 s/d 700
            const kriteriaBobot = [25, 20, 35, 10, 10];
            let scores = [];
            let totalNilai = 0;
            let attempts = 0;

            do {
              scores = kriteriaBobot.map(() => Math.floor(Math.random() * 3) + 5); // 5, 6, atau 7
              totalNilai = scores.reduce((sum, score, idx) => sum + score * kriteriaBobot[idx], 0);
              attempts++;
            } while ((totalNilai < 540 || totalNilai > 700) && attempts < 10000);

            const kriteriaList = kriteriaBobot.map((bobot, idx) => ({
              no: idx + 1,
              bobot: bobot,
              skor: scores[idx],
              nilai: bobot * scores[idx]
            }));

            parsedList.push({
              key: `penilaian_proposal_${index}_${nama_ketua_pengusul.replace(/\s+/g, '_')}`,
              nama_ketua_pengusul,
              nama: nama_ketua_pengusul,
              judul_proposal,
              tempat_tanggal,
              penilai,
              catatan_penilai,
              kriteriaList,
              total_nilai: totalNilai
            });
          });

          if (parsedList.length === 0) {
            setUploadError('Tidak dapat menemukan data form penilaian proposal yang valid di file Excel.');
            return;
          }

          setParsedItems(parsedList);
          setSuccessMessage(`Berhasil memproses ${parsedList.length} data formulir penilaian proposal.`);
        } else if (selectedType === 'FORM_MONEV') {
          // Parse Form Monitoring dan Evaluasi (Monev) Penelitian Hibah Internal
          const parsedList = [];

          rows.forEach((row, index) => {
            const normalized = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.\/]/g, '');
              normalized[cleanKey] = row[key];
            });

            const ketua_peneliti = (
              normalized['ketuapeneliti'] || 
              normalized['nama'] || 
              normalized['namadosen'] || 
              normalized['namaketuapeneliti'] || 
              normalized['ketua'] ||
              ''
            ).toString().trim();

            const prodi = (
              normalized['programstudi'] || 
              normalized['prodi'] || 
              normalized['namaprodi'] || 
              ''
            ).toString().trim();

            const bidang_keahlian = (
              normalized['bidangkeahlian'] || 
              normalized['keahlian'] || 
              '-'
            ).toString().trim();

            const tahun_akademik = (
              normalized['tahunakademik'] || 
              normalized['ta'] || 
              normalized['tahun'] || 
              '2024-2025'
            ).toString().trim();

            const judul_penelitian = (
              normalized['judulpenelitian'] || 
              normalized['judul'] || 
              normalized['judulartikel'] || 
              ''
            ).toString().trim();

            if (!ketua_peneliti && !judul_penelitian) return;

            const formatRupiah = (val) => {
              if (!val) return 'Rp. 10.850.000';
              const str = val.toString().trim();
              if (str.startsWith('Rp') || str.startsWith('rp')) return str;
              const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
              if (isNaN(num)) return str;
              return 'Rp. ' + num.toLocaleString('id-ID');
            };

            const biaya_diusulkan = formatRupiah(normalized['biayayangdiusulkan'] || normalized['biayadiusulkan'] || normalized['usulanbiaya'] || normalized['biayausulan'] || 'Rp. 10.850.000');
            const biaya_disetujui = formatRupiah(normalized['biayayangdisetujui'] || normalized['biayadisetujui'] || normalized['disetujui'] || normalized['biaya'] || 'Rp. 10.850.000');

            const cara_pemantauan = (
              normalized['carapemantauan'] || 
              normalized['pemantauan'] || 
              normalized['metodepemantauan'] || 
              'Wawancara'
            ).toString().trim();

            const tanggal_mulai = (
              normalized['tanggalmulai'] || 
              normalized['tanggaldimulai'] || 
              normalized['mulai'] || 
              '04 September 2024'
            ).toString().trim();

            const tanggal_selesai = (
              normalized['tanggalselesai'] || 
              normalized['selesai'] || 
              '09 Agustus 2025'
            ).toString().trim();

            const tahap_penelitian = (
              normalized['tahappenelitian'] || 
              normalized['capaiantahap'] || 
              normalized['tahap'] || 
              'Tahap pengolahan/analisis data'
            ).toString().trim();

            let persentase_capaian = (
              normalized['persentasecapaian'] || 
              normalized['capaianpersen'] || 
              normalized['persentase'] || 
              normalized['persen'] || 
              '75 %'
            ).toString().trim();
            if (persentase_capaian && !persentase_capaian.includes('%')) {
              persentase_capaian = `${persentase_capaian} %`;
            }

            const kesesuaian_waktu = (
              normalized['kesesuaianwaktu'] || 
              normalized['kesesuaianpelaksanaan'] || 
              normalized['kesesuaian'] || 
              'Sesuai'
            ).toString().trim();

            const alasan_ketidaksesuaian = (
              normalized['alasanketidaksesuaian'] || 
              normalized['alasan'] || 
              '-'
            ).toString().trim();

            const mitra_instansi = (
              normalized['namamitra'] || 
              normalized['namadanalamatinstansi'] || 
              normalized['namainstansi'] || 
              normalized['instansi'] || 
              '-'
            ).toString().trim();

            const bentuk_kerjasama = (
              normalized['bentukkerjasama'] || 
              normalized['kerjasama'] || 
              '-'
            ).toString().trim();

            const publikasi_hasil = (
              normalized['publikasihasil'] || 
              normalized['publikasihasilpenelitian'] || 
              normalized['publikasi'] || 
              'Ada'
            ).toString().trim();

            const judul_artikel = (
              normalized['judulartikel'] || 
              normalized['artikel'] || 
              normalized['judulpublikasi'] || 
              ''
            ).toString().trim();

            const nama_jurnal = (
              normalized['namajurnal'] || 
              normalized['jurnal'] || 
              ''
            ).toString().trim();

            const link_jurnal = (
              normalized['linkjurnal'] || 
              normalized['urljurnal'] || 
              normalized['link'] || 
              ''
            ).toString().trim();

            const potensi_hki = (
              normalized['potensihki'] || 
              normalized['hki'] || 
              'Hak Cipta'
            ).toString().trim();

            const mata_kuliah_integrasi = (
              normalized['matakuliahyangdiintegrasikan'] || 
              normalized['matakuliahintegrasi'] || 
              normalized['matakuliah'] || 
              normalized['integrasimatakuliah'] || 
              '-'
            ).toString().trim();

            const rawPenilaian = (
              normalized['penilaianumum'] || 
              normalized['penilaian'] || 
              normalized['catatanpenilaian'] || 
              ''
            ).toString().trim();

            const persentaseNum = persentase_capaian || '75 %';
            const prodiText = prodi || 'program studi terkait';
            const matkulText = mata_kuliah_integrasi !== '-' ? mata_kuliah_integrasi : 'mata kuliah terkait';

            const defaultPenilaian = `Pelaksanaan penelitian berjalan dengan baik dan telah mencapai sekitar ${persentaseNum} dari keseluruhan tahapan yang direncanakan, mulai dari pengumpulan hingga pengolahan data dan penyusunan luaran. Penelitian memiliki relevansi yang kuat dengan bidang ${prodiText}, khususnya mata kuliah ${matkulText}, serta telah menghasilkan luaran berupa publikasi artikel ilmiah. Secara umum, kegiatan penelitian berjalan sesuai dengan rencana dan menunjukkan progres yang baik menuju penyelesaian penelitian.`;

            const penilaian_umum = rawPenilaian || defaultPenilaian;

            const tempat_tanggal = (
              normalized['tempattanggal'] || 
              normalized['kotatanggal'] || 
              normalized['tanggal'] || 
              'Surakarta, 24 Mei 2025'
            ).toString().trim();

            const pemonev = (
              normalized['pemonev'] || 
              normalized['namapemonev'] || 
              'Dr, Ratna Susanti, S.S., M.Pd'
            ).toString().trim();

            parsedList.push({
              key: `monev_${index}_${ketua_peneliti.replace(/\s+/g, '_')}`,
              ketua_peneliti,
              nama: ketua_peneliti,
              prodi,
              bidang_keahlian,
              tahun_akademik,
              judul_penelitian,
              biaya_diusulkan,
              biaya_disetujui,
              cara_pemantauan,
              tanggal_mulai,
              tanggal_selesai,
              tahap_penelitian,
              persentase_capaian,
              kesesuaian_waktu,
              alasan_ketidaksesuaian,
              mitra_instansi,
              bentuk_kerjasama,
              publikasi_hasil,
              judul_artikel,
              nama_jurnal,
              link_jurnal,
              potensi_hki,
              mata_kuliah_integrasi,
              penilaian_umum,
              tempat_tanggal,
              pemonev
            });
          });

          if (parsedList.length === 0) {
            setUploadError('Tidak dapat menemukan data form monev yang valid di file Excel.');
            return;
          }

          setParsedItems(parsedList);
          setSuccessMessage(`Berhasil memproses ${parsedList.length} data formulir monitoring dan evaluasi (Monev).`);
        } else {
          // Parse Form Integrasi Matakuliah (PPM)
          const parsedList = [];

          rows.forEach((row, index) => {
            const normalized = {};
            Object.keys(row).forEach((key) => {
              const cleanKey = key.toLowerCase().replace(/[\s_\-\.\/]/g, '');
              normalized[cleanKey] = row[key];
            });

            const prodi = (normalized['namaprodi'] || normalized['prodi'] || normalized['programstudi'] || '').toString().trim();
            const nama = (normalized['namadosen'] || normalized['nama'] || normalized['dosen'] || '').toString().trim();
            const tahun_akademik = (normalized['tahunakademik'] || normalized['ta'] || normalized['tahunajaran'] || '2024/2025').toString().trim();

            if (!nama && !prodi) return;

            const roadmap_ppm = (normalized['dosenmemilikiroadmapppm'] || normalized['roadmapppm'] || normalized['roadmap'] || 'Ada').toString().trim();
            const kesesuaian_roadmap = (normalized['kesesuaianppmdenganroadmap'] || normalized['kesesuaianroadmap'] || normalized['kesesuaian'] || 'Sesuai').toString().trim();

            // Gabungan Judul dan Luaran satu saja di template baru (atau fallback ke kolom lama jika ada)
            const rawJudul = (
              normalized['judul'] || 
              normalized['judulkegiatan'] || 
              normalized['judulpenelitian'] || 
              normalized['judulpengabdiankepadamasyarakat'] || 
              normalized['judulpengabdian'] || 
              normalized['judulppm'] || 
              normalized['penelitian'] || 
              normalized['pengabdian'] || 
              '-'
            ).toString().trim();

            const rawLuaran = (
              normalized['luaran'] || 
              normalized['luarankegiatan'] || 
              normalized['luaranpenelitianpublikasibukuhkidll'] || 
              normalized['luaranpenelitian'] || 
              normalized['luaranpengabdiankepadamasyarakatpublikasibukuhkidll'] || 
              normalized['luaranpengabdiankepadamasyarakat'] || 
              normalized['luaranppm'] || 
              normalized['luaranpengabdian'] || 
              normalized['luaranp'] || 
              'Publikasi'
            ).toString().trim();

            const bentuk_integrasi = (normalized['bentukintegrasihasilppmdenganmatakuliah'] || normalized['bentukintegrasi'] || normalized['bentuk'] || 'PPT').toString().trim();
            const mata_kuliah = (normalized['matakuliahyangdiintegrasikan'] || normalized['matakuliah'] || normalized['matkul'] || '-').toString().trim();
            const bukti_integrasi = (normalized['buktiintegrasippmdalampembelajaranrpspptbukuajarvideodllberupalinkdrive'] || normalized['buktiintegrasippmdalampembelajaran'] || normalized['buktiintegrasi'] || normalized['linkdrive'] || '-').toString().trim();

            const gugus_mutu = (normalized['gugusmutu'] || 'Prasiwi Citra Resmi, M.Par').toString().trim();
            const ppm_prodi = (normalized['ppmprogramstudi'] || normalized['ppmprodi'] || 'Yohanes Martono Widagdo, S.ST,. M.M.Par.').toString().trim();
            const ketua_upm = (normalized['ketuaupm'] || normalized['ketuaunitpenjaminanmutu'] || 'Agustyarum Pradiska Budi, M.E.').toString().trim();
            const ketua_lppm = (normalized['ketualppm'] || normalized['ketuaunitpenelitiandanpengabdiankepadamasyarakat'] || normalized['ketuappm'] || 'Dr. Ratna Susanti, SS., M.Pd').toString().trim();

            parsedList.push({
              key: `integrasi_${index}_${nama.replace(/\s+/g, '_')}`,
              nama,
              prodi,
              tahun_akademik,
              roadmap_ppm,
              kesesuaian_roadmap,
              rawJudul,
              rawLuaran,
              judul: rawJudul,
              luaran: rawLuaran,
              bentuk_integrasi,
              mata_kuliah,
              bukti_integrasi,
              gugus_mutu,
              ppm_prodi,
              ketua_upm,
              ketua_lppm
            });
          });

          if (parsedList.length === 0) {
            setUploadError('Tidak dapat menemukan data form integrasi valid di file Excel.');
            return;
          }

          setParsedItems(parsedList);
          setSuccessMessage(`Berhasil memproses ${parsedList.length} data formulir evaluasi integrasi mata kuliah.`);
        }
      } catch (err) {
        console.error(err);
        setUploadError('Gagal membaca file Excel. Pastikan file berformat .xlsx atau .xls.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleClearData = () => {
    setParsedItems([]);
    setFileName('');
    setSuccessMessage('');
    setUploadError('');
    setPrintedItemKeys(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Trigger batch printing (Gabung Semua Jadi 1 File PDF)
  const handleBatchPrint = () => {
    const originalTitle = document.title;
    const firstItem = parsedItems[0];
    const ta = (firstItem?.tahun_akademik || '').replace(/\s*\/\s*/g, '-');
    
    if (selectedType === 'SKM') {
      const sem = firstItem?.semester || '';
      document.title = `SKM Masal ${ta} ${sem}`.trim();
    } else if (selectedType === 'FORM_PENILAIAN_PROPOSAL') {
      document.title = `Form Penilaian Proposal Masal`.trim();
    } else if (selectedType === 'FORM_MONEV') {
      document.title = `Form Monev Masal ${ta}`.trim();
    } else {
      document.title = `Form Integrasi ${integrasiCategory} Masal ${ta}`.trim();
    }

    setSinglePrintItem(null);
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      const restoreTitle = () => {
        document.title = originalTitle;
        window.removeEventListener('afterprint', restoreTitle);
      };
      window.addEventListener('afterprint', restoreTitle);
    }, 400);
  };

  // Trigger single print (1 File Terpisah)
  const handleSinglePrint = (item, markAsPrinted = true) => {
    const originalTitle = document.title;
    const filename = getDocumentFileName(item);
    document.title = filename;

    if (markAsPrinted && item) {
      setPrintedItemKeys(prev => new Set([...prev, item.key || item.nama]));
    }

    setIsBatchPrinting(false);
    setSinglePrintItem(item);
    setTimeout(() => {
      window.print();
      const restoreTitle = () => {
        document.title = originalTitle;
        window.removeEventListener('afterprint', restoreTitle);
      };
      window.addEventListener('afterprint', restoreTitle);
    }, 400);
  };

  // Cetak antrean berikutnya yang belum dicetak
  const handlePrintNextInQueue = () => {
    const unprinted = parsedItems.find(l => !printedItemKeys.has(l.key || l.nama));
    if (unprinted) {
      handleSinglePrint(unprinted, true);
    }
  };

  // Download Semua Surat Terpisah ke dalam File ZIP/RAR
  const handleDownloadAllZip = async () => {
    if (parsedItems.length === 0) return;
    setIsZipping(true);
    setUploadError('');
    const total = parsedItems.length;
    setZipProgress({ current: 0, total, percentage: 0, currentItem: 'Menyiapkan dokumen...' });

    try {
      const zip = new JSZip();
      const firstItem = parsedItems[0];
      const ta = (firstItem?.tahun_akademik || '').replace(/\s*\/\s*/g, '-');

      for (let i = 0; i < parsedItems.length; i++) {
        const item = parsedItems[i];

        setZipProgress({
          current: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentItem: item.nama || item.prodi || `Dokumen #${i + 1}`
        });

        setZipCurrentItem(item);
        await new Promise(r => setTimeout(r, 130));

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        if (selectedType === 'FORM_MONEV') {
          const node1 = zipRenderPage1Ref.current;
          const node2 = zipRenderPage2Ref.current;
          if (!node1 || !node2) {
            throw new Error(`Gagal memuat halaman form monev untuk ${item.nama}`);
          }

          const imgData1 = await toJpeg(node1, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
          });

          const imgData2 = await toJpeg(node2, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
          });

          pdf.addImage(imgData1, 'JPEG', 0, 0, 210, 297);
          pdf.addPage();
          pdf.addImage(imgData2, 'JPEG', 0, 0, 210, 297);
        } else {
          const node = zipRenderItemRef.current;
          if (!node) {
            throw new Error(`Gagal memuat elemen dokumen untuk ${item.nama}`);
          }

          const imgData = await toJpeg(node, {
            quality: 0.95,
            pixelRatio: 2,
            backgroundColor: '#ffffff'
          });

          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = 210;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          const pageHeight = 297;

          if (pdfHeight <= pageHeight + 5) {
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          } else {
            let heightLeft = pdfHeight;
            let position = 0;

            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 5) {
              position -= pageHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
              heightLeft -= pageHeight;
            }
          }
        }

        const pdfBlob = pdf.output('blob');
        const fileName = `${getDocumentFileName(item)}.pdf`;
        zip.file(fileName, pdfBlob);

        setPrintedItemKeys(prev => new Set([...prev, item.key || item.nama]));
      }

      setZipCurrentItem(null);

      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      const prefix = selectedType === 'SKM' 
        ? 'SKM_Terpisah' 
        : selectedType === 'FORM_PENILAIAN_PROPOSAL' 
          ? 'Form_Penilaian_Proposal_Terpisah' 
          : selectedType === 'FORM_MONEV'
            ? 'Form_Monev_Terpisah'
            : `Form_Integrasi_${integrasiCategory}_Terpisah`;
      const zipDatePart = ta || new Date().toISOString().slice(0, 10);
      link.download = `${prefix}_${zipDatePart}.zip`.replace(/\s+/g, '_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccessMessage(`Berhasil mengunduh file ZIP/RAR berisi ${parsedItems.length} dokumen surat.`);
    } catch (err) {
      console.error('Error creating ZIP archive:', err);
      setUploadError(`Gagal membuat file ZIP/RAR: ${err.message || 'Terjadi kesalahan saat render'}`);
    } finally {
      setZipCurrentItem(null);
      setIsZipping(false);
    }
  };

  return (
    <AdminLayout title="Generate Surat Masal">
      
      {/* 1. Main Admin Workspace View (Hidden during printing) */}
      <div className="no-print space-y-6 animate-fade-in pb-12 w-full">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden w-full">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-indigo-200 border border-white/10">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Batch Letter Generator</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Generate Surat Masal Otomatis (Excel Import)
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Pilih jenis template surat yang ingin dibuat, unduh template spreadsheet Excel (.xlsx), isi data, dan impor untuk men-generate puluhan dokumen sekaligus secara instan dan rapi.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <FileSpreadsheet className="w-80 h-80 text-white" />
          </div>
        </div>

        {/* Steps Grid: 1. Template & 2. Upload */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Pilihan Surat & Download Template */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold border border-indigo-100">
                  1
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Pilih Jenis & Unduh Template</h3>
                  <p className="text-xs text-slate-500">Pilih jenis formulir dan unduh struktur kolom yang sesuai</p>
                </div>
              </div>

              {/* Selector Jenis Surat */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Template Surat / Formulir:
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {LETTER_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <div
                        key={type.id}
                        onClick={() => handleSelectType(type.id)}
                        className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-600 shadow-sm'
                            : 'bg-slate-50/50 hover:bg-slate-100/70 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
                          }`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <span className={`text-xs font-extrabold block truncate ${
                              isSelected ? 'text-indigo-950' : 'text-slate-800'
                            }`}>
                              {type.title}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {type.subtitle}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {isSelected ? 'AKTIF' : 'PILIH'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Pilihan: Penelitian atau Pengabdian (khusus Form Integrasi) */}
              {selectedType === 'FORM_INTEGRASI' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Pilih Kategori Generate:
                    </label>
                    <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold rounded-md">
                      Mapping Otomatis
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIntegrasiCategory('Penelitian')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        integrasiCategory === 'Penelitian'
                          ? 'bg-white border-emerald-600 shadow-sm text-emerald-950 font-extrabold'
                          : 'bg-white/60 hover:bg-white border-transparent hover:border-emerald-300 text-emerald-800 font-medium'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        integrasiCategory === 'Penelitian' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <FlaskConical className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">1. Penelitian</span>
                        <span className="text-[10px] text-slate-500 block font-normal leading-tight">
                          Masuk ke baris Penelitian
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIntegrasiCategory('Pengabdian')}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                        integrasiCategory === 'Pengabdian'
                          ? 'bg-white border-emerald-600 shadow-sm text-emerald-950 font-extrabold'
                          : 'bg-white/60 hover:bg-white border-transparent hover:border-emerald-300 text-emerald-800 font-medium'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        integrasiCategory === 'Pengabdian' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <HeartHandshake className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block">2. Pengabdian</span>
                        <span className="text-[10px] text-slate-500 block font-normal leading-tight">
                          Masuk ke baris Pengabdian
                        </span>
                      </div>
                    </button>
                  </div>

                  <p className="text-[11px] text-emerald-900 bg-emerald-100/60 p-2.5 rounded-xl leading-relaxed">
                    {integrasiCategory === 'Penelitian' ? (
                      <>
                        📌 <strong>Mode Penelitian:</strong> Judul & Luaran yang diimpor akan masuk ke kolom <strong>Penelitian (baris 3 & 6)</strong>. Baris Pengabdian (4 & 7) otomatis diisi strip (<strong>-</strong>).
                      </>
                    ) : (
                      <>
                        📌 <strong>Mode Pengabdian:</strong> Judul & Luaran yang diimpor akan masuk ke kolom <strong>Pengabdian (baris 4 & 7)</strong>. Baris Penelitian (3 & 6) otomatis diisi strip (<strong>-</strong>).
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Info panduan kolom */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> 
                  {selectedType === 'SKM' 
                    ? 'Aturan Format Excel SKM:' 
                    : selectedType === 'FORM_PENILAIAN_PROPOSAL'
                      ? 'Aturan Format Excel Form Penilaian Proposal:'
                      : selectedType === 'FORM_MONEV'
                        ? 'Aturan Format Excel Form Monev:'
                        : 'Aturan Format Excel Form Integrasi:'}
                </span>
                {selectedType === 'SKM' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Setiap baris berisi 1 mata kuliah.</li>
                    <li>Jika 1 dosen mengajar lebih dari 1 mata kuliah, gunakan <strong>Nama</strong> yang sama (otomatis digabung ke 1 surat).</li>
                    <li>NIDN yang berawalan angka 6 otomatis diformat dengan angka 0 di depannya.</li>
                  </ul>
                ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Hanya butuh 3 kolom isian di Excel: <strong>Nama_Ketua_Pengusul</strong>, <strong>Judul_Proposal</strong>, dan <strong>Tempat_Tanggal</strong>.</li>
                    <li>Kolom <strong>Skor</strong> (nilai 5-7) dan <strong>Nilai</strong> (Bobot x Skor) <strong>diisi otomatis oleh sistem</strong> dengan total nilai berkisar <strong>540 s.d. 700</strong>.</li>
                    <li>Dokumen formulir penilaian proposal ini di-generate <strong>tanpa kop surat</strong> sesuai standar dokumen evaluasi.</li>
                  </ul>
                ) : selectedType === 'FORM_MONEV' ? (
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Formulir Monitoring dan Evaluasi (Monev) Kegiatan Penelitian Hibah Internal.</li>
                    <li>Kolom utama: <strong>Ketua_Peneliti</strong>, <strong>Program_Studi</strong>, <strong>Judul_Penelitian</strong>, <strong>Biaya</strong>, <strong>Publikasi (Judul, Jurnal, Link)</strong>, dan <strong>Integrasi Mata Kuliah</strong>.</li>
                    <li>Kolom <strong>Penilaian_Umum</strong> terisi otomatis narasi standar profesional bila dikosongkan di Excel.</li>
                  </ul>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Setiap baris berisi 1 formulir evaluasi integrasi per dosen / mata kuliah.</li>
                    <li>Data <strong>Judul</strong> dan <strong>Luaran</strong> kini digabung menjadi 1 kolom saja di Excel.</li>
                    <li>Pilih opsi kategori di atas (<strong>Penelitian</strong> atau <strong>Pengabdian</strong>) untuk menentukan letak baris output dokumen.</li>
                    <li>Baris yang tidak dipilih otomatis bernilai tanda strip (<strong>-</strong>).</li>
                  </ul>
                )}
              </div>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-98"
            >
              <Download className="w-4 h-4 text-blue-400" /> 
              {selectedType === 'SKM' 
                ? 'Unduh Template Excel SKM (.xlsx)' 
                : selectedType === 'FORM_PENILAIAN_PROPOSAL'
                  ? 'Unduh Template Penilaian Proposal (.xlsx)'
                  : selectedType === 'FORM_MONEV'
                    ? 'Unduh Template Form Monev (.xlsx)'
                    : 'Unduh Template Excel Form Integrasi (.xlsx)'}
            </button>
          </div>

          {/* Card 2: Upload File Excel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold border border-blue-100">
                  2
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Unggah File Data Excel</h3>
                  <p className="text-xs text-slate-500">Pilih file spreadsheet berisi data sesuai template aktif</p>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-indigo-600 mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <span className="text-xs font-extrabold text-slate-800 block">
                  {fileName ? fileName : 'Klik untuk memilih file Excel (.xlsx / .xls)'}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Drag & drop file spreadsheet ke area ini
                </span>
              </div>

              {/* Status Alert */}
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}
            </div>

            {parsedItems.length > 0 && (
              <button
                onClick={handleClearData}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Reset / Hapus Data Unggahan
              </button>
            )}
          </div>
        </div>

        {/* 3. Table Preview & Batch Actions */}
        {parsedItems.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
            
            {/* Top Bar inside Preview Table */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900">Daftar Dokumen Siap Cetak</h3>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-extrabold rounded-full">
                    {parsedItems.length} Dokumen / Surat
                  </span>
                  <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-full">
                    {selectedType === 'SKM' 
                      ? 'SKM' 
                      : selectedType === 'FORM_PENILAIAN_PROPOSAL' 
                        ? 'Penilaian Proposal' 
                        : selectedType === 'FORM_MONEV'
                          ? 'Form Monev'
                          : 'Integrasi PPM'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih opsi: Cetak digabung 1 file PDF atau langsung download semua file terpisah dalam bentuk RAR/ZIP
                </p>
              </div>

              {/* 2 Print / Download Options Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                
                {/* Opsi 1: Gabung 1 File */}
                <button
                  onClick={handleBatchPrint}
                  disabled={isZipping}
                  className="flex-1 sm:flex-initial px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Gabung semua surat ke dalam 1 file PDF multi-halaman"
                >
                  <Layers className="w-4 h-4" /> Cetak Gabung (1 File Semua Dokumen)
                </button>

                {/* Opsi 2: Download Langsung RAR/ZIP Per Dokumen */}
                <button
                  onClick={handleDownloadAllZip}
                  disabled={isZipping}
                  className="flex-1 sm:flex-initial px-5 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Download semua surat terpisah dalam satu arsip file RAR/ZIP"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses ({zipProgress.percentage}%)</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 text-emerald-200" />
                      <span>Download Terpisah (RAR/ZIP Semua File)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Document Table (Dynamic based on selectedType) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-900 font-extrabold uppercase text-[10px] tracking-wider border-y border-slate-200">
                  {selectedType === 'SKM' ? (
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Dosen / Pengajar</th>
                      <th className="py-3 px-4">NIDN</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Semester / TA</th>
                      <th className="py-3 px-4">Mata Kuliah Diampu</th>
                      <th className="py-3 px-4 text-center">Total SKS</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Ketua Pengusul</th>
                      <th className="py-3 px-4">Judul Proposal Penelitian</th>
                      <th className="py-3 px-4 text-center">Skor & Total Nilai</th>
                      <th className="py-3 px-4">Tempat & Tanggal</th>
                      <th className="py-3 px-4">Penilai</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  ) : selectedType === 'FORM_MONEV' ? (
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Ketua Peneliti & Prodi</th>
                      <th className="py-3 px-4">Judul Penelitian</th>
                      <th className="py-3 px-4">Biaya & Capaian</th>
                      <th className="py-3 px-4">Publikasi & Matkul Integrasi</th>
                      <th className="py-3 px-4">Pemonev</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Nama Dosen & Prodi</th>
                      <th className="py-3 px-4">Tahun Akademik</th>
                      <th className="py-3 px-4">Mata Kuliah Diintegrasikan</th>
                      <th className="py-3 px-4">Judul ({integrasiCategory})</th>
                      <th className="py-3 px-4">Luaran & Bentuk</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedItems.map((item, idx) => {
                    const isPrinted = printedItemKeys.has(item.key || item.nama);
                    return (
                      <tr key={idx} className={`transition-colors ${isPrinted ? 'bg-emerald-50/30' : 'hover:bg-blue-50/40'}`}>
                        <td className="py-3.5 px-4 font-bold text-slate-500">
                          <div className="flex items-center gap-1.5">
                            {idx + 1}
                            {isPrinted && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline" />}
                          </div>
                        </td>
                        
                        {selectedType === 'SKM' ? (
                          <>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              {item.nama}
                              <span className="block text-[10px] font-normal text-slate-500">HP: {item.no_hp}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-900">{item.nidn || '-'}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-700 rounded-md text-[10px]">
                                {item.pengajar}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600">
                              {item.semester} {item.tahun_akademik}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                {item.matkulList?.map((m, mIdx) => (
                                  <div key={mIdx} className="text-[11px] text-slate-800 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                                    <span className="font-semibold">{m.mata_kuliah}</span>
                                    <span className="text-slate-500">({m.kelas_semester} - {m.sks} SKS)</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-indigo-950 text-sm">
                              {item.total_sks}
                            </td>
                          </>
                        ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                          <>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">
                              {item.nama_ketua_pengusul || item.nama}
                            </td>
                            <td className="py-3.5 px-4 max-w-md">
                              <p className="text-[11px] text-slate-800 font-medium leading-relaxed">
                                {item.judul_proposal}
                              </p>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-xs border border-amber-200 shadow-xs">
                                Total: {item.total_nilai}
                              </span>
                              <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                                Skor: [{(item.kriteriaList || []).map(k => k.skor).join(', ')}]
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                              {item.tempat_tanggal}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600 text-[11px]">
                              {item.penilai || 'Dr. Ratna Susanti, S.S., M.Pd'}
                            </td>
                          </>
                        ) : selectedType === 'FORM_MONEV' ? (
                          <>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-slate-900 block">{item.ketua_peneliti || item.nama}</span>
                              <span className="text-[11px] font-semibold text-blue-700 block">Prodi: {item.prodi || '-'}</span>
                              <span className="text-[10px] text-slate-500 block">TA: {item.tahun_akademik || '-'}</span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <p className="text-[11px] text-slate-800 font-medium leading-snug">
                                {item.judul_penelitian || '-'}
                              </p>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block text-[11px]">{item.biaya_disetujui || item.biaya_diusulkan || '-'}</span>
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-extrabold mt-0.5">
                                Capaian: {item.persentase_capaian || '75%'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <span className="font-bold text-slate-900 block text-[11px] truncate">
                                {item.judul_artikel ? `📄 ${item.judul_artikel}` : 'Publikasi: -'}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Matkul: {item.mata_kuliah_integrasi || '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-600 text-[11px] whitespace-nowrap">
                              {item.pemonev || 'Dr, Ratna Susanti, S.S., M.Pd'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-slate-900 block">{item.nama}</span>
                              <span className="text-[11px] font-semibold text-emerald-700 block">Prodi: {item.prodi || '-'}</span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-700">
                              {item.tahun_akademik}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 block">{item.mata_kuliah || '-'}</span>
                              <span className="text-[10px] text-slate-500">Bentuk: {item.bentuk_integrasi || '-'}</span>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="space-y-1">
                                <div className="text-[11px] text-slate-800 font-medium">
                                  {item.rawJudul || item.judul || '-'}
                                </div>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  integrasiCategory === 'Penelitian' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  Kolom {integrasiCategory}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 font-bold text-slate-800 rounded-md text-[10px] block w-fit mb-1">
                                {item.rawLuaran || item.luaran || '-'}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">
                                Bukti: {item.bukti_integrasi || '-'}
                              </span>
                            </td>
                          </>
                        )}

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setActivePreviewItem(item)}
                              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              title="Pratinjau Dokumen"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSinglePrint(item, true)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                                isPrinted
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700'
                              }`}
                              title={`Cetak terpisah: ${getDocumentFileName(item)}.pdf`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              {isPrinted ? 'Cetak Ulang' : 'Cetak File Ini'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* 2. Modal Preview Single Letter (Interactive UI on screen) */}
      {activePreviewItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Pratinjau Dokumen: {activePreviewItem.nama_ketua_pengusul || activePreviewItem.nama}
                </h3>
              </div>
              <button
                onClick={() => setActivePreviewItem(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Render Visual Preview inside modal */}
            <div className="flex-1 overflow-y-auto my-4 bg-slate-100 p-6 rounded-2xl flex justify-center">
              {selectedType === 'FORM_MONEV' ? (
                <div className="flex flex-col items-center gap-6 w-full">
                  <div className="text-center">
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">
                      Halaman 1 dari 2 (Margin Atas/Bawah 10 mm, Kiri/Kanan 20 mm)
                    </span>
                  </div>
                  <div className="w-[210mm] min-h-[297mm] bg-white p-[10mm_20mm_10mm_20mm] shadow-md text-black border border-slate-300 pointer-events-none scale-90 md:scale-95 origin-top flex flex-col justify-between">
                    <FormMonevPage1 data={activePreviewItem} />
                  </div>
                  <div className="text-center mt-2">
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full text-xs">
                      Halaman 2 dari 2 (Margin Atas/Bawah 10 mm, Kiri/Kanan 20 mm)
                    </span>
                  </div>
                  <div className="w-[210mm] min-h-[297mm] bg-white p-[10mm_20mm_10mm_20mm] shadow-md text-black border border-slate-300 pointer-events-none scale-90 md:scale-95 origin-top flex flex-col justify-between">
                    <FormMonevPage2 data={activePreviewItem} signatures={signatures} />
                  </div>
                </div>
              ) : (
                <div className="w-[210mm] min-h-[297mm] bg-white p-[10mm_20mm_10mm_20mm] shadow-md text-black border border-slate-300 pointer-events-none scale-90 md:scale-95 origin-top">
                  {selectedType === 'SKM' ? (
                    <SKMDocumentContent lecturer={activePreviewItem} kopSurat={getKopSuratForTA(activePreviewItem.tahun_akademik)} signatures={signatures} />
                  ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                    <FormPenilaianProposalDocumentContent data={activePreviewItem} signatures={signatures} />
                  ) : (
                    <FormIntegrasiDocumentContent data={activePreviewItem} kopSurat={getKopSuratForTA(activePreviewItem.tahun_akademik)} integrasiCategory={integrasiCategory} signatures={signatures} />
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setActivePreviewItem(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  const target = activePreviewItem;
                  setActivePreviewItem(null);
                  handleSinglePrint(target, true);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Dokumen Ini (A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Printable Documents Container (Always populated and cleanly formatted for window.print) */}
      <div className="print-only-container">
        {singlePrintItem ? (
          selectedType === 'FORM_MONEV' ? (
            <>
              <div className="skm-print-sheet">
                <FormMonevPage1 data={singlePrintItem} />
              </div>
              <div className="skm-print-sheet">
                <FormMonevPage2 data={singlePrintItem} signatures={signatures} />
              </div>
            </>
          ) : (
            <div className="skm-print-sheet">
              {selectedType === 'SKM' ? (
                <SKMDocumentContent lecturer={singlePrintItem} kopSurat={getKopSuratForTA(singlePrintItem.tahun_akademik)} signatures={signatures} />
              ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                <FormPenilaianProposalDocumentContent data={singlePrintItem} signatures={signatures} />
              ) : (
                <FormIntegrasiDocumentContent data={singlePrintItem} kopSurat={getKopSuratForTA(singlePrintItem.tahun_akademik)} integrasiCategory={integrasiCategory} signatures={signatures} />
              )}
            </div>
          )
        ) : parsedItems.length > 0 ? (
          parsedItems.map((item, idx) => (
            selectedType === 'FORM_MONEV' ? (
              <React.Fragment key={idx}>
                <div className="skm-print-sheet">
                  <FormMonevPage1 data={item} />
                </div>
                <div className="skm-print-sheet">
                  <FormMonevPage2 data={item} signatures={signatures} />
                </div>
              </React.Fragment>
            ) : (
              <div key={idx} className="skm-print-sheet">
                {selectedType === 'SKM' ? (
                  <SKMDocumentContent lecturer={item} kopSurat={getKopSuratForTA(item.tahun_akademik)} signatures={signatures} />
                ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                  <FormPenilaianProposalDocumentContent data={item} signatures={signatures} />
                ) : (
                  <FormIntegrasiDocumentContent data={item} kopSurat={getKopSuratForTA(item.tahun_akademik)} integrasiCategory={integrasiCategory} signatures={signatures} />
                )}
              </div>
            )
          ))
        ) : null}
      </div>

      {/* 4. Zipping Progress Overlay Modal */}
      {isZipping && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm animate-pulse">
              <Archive className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-900">
                Membuat File RAR/ZIP...
              </h3>
              <p className="text-xs text-slate-500">
                Sedang mengonversi dan mengemas file PDF terpisah
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div 
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${zipProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600 font-bold">
                <span>{zipProgress.current} dari {zipProgress.total} Dokumen</span>
                <span>{zipProgress.percentage}%</span>
              </div>
            </div>

            {zipProgress.currentItem && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono text-slate-700 truncate">
                📄 {zipProgress.currentItem}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Active render container for high-resolution ZIP PDF generation */}
      {zipCurrentItem && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '210mm', 
            zIndex: 40,
            backgroundColor: '#ffffff'
          }}
        >
          {selectedType === 'FORM_MONEV' ? (
            <div>
              <div 
                ref={zipRenderPage1Ref}
                className="bg-white"
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm',
                  boxSizing: 'border-box', 
                  padding: '10mm 20mm 10mm 20mm',
                  backgroundColor: '#ffffff'
                }}
              >
                <FormMonevPage1 data={zipCurrentItem} />
              </div>
              <div 
                ref={zipRenderPage2Ref}
                className="bg-white"
                style={{ 
                  width: '210mm', 
                  minHeight: '297mm',
                  boxSizing: 'border-box', 
                  padding: '10mm 20mm 10mm 20mm',
                  backgroundColor: '#ffffff'
                }}
              >
                <FormMonevPage2 data={zipCurrentItem} signatures={signatures} />
              </div>
            </div>
          ) : (
            <div 
              ref={zipRenderItemRef}
              className="bg-white"
              style={{ 
                width: '210mm', 
                minHeight: '297mm',
                boxSizing: 'border-box', 
                padding: '10mm 20mm 10mm 20mm',
                backgroundColor: '#ffffff'
              }}
            >
              {selectedType === 'SKM' ? (
                <SKMDocumentContent lecturer={zipCurrentItem} kopSurat={getKopSuratForTA(zipCurrentItem.tahun_akademik)} signatures={signatures} />
              ) : selectedType === 'FORM_PENILAIAN_PROPOSAL' ? (
                <FormPenilaianProposalDocumentContent data={zipCurrentItem} signatures={signatures} />
              ) : (
                <FormIntegrasiDocumentContent data={zipCurrentItem} kopSurat={getKopSuratForTA(zipCurrentItem.tahun_akademik)} integrasiCategory={integrasiCategory} signatures={signatures} />
              )}
            </div>
          )}
        </div>
      )}

    </AdminLayout>
  );
}

// -----------------------------------------------------------------------------------
// Component: Formatted SKM Document Layout (Replicating exact PDF layout & typography)
// -----------------------------------------------------------------------------------
function SKMDocumentContent({ lecturer, kopSurat, signatures = {} }) {
  if (!lecturer) return null;

  const ttdDosen = signatures['ttd_skm_dosen'] || '';

  return (
    <div 
      className="w-full text-black flex flex-col justify-between bg-white" 
      style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11pt', lineHeight: '1.3' }}
    >
      <div>
        {/* 1. Kop Surat Header */}
        <div className="w-full mb-6">
          <img 
            src={kopSurat || '/kop.png'} 
            alt="Kop Surat Resmi" 
            className="w-full h-auto block" 
          />
        </div>

        {/* 2. Judul Surat */}
        <div className="text-center mb-3">
          <h2 className="text-[13pt] font-bold tracking-wider inline-block uppercase">
            SURAT KESANGGUPAN MENGAJAR
          </h2>
        </div>

        {/* 3. Identitas Dosen */}
        <div className="text-[11pt] space-y-1 mt-1">
          <p className="mb-1">Yang bertanda tangan dibawah ini saya:</p>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td style={{ width: '130px' }} className="py-0.5">Nama</td>
                <td style={{ width: '15px' }} className="py-0.5">:</td>
                <td className="py-0.5 font-bold">{lecturer.nama}</td>
              </tr>
              <tr>
                <td className="py-0.5">No. Telepon/HP</td>
                <td className="py-0.5">:</td>
                <td className="py-0.5">{lecturer.no_hp || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5">NIDN</td>
                <td className="py-0.5">:</td>
                <td className="py-0.5 font-mono">{lecturer.nidn || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5">Pengajar</td>
                <td className="py-0.5">:</td>
                <td className="py-0.5">{lecturer.pengajar || 'Dosen / Praktisi'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Pernyataan & Tabel Matkul */}
        <div className="text-[11pt] mt-1.5">
          <p className="mb-1">
            Pada semester <strong>{lecturer.semester}</strong> Tahun Akademik <strong>{lecturer.tahun_akademik}</strong> dengan ini saya sanggup:
          </p>
          
          <div>
            <p className="font-semibold mb-1">1. Menerima tugas mengajar mata kuliah:</p>
            
            {/* Table Courses */}
            <table className="w-full border-collapse text-[10pt] mt-1 mb-1.5" style={{ border: '1px solid black' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ border: '1px solid black', padding: '3px 4px', width: '30px', textAlign: 'center' }}>NO</th>
                  <th style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center' }}>MATA KULIAH</th>
                  <th style={{ border: '1px solid black', padding: '3px 4px', width: '110px', textAlign: 'center' }}>KELAS/<br />SEMESTER</th>
                  <th style={{ border: '1px solid black', padding: '3px 4px', width: '90px', textAlign: 'center' }}>PERTEMUAN</th>
                  <th style={{ border: '1px solid black', padding: '3px 4px', width: '50px', textAlign: 'center' }}>SKS</th>
                  <th style={{ border: '1px solid black', padding: '3px 4px', width: '140px', textAlign: 'center' }}>LUARAN<br />MATA KULIAH</th>
                </tr>
              </thead>
              <tbody>
                {lecturer.matkulList?.map((m, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid black', padding: '3px 4px', fontWeight: 'bold' }}>{m.mata_kuliah}</td>
                    <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center' }}>{m.kelas_semester}</td>
                    <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center' }}>{m.pertemuan}</td>
                    <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{m.sks}</td>
                    <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center' }}>{m.luaran_mata_kuliah || '-'}</td>
                  </tr>
                ))}
                {/* Total SKS Row */}
                <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
                  <td colSpan={4} style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'right', paddingRight: '12px' }}>
                    TOTAL SKS
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px 4px', textAlign: 'center', fontSize: '10.5pt' }}>
                    {lecturer.total_sks}
                  </td>
                  <td style={{ border: '1px solid black', padding: '3px 4px', background: '#f1f5f9' }}></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Butir 2 s/d 8 Komitmen Kesanggupan */}
          <ol start={2} className="list-decimal list-outside pl-5 space-y-0.5 text-[9.5pt] leading-tight text-justify">
            <li>Meninjau kembali silabi mata kuliah bersama dengan Program Studi</li>
            <li>Menyusun Kontrak Perkuliahan (KP) dan dikumpulkan ke Ketua Program Studi satu minggu sebelum mengajar</li>
            <li>Menyusun Rencana Pembelajaran Semester (RPS) dan atau mengevaluasi RPS dan dikumpulkan ke Ketua Program Studi satu minggu sebelum mengajar</li>
            <li>Mengajar sesuai dengan jadwal yang telah ditentukan</li>
            <li>Mengajar menggunakan sarana pembelajaran multimedia</li>
            <li>Mentaati peraturan yang telah ditetapkan oleh institusi</li>
            <li>Sanggup menyelesaikan luaran mata kuliah yang dijanjikan</li>
          </ol>

          {/* 6. Penutup */}
          <p className="text-[9.5pt] text-justify leading-tight mt-1.5">
            Apabila saya tidak melakukan hal tersebut diatas saya siap untuk menerima sanksi dari institusi. Demikian surat kesanggupan mengajar ini saya buat dengan sesungguhnya, agar dapat digunakan sebagaimana mestinya.
          </p>
        </div>
      </div>

      {/* 7. Titimangsa & Tanda Tangan */}
      <div className="flex justify-end text-[10.5pt] mt-14 mb-0">
        <div className="w-64 text-center space-y-0 relative">
          <p className="relative z-10">{lecturer.kota_tanggal || 'Surakarta, 8 Juli 2025'}</p>
          <p className="font-medium relative z-10">Yang membuat</p>
          
          <div className="h-[45px] flex items-center justify-center relative pointer-events-none">
            {ttdDosen ? (
              <img 
                src={ttdDosen} 
                alt="Tanda Tangan Dosen" 
                className="max-h-[80px] max-w-[190px] object-contain -my-5 -mt-6 z-20 mix-blend-multiply" 
              />
            ) : (
              <div className="h-[45px]" />
            )}
          </div>
          
          <p className="font-bold underline leading-none relative z-10">{lecturer.nama}</p>
        </div>
      </div>

    </div>
  );
}

// -----------------------------------------------------------------------------------
// Component: Formatted Form Integrasi PPM Document Layout (Official Template Format)
// -----------------------------------------------------------------------------------
function FormIntegrasiDocumentContent({ data, kopSurat, integrasiCategory = 'Penelitian', signatures = {} }) {
  if (!data) return null;

  const isPenelitian = (data.kategori || integrasiCategory) === 'Penelitian';

  const mainJudul = data.rawJudul || data.judul || '-';
  const mainLuaran = data.rawLuaran || data.luaran || 'Publikasi';

  const ttdGugusMutu = signatures['ttd_integrasi_gugus_mutu'] || '';
  const ttdPpmProdi = signatures['ttd_integrasi_ppm_prodi'] || '';
  const ttdKetuaUpm = signatures['ttd_integrasi_ketua_upm'] || '';
  const ttdKetuaLppm = signatures['ttd_integrasi_ketua_lppm'] || '';

  // Sesuai aturan: jika Penelitian maka data masuk ke baris penelitian & pengabdian bernilai -
  // Jika Pengabdian maka data masuk ke baris pengabdian & penelitian bernilai -
  const judulPenelitian = isPenelitian ? (mainJudul || '-') : '-';
  const judulPPM = !isPenelitian ? (mainJudul || '-') : '-';

  const luaranPenelitian = isPenelitian ? (mainLuaran || 'Publikasi') : '-';
  const luaranPPM = !isPenelitian ? (mainLuaran || 'Publikasi') : '-';

  return (
    <div 
      className="w-full text-black flex flex-col justify-between bg-white" 
      style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '11pt', lineHeight: '1.35' }}
    >
      <div>
        {/* 1. Kop Surat Header */}
        <div className="w-full mb-4">
          <img 
            src={kopSurat || '/kop.png'} 
            alt="Kop Surat Resmi" 
            className="w-full h-auto block" 
          />
        </div>

        {/* 2. Judul Formulir */}
        <div className="text-center mb-4">
          <h2 className="text-[12pt] font-bold uppercase leading-snug">
            FORMULIR EVALUASI<br />
            INTEGRASI PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT
          </h2>
        </div>

        {/* 3. Identitas Header */}
        <div className="text-[11.5pt] mb-3">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td style={{ width: '160px' }} className="py-0.5 font-normal">Nama Prodi</td>
                <td style={{ width: '15px' }} className="py-0.5">:</td>
                <td className="py-0.5 font-normal">{data.prodi || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-normal">Nama Dosen</td>
                <td style={{ width: '15px' }} className="py-0.5">:</td>
                <td className="py-0.5 font-normal">{data.nama || '-'}</td>
              </tr>
              <tr>
                <td className="py-0.5 font-normal">Tahun Akademik</td>
                <td style={{ width: '15px' }} className="py-0.5">:</td>
                <td className="py-0.5 font-normal">{data.tahun_akademik || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Tabel Evaluasi Integrasi PPM */}
        <table className="w-full border-collapse text-[11pt] mb-6" style={{ border: '1px solid black' }}>
          <thead>
            <tr style={{ backgroundColor: '#bfbfbf' }}>
              <th style={{ border: '1px solid black', padding: '5px 6px', width: '40px', textAlign: 'center', fontWeight: 'bold' }}>
                No
              </th>
              <th style={{ border: '1px solid black', padding: '5px 8px', width: '52%', textAlign: 'center', fontWeight: 'bold' }}>
                Kriteria
              </th>
              <th style={{ border: '1px solid black', padding: '5px 8px', width: '40%', textAlign: 'center', fontWeight: 'bold' }}>
                Hasil
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>1.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Dosen memiliki roadmap PPM</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{data.roadmap_ppm || 'Ada'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>2.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Kesesuaian PPM dengan roadmap</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{data.kesesuaian_roadmap || 'Sesuai'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>3.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Judul penelitian</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: isPenelitian && judulPenelitian !== '-' ? 'left' : 'center', verticalAlign: 'top' }}>{judulPenelitian}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>4.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Judul pengabdian kepada masyarakat</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: !isPenelitian && judulPPM !== '-' ? 'left' : 'center', verticalAlign: 'top' }}>{judulPPM}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>5.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Bentuk integrasi hasil PPM dengan mata kuliah</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{data.bentuk_integrasi || 'PPT'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>6.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Luaran penelitian (publikasi, buku, HKI, dll)</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{luaranPenelitian}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>7.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Luaran pengabdian kepada masyarakat (publikasi, buku, HKI, dll)</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{luaranPPM}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>8.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>Mata kuliah yang diintegrasikan</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top' }}>{data.mata_kuliah || '-'}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'top' }}>9.</td>
              <td style={{ border: '1px solid black', padding: '4px 8px', verticalAlign: 'top' }}>
                Bukti integrasi PPM dalam pembelajaran (RPS, PPT/ Buku Ajar/ Video, dll)
                <div style={{ fontStyle: 'italic', fontSize: '10pt', marginTop: '2px' }}>
                  *) berupa link drive
                </div>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'top', wordBreak: 'break-all' }}>
                {data.bukti_integrasi || '-'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Empat Tanda Tangan Pengesahan (2 Kolom x 2 Baris) */}
      <div className="w-full text-[11pt] mt-2 mb-0">
        <table className="w-full border-collapse">
          <tbody>
            {/* Baris 1: Gugus Mutu & PPM Program Studi */}
            <tr>
              <td style={{ width: '50%', textAlign: 'center', paddingBottom: '16px', verticalAlign: 'top', position: 'relative' }}>
                <div style={{ height: '36px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>Gugus Mutu</p>
                </div>
                <div style={{ height: '48px' }} className="flex items-center justify-center relative pointer-events-none">
                  {ttdGugusMutu ? (
                    <img 
                      src={ttdGugusMutu} 
                      alt="Tanda Tangan Gugus Mutu" 
                      className="max-h-[75px] max-w-[160px] object-contain -my-4 -mt-5 z-20 mix-blend-multiply" 
                    />
                  ) : null}
                </div>
                <div style={{ height: '24px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>
                    (&nbsp;<span style={{ textDecoration: 'underline' }}>{data.gugus_mutu || 'Prasiwi Citra Resmi, M.Par'}</span>&nbsp;)
                  </p>
                </div>
              </td>
              <td style={{ width: '50%', textAlign: 'center', paddingBottom: '16px', verticalAlign: 'top', position: 'relative' }}>
                <div style={{ height: '36px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>PPM Program Studi</p>
                </div>
                <div style={{ height: '48px' }} className="flex items-center justify-center relative pointer-events-none">
                  {ttdPpmProdi ? (
                    <img 
                      src={ttdPpmProdi} 
                      alt="Tanda Tangan PPM Prodi" 
                      className="max-h-[75px] max-w-[160px] object-contain -my-4 -mt-5 z-20 mix-blend-multiply" 
                    />
                  ) : null}
                </div>
                <div style={{ height: '24px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>
                    (&nbsp;<span style={{ textDecoration: 'underline' }}>{data.ppm_prodi || 'Yohanes Martono Widagdo, S.ST,. M.M.Par.'}</span>&nbsp;)
                  </p>
                </div>
              </td>
            </tr>
            {/* Baris 2: Ketua Unit Penjaminan Mutu & Ketua LPPM */}
            <tr>
              <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', position: 'relative' }}>
                <div style={{ height: '40px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>Ketua Unit Penjaminan Mutu</p>
                </div>
                <div style={{ height: '48px' }} className="flex items-center justify-center relative pointer-events-none">
                  {ttdKetuaUpm ? (
                    <img 
                      src={ttdKetuaUpm} 
                      alt="Tanda Tangan Ketua UPM" 
                      className="max-h-[75px] max-w-[160px] object-contain -my-4 -mt-5 z-20 mix-blend-multiply" 
                    />
                  ) : null}
                </div>
                <div style={{ height: '24px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>
                    (&nbsp;<span style={{ textDecoration: 'underline' }}>{data.ketua_upm || 'Agustyarum Pradiska Budi, M.E.'}</span>&nbsp;)
                  </p>
                </div>
              </td>
              <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', position: 'relative' }}>
                <div style={{ height: '40px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10, lineHeight: '1.15' }}>Ketua Unit Penelitian dan<br />Pengabdian kepada Masyarakat</p>
                </div>
                <div style={{ height: '48px' }} className="flex items-center justify-center relative pointer-events-none">
                  {ttdKetuaLppm ? (
                    <img 
                      src={ttdKetuaLppm} 
                      alt="Tanda Tangan Ketua LPPM" 
                      className="max-h-[75px] max-w-[160px] object-contain -my-4 -mt-5 z-20 mix-blend-multiply" 
                    />
                  ) : null}
                </div>
                <div style={{ height: '24px' }} className="flex items-center justify-center">
                  <p style={{ margin: 0, padding: 0, position: 'relative', zIndex: 10 }}>
                    (&nbsp;<span style={{ textDecoration: 'underline' }}>{data.ketua_lppm || 'Dr. Ratna Susanti, S.S., M.Pd.'}</span>&nbsp;)
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}

// -----------------------------------------------------------------------------------
// Component: Formatted Form Penilaian Proposal Document Layout (Tanpa Kop Surat)
// -----------------------------------------------------------------------------------
function FormPenilaianProposalDocumentContent({ data, signatures = {} }) {
  if (!data) return null;

  const ttdPenilai = signatures['ttd_penilai_proposal'] || '';

  const kriteria = data.kriteriaList || [
    { no: 1, bobot: 25, skor: 6, nilai: 150 },
    { no: 2, bobot: 20, skor: 6, nilai: 120 },
    { no: 3, bobot: 35, skor: 6, nilai: 210 },
    { no: 4, bobot: 10, skor: 6, nilai: 60 },
    { no: 5, bobot: 10, skor: 6, nilai: 60 }
  ];

  const totalNilai = data.total_nilai || kriteria.reduce((sum, k) => sum + (k.nilai || 0), 0);

  return (
    <div 
      className="w-full text-black flex flex-col justify-between bg-white" 
      style={{ 
        fontFamily: '"Times New Roman", Times, serif', 
        fontSize: '11pt', 
        lineHeight: '1.3',
        paddingTop: '15mm' // Top head 15mm
      }}
    >
      <div>
        {/* 1. Judul Formulir (Tanpa Kop Surat) */}
        <div className="text-center mb-5">
          <h2 className="text-[12pt] font-bold uppercase tracking-wide">
            FORMULIR PENILAIAN PROPOSAL PENELITIAN
          </h2>
        </div>

        {/* 2. Identitas Pengusul */}
        <div className="text-[11pt] mb-3">
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td style={{ width: '180px', verticalAlign: 'top' }} className="py-0.5">Nama Ketua Pengusul</td>
                <td style={{ width: '15px', verticalAlign: 'top' }} className="py-0.5">:</td>
                <td className="py-0.5 font-bold" style={{ verticalAlign: 'top' }}>
                  {data.nama_ketua_pengusul || data.nama || '-'}
                </td>
              </tr>
              <tr>
                <td style={{ verticalAlign: 'top' }} className="py-0.5">Judul Proposal</td>
                <td style={{ verticalAlign: 'top' }} className="py-0.5">:</td>
                <td className="py-0.5" style={{ verticalAlign: 'top' }}>
                  {data.judul_proposal || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 3. Tabel Kriteria Penilaian */}
        <table className="w-full border-collapse text-[10pt] mb-3" style={{ border: '1px solid black' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ border: '1px solid black', padding: '4px 5px', width: '35px', textAlign: 'center', fontWeight: 'bold' }}>
                NO.
              </th>
              <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold' }}>
                KRITERIA PENILAIAN
              </th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '65px', textAlign: 'center', fontWeight: 'bold' }}>
                BOBOT
              </th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '65px', textAlign: 'center', fontWeight: 'bold' }}>
                SKOR*)
              </th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '90px', textAlign: 'center', fontWeight: 'bold' }}>
                NILAI<br />(Bobot x Skor)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1px solid black', padding: '4px 5px', textAlign: 'center', verticalAlign: 'top' }}>1</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <span className="font-bold">PENDAHULUAN</span>
                <ul className="list-disc list-outside pl-4 mt-0.5 text-[9.5pt] space-y-0.5">
                  <li>Kejelasan Latar Belakang</li>
                  <li>Perumusan Masalah</li>
                  <li>Tujuan Penelitian</li>
                  <li>Urgensi Penelitian</li>
                </ul>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[0]?.bobot ?? 25}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[0]?.skor ?? '-'}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[0]?.nilai ?? '-'}
              </td>
            </tr>

            <tr>
              <td style={{ border: '1px solid black', padding: '4px 5px', textAlign: 'center', verticalAlign: 'top' }}>2</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <span className="font-bold">TINJAUAN PUSTAKA</span>
                <ul className="list-disc list-outside pl-4 mt-0.5 text-[9.5pt] space-y-0.5">
                  <li>Relevansi Teori</li>
                  <li>Kemutakhiran Pustaka</li>
                </ul>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[1]?.bobot ?? 20}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[1]?.skor ?? '-'}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[1]?.nilai ?? '-'}
              </td>
            </tr>

            <tr>
              <td style={{ border: '1px solid black', padding: '4px 5px', textAlign: 'center', verticalAlign: 'top' }}>3</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <span className="font-bold">METODOLOGI PENELITIAN</span>
                <ul className="list-disc list-outside pl-4 mt-0.5 text-[9.5pt] space-y-0.5">
                  <li>Kesesuaian Desain/Metode Penelitian</li>
                  <li>Ketepatan Instrumen Penelitian</li>
                  <li>Ketepatan Metode Analisis Data</li>
                </ul>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[2]?.bobot ?? 35}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[2]?.skor ?? '-'}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[2]?.nilai ?? '-'}
              </td>
            </tr>

            <tr>
              <td style={{ border: '1px solid black', padding: '4px 5px', textAlign: 'center', verticalAlign: 'top' }}>4</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <span className="font-bold">KELAYAKAN PENELITIAN</span>
                <ul className="list-disc list-outside pl-4 mt-0.5 text-[9.5pt] space-y-0.5">
                  <li>Jadwal Penelitian</li>
                  <li>Rencana Anggaran Biaya (RAB)</li>
                  <li>Kesesuaian Luaran yang Ditargetkan</li>
                </ul>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[3]?.bobot ?? 10}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[3]?.skor ?? '-'}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[3]?.nilai ?? '-'}
              </td>
            </tr>

            <tr>
              <td style={{ border: '1px solid black', padding: '4px 5px', textAlign: 'center', verticalAlign: 'top' }}>5</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', verticalAlign: 'top' }}>
                <span className="font-bold">UMUM</span>
                <ul className="list-disc list-outside pl-4 mt-0.5 text-[9.5pt] space-y-0.5">
                  <li>Sistematika Penulisan</li>
                  <li>Kerapian</li>
                </ul>
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[4]?.bobot ?? 10}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[4]?.skor ?? '-'}
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                {kriteria[4]?.nilai ?? '-'}
              </td>
            </tr>

            <tr style={{ fontWeight: 'bold', background: '#f8fafc' }}>
              <td colSpan={2} style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center' }}>
                JUMLAH
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>
                100
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>-</td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>
                {totalNilai}
              </td>
            </tr>

            {/* Kotak Catatan Penilai */}
            <tr>
              <td colSpan={5} style={{ border: '1px solid black', padding: '6px 8px', minHeight: '60px', verticalAlign: 'top' }}>
                <span className="font-bold text-[9.5pt] block mb-1">CATATAN PENILAI :</span>
                <p className="text-[10pt] text-slate-900 leading-relaxed font-normal">
                  {data.catatan_penilai || 'Proposal layak dilanjutkan untuk didanai risetnya'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* 4. Keterangan Skor & Passing Grade */}
        <div className="text-[9.5pt] leading-tight space-y-1">
          <p>
            <strong>Keterangan :</strong><br />
            *) Skor : 1 = Buruk, 2 = Sangat Kurang, 3 = Kurang, 5 = Cukup, 6 = Baik, 7 = Sangat Baik<br />
            Passing Grade &gt; 500<br />
            Hasil penilaian : <strong>Diterima / <span style={{ textDecoration: 'line-through' }}>Ditolak</span>*</strong>
          </p>
        </div>
      </div>

      {/* 5. Tanda Tangan Penilai */}
      <div className="flex justify-end text-[10.5pt] mt-4 mb-0">
        <div className="w-64 text-center space-y-0 relative">
          <p className="relative z-10">{data.tempat_tanggal || 'Surakarta, 10 Agustus 2025'}</p>
          <p className="font-medium relative z-10">Penilai</p>
          
          <div className="h-[45px] flex items-center justify-center relative pointer-events-none">
            {ttdPenilai ? (
              <img 
                src={ttdPenilai} 
                alt="Tanda Tangan Penilai" 
                className="max-h-[80px] max-w-[190px] object-contain -my-5 -mt-6 z-20 mix-blend-multiply" 
              />
            ) : (
              <div className="h-[45px]" />
            )}
          </div>
          
          <p className="font-bold underline leading-none relative z-10">
            ({data.penilai || 'Dr. Ratna Susanti, S.S., M.Pd'})
          </p>
        </div>
      </div>

    </div>
  );
}

// -----------------------------------------------------------------------------------
// Component: Form Monev Penelitian - Halaman 1 (Poin 1 s/d Poin 8)
// -----------------------------------------------------------------------------------
function FormMonevPage1({ data }) {
  if (!data) return null;

  const caraPemantauan = (data.cara_pemantauan || 'Wawancara').toLowerCase();
  const tahap = (data.tahap_penelitian || 'Tahap pengolahan/analisis data').toLowerCase();
  const isSesuai = (data.kesesuaian_waktu || 'Sesuai').toLowerCase() === 'sesuai';

  return (
    <div 
      className="w-full text-black flex flex-col justify-between bg-white h-full" 
      style={{ 
        fontFamily: '"Times New Roman", Times, serif', 
        fontSize: '10.5pt', 
        lineHeight: '1.2',
        color: '#000000'
      }}
    >
      <div>
        {/* 1. Header Text Resmi UPPM */}
        <div className="text-center mb-3">
          <p className="font-bold text-[11pt] tracking-normal leading-tight uppercase">
            UNIT PENELITIAN DAN PENGABDIAN MASYARAKAT
          </p>
          <p className="font-bold text-[11pt] tracking-normal leading-tight uppercase">
            POLITEKNIK INDONUSA SURAKARTA
          </p>
          <div className="my-1.5 border-b border-black w-full" style={{ borderBottomWidth: '1px' }} />
          <p className="font-bold text-[11pt] leading-tight uppercase">
            Instrumen Monitoring dan Evaluasi
          </p>
          <p className="font-bold text-[11pt] leading-tight uppercase">
            Kegiatan Penelitian Hibah Internal
          </p>
          <p className="font-bold text-[11pt] leading-tight uppercase">
            Tahun {data.tahun_akademik || '2024-2025'}
          </p>
        </div>

        {/* 2. Isi Formulir Monev Poin 1 s/d Poin 8 */}
        <div className="space-y-1.5 text-[10.5pt]">
          
          {/* Poin 1: Ketua Peneliti */}
          <div>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td style={{ width: '25px', verticalAlign: 'top' }}>1.</td>
                  <td style={{ width: '150px', verticalAlign: 'top' }}>Ketua Peneliti</td>
                  <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                  <td style={{ verticalAlign: 'top' }} className="font-normal">{data.ketua_peneliti || data.nama || '-'}</td>
                </tr>
                <tr>
                  <td></td>
                  <td style={{ verticalAlign: 'top' }}>Program Studi</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ verticalAlign: 'top' }} className="font-normal">{data.prodi || '-'}</td>
                </tr>
                <tr>
                  <td></td>
                  <td style={{ verticalAlign: 'top' }}>Bidang keahlian</td>
                  <td style={{ verticalAlign: 'top' }}>:</td>
                  <td style={{ verticalAlign: 'top' }} className="font-normal">{data.bidang_keahlian || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Poin 2: Judul Penelitian */}
          <div>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td style={{ width: '25px', verticalAlign: 'top' }}>2.</td>
                  <td style={{ width: '150px', verticalAlign: 'top' }}>Judul Penelitian</td>
                  <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                  <td style={{ verticalAlign: 'top', textAlign: 'justify' }} className="font-normal leading-snug">
                    {data.judul_penelitian || '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Poin 3: Biaya Penelitian */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>3.</span>
              <span>Biaya Penelitian</span>
            </div>
            <div className="pl-6">
              <table className="w-full border-collapse text-[10pt]" style={{ border: '1px solid black' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ border: '1px solid black', padding: '2px 5px', width: '45px', textAlign: 'center' }}>No.</th>
                    <th style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center' }}>Biaya yang Diusulkan</th>
                    <th style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center' }}>Biaya yang Disetujui</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '2px 5px', textAlign: 'center' }}>1</td>
                    <td style={{ border: '1px solid black', padding: '2px 8px' }}>{data.biaya_diusulkan || 'Rp. 10.850.000'}</td>
                    <td style={{ border: '1px solid black', padding: '2px 8px' }}>{data.biaya_disetujui || 'Rp. 10.850.000'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Poin 4: Cara Pemantauan */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>4.</span>
              <span>Cara Pemantauan:</span>
            </div>
            <div className="pl-6 space-y-0.5">
              <p>
                1. <span className={caraPemantauan.includes('lapangan') ? 'font-bold underline' : 'line-through text-slate-600'}>Peninjauan lapangan</span>
              </p>
              <p>
                2. <span className={caraPemantauan.includes('wawancara') ? 'font-bold underline' : 'line-through text-slate-600'}>Wawancara</span>
              </p>
              <p>
                3. <span className={caraPemantauan.includes('lain') ? 'font-bold underline' : 'line-through text-slate-600'}>Lainnya (sebutkan) :</span> {caraPemantauan.includes('lain') ? data.cara_pemantauan : ''}
              </p>
            </div>
          </div>

          {/* Poin 5: Pelaksanaan Penelitian */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>5.</span>
              <span>Pelaksanaan Penelitian:</span>
            </div>
            <div className="pl-6 space-y-0.5">
              <p>Tanggal dimulai: {data.tanggal_mulai || '04 September 2024'}</p>
              <p>Tanggal selesai : {data.tanggal_selesai || '09 Agustus 2025'}</p>
            </div>
          </div>

          {/* Poin 6: Capaian tahapan penelitian */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>6.</span>
              <span>Capaian tahapan penelitian:</span>
            </div>
            <div className="pl-6 space-y-0.5">
              <div>
                <p>1. Menurut Saudara, telah berada pada tahap berapa penelitian saat ini?</p>
                <div className="pl-4 space-y-0.5 mt-0.5">
                  <p>1. <span className={tahap.includes('persiapan') ? 'font-bold underline' : 'line-through text-slate-600'}>Tahap persiapan</span></p>
                  <p>2. <span className={tahap.includes('pengumpulan') ? 'font-bold underline' : 'line-through text-slate-600'}>Tahap pengumpulan data penelitian</span></p>
                  <p>3. <span className={tahap.includes('pengolahan') || tahap.includes('analisis') ? 'font-bold underline' : 'line-through text-slate-600'}>Tahap pengolahan/analisis data</span></p>
                  <p>4. <span className={tahap.includes('laporan') ? 'font-bold underline' : 'line-through text-slate-600'}>Tahap penulisan laporan</span></p>
                  <p>5. <span className={tahap.includes('luaran') ? 'font-bold underline' : 'line-through text-slate-600'}>Tahap menyusun luaran</span></p>
                </div>
              </div>
              <p>2. Menurut Saudara, saat ini sudah tercapai berapa % penelitian/ Saudara?</p>
              <p className="pl-4 font-normal">Jawab: <strong>{data.persentase_capaian || '75 %'}</strong></p>
            </div>
          </div>

          {/* Poin 7: Kesesuaian Pelaksanaan Penelitian */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>7.</span>
              <span>Kesesuaian Pelaksanaan Penelitian:</span>
            </div>
            <div className="pl-6 space-y-0.5">
              <p>
                1. Waktu penelitian: {isSesuai ? (
                  <><strong>sesuai</strong> / <span className="line-through text-slate-600">tidak sesuai</span></>
                ) : (
                  <><span className="line-through text-slate-600">sesuai</span> / <strong>tidak sesuai</strong></>
                )}
              </p>
              <div>
                <p>Jika tidak sesuai, uraikan alasannya:</p>
                <div className="pl-4 space-y-0.5 mt-0.5">
                  <p>1. <span className={!isSesuai && data.alasan_ketidaksesuaian?.toLowerCase().includes('dana') ? 'font-bold underline' : 'text-slate-700'}>Pencairan dana terlambat</span></p>
                  <p>2. <span className={!isSesuai && data.alasan_ketidaksesuaian?.toLowerCase().includes('alat') ? 'font-bold underline' : 'text-slate-700'}>Pemesanan bahan dan atau alat lama</span></p>
                  <p>3. <span className={!isSesuai && data.alasan_ketidaksesuaian?.toLowerCase().includes('sumber') ? 'font-bold underline' : 'text-slate-700'}>Sumber data/informasi sudah didapat/diakses</span></p>
                  <p>4. Lainnya (sebutkan): {!isSesuai && data.alasan_ketidaksesuaian && data.alasan_ketidaksesuaian !== '-' ? data.alasan_ketidaksesuaian : '………………………………….'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Poin 8: Pelaksanaan kerja sama dengan instansi lain */}
          <div>
            <div className="flex gap-1 mb-0.5">
              <span style={{ width: '25px' }}>8.</span>
              <span>Pelaksanaan kerja sama dengan instansi lain (jika ada):</span>
            </div>
            <div className="pl-6">
              <table className="w-full border-collapse text-[10pt]" style={{ border: '1px solid black' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ border: '1px solid black', padding: '2px 5px', width: '45px', textAlign: 'center' }}>No</th>
                    <th style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center' }}>Nama dan Alamat Instansi</th>
                    <th style={{ border: '1px solid black', padding: '2px 8px', textAlign: 'center' }}>Bentuk Kerja Sama</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '3px 5px', textAlign: 'center', height: '22px' }}>
                      {data.mitra_instansi && data.mitra_instansi !== '-' ? '1' : ''}
                    </td>
                    <td style={{ border: '1px solid black', padding: '3px 8px' }}>
                      {data.mitra_instansi && data.mitra_instansi !== '-' ? data.mitra_instansi : ''}
                    </td>
                    <td style={{ border: '1px solid black', padding: '3px 8px' }}>
                      {data.bentuk_kerjasama && data.bentuk_kerjasama !== '-' ? data.bentuk_kerjasama : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------------
// Component: Form Monev Penelitian - Halaman 2 (Poin 9 s/d Poin 12 + Tanda Tangan)
// -----------------------------------------------------------------------------------
function FormMonevPage2({ data, signatures = {} }) {
  if (!data) return null;

  const hasPublikasi = (data.publikasi_hasil || 'Ada').toLowerCase() === 'ada';
  const hki = (data.potensi_hki || 'Hak Cipta').toLowerCase();
  const ttdPemonev = signatures['ttd_pemonev_penelitian'] || '';

  return (
    <div 
      className="w-full text-black flex flex-col justify-between bg-white h-full" 
      style={{ 
        fontFamily: '"Times New Roman", Times, serif', 
        fontSize: '10.5pt', 
        lineHeight: '1.3',
        color: '#000000'
      }}
    >
      <div>
        {/* Isi Formulir Monev Poin 9 s/d Poin 12 */}
        <div className="space-y-3.5 text-[10.5pt]">
          
          {/* Poin 9: Publikasi hasil Penelitian */}
          <div>
            <div className="flex gap-1 mb-1">
              <span style={{ width: '25px' }}>9.</span>
              <span>
                Publikasi hasil Penelitian: {hasPublikasi ? (
                  <><strong>ada</strong> / <span className="line-through text-slate-600">tidak ada</span></>
                ) : (
                  <><span className="line-through text-slate-600">ada</span> / <strong>tidak ada</strong></>
                )}
              </span>
            </div>
            {hasPublikasi && (
              <div className="pl-6 space-y-1">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td style={{ width: '20px', verticalAlign: 'top' }}>1.</td>
                      <td style={{ width: '120px', verticalAlign: 'top' }}>Judul artikel</td>
                      <td style={{ width: '15px', verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', textAlign: 'justify' }}>{data.judul_artikel || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>2.</td>
                      <td style={{ verticalAlign: 'top' }}>Nama Jurnal</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top' }}>{data.nama_jurnal || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ verticalAlign: 'top' }}>3.</td>
                      <td style={{ verticalAlign: 'top' }}>Link Jurnal</td>
                      <td style={{ verticalAlign: 'top' }}>:</td>
                      <td style={{ verticalAlign: 'top', wordBreak: 'break-all' }}>{data.link_jurnal || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Poin 10: Potensi HKI */}
          <div>
            <div className="flex gap-1 mb-1">
              <span style={{ width: '25px' }}>10.</span>
              <span>Potensi HKI:</span>
            </div>
            <div className="pl-6 space-y-1">
              <p>1. <span className={hki.includes('cipta') ? 'font-bold underline' : 'line-through text-slate-600'}>Hak Cipta</span></p>
              <p>2. <span className={hki.includes('paten') ? 'font-bold underline' : 'line-through text-slate-600'}>Hak Paten</span></p>
              <p>3. <span className={hki.includes('tidak') ? 'font-bold underline' : 'line-through text-slate-600'}>Tidak ada</span></p>
            </div>
          </div>

          {/* Poin 11: Integrasi dengan mata kuliah */}
          <div>
            <div className="flex gap-1">
              <span style={{ width: '25px' }}>11.</span>
              <span className="text-justify leading-relaxed">
                Hasil Penelitian memiliki integrasi dengan mata kuliah: <strong>{data.mata_kuliah_integrasi || '-'}</strong>
              </span>
            </div>
          </div>

          {/* Poin 12: Penilaian umum */}
          <div>
            <div className="flex gap-1 mb-1">
              <span style={{ width: '25px' }}>12.</span>
              <span>Penilaian umum:</span>
            </div>
            <div className="pl-6 text-justify leading-relaxed">
              <p>{data.penilaian_umum}</p>
            </div>
          </div>

        </div>
      </div>

      {/* Titimangsa & Tanda Tangan Pemonev */}
      <div className="flex justify-end text-[10.5pt] mt-8 mb-0">
        <div className="w-72 text-center space-y-0 relative">
          <p className="relative z-10">{data.tempat_tanggal || 'Surakarta, 24 Mei 2025'}</p>
          <p className="font-medium relative z-10">Pemonev,</p>
          
          <div className="h-[48px] flex items-center justify-center relative pointer-events-none">
            {ttdPemonev ? (
              <img 
                src={ttdPemonev} 
                alt="Tanda Tangan Pemonev" 
                className="max-h-[85px] max-w-[190px] object-contain -my-5 -mt-6 z-20 mix-blend-multiply" 
              />
            ) : (
              <div className="h-[48px]" />
            )}
          </div>
          
          <p className="font-bold underline leading-none relative z-10">
            {data.pemonev || 'Dr, Ratna Susanti, S.S., M.Pd'}
          </p>
        </div>
      </div>

    </div>
  );
}

// -----------------------------------------------------------------------------------
// Component: Wrapper Form Monev Document Content
// -----------------------------------------------------------------------------------
function FormMonevDocumentContent({ data, page, signatures = {} }) {
  if (!data) return null;

  if (page === 1) return <FormMonevPage1 data={data} />;
  if (page === 2) return <FormMonevPage2 data={data} signatures={signatures} />;

  return (
    <div className="space-y-6">
      <div className="form-monev-page">
        <FormMonevPage1 data={data} />
      </div>
      <div className="form-monev-page">
        <FormMonevPage2 data={data} signatures={signatures} />
      </div>
    </div>
  );
}

