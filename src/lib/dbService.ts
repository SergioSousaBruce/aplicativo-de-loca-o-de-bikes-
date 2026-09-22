import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Bike, 
  CustomerData, 
  Reservation, 
  SystemSettings, 
  ReservationStatus 
} from '../types';
import { INITIAL_BIKES, INITIAL_SETTINGS } from './constants';

const SETTINGS_DOC_ID = 'general_settings';

// Initialize default settings and bikes if database is empty
export async function initializeDatabaseIfEmpty() {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, INITIAL_SETTINGS);
    } else {
      // Ensure the official whatsapp number requested by user is set
      const current = settingsSnap.data();
      if (!current.whatsappDisplay || current.whatsappDisplay.includes('99123-4567')) {
        await setDoc(settingsRef, {
          whatsappDisplay: INITIAL_SETTINGS.whatsappDisplay,
          whatsappOfficialUrl: INITIAL_SETTINGS.whatsappOfficialUrl,
        }, { merge: true });
      }
    }

    const bikesRef = collection(db, 'bikes');
    const bikesSnap = await getDocs(bikesRef);
    if (bikesSnap.empty) {
      for (const bike of INITIAL_BIKES) {
        await setDoc(doc(db, 'bikes', bike.id), bike);
      }
    } else {
      // Synchronize with user's official bike photos if previously seeded with placeholders
      for (const bike of INITIAL_BIKES) {
        const existingDoc = bikesSnap.docs.find(d => d.id === bike.id || d.data().code === bike.code);
        if (existingDoc && (!existingDoc.data().photoUrl || existingDoc.data().photoUrl.includes('unsplash.com'))) {
          await setDoc(doc(db, 'bikes', existingDoc.id), {
            name: bike.name,
            model: bike.model,
            color: bike.color,
            photoUrl: bike.photoUrl,
            description: bike.description,
            notes: bike.notes,
          }, { merge: true });
        }
      }
    }
  } catch (error) {
    console.warn('Database initialization note:', error);
  }
}

// ----------------- SETTINGS -----------------
export async function getSettings(): Promise<SystemSettings> {
  try {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return { ...INITIAL_SETTINGS, ...(snap.data() as SystemSettings) };
    }
  } catch (err) {
    console.warn('Error fetching settings, using defaults:', err);
  }
  return INITIAL_SETTINGS;
}

export function subscribeSettings(callback: (settings: SystemSettings) => void) {
  const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
  return onSnapshot(settingsRef, (snap) => {
    if (snap.exists()) {
      callback({ ...INITIAL_SETTINGS, ...(snap.data() as SystemSettings) });
    } else {
      callback(INITIAL_SETTINGS);
    }
  }, (err) => {
    console.warn('Settings subscription fallback:', err);
    callback(INITIAL_SETTINGS);
  });
}

export async function updateSettings(newSettings: Partial<SystemSettings>): Promise<void> {
  const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(settingsRef, newSettings, { merge: true });
}

// ----------------- BIKES -----------------
export function subscribeBikes(callback: (bikes: Bike[]) => void) {
  const bikesRef = collection(db, 'bikes');
  return onSnapshot(bikesRef, (snapshot) => {
    const bikes: Bike[] = [];
    snapshot.forEach((docSnap) => {
      bikes.push({ id: docSnap.id, ...(docSnap.data() as Omit<Bike, 'id'>) });
    });
    // Sort by code or creation
    bikes.sort((a, b) => a.code.localeCompare(b.code));
    callback(bikes.length > 0 ? bikes : INITIAL_BIKES);
  }, (error) => {
    console.warn('Bikes subscription error, using fallbacks:', error);
    callback(INITIAL_BIKES);
  });
}

export async function createBike(bikeData: Omit<Bike, 'id'>): Promise<string> {
  const bikesRef = collection(db, 'bikes');
  const res = await addDoc(bikesRef, bikeData);
  return res.id;
}

export async function updateBike(bikeId: string, updates: Partial<Bike>): Promise<void> {
  const bikeRef = doc(db, 'bikes', bikeId);
  await updateDoc(bikeRef, updates);
}

export async function deleteBike(bikeId: string): Promise<void> {
  const bikeRef = doc(db, 'bikes', bikeId);
  await deleteDoc(bikeRef);
}

// ----------------- CLIENTS -----------------
export async function getClientByCpf(cpf: string): Promise<CustomerData | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  const clientsRef = collection(db, 'clients');
  const q = query(clientsRef, where('cpfClean', '==', cleanCpf));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docData = snap.docs[0].data();
    return { id: snap.docs[0].id, ...(docData as CustomerData) };
  }
  return null;
}

