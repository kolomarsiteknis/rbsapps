import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    if (variant === 'sidebar') {
      return (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Aplikasi Terpasang (Mode App)</span>
        </div>
      );
    }
    return null;
  }

  const handleButtonClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleButtonClick}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 shrink-0 ${className}`}
          title="Instal RBS APPS ke Perangkat"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="inline">Instal App</span>
        </button>

        {showModal && (
          <InstallInstructionsModal
            isIOS={isIOS}
            isInstallable={isInstallable}
            onClose={() => setShowModal(false)}
            onTryInstall={install}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-lg transition-all cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-950/20 rounded-lg">
            <Smartphone className="w-4 h-4 text-slate-950" />
          </div>
          <div className="text-left">
            <div className="font-black text-xs">Instal Aplikasi di HP</div>
            <div className="text-[10px] opacity-90 font-medium">Akses Cepat Cepat Tanpa Browser</div>
          </div>
        </div>
        <Download className="w-4 h-4 text-slate-950" />
      </button>

      {showModal && (
        <InstallInstructionsModal
          isIOS={isIOS}
          isInstallable={isInstallable}
          onClose={() => setShowModal(false)}
          onTryInstall={install}
        />
      )}
    </>
  );
};

interface ModalProps {
  isIOS: boolean;
  isInstallable: boolean;
  onClose: () => void;
  onTryInstall: () => Promise<boolean>;
}

const InstallInstructionsModal: React.FC<ModalProps> = ({
  isIOS,
  isInstallable,
  onClose,
  onTryInstall,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Instal RBS APPS</h3>
              <p className="text-[10px] text-slate-400">Pintasan Layar Utama &amp; Akses Offline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3 text-xs text-slate-300">
            <p className="font-semibold text-amber-400">Petunjuk Instalasi Safari iOS (iPhone / iPad):</p>
            <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] leading-relaxed text-slate-300">
              <li className="flex items-start gap-2">
                <Share2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Tekan tombol <strong>Bagikan (Share)</strong> di bagian bawah menu browser Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</span>
              </li>
              <li>
                Tekan tombol <strong>"Tambah" (Add)</strong> di pojok kanan atas untuk memasang icon aplikasi.
              </li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-slate-300">
            <p className="font-semibold text-amber-400">Petunjuk Instalasi Browser Chrome / Android / Desktop:</p>
            
            {isInstallable && (
              <button
                onClick={async () => {
                  await onTryInstall();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Klik Untuk Langsung Instal</span>
              </button>
            )}

            <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] leading-relaxed text-slate-300">
              <li>
                Klik tombol titik tiga <strong>(⋮)</strong> di pojok kanan atas Chrome.
              </li>
              <li>
                Pilih menu <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" / "Add to Home screen"</strong>.
              </li>
              <li>
                Konfirmasi dialog popup untuk membuat icon aplikasi di beranda HP Anda.
              </li>
            </ol>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
