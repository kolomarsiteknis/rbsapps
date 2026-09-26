import React, { useState } from 'react';

interface RbsLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
}

export const RbsLogo: React.FC<RbsLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  subtitle = 'PT. RBS GROUP • Land Clearing Heavy Equipment',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-9 h-9 rounded-xl text-sm',
    lg: 'w-11 h-11 rounded-xl text-base',
    xl: 'w-14 h-14 rounded-2xl text-xl',
  };

  const imageSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} overflow-hidden bg-slate-900 border border-amber-500/40 flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0 relative`}
      >
        {!imageError ? (
          <img
            src="/Logo RBS.png"
            alt="Logo RBS"
            className={`${imageSizes[size]} object-cover w-full h-full`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black tracking-tight">
            RBS
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-sm sm:text-base font-black tracking-wider text-white">
              RBS
            </span>
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              APPS
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
