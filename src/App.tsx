import React, { useState, useEffect, useRef } from 'react';
import { Siswa, IuranTransaksi } from './types';
import { formatRupiah, formatDateIndo, BULAN_LIST, TAHUN_LIST } from './utils';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Search, 
  Download, 
  Sparkles, 
  AlertCircle, 
  X,
  GraduationCap,
  Calculator,
  Check,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  FileSpreadsheet,
  Table,
  CircleDollarSign,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- CORE STATE PERSISTENCE ---
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [daftarTransaksi, setDaftarTransaksi] = useState<IuranTransaksi[]>([]);

  // --- REGISTRATION FORM STATES (MANUAL) ---
  const [siswaNama, setSiswaNama] = useState('');

  // --- EXCEL BATCH IMPORTER STATES ---
  interface ParsedSiswa {
    name: string;
    exists: boolean;
  }
  const [regMethod, setRegMethod] = useState<'manual' | 'excel'>('manual');
  const [parsedExcelSiswa, setParsedExcelSiswa] = useState<ParsedSiswa[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- CORE INPUT FORM STATES ---
  const [transactionType, setTransactionType] = useState<'infaq' | 'pengeluaran'>('infaq');
  const [inputSiswaId, setInputSiswaId] = useState('');
  const [inputSiswaNamaCustom, setInputSiswaNamaCustom] = useState('');
  const [inputInfaqAmount, setInputInfaqAmount] = useState(''); // "jumlah uang infaq per siswa"
  const [inputBulanDibayar, setInputBulanDibayar] = useState(''); // "bulan di bayar"
  const [inputTahunDibayar, setInputTahunDibayar] = useState('');
  const [inputPengeluaran, setInputPengeluaran] = useState(''); // "pengeluaran"
  const [inputDate, setInputDate] = useState('');
  const [inputNote, setInputNote] = useState('');

  // --- FILTER & SEARCH JURNAL STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');
  const [isDaftarSiswaOpen, setIsDaftarSiswaOpen] = useState(false);

  // --- METRIC STATUS & TOASTER ---
  const [notification, setNotification] = useState('');

  // --- CUSTOM DIALOG STATES (keeps dialogs beautiful and prevents iframe blocks) ---
  const [dialog, setDialog] = useState<{
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  } | null>(null);

  const triggerAlert = (title: string, message: string) => {
    setDialog({
      type: 'alert',
      title,
      message,
      confirmText: 'OK'
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Ya', cancelText = 'Batal') => {
    setDialog({
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText,
      onConfirm
    });
  };

  // --- LOCALSTORAGE SYNC ON BOOT ---
  useEffect(() => {
    const savedSiswa = localStorage.getItem('iuran_siswa_list_v4');
    const savedTx = localStorage.getItem('iuran_tx_list_v4');

    const parsedSiswa = savedSiswa ? JSON.parse(savedSiswa) : [];
    const parsedTx = savedTx ? JSON.parse(savedTx) : [];

    setDaftarSiswa(parsedSiswa);
    setDaftarTransaksi(parsedTx);

    // Default dates and months based on present local time (June 2026 / 2026-06-09)
    const today = new Date();
    setInputDate(today.toISOString().substring(0, 10));

    // Default current Indonesian month
    const curMonthIndex = today.getMonth(); // June is index 5
    const guessedMonth = BULAN_LIST[curMonthIndex] || 'Juni';
    setInputBulanDibayar(guessedMonth);
    setInputTahunDibayar(String(today.getFullYear()));
  }, []);

  // --- PWA INSTALL PROMPT STUFF & STATES ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Suppress benign sandbox errors (like Vite HMR websocket failures)
    const originalError = window.console.error;
    window.console.error = (...args) => {
      if (typeof args[0] === 'string' && (args[0].includes('websocket') || args[0].includes('Vite'))) {
        return;
      }
      originalError.apply(window.console, args);
    };

    // Register Service Worker for PWA (Offline Support)
    const registerSW = () => {
      // Only register on production domains, not on AI Studio dev/preview sandboxes or localhost
      const isSandbox = window.location.hostname.includes('ais-dev') || 
                        window.location.hostname.includes('ais-pre') || 
                        window.location.hostname === 'localhost';
      
      if ('serviceWorker' in navigator && !isSandbox) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered:', reg.scope))
          .catch(err => console.log('SW registration failed:', err));
      }
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }

    const handleBeforeInstall = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check display mode to see if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsAppInstalled(true);
    }

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredPrompt(null);
      setNotification('KAS MTS BUNYU telah berhasil dipasang di perangkat Anda!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('load', registerSW);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      // Fallback instructions if prompt is not available (e.g. on iOS or if already dismissed)
      triggerAlert(
        'Panduan Pemasangan',
        'Gunakan menu browser (titik tiga) lalu pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama" untuk pengalaman layar penuh tanpa browser bar.'
      );
      return;
    }
    // Show the install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again
      setDeferredPrompt(null);
    }
  };

  // Sync state helpers
  const saveSiswa = (siswaList: Siswa[]) => {
    setDaftarSiswa(siswaList);
    localStorage.setItem('iuran_siswa_list_v4', JSON.stringify(siswaList));
  };

  const saveTransaksi = (txList: IuranTransaksi[]) => {
    setDaftarTransaksi(txList);
    localStorage.setItem('iuran_tx_list_v4', JSON.stringify(txList));
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  // --- STUDENT REGISTRATION HANDLERS ---

  // 1. ADD NEW STUDENT MANUALLY
  const handleAddSiswa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaNama.trim()) {
      triggerAlert('Peringatan', 'Nama siswa tidak boleh kosong.');
      return;
    }

    const newSiswa: Siswa = {
      id: `siswa_${Date.now()}`,
      name: siswaNama.trim(),
      createdAt: new Date().toISOString()
    };

    const performAdd = () => {
      const nextList = [...daftarSiswa, newSiswa];
      saveSiswa(nextList);
      setSiswaNama('');
      showNotification(`Siswa "${newSiswa.name}" berhasil didaftarkan!`);
    };

    // Duplicate detection check
    const isDuplicate = daftarSiswa.some(s => s.name.toLowerCase() === newSiswa.name.toLowerCase());
    if (isDuplicate) {
      triggerConfirm(
        'Siswa Sudah Terdaftar',
        `Siswa bernama "${newSiswa.name}" sudah terdaftar. Tetap daftarkan?`,
        performAdd,
        'Ya, Tetap Daftarkan',
        'Batal'
      );
    } else {
      performAdd();
    }
  };

  // 2. EXCEL EXPEDITED STUDENT IMPORTER
  const handleDownloadTemplate = () => {
    const headers = ['Nama Siswa'];
    const examples = [
      ['Ahmad Rafif Musyaffa'],
      ['Zahra Annisa Fitri'],
      ['Fatih Al-Mubarak']
    ];
    // CSV with UTF-8 BOM so Excel opens it with Indonesian characters correctly
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...examples.map(row => row.map(v => `"${v}"`).join(','))].join('\n');
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "Template_Impor_Siswa.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Get rows as 2D array
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length < 2) {
          triggerAlert('Format Excel Salah', 'File Excel kosong atau kurang dari 2 baris (baris header + baris data).');
          setExcelFileName('');
          return;
        }

        const headers = (rows[0] as any[]).map(h => String(h || '').trim().toLowerCase());
        
        let namaIdx = headers.findIndex(h => h.includes('nama') || h.includes('siswa') || h.includes('name'));

        // Fallback guess logic in case headers aren't clear
        if (namaIdx === -1) namaIdx = 0;

        const detectedList: ParsedSiswa[] = [];

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const rawNama = row[namaIdx];
          if (rawNama === undefined || rawNama === null) continue;
          
          const nameVal = String(rawNama).trim();
          if (!nameVal) continue;

          const exists = daftarSiswa.some(s => s.name.toLowerCase() === nameVal.toLowerCase());

          detectedList.push({
            name: nameVal,
            exists
          });
        }

        if (detectedList.length === 0) {
          triggerAlert('Data Tidak Ditemukan', 'Tidak menemukan nama siswa yang valid di spreadsheet. Mohon periksa kembali kolom atau gunakan template.');
          setExcelFileName('');
        } else {
          setParsedExcelSiswa(detectedList);
        }
      } catch (err) {
        console.error(err);
        triggerAlert('Gagal Impor', 'Gagal membaca file Excel. Pastikan format file cocok.');
        setExcelFileName('');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleCommitImport = () => {
    if (parsedExcelSiswa.length === 0) return;

    const newStudents: Siswa[] = parsedExcelSiswa.map((ps, index) => ({
      id: `siswa_${Date.now()}_${index}`,
      name: ps.name,
      createdAt: new Date().toISOString()
    }));

    const nextList = [...daftarSiswa, ...newStudents];
    saveSiswa(nextList);

    showNotification(`Berhasil mengimpor ${newStudents.length} siswa baru dari Excel!`);
    setParsedExcelSiswa([]);
    setExcelFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelImport = () => {
    setParsedExcelSiswa([]);
    setExcelFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. DELETE SINGLE STUDENT
  const handleDeleteSiswa = (id: string, name: string) => {
    const performDelete = () => {
      const hasPayments = daftarTransaksi.some(t => t.siswaId === id);
      if (hasPayments) {
        const filteredTx = daftarTransaksi.filter(t => t.siswaId !== id);
        saveTransaksi(filteredTx);
      }
      const nextList = daftarSiswa.filter(s => s.id !== id);
      saveSiswa(nextList);
      showNotification(`Siswa "${name}" berhasil dihapus.`);
    };

    const hasPayments = daftarTransaksi.some(t => t.siswaId === id);
    if (hasPayments) {
      triggerConfirm(
        'Hapus Siswa & Transaksi',
        `Siswa "${name}" memiliki riwayat transaksi/pembayaran infaq. Jika siswa dihapus, seluruh data iuran terkait siswa ini juga terhapus.\n\nApakah Anda yakin ingin melanjutkan?`,
        performDelete,
        'Ya, Hapus Semua',
        'Batal'
      );
    } else {
      triggerConfirm(
        'Hapus Siswa',
        `Apakah Anda yakin ingin menghapus data siswa "${name}"?`,
        performDelete,
        'Ya, Hapus',
        'Batal'
      );
    }
  };


  // --- TRANSACTIONS RECORDING ---

  const handleAddTransaksiObj = (e: React.FormEvent) => {
    e.preventDefault();

    let finalSiswaId: string | undefined = undefined;
    let finalSiswaName = '';
    let valInfaq = 0;
    let valPengeluaran = 0;

    if (transactionType === 'infaq') {
      if (inputSiswaId === 'custom') {
        if (!inputSiswaNamaCustom.trim()) {
          triggerAlert('Keterangan Diperlukan', 'Mohon masukkan nama pembayar/siswa manual.');
          return;
        }
        finalSiswaName = inputSiswaNamaCustom.trim();
      } else if (inputSiswaId) {
        const found = daftarSiswa.find(s => s.id === inputSiswaId);
        if (found) {
          finalSiswaId = found.id;
          finalSiswaName = found.name;
        }
      } else {
        triggerAlert('Pilih Siswa', 'Mohon pilih Nama Siswa atau pilih penulisan manual.');
        return;
      }

      valInfaq = inputInfaqAmount ? parseFloat(inputInfaqAmount) : 0;
      if (valInfaq <= 0) {
        triggerAlert('Nominal Kosong', 'Mohon masukkan Jumlah Uang Infaq di atas Rp 0.');
        return;
      }
    } else {
      // transactionType === 'pengeluaran' (Keperluan Sekolah)
      // Check Keperluan Pengeluaran
      if (!inputSiswaNamaCustom.trim() && !inputNote.trim()) {
        triggerAlert('Detail Diperlukan', 'Mohon masukkan detail atau nama keperluan sekolah pada bagian form.');
        return;
      }
      const detail = (inputSiswaNamaCustom.trim() || inputNote.trim());
      finalSiswaName = `Keperluan Sekolah: ${detail}`;
      
      valPengeluaran = inputPengeluaran ? parseFloat(inputPengeluaran) : 0;
      if (valPengeluaran <= 0) {
        triggerAlert('Nominal Kosong', 'Mohon masukkan Jumlah Pengeluaran di atas Rp 0.');
        return;
      }
    }

    const newTx: IuranTransaksi = {
      id: `tx_${Date.now()}`,
      siswaId: finalSiswaId,
      siswaName: finalSiswaName,
      infaq: valInfaq,
      bulanDibayar: inputBulanDibayar || '-',
      tahunDibayar: inputTahunDibayar || '2026',
      pengeluaran: valPengeluaran,
      date: inputDate || new Date().toISOString().substring(0, 10),
      note: inputNote.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const nextList = [...daftarTransaksi, newTx];
    saveTransaksi(nextList);

    // Reset fields based on state hygiene
    setInputInfaqAmount('');
    setInputPengeluaran('');
    setInputNote('');
    setInputSiswaNamaCustom('');
    showNotification(
      transactionType === 'infaq'
        ? 'Data iuran infaq siswa berhasil dicatat!'
        : 'Data pengeluaran sekolah berhasil dicatat!'
    );
  };

  const handleDeleteTransaksi = (id: string) => {
    triggerConfirm(
      'Hapus Catatan Kas',
      'Apakah Anda yakin ingin menghapus catatan transaksi ini dari tabel?',
      () => {
        const nextList = daftarTransaksi.filter(t => t.id !== id);
        saveTransaksi(nextList);
        showNotification('Catatan transaksi telah berhasil dihapus.');
      },
      'Ya, Hapus',
      'Batal'
    );
  };

  // POPULATE DEMO
  const handlePopulateDemoData = () => {
    triggerConfirm(
      'Muat Data Contoh',
      'Muat data contoh simulasi siswa dan data infaq iuran?',
      () => {
        const demoSiswa: Siswa[] = [
          { id: 's_1', name: 'Ahmad Rafif Musyaffa', createdAt: new Date().toISOString() },
          { id: 's_2', name: 'Zahra Annisa Fitri', createdAt: new Date().toISOString() },
          { id: 's_3', name: 'Fatih Al-Mubarak', createdAt: new Date().toISOString() },
          { id: 's_4', name: 'Siti Maisarah', createdAt: new Date().toISOString() }
        ];

         const demoIuran: IuranTransaksi[] = [
          { id: 'tx_1', siswaId: 's_1', siswaName: 'Ahmad Rafif Musyaffa', infaq: 150000, bulanDibayar: 'Juni', tahunDibayar: '2026', pengeluaran: 0, date: '2026-06-01', note: 'Iuran Juni', createdAt: new Date().toISOString() },
          { id: 'tx_2', siswaId: 's_2', siswaName: 'Zahra Annisa Fitri', infaq: 200000, bulanDibayar: 'Juni', tahunDibayar: '2026', pengeluaran: 0, date: '2026-06-02', note: 'Infaq bulanan', createdAt: new Date().toISOString() },
          { id: 'tx_3', siswaName: 'Keperluan Sekolah: Pembelian sapu ijuk', infaq: 0, bulanDibayar: 'Juni', tahunDibayar: '2026', pengeluaran: 25000, date: '2026-06-03', note: 'Pembelian sapu', createdAt: new Date().toISOString() },
          { id: 'tx_4', siswaId: 's_3', siswaName: 'Fatih Al-Mubarak', infaq: 100000, bulanDibayar: 'Mei', tahunDibayar: '2026', pengeluaran: 0, date: '2026-06-04', note: 'Susulan iuran Mei', createdAt: new Date().toISOString() },
          { id: 'tx_5', siswaId: 's_4', siswaName: 'Siti Maisarah', infaq: 120000, bulanDibayar: 'Juni', tahunDibayar: '2026', pengeluaran: 0, date: '2026-06-05', note: 'Lunas', createdAt: new Date().toISOString() },
          { id: 'tx_6', siswaName: 'Keperluan Sekolah: Konsumsi Rapat Wali Murid', infaq: 0, bulanDibayar: 'Juni', tahunDibayar: '2026', pengeluaran: 75000, date: '2026-06-06', note: 'Snack rapat', createdAt: new Date().toISOString() }
        ];

        saveSiswa(demoSiswa);
        saveTransaksi(demoIuran);
        showNotification('Berhasil memuat data simulasi!');
      },
      'Ya, Muat',
      'Batal'
    );
  };

  const handleClearAllData = () => {
    triggerConfirm(
      'Hapus Seluruh Data',
      'Yakin ingin mengosongkan seluruh data siswa serta catatan kas keuangan?',
      () => {
        saveSiswa([]);
        saveTransaksi([]);
        showNotification('Semua data dibersihkan.');
      },
      'Ya, Hapus Semua',
      'Batal'
    );
  };

  // --- CALCULATION OF METRIC VALUES (TOTALS & SALDO AKHIR) ---
  const totalInfaq = daftarTransaksi.reduce((sum, item) => sum + item.infaq, 0);
  const totalPengeluaran = daftarTransaksi.reduce((sum, item) => sum + item.pengeluaran, 0);
  const totalSaldoAkhir = totalInfaq - totalPengeluaran;

  const filteredTxList = daftarTransaksi.filter(t => {
    const matchSearch = t.siswaName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        t.bulanDibayar.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  const filteredStudents = daftarSiswa.filter(s => 
    s.name.toLowerCase().includes(searchSiswaQuery.toLowerCase())
  );

  const handleExportExcel = () => {
    if (daftarTransaksi.length === 0) {
      triggerAlert('Tidak Ada Data', 'Tidak ada riwayat pembukuan iuran untuk diekspor.');
      return;
    }

    const headers = [
      'No', 
      'Kategori Transaksi', 
      'Nama Siswa / Detail Keperluan', 
      'Pemasukan Infaq (+)', 
      'Alokasi Bulan', 
      'Pengeluaran Sekolah (-)', 
      'Tanggal Transaksi', 
      'Catatan Tambahan'
    ];

    const rows = daftarTransaksi.map((t, idx) => {
      const isPengeluaran = t.siswaName.startsWith('Keperluan Sekolah:');
      const kategori = isPengeluaran ? 'PENGELUARAN' : 'PEMASUKAN';
      const detailNama = isPengeluaran 
        ? t.siswaName.replace('Keperluan Sekolah:', '').trim() 
        : t.siswaName;

      return [
        idx + 1,
        kategori,
        detailNama,
        t.infaq || 0,
        isPengeluaran && (t.bulanDibayar === '-' || !t.bulanDibayar) ? '-' : `${t.bulanDibayar} ${t.tahunDibayar}`,
        t.pengeluaran || 0,
        t.date,
        t.note || '-'
      ];
    });

    // Spacer row
    rows.push([]);
    
    // Summary row
    rows.push([
      '', 
      'RINGKASAN REKAPITULASI', 
      'TOTAL KESELURUHAN:', 
      totalInfaq, 
      '', 
      totalPengeluaran, 
      'SALDO AKHIR (SISA KAS):', 
      totalSaldoAkhir
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set custom column widths to make sheet scannable
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 15 }, // Kategori
      { wch: 35 }, // Nama/Detail
      { wch: 22 }, // Pemasukan 
      { wch: 18 }, // Alokasi Bulan
      { wch: 22 }, // Pengeluaran
      { wch: 18 }, // Tanggal
      { wch: 30 }  // Catatan
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rincian Kas & Iuran');

    XLSX.writeFile(wb, `Laporan_Kas_Iuran_MTS_Bunyu_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      
      {/* HEADER SECTION - NO MENUS OR NAV NAVIGATION FOR MAXIMUM CLEANLINESS */}
      <header className="bg-white/85 border-b border-slate-250/80 px-4 py-4 sm:px-6 sticky top-0 z-40 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200 shadow-inner">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 flex flex-wrap items-center gap-2 tracking-tight">
                KAS MTS BUNYU
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">MTS AL-KHAIRAAT BUNYU</span>
              </h1>
              <p className="text-xs text-slate-500">Pembukuan Transparansi Infaq Iuran, Rincian Pengeluaran, & Akumulasi Saldo Sisa Kas</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Quick Demo Generation & Database Reset in header */}
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl overflow-hidden p-0.5 shadow-sm">
              <button
                type="button"
                onClick={handlePopulateDemoData}
                className="hover:bg-white hover:text-slate-900 text-[10px] font-bold text-slate-600 px-3 py-1.5 transition-all flex items-center gap-1 cursor-pointer"
                title="Muat data contoh siswa dan transaksi"
              >
                <RotateCcw className="w-3 h-3 text-emerald-600" /> Contoh Data
              </button>
              <div className="w-[1px] h-3.5 bg-slate-200" />
              <button
                type="button"
                onClick={handleClearAllData}
                className="hover:bg-rose-50 text-[10px] font-bold text-rose-600 px-3 py-1.5 transition-all cursor-pointer text-center"
                title="Kosongkan seluruh data"
              >
                Hapus Semua
              </button>
            </div>
            
            {/* Elegant PWA Install Button */}
            {!isAppInstalled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleInstallApp}
                className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 ring-2 ring-white"
              >
                <Smartphone className="w-3.5 h-3.5" /> Pasang Aplikasi
              </motion.button>
            )}

            <button
              onClick={handleExportExcel}
              className="py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-600/10"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Laporan Excel
            </button>
          </div>

        </div>
      </header>

      {/* QUICK FLOATING TOASTER/NOTIFICATION */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-20 right-4 z-50 bg-white border border-slate-200 text-slate-800 text-xs px-4 py-3 rounded-2xl shadow-lg flex items-center gap-2 font-medium"
          >
            <Check className="w-4 h-4 text-emerald-600 bg-emerald-50 p-0.5 rounded-full" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONCISE DASHBOARD BANNER */}
      <section className="bg-slate-100 border-b border-slate-200 py-3 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <p className="font-medium text-slate-700">Aplikasi siap digunakan. Bersih dari menu navigasi demi kemudahan pengisian dalam 1 halaman.</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
            <span>Siswa: <strong className="text-slate-800 font-bold font-sans">{daftarSiswa.length}</strong></span>
            <span>Jurnal Transaksi: <strong className="text-slate-800 font-bold font-sans">{daftarTransaksi.length}</strong></span>
          </div>
        </div>
      </section>

      {/* MAIN SINGLE VIEW DASHBOARD GRID */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ==================== LEFT COLUMN: INPUT MANAGERS (REGISTRATION & TRANSACTION) ==================== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CARD A: REGISTRASI DATA SISWA (INTEGRATED SINGLE PANEL) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="mb-3.5">
              <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">Kelola Siswa</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-1.5 flex items-center gap-2">
                <Users className="text-indigo-600 w-5 h-5" /> Registrasi Siswa Baru
              </h3>
              <p className="text-[11px] text-slate-500">Mendaftarkan murid ke database sekolahan manual atau unggah file excel.</p>
            </div>

            {/* Toggle Mode Tab inside Card */}
            <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setRegMethod('manual')}
                className={`flex-1 py-1.5 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  regMethod === 'manual'
                    ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Ketik Manual
              </button>
              <button
                type="button"
                onClick={() => setRegMethod('excel')}
                className={`flex-1 py-1.5 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  regMethod === 'excel'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Unggah Excel
              </button>
            </div>

            {regMethod === 'manual' ? (
               <form onSubmit={handleAddSiswa} className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Nama Siswa</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap siswa baru..."
                    value={siswaNama}
                    onChange={(e) => setSiswaNama(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-xs text-white shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Tambah Siswa Baru
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <p className="text-slate-500">Punya daftar nama di Excel?</p>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                    title="Unduh templat impor"
                  >
                    <Download className="w-3 h-3" /> Templat .CSV
                  </button>
                </div>

                {parsedExcelSiswa.length === 0 ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-350 hover:border-indigo-500/50 bg-slate-50 hover:bg-indigo-50/50 p-5 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleExcelUpload}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700">Pilih berkas Spreadsheet</p>
                      <p className="text-[9px] text-slate-400">Mendukung file .XLSX, .XLS, atau .CSV</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-teal-50 border border-teal-200 p-2 rounded-xl flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{excelFileName}</p>
                        <p className="text-[10px] text-teal-700 font-medium">{parsedExcelSiswa.length} Siswa Terbaca</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelImport}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden max-h-32 overflow-y-auto divide-y divide-slate-100 px-2 py-1">
                      {parsedExcelSiswa.map((ps, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700 truncate max-w-[200px]">{ps.name}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancelImport}
                        className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-slate-500 rounded-lg text-xs border border-slate-200 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleCommitImport}
                        className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Pasang Impor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* COLLAPSIBLE ACCORDION list of existing registered students (Daftar Siswa / Pilih Siswa) */}
            <div className="mt-4 pt-3.5 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => setIsDaftarSiswaOpen(!isDaftarSiswaOpen)}
                className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/70 border border-slate-200 px-3 py-2.5 rounded-xl text-xs font-black text-slate-700 hover:text-slate-900 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>Pilih Siswa</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-700 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-200">
                    {daftarSiswa.length} Murid
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    {isDaftarSiswaOpen ? 'Tutup ▲' : 'Buka ▼'}
                  </span>
                </div>
              </button>

              {isDaftarSiswaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Database Siswa</span>
                    <input
                      type="text"
                      placeholder="Cari murid..."
                      value={searchSiswaQuery}
                      onChange={(e) => setSearchSiswaQuery(e.target.value)}
                      className="bg-white text-[10px] text-slate-700 border border-slate-250 rounded-lg px-2 py-1 w-32 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="text-[11px] max-h-40 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {filteredStudents.map(s => (
                      <div 
                        key={s.id} 
                        className="py-1.5 flex items-center justify-between group hover:bg-slate-100 px-1 rounded-md transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setInputSiswaId(s.id);
                            setTransactionType('infaq');
                            showNotification(`Siswa "${s.name}" dipilih.`);
                          }}
                          className="min-w-0 flex-1 text-left cursor-pointer group-hover:text-indigo-650 transition-colors"
                          title="Klik untuk memilih siswa ini untuk pembayaran iuran"
                        >
                          <p className="font-bold text-slate-700 group-hover:text-indigo-655 truncate transition-colors flex items-center gap-1.5">
                            <span className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-indigo-500 transition-colors"></span>
                            {s.name}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSiswa(s.id, s.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Hapus Siswa dari sistem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {filteredStudents.length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center py-4 font-medium">Siswa tidak ditemukan atau belum didaftarkan.</p>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 text-center italic mt-1 pb-0.5">💡 Tips: Klik nama siswa di atas untuk langsung memilih & mencatat iuran mereka.</p>
                </motion.div>
              )}
            </div>

          </section>

          {/* CARD B: FORM INPUT DATA IURAN & PENGELUARAN */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="mb-3.5">
              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-black uppercase tracking-wider inline-block">Transaksi Keuangan</span>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mt-1.5 flex items-center gap-2">
                <Calculator className="text-emerald-600 w-5 h-5" /> Catat Kas & Iuran
              </h3>
              <p className="text-[11px] text-slate-500">Pilih model transaksi di bawah untuk mencatat pemasukan infaq siswa atau pengeluaran sekolah.</p>
            </div>

            {/* Toggle Transaction Type (Infaq Siswa vs Pengeluaran Sekolah) */}
            <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('infaq');
                  setInputSiswaId('');
                  setInputSiswaNamaCustom('');
                  setInputInfaqAmount('');
                  setInputPengeluaran('');
                  setInputNote('');
                }}
                className={`flex-1 py-1.5 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  transactionType === 'infaq'
                    ? 'bg-white text-teal-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-teal-600" /> Infaq Siswa (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType('pengeluaran');
                  setInputSiswaId('sekolah');
                  setInputSiswaNamaCustom('');
                  setInputInfaqAmount('');
                  setInputPengeluaran('');
                  setInputNote('');
                }}
                className={`flex-1 py-1.5 text-[11px] font-bold transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  transactionType === 'pengeluaran'
                    ? 'bg-white text-rose-700 shadow-sm border border-slate-200/60'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5 rotate-90 text-rose-600" /> Pengeluaran Sekolah (-)
              </button>
            </div>

            <form onSubmit={handleAddTransaksiObj} className="space-y-3.5">
              
              {transactionType === 'infaq' ? (
                <>
                  {/* dropdown of registered students */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Pilih Nama Siswa Pembayar</label>
                    <select
                      required
                      value={inputSiswaId}
                      onChange={(e) => setInputSiswaId(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-teal-500"
                    >
                      <option value="">— Pilih Murid Terdaftar —</option>
                      {daftarSiswa.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="custom">Tulis Nama Manual...</option>
                    </select>

                    {inputSiswaId === 'custom' && (
                      <input
                        type="text"
                        required
                        placeholder="Ketik Nama Siswa Manual..."
                        value={inputSiswaNamaCustom}
                        onChange={(e) => setInputSiswaNamaCustom(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-teal-500 mt-2"
                      />
                    )}
                  </div>

                  {/* infaq amount per student */}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Jumlah Uang Infaq Per Siswa (+)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        placeholder="Masukkan nominal iuran (cth: 150000)"
                        value={inputInfaqAmount}
                        onChange={(e) => setInputInfaqAmount(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-teal-500"
                      />
                    </div>
                  </div>

                  {/* bulan di bayar */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Bulan Di Bayar</label>
                      <select
                        value={inputBulanDibayar}
                        onChange={(e) => setInputBulanDibayar(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white focus:border-teal-500"
                      >
                        {BULAN_LIST.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Tahun</label>
                      <select
                        value={inputTahunDibayar}
                        onChange={(e) => setInputTahunDibayar(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white focus:border-teal-500"
                      >
                        {TAHUN_LIST.map(year => (
                          <option key={year} value={String(year)}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Keperluar Sekolah input */}
                  <div>
                    <label className="text-[10px] text-rose-700 uppercase tracking-wider block font-bold mb-1">Keperluan / Detail Pengeluaran Sekolah</label>
                    <input
                      type="text"
                      required
                      placeholder="Cth: Pembelian sapu ijuk, snack rapat, ATK..."
                      value={inputSiswaNamaCustom}
                      onChange={(e) => setInputSiswaNamaCustom(e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-rose-500"
                    />
                  </div>

                  {/* Pengeluaran amount */}
                  <div>
                    <label className="text-[10px] text-rose-700 uppercase tracking-wider block font-bold mb-1">Nominal Pengeluaran Sekolah (-)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        required
                        placeholder="Masukkan biaya belanja sekolah"
                        value={inputPengeluaran}
                        onChange={(e) => setInputPengeluaran(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl pl-8 pr-3 py-2 text-xs focus:outline-none focus:bg-white focus:border-rose-500"
                      />
                    </div>
                  </div>

                  {/* bulan buku */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Dialokasikan Bulan</label>
                      <select
                        value={inputBulanDibayar}
                        onChange={(e) => setInputBulanDibayar(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white focus:border-rose-500"
                      >
                        {BULAN_LIST.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Tahun</label>
                      <select
                        value={inputTahunDibayar}
                        onChange={(e) => setInputTahunDibayar(e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white focus:border-rose-500"
                      >
                        {TAHUN_LIST.map(year => (
                          <option key={year} value={String(year)}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Date & Note field */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="custom-date-picker-wrapper">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    onFocus={(e) => e.currentTarget.showPicker?.()}
                    className="custom-date-picker w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-2.5 py-1 text-xs focus:outline-none focus:bg-white cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">Note/Catatan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Cth: Opsional"
                    value={inputNote}
                    onChange={(e) => setInputNote(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl px-3 py-1 text-xs focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-2 font-extrabold text-white rounded-xl text-xs transition-colors cursor-pointer shadow-sm ${
                  transactionType === 'infaq'
                    ? 'bg-teal-600 hover:bg-teal-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <Check className="w-4 h-4" /> Simpan Data Transaksi
              </button>
            </form>
          </section>
        </div>

        {/* ==================== RIGHT COLUMN: SPECIFIC COLUMNS REKAPITULASI JURNAL ==================== */}
        <div className="lg:col-span-8 space-y-4 flex flex-col h-full min-h-[400px]">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Table search and info */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Table className="text-emerald-600 w-5 h-5" /> Jurnal Infaq & Pengeluaran MTS
                  </h2>
                  <p className="text-[11px] text-slate-550">Pembukuan pengiriman kas siswa sesuai kriteria pencarian</p>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 text-slate-450 w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Cari siswa / bulan pembayaran / note..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 border border-slate-250 rounded-xl pl-8 pr-8 py-1.5 text-xs focus:outline-none focus:bg-white focus:border-emerald-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2.5 text-slate-450 hover:text-slate-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* SPECIFIC TABLE COLUMNS REQUESTED:
                   "format kolom, nomor, nama siswa, jumlah uang infaq per siswa, bulan di bayar, pengeluaran. 
                    untuk saldo akhir letakkan pada bagian bawah."
              */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider">
                      <th className="py-3 px-4 text-center w-12">Nomor</th>
                      <th className="py-3 px-4">Nama Siswa</th>
                      <th className="py-3 px-4 text-right">Jumlah Uang Infaq Per Siswa</th>
                      <th className="py-3 px-4 text-center">Bulan Di Bayar</th>
                      <th className="py-3 px-4 text-right">Pengeluaran</th>
                      <th className="py-3 px-4 text-center w-10">Hapus</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTxList.map((tx, index) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* 1. Nomor (Chronological Order Index) */}
                        <td className="py-3 px-4 text-center font-mono text-slate-400">
                          {index + 1}
                        </td>

                        {/* 2. Nama Siswa / Keperluan Sekolah */}
                        <td className="py-3 px-4 text-slate-750">
                          <div className="flex flex-col">
                            {tx.siswaName.startsWith('Keperluan Sekolah:') ? (
                              <div>
                                <span className="inline-block text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded-md font-extrabold uppercase tracking-widest mb-1 mr-2">
                                  Keperluan Sekolah
                                </span>
                                <span className="font-bold text-slate-850 block sm:inline">
                                  {tx.siswaName.replace('Keperluan Sekolah:', '').trim()}
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-800">{tx.siswaName}</span>
                            )}
                            {tx.note && (
                              <span className="text-[10px] text-slate-400 font-normal italic mt-0.5">
                                * {tx.note} {tx.date && `(${tx.date})`}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Jumlah Uang Infaq Per Siswa */}
                        <td className="py-3 px-4 text-right font-mono text-teal-700 font-bold">
                          {tx.infaq > 0 ? formatRupiah(tx.infaq) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* 4. Bulan Di Bayar */}
                        <td className="py-3 px-4 text-center">
                          <span className="bg-slate-100 border border-slate-200 text-slate-650 px-2 py-0.5 rounded font-medium">
                            {tx.bulanDibayar} {tx.tahunDibayar}
                          </span>
                        </td>

                        {/* 5. Pengeluaran */}
                        <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">
                          {tx.pengeluaran > 0 ? formatRupiah(tx.pengeluaran) : <span className="text-slate-300">-</span>}
                        </td>

                        {/* 6. Delete Action */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaksi(tx.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus baris"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>

                      </tr>
                    ))}

                    {filteredTxList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400 font-medium">
                          <AlertCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p>Belum ada rekaman pembukuan iuran & pengeluaran.</p>
                          <p className="text-[10.5px] text-slate-450 mt-1">Sila catat data iuran baru di area kirian.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* BOTTOM ALIGNMENT OF SALDO AKHIR & TOTALS (EXPLICIT USER DIRECTIVE: "untuk saldo akhir letakkan pada bagian bawah.") */}
                  <tfoot>
                    
                    {/* Sum of Infaq, Sum of Pengeluaran at sub-level */}
                    <tr className="bg-slate-100 border-t-2 border-slate-200 text-slate-700 font-bold">
                      <td colSpan={2} className="py-3 px-4 text-left uppercase text-[9.5px] tracking-wider text-slate-500">
                        Total Kas Berputar:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-teal-700 text-[13px]">
                        {formatRupiah(totalInfaq)}
                      </td>
                      <td className="py-3 px-3 text-center text-slate-400 text-[10px]">
                        MTS Al-Khairaat
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-700 text-[13px]">
                        {formatRupiah(totalPengeluaran)}
                      </td>
                      <td></td>
                    </tr>

                    {/* ABSOLUTE BOTTOM ROW: SALDO AKHIR MAIN VALUE */}
                    <tr className="bg-slate-150 text-slate-800 border-t border-slate-250">
                      <td colSpan={3} className="py-4 px-4 text-right text-xs uppercase tracking-widest text-slate-600 font-bold">
                        Akumulasi Kas Bersih (Saldo Akhir) :
                      </td>
                      <td colSpan={3} className="py-4 px-4 bg-teal-50 text-center text-teal-800 font-black font-mono text-base tracking-wide border-l border-slate-250">
                        {formatRupiah(totalSaldoAkhir)}
                      </td>
                    </tr>

                  </tfoot>
                </table>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 text-[10.5px] text-slate-450 flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-650" />
                MTS Al-Khairaat Bunyu
              </span>
              <span>Kalkulasi otomatis (Saldo Akhir = Total Infaq - Total Pengeluaran)</span>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER METADATA */}
      <footer className="bg-slate-100 border-t border-slate-200 px-4 py-4 sm:px-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MTS Al-Khairaat Bunyu · Pembukuan Infaq Iuran</p>
          <p className="font-mono text-[10.5px] text-slate-400">Sistem Kas Mandiri v4.0 · Offline Local-Database</p>
        </div>
      </footer>

      {/* CUSTOM DIALOG POPUP */}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0">
                  <AlertCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{dialog.title}</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">{dialog.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                {dialog.type === 'confirm' && (
                  <button
                    type="button"
                    onClick={() => setDialog(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors cursor-pointer"
                  >
                    {dialog.cancelText || 'Batal'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (dialog.type === 'confirm' && dialog.onConfirm) {
                      dialog.onConfirm();
                    }
                    setDialog(null);
                  }}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs text-white transition-colors cursor-pointer ${
                    (dialog.confirmText?.toLowerCase().includes('hapus') || dialog.confirmText?.toLowerCase().includes('kosongkan'))
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-sm' 
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                  }`}
                >
                  {dialog.confirmText || 'Ya'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
