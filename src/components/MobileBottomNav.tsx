import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  Fuel, 
  Menu, 
  HardHat, 
  Database,
  ClipboardCheck,
  ShieldCheck
} from 'lucide-react';
import { UserRole } from '../types';
import { TabKey } from './Header';

interface MobileBottomNavProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  userRole: UserRole;
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  onOpenSidebar,
}) => {
  const isDirector = userRole === 'director';
  const isManager = userRole === 'manager';

  const items = isDirector
    ? [
        {
          key: 'dashboard' as TabKey,
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
        {
          key: 'director-field-monitor' as TabKey,
          label: 'Audit P2H/K3',
          icon: ClipboardCheck,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap',
          icon: FileText,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik',
          icon: Fuel,
        },
      ]
    : isManager
    ? [
        {
          key: 'approval' as TabKey,
          label: 'Approval',
          icon: ShieldCheck,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap',
          icon: FileText,
        },
        {
          key: 'director-field-monitor' as TabKey,
          label: 'Audit P2H/K3',
          icon: ClipboardCheck,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik',
          icon: Fuel,
        },
      ]
    : [
        {
          key: 'wizard' as TabKey,
          label: 'Input',
          icon: PlusCircle,
        },
        {
          key: 'supervisor-tools' as TabKey,
          label: 'Alat & K3',
          icon: HardHat,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap',
          icon: FileText,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik',
          icon: Fuel,
        },
      ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-2xl safe-area-bottom"
      aria-label="Navigasi Bawah Layar Sentuh"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-lg mx-auto px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectTab(item.key)}
              className={`flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
                isActive ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 text-amber-400' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th button: Open Hidden Sidebar Menu */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-amber-400 transition-all duration-200 active:scale-90 cursor-pointer"
          title="Buka Menu Lengkap"
        >
          <div className="relative p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400">
            <Menu className="w-4 h-4" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