export async function saveOrUpdateClient(customer: CustomerData): Promise<string> {
  const cleanCpf = customer.cpf.replace(/\D/g, '');
  const clientsRef = collection(db, 'clients');
  const q = query(clientsRef, where('cpfClean', '==', cleanCpf));
  const snap = await getDocs(q);

  const payload = {
    ...customer,
    cpfClean: cleanCpf,
    updatedAt: Date.now(),
  };

  if (!snap.empty) {
    const clientDoc = snap.docs[0];
    const prevTotal = clientDoc.data().totalReservations || 0;
    await updateDoc(doc(db, 'clients', clientDoc.id), {
      ...payload,
      totalReservations: prevTotal + 1,
      lastReservationAt: Date.now(),
    });
    return clientDoc.id;
  } else {
    const newDoc = await addDoc(clientsRef, {
      ...payload,
      totalReservations: 1,
      createdAt: Date.now(),
      lastReservationAt: Date.now(),
    });
    return newDoc.id;
  }
}

export function subscribeClients(callback: (clients: CustomerData[]) => void) {
  const clientsRef = collection(db, 'clients');
  return onSnapshot(clientsRef, (snapshot) => {
    const clients: CustomerData[] = [];
    snapshot.forEach((d) => {
      clients.push({ id: d.id, ...(d.data() as CustomerData) });
    });
    clients.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(clients);
  }, (err) => console.warn('Clients subscription warning:', err));
}

// ----------------- RESERVATIONS -----------------
export function subscribeReservations(callback: (reservations: Reservation[]) => void) {
  const resRef = collection(db, 'reservations');
  return onSnapshot(resRef, (snapshot) => {
    const list: Reservation[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Reservation, 'id'>) });
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  }, (err) => console.warn('Reservations subscription error:', err));
}

export async function getReservationsForBikeAndDate(bikeId: string, date: string): Promise<Reservation[]> {
  const resRef = collection(db, 'reservations');
  const q = query(
    resRef,
    where('bikeId', '==', bikeId),
    where('date', '==', date)
  );
  const snap = await getDocs(q);
  const results: Reservation[] = [];
  snap.forEach((d) => {
    const res = { id: d.id, ...(d.data() as Omit<Reservation, 'id'>) };
    if (res.status !== 'cancelada') {
      results.push(res);
    }
  });
  return results;
}

// Helper to convert HH:mm to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function minutesToTime(minutesTotal: number): string {
  const h = Math.floor(minutesTotal / 60);
  const m = minutesTotal % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Check time overlap between two intervals [startA, endA) and [startB, endB)
export function hasTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);

  // Overlap occurs if startA < endB and endA > startB
  return sA < eB && eA > sB;
}

// Validates conflicts against active reservations for the bike & date
export async function checkReservationConflict(
  bikeId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: string
): Promise<{ conflict: boolean; conflictingReservation?: Reservation }> {
  const activeReservations = await getReservationsForBikeAndDate(bikeId, date);
  for (const res of activeReservations) {
    if (excludeReservationId && res.id === excludeReservationId) continue;
    if (res.status === 'cancelada') continue;

    if (hasTimeOverlap(startTime, endTime, res.startTime, res.endTime)) {
      return { conflict: true, conflictingReservation: res };
    }
  }
  return { conflict: false };
}

// Generate code format PED-000001
export async function generateNextReservationCode(): Promise<string> {
  const resRef = collection(db, 'reservations');
  const snap = await getDocs(resRef);
  const count = snap.size + 1;
  return `PED-${String(count).padStart(6, '0')}`;
}

export async function createReservation(
  reservationData: Omit<Reservation, 'id'>
): Promise<string> {
  // Validate conflict in database
  const { conflict, conflictingReservation } = await checkReservationConflict(
    reservationData.bikeId,
    reservationData.date,
    reservationData.startTime,
    reservationData.endTime
  );

  if (conflict && conflictingReservation) {
    throw new Error(
      `Conflito de horário! A bike já está reservada de ${conflictingReservation.startTime} às ${conflictingReservation.endTime} nesta data.`
    );
  }

  const resRef = collection(db, 'reservations');
  const docRef = await addDoc(resRef, reservationData);
  return docRef.id;
}

export async function updateReservationStatus(
  reservationId: string,
  status: ReservationStatus,
  extraUpdates: Partial<Reservation> = {}
): Promise<void> {
  const resRef = doc(db, 'reservations', reservationId);
  await updateDoc(resRef, {
    status,
    updatedAt: Date.now(),
    ...extraUpdates,
  });
}

export async function deleteReservation(reservationId: string): Promise<void> {
  const resRef = doc(db, 'reservations', reservationId);
  await deleteDoc(resRef);
}

