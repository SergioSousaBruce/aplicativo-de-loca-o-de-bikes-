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

  // Navigation views
  const [view, setView] = useState<'home' | 'booking' | 'admin'>('home');
  const [preselectedBike, setPreselectedBike] = useState<Bike | null>(null);

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
    setView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartBooking = () => {
    setPreselectedBike(null);
    setView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Header */}
      <Header
        onNavigateHome={() => setView('home')}
        onOpenBooking={handleStartBooking}
        onOpenAdmin={() => setView(view === 'admin' ? 'home' : 'admin')}
        isAdminOpen={view === 'admin'}
        whatsappUrl={settings.whatsappOfficialUrl}
      />

      {/* Main Views */}
      <div className="flex-grow">
        {view === 'home' && (
          <HomePage
            settings={settings}
            bikes={bikes}
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
            initialBike={preselectedBike}
            onCancel={() => setView('home')}
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
            onClose={() => setView('home')}
          />
        )}
      </div>

      {/* Fixed WhatsApp Action Button (visible throughout the system) */}
      <WhatsAppFloatingButton customUrl={settings.whatsappOfficialUrl} />
    </div>
  );
}
