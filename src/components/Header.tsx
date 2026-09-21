import React from 'react';
import { MessageCircle, Shield, Award, MapPin } from 'lucide-react';
import { OFFICIAL_WHATSAPP_LINK } from '../lib/whatsapp';

interface HeaderProps {
  onNavigateHome: () => void;
  onOpenBooking: () => void;
  onOpenAdmin: () => void;
  isAdminOpen: boolean;
  whatsappUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onOpenBooking,
  onOpenAdmin,
  isAdminOpen,
  whatsappUrl,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-amber-500/20 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <button
          id="btn-nav-brand"
          onClick={onNavigateHome}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <img
            src="/logo.png"
            alt="Logo Oficial PEDALAÊ"
            className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full border border-amber-500/40 p-0.5 shadow-lg group-hover:scale-105 transition-transform"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white font-sans">
                PEDALA<span className="text-amber-400">Ê</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Parintins
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-amber-400/90 font-medium tracking-wide">
              ALUGUE. PEDALE. VIVA O MOMENTO.
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="btn-header-reservar"
            onClick={onOpenBooking}
            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-md shadow-amber-500/20"
          >
            <span>🚲 Reservar Bike</span>
          </button>

          <a
            id="btn-header-whatsapp-top"
            href={whatsappUrl || OFFICIAL_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>

          <button
            id="btn-header-toggle-admin"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
              isAdminOpen
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-amber-500/50 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdminOpen ? 'Sair do Painel' : 'Painel Admin'}</span>
            <span className="sm:hidden">{isAdminOpen ? 'Painel' : 'Admin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
