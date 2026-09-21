export interface Bike {
  id: string;
  code: string; // e.g., PED-001
  name: string; // e.g., Bike Verde
  model: string; // e.g., Colli
  color: string; // e.g., Verde Neon
  description: string;
  photoUrl: string;
  status: 'available' | 'maintenance' | 'inactive';
  notes?: string;
  createdAt: number;
}

export interface RentalPlan {
  id: string;
  durationHours: number;
  label: string; // e.g. "1 HORA"
  price: number; // e.g. 10.00
  popular?: boolean;
}

export type ReservationStatus =
  | 'aguardando_pagamento'
  | 'pagamento_confirmado'
  | 'aguardando_retirada'
  | 'bike_retirada'
  | 'bike_em_uso'
  | 'devolvida_finalizada'
  | 'cancelada'
  | 'cancelamento_solicitado';

export interface CustomerData {
  id?: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  whatsapp: string;
  email: string;
  fullAddress: string;
  photoBase64?: string;
  createdAt?: number;
  updatedAt?: number;
  totalReservations?: number;
  lastReservationAt?: number;
}

export interface CheckinData {
  checkedInAt: number;
  checkedInBy: string;
  bikeConditionOk: boolean;
  notes?: string;
  photoUrl?: string;
  termAgreedPhysically: boolean;
}

export interface CheckoutData {
  checkedOutAt: number;
  checkedOutBy: string;
  conditionStatus: 'normal' | 'avaria' | 'problema_mecanico' | 'outros';
  notes?: string;
  photoUrl?: string;
}

export interface Reservation {
  id: string;
  code: string; // e.g., PED-000001
  bikeId: string;
  bikeSnapshot: {
    code: string;
    name: string;
    model: string;
    color: string;
    photoUrl: string;
  };
  customerId: string;
  customerSnapshot: CustomerData;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (e.g. "15:00")
  endTime: string; // HH:mm (e.g. "17:00")
  durationHours: number;
  totalPrice: number;
  pixKey: string;
  status: ReservationStatus;
  createdAt: number;
  updatedAt: number;
  
  // Payment confirmation
  paymentProofBase64?: string;
  paymentProofUploadedAt?: number;
  paymentConfirmedAt?: number;
  paymentConfirmedBy?: string;
  
  // Check-in and check-out records
  checkin?: CheckinData;
  checkout?: CheckoutData;
  
  // Terms
  termAgreedOnline: boolean;
  termAgreedAt: number;

  // Cancellation
  cancellationReason?: string;
  cancellationRequestedAt?: number;
  cancellationReviewedBy?: string;
  cancellationReviewedAt?: number;
}

export interface SystemSettings {
  companyName: string;
  slogan: string;
  logoUrl: string;
  cityState: string;
  address: string;
  whatsappOfficialUrl: string;
  whatsappDisplay: string;
  pixKey: string;
  pixType: 'CNPJ' | 'Chave Aleatória' | 'E-mail' | 'Telefone' | 'CPF';
  pixBeneficiary: string;
  openingTime: string; // e.g. "08:00"
  closingTime: string; // e.g. "22:00"
  slotIntervalMinutes: number; // e.g. 60
  blockedWeekdays: number[]; // 0 = Sunday, 1 = Monday...
  blockedDates: string[]; // ['2026-12-25']
  plans: RentalPlan[];
  termText: string;
  cancellationPolicy: string;
  adminPasswordHash?: string;
}
