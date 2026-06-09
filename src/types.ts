export interface Siswa {
  id: string;
  name: string;
  createdAt: string;
}

export interface IuranTransaksi {
  id: string;
  siswaId?: string; // Dapat kosong jika pengeluaran umum
  siswaName: string; // Nama siswa penerima / pembayar iuran, atau "Umum / Pengeluaran Sekolah"
  infaq: number; // Jumlah uang infaq per siswa
  bulanDibayar: string; // Bulan di bayar (contoh: "Juni")
  tahunDibayar: string; // Tahun di bayar (contoh: "2026")
  pengeluaran: number; // Pengeluaran (-)
  date: string; // Tanggal transaksi YYYY-MM-DD
  note?: string; // Keterangan tambahan
  createdAt: string;
}
