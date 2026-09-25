import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Info, 
  WifiOff, 
  ExternalLink,
  ShieldAlert,
  Server
} from 'lucide-react';
import { 
  getHealthCheckState, 
  onHealthCheckChange, 
  runConnectionHealthCheck, 
  simulateHealthCheckState,
  HealthCheckState 
} from '../services/connectionHealth';

interface ConnectionHealthCheckProps {
  /**
   * 'header' for compact navbar integration
   * 'dashboard' for executive top banner / card on Dashboard
   */
  variant?: 'header' | 'dashboard';
  className?: string;
}

export const ConnectionHealthCheck: React.FC<ConnectionHealthCheckProps> = ({
  variant = 'header',
  className = '',
}) => {
  const [health, setHealth] = useState<HealthCheckState>(getHealthCheckState());
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onHealthCheckChange((newState) => {
      setHealth({ ...newState });
    });
    return () => unsubscribe();
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await runConnectionHealthCheck();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopyError = () => {
    const errorLog = `[FIREBASE HEALTH CHECK ERROR]
Status: ${health.status}
Error Code: ${health.errorCode || 'UNKNOWN'}
Message: ${health.errorMessage || 'Unknown Error'}
Technical Details: ${health.errorDetails || 'N/A'}
Project ID: ${health.projectId}
Database ID: ${health.databaseId}
Tested At: ${health.testedAt || 'N/A'}
Navigator Online: ${!health.isOffline}
Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'}`;

    navigator.clipboard?.writeText(errorLog).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ----------------------------------------------------
  // RENDER: VARIANT HEADER (Top Navigation Bar)
  // ----------------------------------------------------
  if (variant === 'header') {
    return (
      <>
        <div className={`flex items-center gap-1.5 ${className}`}>
          {health.status === 'checking' && (
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300 shadow-xs"
              title="Memeriksa koneksi database Firebase..."
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span className="hidden sm:inline">Checking DB...</span>
            </div>
          )}

          {health.status === 'connected' && (
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border cursor-pointer bg-emerald-950/80 border-emerald-600/80 text-emerald-300 hover:bg-emerald-900/90 shadow-xs active:scale-95 group"
              title={`Database Connected (Firebase Firestore)\nLatency: ${health.latencyMs ?? '-'} ms\nDatabase: ${health.databaseId}\nKlik untuk uji ulang ping.`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Database Connected</span>
              <span className="md:hidden">DB Connected</span>
              {health.latencyMs !== null && (
                <span className="text-[10px] text-emerald-400/80 font-mono hidden lg:inline ml-0.5">
                  ({health.latencyMs}ms)
                </span>
              )}
            </button>
          )}

          {health.status === 'error' && (
            <div className="flex items-center gap-1">
              {/* Indikator Merah + Teks "Connection Error" */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-rose-950/90 border-rose-600 text-rose-200 shadow-xs"
                title={`Koneksi Database Bermasalah:\n${health.errorMessage || 'Connection Error'}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="hidden sm:inline">Connection Error</span>
                <span className="sm:hidden">DB Error</span>
              </div>

              {/* Tombol "Detail Error" */}
              <button
                type="button"
                onClick={() => setShowErrorModal(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-black transition-all duration-200 border cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm hover:shadow-rose-500/20 active:scale-95 flex items-center gap-1"
                title="Klik untuk membuka pesan error teknis dan panduan perbaikan"
              >
                <span>Detail Error</span>
              </button>
            </div>
          )}
        </div>

        {/* MODAL DETAIL ERROR TEKNIS */}
        {showErrorModal && renderErrorModal()}
      </>
    );
  }

  // ----------------------------------------------------
  // RENDER: VARIANT DASHBOARD (Top Banner on Executive Dashboard)
  // ----------------------------------------------------
  return (
    <>
      <div className={`w-full rounded-2xl transition-all duration-200 border ${
        health.status === 'connected'
          ? 'bg-gradient-to-r from-emerald-950/20 via-white to-emerald-950/10 border-emerald-300/80 shadow-xs'
          : health.status === 'error'
          ? 'bg-rose-50/90 border-rose-300 shadow-sm'
          : 'bg-slate-50 border-slate-200 shadow-xs'
      } p-3.5 sm:p-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Status Icon & Label */}
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              health.status === 'connected'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : health.status === 'error'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-200 text-slate-700'
            }`}>
              {health.status === 'connected' ? (
                <Database className="w-5 h-5" />
              ) : health.status === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <RefreshCw className="w-5 h-5 animate-spin" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* 2. Indikator Visual Status Koneksi */}
                {health.status === 'connected' && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Database Connected
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 font-mono">
                      Ping: {health.latencyMs}ms
                    </span>
                  </>
                )}

                {health.status === 'error' && (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                      Connection Error
                    </span>
                    {health.errorCode && (
                      <span className="text-[10px] font-mono font-bold bg-rose-200/70 text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                        {health.errorCode}
                      </span>
                    )}
                  </>
                )}

                {health.status === 'checking' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <RefreshCw className="w-3 h-3 text-amber-700 animate-spin" />
                    Sedang Menguji Koneksi Database...
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-1">
                {health.status === 'connected' ? (
                  <>
                    Koneksi ke Google Cloud Firestore aktif & valid. Database ID:{' '}
                    <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-800 border border-slate-200">
                      {health.databaseId}
                    </code>
                  </>
                ) : health.status === 'error' ? (
                  <span className="text-rose-700 font-semibold">
                    {health.errorMessage || 'Terjadi kegagalan komunikasi ke database server.'}
                  </span>
                ) : (
                  'Melakukan ping server Firestore untuk memeriksa otorisasi kredensial...'
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* 3. Tombol "Detail Error" jika status Merah */}
            {health.status === 'error' && (
              <button
                type="button"
                onClick={() => setShowErrorModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 shadow-sm hover:shadow-rose-600/30 active:scale-95 flex items-center gap-1.5"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Detail Error</span>
              </button>
            )}

            {/* Tombol Uji Ulang Ping */}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying || health.status === 'checking'}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs hover:border-slate-400 active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
              title="Jalankan pengujian ping koneksi database ulang"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Menguji...' : 'Uji Ulang Koneksi'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* MODAL DETAIL ERROR TEKNIS */}
      {showErrorModal && renderErrorModal()}
    </>
  );

  // ----------------------------------------------------
  // HELPER: MODAL DETAIL ERROR TEKNIS
  // ----------------------------------------------------
  function renderErrorModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-2xl w-full border border-rose-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
          
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-700 text-white p-4 sm:p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <AlertCircle className="w-6 h-6 text-rose-100" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-wide">
                  Detail Error Koneksi Database
                </h3>
                <p className="text-xs text-rose-100/90 font-medium">
                  Laporan teknis status gagal koneksi Google Cloud Firestore
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowErrorModal(false)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            
            {/* Error Code & Summary Card */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-rose-800 tracking-wider">
                  Status Error:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-rose-200 text-rose-900 border border-rose-300">
                  {health.errorCode || 'CONNECTION_ERROR'}
                </span>
              </div>
              <p className="text-sm font-bold text-rose-950">
                {health.errorMessage || 'Terjadi masalah pada koneksi database.'}
              </p>
            </div>

            {/* Technical Detail Raw Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pesan Error Teknis (Raw Message):</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyError}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Detail</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner leading-relaxed">
                {health.errorDetails ? (
                  <pre className="whitespace-pre-wrap break-all">{health.errorDetails}</pre>
                ) : (
                  <p className="text-slate-400 italic">
                    Tidak ada stack trace rincian yang tersedia.
                  </p>
                )}
              </div>
            </div>

            {/* Target Database Configuration Specs */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
              <h4 className="font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-4 h-4 text-slate-600" />
                <span>Parameter Konfigurasi Target</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Project ID:</span>
                  <span className="font-mono font-bold text-slate-900 break-all">{health.projectId}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Firestore Database ID:</span>
                  <span className="font-mono font-bold text-slate-900 break-all">{health.databaseId}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Waktu Pengujian Terakhir:</span>
                  <span className="font-bold text-slate-900">{health.testedAt || '-'}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Status Internet Perangkat:</span>
                  <span className={`font-bold ${health.isOffline ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {health.isOffline ? 'Offline (Tidak Terkoneksi)' : 'Online (Internet Terhubung)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Panduan Perbaikan Cepat (Troubleshooting Guide) */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 space-y-2 text-xs">
              <h4 className="font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                <span>Panduan Perbaikan Cepat</span>
              </h4>
              <ul className="space-y-1.5 text-amber-950 list-disc list-inside">
                {health.errorCode === 'API_KEY_INVALID' && (
                  <>
                    <li>Periksa nilai <code>apiKey</code> di <code>firebase-applet-config.json</code>.</li>
                    <li>Pastikan API Key diizinkan untuk layanan Cloud Firestore API pada Google Cloud Console.</li>
                  </>
                )}
                {health.errorCode === 'PERMISSION_DENIED' && (
                  <>
                    <li>Aturan keamanan Firestore menolak pembacaan koleksi.</li>
                    <li>Periksa aturan di <code>firestore.rules</code> dan pastikan aturan <code>allow read, write: if true;</code> telah di-deploy via <code>deploy_firebase</code>.</li>
                  </>
                )}
                {health.errorCode === 'NETWORK_TIMEOUT' && (
                  <>
                    <li>Server tidak merespons dalam waktu 8 detik.</li>
                    <li>Periksa kecepatan internet atau coba klik tombol "Uji Ulang Koneksi" di bawah.</li>
                  </>
                )}
                {(health.errorCode === 'NETWORK_OFFLINE' || health.errorCode === 'CLIENT_OFFLINE') && (
                  <>
                    <li>Browser berada dalam mode offline atau koneksi data seluler terputus.</li>
                    <li>Pastikan Anda terhubung ke Wi-Fi / jaringan internet aktif, lalu klik "Uji Ulang Koneksi".</li>
                  </>
                )}
                {!['API_KEY_INVALID', 'PERMISSION_DENIED', 'NETWORK_TIMEOUT', 'NETWORK_OFFLINE', 'CLIENT_OFFLINE'].includes(health.errorCode || '') && (
                  <>
                    <li>Pastikan kredensial Firebase di <code>firebase-applet-config.json</code> cocok dengan database Firestore aktif.</li>
                    <li>Salin log error di atas dan periksa konsol developer untuk rincian panggilan API.</li>
                  </>
                )}
              </ul>
            </div>

            {/* Test Simulation Controls (For QA & Verification) */}
            <div className="pt-2 border-t border-slate-200">
              <p className="text-[11px] text-slate-500 font-bold mb-2">
                Simulasi Kasus Error (Untuk Pengujian QA):
              </p>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => simulateHealthCheckState('apiKey')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 cursor-pointer"
                >
                  Test: API Key Invalid
                </button>
                <button
                  type="button"
                  onClick={() => simulateHealthCheckState('permission')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 cursor-pointer"
                >
                  Test: Permission Denied
                </button>
                <button
                  type="button"
                  onClick={() => simulateHealthCheckState('timeout')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 cursor-pointer"
                >
                  Test: Network Timeout
                </button>
                <button
                  type="button"
                  onClick={() => simulateHealthCheckState('offline')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 cursor-pointer"
                >
                  Test: Network Offline
                </button>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyError}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin ke Clipboard' : 'Salin Pesan Error'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                <span>{isRetrying ? 'Menguji Ulang...' : 'Uji Ulang Koneksi'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }
};
