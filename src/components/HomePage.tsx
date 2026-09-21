import React from 'react';
import { 
  ArrowRight, 
  Clock, 
  Calendar, 
  Bike as BikeIcon, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  MapPin, 
  Sun, 
  Flame, 
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Bike, RentalPlan, SystemSettings } from '../types';
import { OFFICIAL_WHATSAPP_LINK } from '../lib/whatsapp';

interface HomePageProps {
  settings: SystemSettings;
  bikes: Bike[];
  plans: RentalPlan[];
  onSelectBikeForBooking: (bike: Bike) => void;
  onStartBooking: () => void;
  onScrollToBikes: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  bikes,
  plans,
  onSelectBikeForBooking,
  onStartBooking,
  onScrollToBikes,
}) => {
  const availableBikes = bikes.filter((b) => b.status === 'available');

  const scrollToHowItWorks = () => {
    const el = document.getElementById('section-como-funciona');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:py-20 px-4 sm:px-6 border-b border-zinc-900 bg-gradient-to-b from-zinc-950 via-black to-zinc-950">
        {/* Subtle decorative glowing background orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-0" />

        <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center text-center">
          {/* Official Emblem Banner */}
          <div className="mb-6 relative group">
            <div className="w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-full p-1 bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 shadow-2xl shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
              <img
                src="/logo.png"
                alt="Logo Oficial PEDALAÊ Parintins"
                className="w-full h-full object-cover rounded-full bg-black"
              />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border border-amber-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <MapPin className="w-3 h-3 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-300 tracking-wider uppercase">
                {settings.cityState || 'Parintins - AM'}
              </span>
            </div>
          </div>

          {/* Slogan & Title */}
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-widest uppercase">
              <Sun className="w-3.5 h-3.5" />
              Aluguel de Bikes em Parintins - AM
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight font-sans">
              ALUGUE. PEDALE.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
                VIVA O MOMENTO.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
              Explore a ilha da magia sobre duas rodas! Liberdade, aventura e lazer na orla,
              praças e pontos turísticos de Parintins com bicicletas modernas, seguras e revisadas.
            </p>
          </div>

          {/* Pill Tags (Archetype Vibe) */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              🚲 Liberdade
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-amber-300">
              🔥 Aventura
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              ☀️ Lazer
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-yellow-300">
              🌴 Passeio
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300">
              📍 Parintins
            </span>
          </div>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full sm:w-auto">
            <button
              id="btn-hero-reservar"
              onClick={onScrollToBikes || onStartBooking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-black font-extrabold text-base sm:text-lg px-8 py-4 rounded-2xl hover:brightness-110 active:scale-98 transition-all shadow-xl shadow-amber-500/25 cursor-pointer"
            >
              <span>🚲 ESCOLHER MINHA BIKE</span>
              <ArrowRight className="w-5 h-5 text-black" />
            </button>

            <button
              id="btn-hero-como-funciona"
              onClick={scrollToHowItWorks}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-bold text-sm sm:text-base px-6 py-4 rounded-2xl transition-colors cursor-pointer"
            >
              <span>COMO FUNCIONA</span>
            </button>
          </div>

          {/* Quick Notice */}
          <div className="mt-6 flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Retirada facilitada na Orla • Pagamento instantâneo via PIX</span>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="section-como-funciona" className="py-14 sm:py-20 px-4 sm:px-6 bg-zinc-950/60 border-b border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Passo a Passo Descomplicado
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              Como funciona o aluguel no PEDALAÊ?
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 mt-2">
              Em poucos minutos sua reserva está garantida no sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                ⏱️
              </div>
              <h3 className="font-bold text-white text-base">1. Escolha o tempo</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Opções de 1h, 2h, 3h ou 4h de pedal pelos melhores pontos de Parintins.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                📅
              </div>
              <h3 className="font-bold text-white text-base">2. Escolha o horário</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Calendário inteligente com bloqueio de conflitos em tempo real.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                🚲
              </div>
              <h3 className="font-bold text-white text-base">3. Escolha sua bike</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Selecione seu modelo e cor favoritos no catálogo de bikes disponíveis.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                💳
              </div>
              <h3 className="font-bold text-white text-base">4. Faça o pagamento</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Chave PIX oficial com cópia rápida e valor calculado automaticamente.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                📲
              </div>
              <h3 className="font-bold text-white text-base">5. Envie o comprovante</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Com um toque você abre o WhatsApp oficial com a mensagem pré-formatada.
              </p>
            </div>

            <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-5 hover:border-amber-500/40 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-lg mb-3">
                ✅
              </div>
              <h3 className="font-bold text-white text-base">6. Venha buscar e pedalar</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                Confira os detalhes, assine o termo presencialmente e aproveite o rolê!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos de Aluguel Section */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-black border-b border-zinc-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Tarifas Acessíveis
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
              Planos de Aluguel
            </h2>
            <p className="text-sm text-zinc-400 mt-2">
              Escolha o período ideal para o seu passeio em Parintins.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-5 text-center flex flex-col justify-between transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-b from-amber-500/20 to-zinc-900 border-2 border-amber-500 shadow-lg shadow-amber-500/10'
                    : 'bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                    Mais Popular
                  </span>
                )}
                <div>
                  <div className="text-xs font-bold text-amber-400 tracking-wider uppercase mb-1">
                    {plan.label}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    {plan.durationHours}h de locação contínua
                  </div>
                </div>

                <button
                  id={`btn-plan-${plan.id}`}
                  onClick={onStartBooking}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-black text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
                >
                  Reservar este plano
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catálogo de Bikes Section */}
      <section id="section-bikes" className="py-14 sm:py-20 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                Frota Pedalaê
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1">
                ESCOLHA SUA BIKE
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Todas as nossas bicicletas são revisadas periodicamente para sua segurança.
              </p>
            </div>
            <div className="text-xs font-semibold text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 self-start sm:self-auto">
              🟢 {availableBikes.length} bikes disponíveis para reserva
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bikes.map((bike) => {
              const isAvailable = bike.status === 'available';
              return (
                <div
                  key={bike.id}
                  id={`card-bike-${bike.code.toLowerCase()}`}
                  className="bg-black/90 rounded-2xl border-2 border-amber-500/30 overflow-hidden flex flex-col justify-between hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 group"
                >
                  <div>
                    {/* Bike Poster Image Container with aspect ratio and sunset frame */}
                    <div className="relative aspect-[9/16] w-full bg-zinc-950 overflow-hidden cursor-pointer" onClick={() => isAvailable && onSelectBikeForBooking(bike)}>
                      <img
                        src={bike.photoUrl}
                        alt={bike.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80';
                        }}
                      />

                      {/* Code Badge */}
                      <div className="absolute top-3 left-3 bg-black/85 backdrop-blur-md border border-amber-500/50 text-amber-400 font-mono text-xs font-black px-2.5 py-1 rounded-lg shadow-lg">
                        {bike.code}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 bg-black/85 backdrop-blur-md border border-emerald-500/60 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            DISPONÍVEL
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-black/85 backdrop-blur-md border border-rose-500/60 text-rose-400 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg">
                            MANUTENÇÃO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bike Details */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-black text-white text-base sm:text-lg group-hover:text-amber-400 transition-colors uppercase tracking-tight">
                          {bike.name}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 font-semibold">
                          {bike.model}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                          Cor: {bike.color}
                        </span>
                      </div>

                      {/* Key Features Badges matching official poster */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] text-zinc-400 font-medium">
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
                          ⚙️ Freios a Disco
                        </span>
                        <span className="flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80">
                          🚵 Marchas Precisas
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Button */}
                  <div className="p-4 pt-0">
                    <button
                      id={`btn-choose-bike-${bike.code.toLowerCase()}`}
                      disabled={!isAvailable}
                      onClick={() => onSelectBikeForBooking(bike)}
                      className={`w-full py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isAvailable
                          ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:brightness-110 active:scale-95 text-black shadow-lg shadow-amber-500/25'
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      }`}
                    >
                      <span>🚲 {isAvailable ? 'ESCOLHER ESTA BIKE' : 'INDISPONÍVEL'}</span>
                      {isAvailable && <ChevronRight className="w-4 h-4 text-black stroke-[3]" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-zinc-900 py-10 px-4 sm:px-6 pb-24 sm:pb-12 text-center text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="PEDALAÊ" className="w-10 h-10 object-contain rounded-full" />
            <div className="text-left">
              <div className="text-sm font-black text-white">PEDALAÊ</div>
              <div className="text-[10px] text-amber-400">ALUGUE. PEDALE. VIVA O MOMENTO.</div>
            </div>
          </div>
          <p className="max-w-md text-zinc-400">
            {settings.address}
          </p>
          <div className="flex items-center gap-4 text-zinc-400 font-medium">
            <a href={settings.whatsappOfficialUrl || OFFICIAL_WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">
              WhatsApp Oficial: {settings.whatsappDisplay}
            </a>
            <span>•</span>
            <span>Parintins - Amazonas</span>
          </div>
          <p className="text-[11px] text-zinc-600">
            © {new Date().getFullYear()} PEDALAÊ. Todos os direitos reservados. Conforme diretrizes LGPD de proteção de dados.
          </p>
        </div>
      </footer>
    </div>
  );
};
