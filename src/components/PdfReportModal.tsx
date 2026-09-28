import React, { useState } from 'react';
import { Printer, X, Download, AlertTriangle, CheckCircle2, ChevronDown, Calendar, Building2, MapPin } from 'lucide-react';
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

  const companyProfile = companyProfileProp || storageService.getCompanyProfile();
  const companyStaff = storageService.getCompanyStaff();

  const report = reports.find((r) => r.id === currentId) || reports[0];

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

  if (!report) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow">
        <p className="text-slate-500">Belum ada laporan harian yang tersedia.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const textReport = `====================================================================================================
                                      ${companyProfile.officialName || 'PT. RBS GROUP'}
                           ${companyProfile.headOfficeAddress} | Telp: ${companyProfile.phone}
====================================================================================================
                                LAPORAN HARIAN OPERASIONAL LAND CLEARING
                                      No. Dokumen: ${report.reportNumber}
====================================================================================================

INFORMASI PROYEK & KLIEN
----------------------------------------------------------------------------------------------------
Klien / Pemilik Lahan : ${report.clientName.padEnd(36)} Tanggal Laporan  : ${report.date}
Nama Proyek           : ${report.projectName.padEnd(36)} Lokasi Kerja     : ${report.blockCode}
No. Kontrak           : ${report.contractNumber.padEnd(36)} Kondisi Cuaca    : ${report.weather}${report.weatherStartTime ? ` (${report.weatherStartTime} - ${report.weatherEndTime || ''} WIB)` : ''}
Pengawas Lapangan     : ${report.supervisorName} (${companyProfile.shortName || 'RBS'})    Jam Efektif Keja : ${report.effectiveWorkShift}

----------------------------------------------------------------------------------------------------
I. HASIL KERJA HARIAN (CAPAIAN FISIK)
----------------------------------------------------------------------------------------------------
  Item Pekerjaan          Target Harian       Realisasi Hari Ini      Total Kumulatif    Status Progres
  ----------------------  ------------------  ----------------------  -----------------  --------------
  Land Clearing (Rabas,   ${report.physicalProgress.targetAreaHa.toFixed(2)} Ha             ${report.physicalProgress.realizedAreaHa.toFixed(2)} Ha                 ${report.physicalProgress.cumulativeAreaHa.toFixed(2)} Ha           ${report.physicalProgress.progressPercentage.toFixed(2)} %
  Cincang & Rumpuk)
----------------------------------------------------------------------------------------------------
  Catatan Pengawas: ${report.physicalProgress.notes || '-'}

----------------------------------------------------------------------------------------------------
II. OPERASIONAL ALAT BERAT & PENCATATAN DOWNTIME (JAM MATI)
----------------------------------------------------------------------------------------------------
  Kode Alat  Jenis & Tipe     HM Awal  HM Akhir  Total HM  Downtime   Downtime   Jam Kerja  Keterangan
                              Mesin    Mesin     Buka      Cuaca      Breakdown  Efektif    Downtime
  ---------  ---------------  -------  --------  --------  ---------  ---------  ---------  -----------------
${report.equipmentWorkLogs
  .map(
    (l) =>
      `  ${l.equipmentId.padEnd(10)} ${l.type.padEnd(16)} ${l.hmStart.toFixed(1).padStart(7)}  ${l.hmEnd.toFixed(1).padStart(8)}  ${l.totalHm.toFixed(1).padStart(6)} HM ${l.downtimeWeatherHours.toFixed(1).padStart(8)} Jam  ${l.downtimeBreakdownHours.toFixed(1).padStart(8)} Jam  ${l.effectiveWorkHours.toFixed(1).padStart(7)} HM  ${l.downtimeWeatherNote || l.downtimeBreakdownNote || '-'}`
  )
  .join('\n')}
  --------------------------------------------------------------------------------------------------
  TOTAL DURATION / JAM                                     ${report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeWeatherHours, 0).toFixed(1)} Jam    ${report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeBreakdownHours, 0).toFixed(1)} Jam    ${report.equipmentWorkLogs.reduce((acc, l) => acc + l.effectiveWorkHours, 0).toFixed(1)} HM

----------------------------------------------------------------------------------------------------
III. LOGISTIK, KONSUMSI BBM (SOLAR), & OLI/GREASE
----------------------------------------------------------------------------------------------------
  Kode Alat  Pengisian BBM   Jam Efektif   Rasio BBM/HM   Batas Std   Status Efisiensi   Pemakaian Oli/Part
  ---------  --------------  ------------  -------------  ----------  -----------------  ------------------
${report.equipmentWorkLogs
  .map(
    (l) =>
      `  ${l.equipmentId.padEnd(10)} ${(l.fuelAddedLiters + ' L').padEnd(15)} ${(l.effectiveWorkHours.toFixed(1) + ' HM').padEnd(13)} ${(l.fuelRatio.toFixed(1) + ' L/HM').padEnd(14)} ${(l.fuelStandardLimit.toFixed(1) + ' L/HM').padEnd(11)} ${(l.isFuelAlert ? 'ALERT (> Std)' : 'NORMAL').padEnd(18)} ${l.downtimeBreakdownNote || 'Grease: 1.5 Kg'}`
  )
  .join('\n')}
  --------------------------------------------------------------------------------------------------
  * Catatan BBM: Stok Awal Tangki: ${report.logistics.fuelTankInitialLiters} L | Masuk: ${report.logistics.fuelTankInflowLiters} L | Terpakai: ${report.logistics.fuelTankUsedLiters} L | Sisa Stok: ${report.logistics.fuelTankRemainingLiters} L

====================================================================================================
                                        LEMBAR PENGESAHAN
====================================================================================================

      Dibuat Oleh,                      Diperiksa Oleh,                    Disetujui Oleh,
    Pengawas Lapangan                  Site Manager                           Direktur

   ( ${report.signatures.supervisor.name} )                  ( ${report.signatures.siteManager?.name || 'Agus Wardhana'} )               ( ${report.signatures.director?.name || 'Ir. Hendra Wijaya, M.Si'} )
`;
    const blob = new Blob([textReport], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.reportNumber.replace(/[\/\\:]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalDowntimeWeather = report.equipmentWorkLogs.reduce((a, b) => a + b.downtimeWeatherHours, 0);
  const totalDowntimeBreakdown = report.equipmentWorkLogs.reduce((a, b) => a + b.downtimeBreakdownHours, 0);
  const totalEffectiveHours = report.equipmentWorkLogs.reduce((a, b) => a + b.effectiveWorkHours, 0);

  return (
    <div className={`${isStandaloneView ? 'py-6 px-2 sm:px-6' : 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto p-2 sm:p-6 flex justify-center'}`}>
      <div className="bg-white w-full max-w-4xl text-slate-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:m-0 print:p-0 print:w-full print:max-w-none">
        
        {/* Controls Bar (Hidden during Print) */}
        <div className="print:hidden bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase text-slate-300">Pilih Laporan:</span>
            <div className="relative">
              <select
                value={currentId}
                onChange={(e) => setCurrentId(e.target.value)}
                className="bg-slate-700 text-white text-xs font-medium pl-3 pr-8 py-1.5 rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reportNumber} — {r.clientName || 'PT. A'} ({r.blockCode} • {r.date})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
            <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              Format Siap Cetak F4 / A4
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh TXT</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
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
                {report.physicalProgress.itemProgress && report.physicalProgress.itemProgress.length > 0 ? (
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
                        {report.physicalProgress.cumulativeAreaHa.toFixed(2)} Ha
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
                      {report.physicalProgress.targetAreaHa.toFixed(2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold text-emerald-800">
                      {report.physicalProgress.realizedAreaHa.toFixed(2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-mono font-bold">
                      {report.physicalProgress.cumulativeAreaHa.toFixed(2)} Ha
                    </td>
                    <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-amber-700">
                      {report.physicalProgress.progressPercentage.toFixed(2)} %
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {report.physicalProgress.notes && (
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
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">{log.hmStart.toFixed(1)}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono">{log.hmEnd.toFixed(1)}</td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold bg-slate-100/50">
                      {log.totalHm.toFixed(1)} HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-blue-700">
                      {log.downtimeWeatherHours > 0 ? `${log.downtimeWeatherHours.toFixed(1)} Jam` : '0.0 Jam'}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold text-rose-700">
                      {log.downtimeBreakdownHours > 0 ? `${log.downtimeBreakdownHours.toFixed(1)} Jam` : '0.0 Jam'}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold text-emerald-800 bg-emerald-50/50">
                      {log.effectiveWorkHours.toFixed(1)} HM
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
                    {totalDowntimeWeather.toFixed(1)} Jam
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-rose-900">
                    {totalDowntimeBreakdown.toFixed(1)} Jam
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-emerald-900">
                    {totalEffectiveHours.toFixed(1)} HM
                  </td>
                  <td className="border border-slate-300 px-1.5 py-1 text-[10px] text-slate-600">
                    Rasio Efektif: {totalEffectiveHours > 0 ? ((totalEffectiveHours / (totalEffectiveHours + totalDowntimeWeather + totalDowntimeBreakdown)) * 100).toFixed(1) : 0}%
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
                      {log.effectiveWorkHours.toFixed(1)} HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono font-bold">
                      {log.fuelRatio.toFixed(1)} L/HM
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 text-center font-mono text-slate-600">
                      {log.fuelStandardLimit.toFixed(1)} L/HM
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
                <strong>Tangki Lapangan:</strong> Stok Awal: <strong>{report.logistics.fuelTankInitialLiters} L</strong>
              </span>
              <span>
                Masuk (Inflow): <strong>{report.logistics.fuelTankInflowLiters} L</strong>
              </span>
              <span>
                Terpakai Hari Ini: <strong className="text-amber-800">{report.logistics.fuelTankUsedLiters} L</strong>
              </span>
              <span>
                Sisa Stok Tangki: <strong className="text-emerald-800">{report.logistics.fuelTankRemainingLiters} L</strong>
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
                      <span>GPS: {photo.gpsCoordinates.lat.toFixed(5)}, {photo.gpsCoordinates.lng.toFixed(5)}</span>
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
