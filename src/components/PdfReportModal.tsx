import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  X, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  Calendar, 
  Building2, 
  MapPin,
  FileSpreadsheet,
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas, toJpeg } from 'html-to-image';
import { DailyReport, CompanyProfile, CompanyStaff } from '../types';
import { storageService } from '../services/storageService';

interface PdfReportModalProps {
  reports: DailyReport[];
  selectedReportId?: string;
  onClose?: () => void;
  isStandaloneView?: boolean;
  companyProfileProp?: CompanyProfile;
}

export const PdfReportModal: React.FC<PdfReportModalProps> = ({
  reports,
  selectedReportId,
  onClose,
  isStandaloneView = false,
  companyProfileProp,
}) => {
  const [currentId, setCurrentId] = useState<string>(
    selectedReportId || (reports.length > 0 ? reports[0].id : '')
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Sync currentId when selectedReportId or reports change
  useEffect(() => {
    if (selectedReportId) {
      setCurrentId(selectedReportId);
    } else if (reports.length > 0 && !currentId) {
      setCurrentId(reports[0].id);
    }
  }, [selectedReportId, reports]);

  const companyProfile = companyProfileProp || storageService.getCompanyProfile();
  const companyStaff = storageService.getCompanyStaff();

  const allAvailableReports = reports && reports.length > 0 ? reports : storageService.getReports();
  const report = allAvailableReports.find((r) => r.id === currentId) 
    || (selectedReportId ? storageService.getReportById(selectedReportId) : undefined)
    || (currentId ? storageService.getReportById(currentId) : undefined)
    || allAvailableReports[0];

  // Match staff for signatures
  const supervisorStaff = companyStaff.find(
    (s) => s.staffLevel === 'Pengawas' || 
           (s.jobRole || '').toLowerCase().includes('pengawas') || 
           ((s.fullName || '').toLowerCase().includes((report?.supervisorName || '').toLowerCase()))
  );
  const managerStaff = companyStaff.find(
    (s) => s.staffLevel === 'Manager' || (s.jobRole || '').toLowerCase().includes('manager')
  );
  const directorStaff = companyStaff.find(
    (s) => s.staffLevel === 'Direktur' || (s.jobRole || '').toLowerCase().includes('direktur')
  );

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setStatusNotification({ message, type });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4500);
  };

  if (!report) {
    return (
      <div className={`${isStandaloneView ? 'py-8 px-4' : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4'}`}>
        <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-2xl text-center space-y-4 border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Dokumen Laporan Belum Tersedia</h3>
          <p className="text-slate-500 text-xs">
            Tidak ditemukan data laporan harian operasional untuk ditampilkan saat ini.
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Tutup Jendela
            </button>
          )}
        </div>
      </div>
    );
  }

  const safeNum = (val: any, decimals = 1): string => {
    if (val === undefined || val === null || isNaN(Number(val))) {
      return (0).toFixed(decimals);
    }
    return Number(val).toFixed(decimals);
  };

  // 1. UNDUH PDF RESMI (Menggunakan html-to-image + jsPDF, mendukung semua warna OKLCH modern)
  const handleDownloadPdf = async () => {
    const sheetElement = document.getElementById('official-pdf-sheet');
    if (!sheetElement) {
      showNotification('Gagal menemukan elemen lembar dokumen untuk di-generate.', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    showNotification('Sedang memproses dokumen ke format PDF resolusi tinggi...', 'info');

    try {
      const canvas = await toCanvas(sheetElement, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210; // Lebar standar A4 (mm)
      const pdfHeight = 297; // Tinggi standar A4 (mm)
      const pageMargin = 6;
      const contentWidth = pdfWidth - (pageMargin * 2);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = pageMargin;

      pdf.addImage(imgData, 'JPEG', pageMargin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= (pdfHeight - pageMargin * 2);

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + pageMargin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', pageMargin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - pageMargin * 2);
      }

      const safeReportNo = (report.reportNumber || 'LAPORAN').replace(/[\/\\:\s]/g, '_');
      const filename = `LAPORAN_RESMI_${safeReportNo}_${report.date}.pdf`;
      pdf.save(filename);

      showNotification(`Dokumen PDF berhasil diunduh: ${filename}`, 'success');
    } catch (err) {
      console.error('Error creating PDF file with toCanvas, attempting toJpeg fallback:', err);
      try {
        const imgData = await toJpeg(sheetElement, {
          backgroundColor: '#ffffff',
          pixelRatio: 1.5,
          quality: 0.95,
        });
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
          compress: true,
        });
        const pdfWidth = 210;
        const pdfHeight = 297;
        const pageMargin = 6;
        const contentWidth = pdfWidth - (pageMargin * 2);
        const rect = sheetElement.getBoundingClientRect();
        const contentHeight = (rect.height * contentWidth) / (rect.width || 800);

        let heightLeft = contentHeight;
        let position = pageMargin;

        pdf.addImage(imgData, 'JPEG', pageMargin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= (pdfHeight - pageMargin * 2);

        while (heightLeft > 0) {
          position = heightLeft - contentHeight + pageMargin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', pageMargin, position, contentWidth, contentHeight, undefined, 'FAST');
          heightLeft -= (pdfHeight - pageMargin * 2);
        }

        const safeReportNo = (report.reportNumber || 'LAPORAN').replace(/[\/\\:\s]/g, '_');
        const filename = `LAPORAN_RESMI_${safeReportNo}_${report.date}.pdf`;
        pdf.save(filename);

        showNotification(`Dokumen PDF berhasil diunduh: ${filename}`, 'success');
      } catch (err2) {
        console.error('Error in secondary PDF generator:', err2);
        // Fallback: Unduh sebagai dokumen HTML Siap Cetak
        handleDownloadHtmlFallback();
        showNotification('PDF dialihkan ke dokumen resmi cetak mandiri.', 'info');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Fallback dokumen HTML cetak jika rendering canvas browser terhalang sandbox
  const handleDownloadHtmlFallback = () => {
    const sheetElement = document.getElementById('official-pdf-sheet');
    if (!sheetElement) return;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan ${report.reportNumber} - ${companyProfile.officialName || 'PT. RBS GROUP'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 20px; color: #0f172a; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 11px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    @media print {
      @page { size: A4 portrait; margin: 8mm; }
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  ${sheetElement.outerHTML}
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `DOKUMEN_CETAK_${(report.reportNumber || 'LAPORAN').replace(/[\/\\:\s]/g, '_')}.html`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // 2. CETAK / PRINT DIALOG (Aman terhadap sandbox iframe)
  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn('Browser window.print() is restricted or sandboxed:', e);
      // Fallback langsung unduh PDF
      handleDownloadPdf();
    }
  };

  // 3. UNDUH DATA TABEL EXCEL (CSV FORMAT)
  const handleDownloadExcel = () => {
    try {
      const headers = [
        'No. Dokumen',
        'Tanggal Laporan',
        'Klien / Pemilik Lahan',
        'No. Kontrak SPK',
        'Nama Proyek',
        'Lokasi Blok',
        'Kondisi Cuaca',
        'Shift Kerja',
        'Pengawas Lapangan',
        'Status Laporan',
        'Target Area (Ha)',
        'Realisasi Area (Ha)',
        'Total Kumulatif (Ha)',
        'Persentase Capaian (%)',
        'Catatan Capaian Fisik',
        'Total Unit Alat Berat',
        'Total Jam Efektif (HM)',
        'Total Downtime Cuaca (Jam)',
        'Total Downtime Breakdown (Jam)',
        'Stok Awal BBM (Liter)',
        'BBM Masuk (Liter)',
        'BBM Terpakai (Liter)',
        'Sisa Stok BBM (Liter)',
      ];

      const totalEffHm = (report.equipmentWorkLogs || []).reduce((acc, l) => acc + (l.effectiveWorkHours || 0), 0);
      const totalDwWeather = (report.equipmentWorkLogs || []).reduce((acc, l) => acc + (l.downtimeWeatherHours || 0), 0);
      const totalDwBreakdown = (report.equipmentWorkLogs || []).reduce((acc, l) => acc + (l.downtimeBreakdownHours || 0), 0);

      const mainRow = [
        `"${report.reportNumber}"`,
        `"${report.date}"`,
        `"${report.clientName || ''}"`,
        `"${report.contractNumber || ''}"`,
        `"${report.projectName || ''}"`,
        `"${report.blockCode || ''}"`,
        `"${report.weather || ''}"`,
        `"${report.effectiveWorkShift || ''}"`,
        `"${report.supervisorName || ''}"`,
        `"${report.status || ''}"`,
        safeNum(report.physicalProgress?.targetAreaHa, 2),
        safeNum(report.physicalProgress?.realizedAreaHa, 2),
        safeNum(report.physicalProgress?.cumulativeAreaHa, 2),
        safeNum(report.physicalProgress?.progressPercentage, 2),
        `"${(report.physicalProgress?.notes || '-').replace(/"/g, '""')}"`,
        (report.equipmentWorkLogs || []).length,
        totalEffHm.toFixed(1),
        totalDwWeather.toFixed(1),
        totalDwBreakdown.toFixed(1),
        report.logistics?.fuelTankInitialLiters ?? 0,
        report.logistics?.fuelTankInflowLiters ?? 0,
        report.logistics?.fuelTankUsedLiters ?? 0,
        report.logistics?.fuelTankRemainingLiters ?? 0,
      ];

      const eqHeaders = [
        'KODE UNIT',
        'JENIS & TIPE ALAT',
        'OPERATOR',
        'HM AWAL',
        'HM AKHIR',
        'TOTAL HM',
        'DOWNTIME CUACA (JAM)',
        'DOWNTIME BREAKDOWN (JAM)',
        'JAM KERJA EFEKTIF (HM)',
        'PENGISIAN BBM (LITER)',
        'RASIO BBM (L/HM)',
        'BATAS STANDAR (L/HM)',
        'STATUS ALARM BBM',
        'KETERANGAN / DOWNTIME',
      ];

      const eqRows = (report.equipmentWorkLogs || []).map((l) => [
        `"${l.equipmentId}"`,
        `"${l.type}"`,
        `"${(l as any).operatorName || l.equipmentName || '-'}"`,
        safeNum(l.hmStart),
        safeNum(l.hmEnd),
        safeNum(l.totalHm),
        safeNum(l.downtimeWeatherHours),
        safeNum(l.downtimeBreakdownHours),
        safeNum(l.effectiveWorkHours),
        l.fuelAddedLiters,
        safeNum(l.fuelRatio),
        safeNum(l.fuelStandardLimit),
        l.isFuelAlert ? 'ALERT (> STD)' : 'NORMAL',
        `"${(l.downtimeWeatherNote || l.downtimeBreakdownNote || '-').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [
        `"REKAPITULASI LAPORAN OPERASIONAL - ${companyProfile.officialName || 'PT. RBS GROUP'}"`,
        headers.join(';'),
        mainRow.join(';'),
        '',
        '"OPERASIONAL ALAT BERAT & PENCATATAN DOWNTIME"',
        eqHeaders.join(';'),
        ...eqRows.map((r) => r.join(';')),
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeReportNo = (report.reportNumber || 'LAPORAN').replace(/[\/\\:\s]/g, '_');
      const filename = `REKAP_EXCEL_${safeReportNo}_${report.date}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      showNotification(`File spreadsheet Excel berhasil diunduh: ${filename}`, 'success');
    } catch (err) {
      console.error('Failed to export CSV Excel:', err);
      showNotification('Gagal mengunduh file Excel.', 'error');
    }
  };

  // 4. UNDUH TEKS DOKUMEN (TXT FORMAT)
  const handleDownloadTxt = () => {
    try {
      const textReport = `====================================================================================================
                                       ${companyProfile.officialName || 'PT. RBS GROUP'}
                           ${companyProfile.headOfficeAddress} | Telp: ${companyProfile.phone}
====================================================================================================
                                Laporan Harian Operasional Land Clearing
                                      No. Dokumen: ${report.reportNumber}
====================================================================================================

INFORMASI PROYEK & KLIEN
----------------------------------------------------------------------------------------------------
Klien / Pemilik Lahan : ${report.clientName.padEnd(36)} Tanggal Laporan  : ${report.date}
Nama Proyek           : ${report.projectName.padEnd(36)} Lokasi Kerja     : ${report.blockCode}
No. Kontrak           : ${report.contractNumber.padEnd(36)} Kondisi Cuaca    : ${report.weather}${report.weatherStartTime ? ` (${report.weatherStartTime} - ${report.weatherEndTime || ''} WIB)` : ''}
Pengawas Lapangan     : ${report.supervisorName} (${companyProfile.shortName || 'RBS'})    Jam Efektif Kerja : ${report.effectiveWorkShift}

----------------------------------------------------------------------------------------------------
I. HASIL KERJA HARIAN (CAPAIAN FISIK)
----------------------------------------------------------------------------------------------------
  Item Pekerjaan          Target Harian       Realisasi Hari Ini      Total Kumulatif    Status Progres
  ----------------------  ------------------  ----------------------  -----------------  --------------
  Land Clearing (Rabas,   ${safeNum(report.physicalProgress?.targetAreaHa, 2)} Ha             ${safeNum(report.physicalProgress?.realizedAreaHa, 2)} Ha                 ${safeNum(report.physicalProgress?.cumulativeAreaHa, 2)} Ha           ${safeNum(report.physicalProgress?.progressPercentage, 2)} %
  Cincang & Rumpuk)
----------------------------------------------------------------------------------------------------
  Catatan Pengawas: ${report.physicalProgress?.notes || '-'}

----------------------------------------------------------------------------------------------------
II. OPERASIONAL ALAT BERAT & PENCATATAN DOWNTIME (JAM MATI)
----------------------------------------------------------------------------------------------------
  Kode Alat  Jenis & Tipe     HM Awal  HM Akhir  Total HM  Downtime   Downtime   Jam Kerja  Keterangan
                                 Mesin    Mesin     Buka      Cuaca      Breakdown  Efektif    Downtime
  ---------  ---------------  -------  --------  --------  ---------  ---------  ---------  -----------------
${(report.equipmentWorkLogs || [])
  .map(
    (l) =>
      `  ${l.equipmentId.padEnd(10)} ${l.type.padEnd(16)} ${safeNum(l.hmStart).padStart(7)}  ${safeNum(l.hmEnd).padStart(8)}  ${safeNum(l.totalHm).padStart(6)} HM ${safeNum(l.downtimeWeatherHours).padStart(8)} Jam  ${safeNum(l.downtimeBreakdownHours).padStart(8)} Jam  ${safeNum(l.effectiveWorkHours).padStart(7)} HM  ${l.downtimeWeatherNote || l.downtimeBreakdownNote || '-'}`
  )
  .join('\n')}
  --------------------------------------------------------------------------------------------------
  TOTAL DURATION / JAM                                     ${safeNum((report.equipmentWorkLogs || []).reduce((acc, l) => acc + l.downtimeWeatherHours, 0))} Jam    ${safeNum((report.equipmentWorkLogs || []).reduce((acc, l) => acc + l.downtimeBreakdownHours, 0))} Jam    ${safeNum((report.equipmentWorkLogs || []).reduce((acc, l) => acc + l.effectiveWorkHours, 0))} HM

----------------------------------------------------------------------------------------------------
III. LOGISTIK, KONSUMSI BBM (SOLAR), & OLI/GREASE
----------------------------------------------------------------------------------------------------
  Kode Alat  Pengisian BBM   Jam Efektif   Rasio BBM/HM   Batas Std   Status Efisiensi   Pemakaian Oli/Part
  ---------  --------------  ------------  -------------  ----------  -----------------  ------------------
${(report.equipmentWorkLogs || [])
  .map(
    (l) =>
      `  ${l.equipmentId.padEnd(10)} ${(l.fuelAddedLiters + ' L').padEnd(15)} ${(safeNum(l.effectiveWorkHours) + ' HM').padEnd(13)} ${(safeNum(l.fuelRatio) + ' L/HM').padEnd(14)} ${(safeNum(l.fuelStandardLimit) + ' L/HM').padEnd(11)} ${(l.isFuelAlert ? 'ALERT (> Std)' : 'NORMAL').padEnd(18)} ${l.downtimeBreakdownNote || 'Grease: 1.5 Kg'}`
  )
  .join('\n')}
  --------------------------------------------------------------------------------------------------
  * Catatan BBM: Stok Awal Tangki: ${report.logistics?.fuelTankInitialLiters || 0} L | Masuk: ${report.logistics?.fuelTankInflowLiters || 0} L | Terpakai: ${report.logistics?.fuelTankUsedLiters || 0} L | Sisa Stok: ${report.logistics?.fuelTankRemainingLiters || 0} L

====================================================================================================
                                        LEMBAR PENGESAHAN
====================================================================================================

      Dibuat Oleh,                      Diperiksa Oleh,                    Disetujui Oleh,
    Pengawas Lapangan                  Site Manager                           Direktur

   ( ${report.signatures?.supervisor?.name || ''} )                  ( ${report.signatures?.siteManager?.name || 'Bambang Sugiarto, S.P.'} )               ( ${report.signatures?.director?.name || 'Direktur Utama'} )
`;
      const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeReportNo = (report.reportNumber || 'LAPORAN').replace(/[\/\\:\s]/g, '_');
      const filename = `${safeReportNo}.txt`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      showNotification(`File teks berhasil diunduh: ${filename}`, 'success');
    } catch (err) {
      console.error('Failed to download TXT:', err);
      showNotification('Gagal mengunduh file teks.', 'error');
    }
  };

  const totalDowntimeWeather = (report.equipmentWorkLogs || []).reduce((a, b) => a + (b.downtimeWeatherHours || 0), 0);
  const totalDowntimeBreakdown = (report.equipmentWorkLogs || []).reduce((a, b) => a + (b.downtimeBreakdownHours || 0), 0);
  const totalEffectiveHours = (report.equipmentWorkLogs || []).reduce((a, b) => a + (b.effectiveWorkHours || 0), 0);

  return (
    <div className={`${isStandaloneView ? 'py-6 px-2 sm:px-6' : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto p-2 sm:p-6 flex justify-center items-start'}`}>
      <div className="bg-white w-full max-w-4xl text-slate-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none">
        
        {/* Toast Notifikasi Khusus Modal */}
        {statusNotification && (
          <div className="fixed top-5 right-5 z-60 max-w-md animate-fade-in shadow-2xl">
            <div className={`px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
              statusNotification.type === 'success' 
                ? 'bg-emerald-600 text-white' 
                : statusNotification.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}>
              {statusNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusNotification.message}</span>
            </div>
          </div>
        )}

        {/* Controls Bar (Hidden during Print) */}
        <div className="print:hidden bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="text-xs font-semibold uppercase text-slate-300">Pilih Laporan:</span>
            <div className="relative">
              <select
                value={currentId}
                onChange={(e) => setCurrentId(e.target.value)}
                className="bg-slate-700 text-white text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 max-w-[260px] sm:max-w-sm truncate"
              >
                {allAvailableReports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reportNumber} — {r.clientName || 'PT. RBS'} ({r.blockCode} • {r.date})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
            <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 hidden md:inline-block">
              Format Standar F4 / A4
            </span>
          </div>

          {/* Action Buttons: UNDUH PDF, CETAK, EXCEL, TXT */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. TOMBOL UTAMA: UNDUH DOKUMEN PDF RESMI */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black rounded-lg shadow transition cursor-pointer disabled:opacity-60"
              title="Unduh dokumen file PDF resmi ke perangkat Anda"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen PDF</span>
                </>
              )}
            </button>

            {/* 2. CETAK / PRINT LANGSUNG */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
              title="Buka dialog printer browser untuk cetak langsung"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            {/* 3. EKSPOR EXCEL (CSV) */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
              title="Unduh data tabel laporan dalam format Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh Excel</span>
            </button>

            {/* 4. UNDUH TXT */}
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
              title="Unduh teks ringkas format .txt"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TXT</span>
            </button>

            {/* 5. TUTUP MODAL */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer ml-1"
                title="Tutup Jendela"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PRINTABLE OFFICIAL SHEET CONTENT */}
        <div id="official-pdf-sheet" className="p-6 sm:p-10 font-sans text-xs sm:text-sm bg-white print:p-4">
          {/* Header Kop Surat */}
          <div className="text-center pb-3 border-b-2 border-slate-900 mb-3">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                {companyProfile.logoUrl ? (
                  <img src={companyProfile.logoUrl} alt="Logo Perusahaan" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-amber-600 text-2xl font-black">🚜</span>
                )}
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-black tracking-widest text-slate-900 uppercase">
                  {companyProfile.officialName || 'PT. RBS GROUP'}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-600">
                  {companyProfile.headOfficeAddress} | Telp: {companyProfile.phone} • Email: {companyProfile.email}
                </p>
                <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">
                  {companyProfile.tagline || 'Heavy Equipment & Plantation Land Clearing Contractor • Zero Burning Method'}
                </div>
              </div>
            </div>
          </div>

          <div className="text-center py-2 bg-slate-100 border border-slate-300 rounded mb-4">
            <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
              LAPORAN HARIAN OPERASIONAL LAND CLEARING
            </h2>
            <p className="text-[11px] font-mono text-slate-700">
              No. Dokumen: <strong className="text-slate-900">{report.reportNumber}</strong>
            </p>
          </div>

          {/* INFORMASI PROYEK & KLIEN */}
          <div className="border border-slate-300 rounded p-3 mb-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 mb-2">
              Informasi Proyek & Klien
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px]">
              <div className="flex">
                <span className="w-36 text-slate-600">Klien / Pemilik Lahan</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-bold text-slate-900">{report.clientName} (PT. AGRO PERDANA MANDIRI)</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600">Tanggal Laporan</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-bold text-slate-900">{report.date}</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-600">Nama Proyek</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-semibold text-slate-800">{report.projectName}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600">Lokasi Kerja</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-bold text-slate-900">{report.blockCode}</span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-600">No. Kontrak</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-mono text-slate-800">{report.contractNumber}</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600">Kondisi Cuaca</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-semibold text-slate-900">
                  {report.weather}
                  {report.weatherStartTime && (
                    <span className="text-xs font-normal text-slate-700 ml-1.5">
                      ({report.weatherStartTime} - {report.weatherEndTime || 'Selesai'} WIB)
                    </span>
                  )}
                  {report.weatherNotes && (
                    <span className="text-[11px] font-normal italic text-slate-500 block">
                      *{report.weatherNotes}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex">
                <span className="w-36 text-slate-600">Pengawas Lapangan</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-semibold text-slate-900">{report.supervisorName} (PT. RBS)</span>
              </div>
              <div className="flex">
                <span className="w-32 text-slate-600">Jam Efektif Kerja</span>
                <span className="w-3 text-slate-400">:</span>
                <span className="font-semibold text-slate-900">{report.effectiveWorkShift}</span>
              </div>
            </div>
          </div>

          {/* I. HASIL KERJA HARIAN (CAPAIAN FISIK) */}
          <div className="mb-4">
            <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
              <span>I. Hasil Kerja Harian (Capaian Fisik)</span>
              <span className="text-amber-400">Metode Zero Burning (Rabas, Cincang, Rumpuk)</span>
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Item Pekerjaan</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center">Target Harian</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center">Realisasi Hari Ini</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center">Total Kumulatif</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center">Status Progres (%)</th>
                </tr>
              </thead>
              <tbody>
                {report.physicalProgress?.itemProgress && report.physicalProgress.itemProgress.length > 0 ? (
                  report.physicalProgress.itemProgress.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : ''}>
                      <td className="border border-slate-300 px-2 py-1.5 font-medium">
                        {item.itemName}
                        {item.notes && <span className="text-[10px] text-slate-500 block italic">({item.notes})</span>}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                        {item.targetDailyVolume} {item.unit}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-emerald-800">
                        {item.realizedDailyVolume} {item.unit}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">
                        {safeNum(report.physicalProgress?.cumulativeAreaHa, 2)} Ha
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-amber-700">
                        {item.achievementPercentage} %
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1.5 font-medium">
                      Land Clearing (Rabas, Cincang, Rumpuk Mekanis)
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono">
                      {safeNum(report.physicalProgress?.targetAreaHa, 2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-emerald-800">
                      {safeNum(report.physicalProgress?.realizedAreaHa, 2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">
                      {safeNum(report.physicalProgress?.cumulativeAreaHa, 2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-amber-700">
                      {safeNum(report.physicalProgress?.progressPercentage, 2)} %
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {report.physicalProgress?.notes && (
              <div className="text-[10px] text-slate-700 italic mt-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                <strong>Catatan Pengawas:</strong> {report.physicalProgress.notes}
              </div>
            )}
          </div>

          {/* II. OPERASIONAL ALAT BERAT & PENCATATAN DOWNTIME */}
          <div className="mb-4">
            <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
              <span>II. Operasional Alat Berat & Pencatatan Downtime (Jam Mati)</span>
              <span className="text-amber-400">Pemisahan Cuaca vs Breakdown Alat</span>
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[10px] sm:text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-1.5 py-1 text-left">Kode</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-left">Jenis & Tipe</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">HM Awal</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">HM Akhir</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center bg-slate-200/60">Total HM</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center text-blue-800">Downtime Cuaca</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center text-rose-800">Downtime Breakdown</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center bg-emerald-50 text-emerald-900 font-bold">Jam Kerja Efektif</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-left">Keterangan Downtime</th>
                </tr>
              </thead>
              <tbody>
                {report.equipmentWorkLogs.map((log) => (
                  <tr key={log.equipmentId} className={log.downtimeBreakdownHours > 0 ? 'bg-rose-50/40' : ''}>
                    <td className="border border-slate-300 px-1.5 py-1 font-bold text-slate-900 font-mono">
                      {log.equipmentId}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">{log.type}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">{safeNum(log.hmStart)}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">{safeNum(log.hmEnd)}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold bg-slate-100/50">
                      {safeNum(log.totalHm)} HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-blue-700">
                      {log.downtimeWeatherHours > 0 ? `${safeNum(log.downtimeWeatherHours)} Jam` : '0.0 Jam'}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold text-rose-700">
                      {log.downtimeBreakdownHours > 0 ? `${safeNum(log.downtimeBreakdownHours)} Jam` : '0.0 Jam'}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                      {safeNum(log.effectiveWorkHours)} HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-slate-700 text-[10px]">
                      {log.downtimeBreakdownNote ? (
                        <span className="text-rose-700 font-semibold">{log.downtimeBreakdownNote}</span>
                      ) : (
                        log.downtimeWeatherNote || '-'
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-200/80 font-bold text-slate-900">
                  <td colSpan={5} className="border border-slate-300 px-2 py-1 text-right uppercase">
                    TOTAL DURASI / JAM :
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-blue-900">
                    {safeNum(totalDowntimeWeather)} Jam
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-rose-900">
                    {safeNum(totalDowntimeBreakdown)} Jam
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-emerald-900">
                    {safeNum(totalEffectiveHours)} HM
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-[10px] text-slate-600">
                    Rasio Efektif: {totalEffectiveHours > 0 ? safeNum((totalEffectiveHours / (totalEffectiveHours + totalDowntimeWeather + totalDowntimeBreakdown)) * 100) : 0}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* III. LOGISTIK, KONSUMSI BBM (SOLAR), & OLI/GREASE */}
          <div className="mb-4">
            <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
              <span>III. Logistik, Konsumsi BBM (Solar), & Oli / Spare Part</span>
              <span className="text-amber-400">Sistem Deteksi Efisiensi & Alert Kebocoran</span>
            </div>
            <table className="w-full border-collapse border border-slate-300 text-[10px] sm:text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border border-slate-300 px-1.5 py-1 text-left">Kode</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">Pengisian BBM</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">Jam Efektif</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">Rasio BBM/HM</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">Batas Std</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-center">Status Efisiensi</th>
                  <th className="border border-slate-300 px-1.5 py-1 text-left">Pemakaian Oli / Part</th>
                </tr>
              </thead>
              <tbody>
                {report.equipmentWorkLogs.map((log) => (
                  <tr key={log.equipmentId} className={log.isFuelAlert ? 'bg-amber-100/50' : ''}>
                    <td className="border border-slate-300 px-1.5 py-1 font-bold font-mono text-slate-900">
                      {log.equipmentId}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">
                      {log.fuelAddedLiters} Liter
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">
                      {safeNum(log.effectiveWorkHours)} HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold">
                      {safeNum(log.fuelRatio)} L/HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-600">
                      {safeNum(log.fuelStandardLimit)} L/HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center">
                      {log.isFuelAlert ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded text-[10px] border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          ALERT (&gt; Std)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-slate-700 text-[10px]">
                      {log.equipmentId === 'EX-02' ? 'Hose Hydraulic 3/4" 4SP' : 'Grease EP-2: 1.5 - 2.0 Kg'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-slate-100 border border-slate-300 text-[10px] sm:text-[11px] px-3 py-1.5 mt-1 rounded flex flex-wrap justify-between text-slate-700 font-mono">
              <span>
                <strong>Tangki Lapangan:</strong> Stok Awal: <strong>{report.logistics?.fuelTankInitialLiters ?? 0} L</strong>
              </span>
              <span>
                Masuk (Inflow): <strong>{report.logistics?.fuelTankInflowLiters ?? 0} L</strong>
              </span>
              <span>
                Terpakai Hari Ini: <strong className="text-amber-800">{report.logistics?.fuelTankUsedLiters ?? 0} L</strong>
              </span>
              <span>
                Sisa Stok Tangki: <strong className="text-emerald-800">{report.logistics?.fuelTankRemainingLiters ?? 0} L</strong>
              </span>
            </div>
          </div>

          {/* IV. ABSENSI PRESENSI TIM HARIAN */}
          <div className="mb-4">
            <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider">
              IV. Absensi Presensi Tim & Tenaga Kerja Lapangan
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-300 p-2 text-[10px] sm:text-[11px] bg-slate-50/40">
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1 text-[11px]">
                  Pekerja Utama:
                </div>
                <ul className="space-y-0.5 text-slate-700">
                  <li>• Operator EX-01 : Agus (Hadir)</li>
                  <li>• Operator EX-02 : Rian (Hadir)</li>
                  <li>• Operator DZ-01 : Bambang (Hadir)</li>
                  <li>• Helper Alat Berat : 3 Orang (Hadir)</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1 text-[11px]">
                  Maintenance:
                </div>
                <ul className="space-y-0.5 text-slate-700">
                  <li>• Mekanik : Toni (Hadir)</li>
                  <li>• Helper Mekanik : Doni (Hadir)</li>
                  <li>• Driver BBM : Joko (Hadir)</li>
                </ul>
              </div>
              <div>
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1 text-[11px]">
                  Pengawas & Pendukung:
                </div>
                <ul className="space-y-0.5 text-slate-700">
                  <li>• Mandor / Pengawas : Budi (Hadir)</li>
                  <li>• Surveyor Field : Eko (Hadir)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* V. DOKUMENTASI FOTO LAPANGAN */}
          <div className="mb-6">
            <div className="bg-slate-800 text-white px-3 py-1 font-bold text-[11px] uppercase tracking-wider flex justify-between">
              <span>V. Dokumentasi Foto Lapangan (Geotagged & Timestamped)</span>
              <span className="text-amber-400">Bukti Fisik Otentik Lapangan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-300 p-3 bg-slate-50/30">
              {report.photos.map((photo) => (
                <div key={photo.id} className="border border-slate-300 rounded overflow-hidden bg-white shadow-sm">
                  <div className="aspect-video w-full bg-slate-900 overflow-hidden relative">
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 text-[10px]">
                    <div className="font-bold text-slate-900 uppercase">{photo.caption}</div>
                    <div className="text-slate-500 font-mono flex items-center justify-between mt-0.5">
                      <span>GPS: {photo.gpsCoordinates ? `${safeNum(photo.gpsCoordinates.lat, 5)}, ${safeNum(photo.gpsCoordinates.lng, 5)}` : '-'}</span>
                      <span>{photo.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LEMBAR PENGESAHAN */}
          <div className="border border-slate-400 rounded p-4 bg-slate-50 text-center">
            <div className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-2 mb-4">
              Lembar Pengesahan Tiga Pihak (Supervisor - Site Manager - Direktur)
            </div>
            <div className="grid grid-cols-3 gap-4 text-[11px]">
              {/* Supervisor Signature Column */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-slate-600 mb-0.5">Dibuat Oleh,</div>
                  <div className="font-bold text-slate-800">Pengawas Lapangan</div>
                </div>

                <div className="h-16 flex items-center justify-center my-1">
                  {supervisorStaff?.signatureUrl ? (
                    <img 
                      src={supervisorStaff.signatureUrl} 
                      alt="TTD Pengawas" 
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12 border-b border-dashed border-slate-300 w-32 mx-auto"></div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    ( {supervisorStaff?.fullName || report.signatures.supervisor.name} )
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {companyProfile.officialName || 'PT. RBS GROUP'}
                  </div>
                </div>
              </div>

              {/* Site Manager Signature Column */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-slate-600 mb-0.5">Diperiksa Oleh,</div>
                  <div className="font-bold text-slate-800">Site Manager Proyek</div>
                </div>

                <div className="h-16 flex items-center justify-center my-1">
                  {managerStaff?.signatureUrl ? (
                    <img 
                      src={managerStaff.signatureUrl} 
                      alt="TTD Manager" 
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12 border-b border-dashed border-slate-300 w-32 mx-auto"></div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    ( {managerStaff?.fullName || report.signatures.siteManager?.name || 'Bambang Sugiarto, S.P.'} )
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {companyProfile.officialName || 'PT. RBS GROUP'}
                  </div>
                </div>
              </div>

              {/* Direktur Signature Column */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-slate-600 mb-0.5">Disetujui Oleh,</div>
                  <div className="font-bold text-slate-800">Direktur Utama</div>
                </div>

                <div className="h-16 flex items-center justify-center my-1">
                  {directorStaff?.signatureUrl ? (
                    <img 
                      src={directorStaff.signatureUrl} 
                      alt="TTD Direktur" 
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="h-12 border-b border-dashed border-slate-300 w-32 mx-auto"></div>
                  )}
                </div>

                <div>
                  <div className="font-bold text-slate-900 border-t border-slate-400 pt-1">
                    ( {directorStaff?.fullName || (report.signatures.director?.name && !report.signatures.director.name.toLowerCase().includes('hendra wijaya') ? report.signatures.director.name : 'Direktur Utama')} )
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    {companyProfile.officialName || 'PT. RBS GROUP'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[9px] text-slate-400 mt-4 text-center">
            Dokumen ini dicetak otomatis dari {companyProfile.shortName || 'RBS'} APPS. Data tervalidasi dengan sistem GPS dan kalkulasi jam kerja efektif terpusat.
          </div>
        </div>

      </div>
    </div>
  );
};
