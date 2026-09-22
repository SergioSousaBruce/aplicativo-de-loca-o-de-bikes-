import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { BookingFlow } from './components/BookingFlow';
import { AdminPanel } from './components/AdminPanel';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton';
import { Bike, CustomerData, RentalPlan, Reservation, SystemSettings } from './types';
import { 
  initializeDatabaseIfEmpty, 
  subscribeBikes, 
  subscribeClients, 
  subscribeReservations, 
  subscribeSettings 
} from './lib/dbService';
import { INITIAL_BIKES, INITIAL_SETTINGS } from './lib/constants';

export default function App() {
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);
  const [bikes, setBikes] = useState<Bike[]>(INITIAL_BIKES);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [clients, setClients] = useState<CustomerData[]>([]);

  // Navigation views with persistence so sudden reload or exit restores view
  const [view, setView] = useState<'home' | 'booking' | 'admin'>(() => {
    try {
      const saved = localStorage.getItem('pedalae_current_view');
      if (saved === 'booking' || saved === 'admin' || saved === 'home') {
        return saved;
      }
    } catch {}
    return 'home';
  });

  const [preselectedBike, setPreselectedBike] = useState<Bike | null>(() => {
    try {
      const saved = localStorage.getItem('pedalae_preselected_bike');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  // Keep view saved
  const handleSetView = (nextView: 'home' | 'booking' | 'admin') => {
    setView(nextView);
    try {
      localStorage.setItem('pedalae_current_view', nextView);
    } catch {}
  };

  // Initialize DB and real-time Firestore subscriptions
  useEffect(() => {
    initializeDatabaseIfEmpty();

    const unsubSettings = subscribeSettings((st) => setSettings(st));
    const unsubBikes = subscribeBikes((bList) => setBikes(bList));
    const unsubRes = subscribeReservations((rList) => setReservations(rList));
    const unsubClients = subscribeClients((cList) => setClients(cList));

    return () => {
      unsubSettings();
      unsubBikes();
      unsubRes();
      unsubClients();
    };
  }, []);

  const handleSelectBikeForBooking = (bike: Bike) => {
    setPreselectedBike(bike);
    try {
      localStorage.setItem('pedalae_preselected_bike', JSON.stringify(bike));
    } catch {}
    handleSetView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartBooking = () => {
    setPreselectedBike(null);
    try {
      localStorage.removeItem('pedalae_preselected_bike');
    } catch {}
    handleSetView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = () => {
    handleSetView('home');
  };

  const handleToggleAdmin = () => {
    handleSetView(view === 'admin' ? 'home' : 'admin');
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header */}
      <Header
        onNavigateHome={handleNavigateHome}
        onOpenBooking={handleStartBooking}
        onOpenAdmin={handleToggleAdmin}
        isAdminOpen={view === 'admin'}
        whatsappUrl={settings.whatsappOfficialUrl}
      />

      {/* Main Views */}
      <div className="flex-grow">
        {view === 'home' && (
          <HomePage
            settings={settings}
            bikes={bikes}
            reservations={reservations}
            plans={settings.plans}
            onSelectBikeForBooking={handleSelectBikeForBooking}
            onStartBooking={handleStartBooking}
            onScrollToBikes={() => {
              const el = document.getElementById('section-bikes');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        )}

        {view === 'booking' && (
          <BookingFlow
            settings={settings}
            bikes={bikes}
            reservations={reservations}
            initialBike={preselectedBike}
            onCancel={handleNavigateHome}
            onFinished={() => {
              // Reservation created, flow displays confirmation step
            }}
          />
        )}

        {view === 'admin' && (
          <AdminPanel
            settings={settings}
            bikes={bikes}
            reservations={reservations}
            clients={clients}
            onClose={handleNavigateHome}
          />
        )}
      </div>

      {/* Fixed WhatsApp Action Button (visible throughout the system) */}
      <WhatsAppFloatingButton customUrl={settings.whatsappOfficialUrl} />
    </div>
  );
}
