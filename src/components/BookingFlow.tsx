import React, { useState, useEffect, useRef } from 'react';
import { 
  Bike, 
  RentalPlan, 
  CustomerData, 
  Reservation, 
  SystemSettings 
} from '../types';
import { 
  checkReservationConflict, 
  createReservation, 
  generateNextReservationCode, 
  getClientByCpf, 
  getReservationsForBikeAndDate, 
  saveOrUpdateClient, 
  timeToMinutes,
  minutesToTime,
  updateReservationStatus
} from '../lib/dbService';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Calendar as CalendarIcon, 
  Clock, 
  Camera, 
  Upload, 
  Copy, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  QrCode, 
  FileText, 
  Send,
  User,
  Sparkles,
  Smartphone,
  CheckCircle,
  Image as ImageIcon
} from 'lucide-react';
import { 
  buildReservationWhatsAppText, 
  OFFICIAL_WHATSAPP_LINK,
  getWhatsAppReservationUrl,
  getWhatsAppClientSelfUrl
} from '../lib/whatsapp';
import { generateReservationPDF } from '../lib/pdfGenerator';
import QRCode from 'qrcode';

interface BookingFlowProps {
  settings: SystemSettings;
  bikes: Bike[];
  initialBike?: Bike | null;
  onCancel: () => void;
  onFinished: (reservation: Reservation) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export const BookingFlow: React.FC<BookingFlowProps> = ({
  settings,
  bikes,
  initialBike,
  onCancel,
  onFinished,
}) => {
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Bike Selection & Plan
  const [selectedBike, setSelectedBike] = useState<Bike | null>(
    initialBike || bikes.find((b) => b.status === 'available') || null
  );
  const [selectedPlan, setSelectedPlan] = useState<RentalPlan>(
    settings.plans[1] || settings.plans[0]
  );

  // Step 2: Date & Slot Selection
  // Default to today in YYYY-MM-DD local format
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('15:00');
  const [existingDateReservations, setExistingDateReservations] = useState<Reservation[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Step 3: Customer Information
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchingClient, setSearchingClient] = useState(false);
  const [clientFoundMessage, setClientFoundMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Step 4: Terms & Summary
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(true);

  // Step 5 & 6: Confirmation & Created Reservation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentProofBase64, setPaymentProofBase64] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [proofSavedSuccess, setProofSavedSuccess] = useState(false);

  // Fetch reservations for the selected bike & date to display slot statuses
  useEffect(() => {
    if (!selectedBike || !selectedDate) return;
    setLoadingSlots(true);
    getReservationsForBikeAndDate(selectedBike.id, selectedDate)
      .then((resList) => {
        setExistingDateReservations(resList);
      })
      .catch((err) => console.warn('Slots load error:', err))
      .finally(() => setLoadingSlots(false));
  }, [selectedBike, selectedDate]);

  // Auto-search returning client when CPF has 11 digits
  const handleCpfChange = async (val: string) => {
    // Format CPF XXX.XXX.XXX-XX
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 9) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    } else if (digits.length > 6) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    } else if (digits.length > 3) {
      formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    setCpf(formatted);

    if (digits.length === 11) {
      setSearchingClient(true);
      try {
        const found = await getClientByCpf(digits);
        if (found) {
          setFullName(found.fullName || '');
          setBirthDate(found.birthDate || '');
          setWhatsapp(found.whatsapp || '');
          setEmail(found.email || '');
          setFullAddress(found.fullAddress || '');
          if (found.photoBase64) {
            setPhotoBase64(found.photoBase64);
          }
          setClientFoundMessage(`Cadastro localizado! Dados de ${found.fullName} preenchidos.`);
        } else {
          setClientFoundMessage(null);
        }
      } catch (err) {
        console.warn('Client search note:', err);
      } finally {
        setSearchingClient(false);
      }
    }
  };

  // Camera capture handlers
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access note:', err);
      alert('Não foi possível acessar a câmera. Você também pode anexar uma foto da sua galeria.');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoBase64(dataUrl);
      }
      // Stop video tracks
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate return time
  const calculateEndTime = (start: string, hours: number): string => {
    const startMins = timeToMinutes(start);
    const endMins = startMins + hours * 60;
    return minutesToTime(endMins);
  };

  const calculatedEndTime = calculateEndTime(selectedStartTime, selectedPlan.durationHours);

  // Generate hourly slots between opening and closing time
  const getSlots = () => {
    const openMins = timeToMinutes(settings.openingTime || '08:00');
    const closeMins = timeToMinutes(settings.closingTime || '22:00');
    const interval = settings.slotIntervalMinutes || 60;
    const slots: { time: string; available: boolean; conflictReason?: string }[] = [];

    for (let m = openMins; m + selectedPlan.durationHours * 60 <= closeMins; m += interval) {
      const slotStart = minutesToTime(m);
      const slotEnd = minutesToTime(m + selectedPlan.durationHours * 60);

      // Check conflict with existing reservations
      let isBusy = false;
      let reason = '';
      for (const res of existingDateReservations) {
        const rStart = timeToMinutes(res.startTime);
        const rEnd = timeToMinutes(res.endTime);
        const candStart = timeToMinutes(slotStart);
        const candEnd = timeToMinutes(slotEnd);

        if (candStart < rEnd && candEnd > rStart) {
          isBusy = true;
          reason = `Ocupado (${res.startTime} - ${res.endTime})`;
          break;
        }
      }

      slots.push({
        time: slotStart,
        available: !isBusy,
        conflictReason: reason,
      });
    }
    return slots;
  };

  // Step 2 validation
  const validateStep2 = async () => {
    setConflictError(null);
    if (!selectedBike) {
      setConflictError('Selecione uma bicicleta.');
      return;
    }

    const { conflict, conflictingReservation } = await checkReservationConflict(
      selectedBike.id,
      selectedDate,
      selectedStartTime,
      calculatedEndTime
    );

    if (conflict && conflictingReservation) {
      setConflictError(
        `Horário indisponível! A bike já possui reserva de ${conflictingReservation.startTime} às ${conflictingReservation.endTime}. Por favor, escolha outro horário ou outra data.`
      );
      return;
    }

    setCurrentStep(3);
  };

  // Step 3 validation
  const validateStep3 = () => {
    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      alert('Por favor, informe seu nome completo.');
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      alert('Por favor, digite um CPF válido com 11 dígitos.');
      return;
    }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 10) {
      alert('Por favor, informe um número de WhatsApp válido com DDD.');
      return;
    }
    if (!fullAddress.trim()) {
      alert('Por favor, preencha seu endereço completo.');
      return;
    }
    if (!photoBase64) {
      alert('A foto do cliente é obrigatória para segurança e conferência no check-in. Tire uma foto ou envie da galeria.');
      return;
    }
    setCurrentStep(4);
  };

  // Final Step: Submit reservation
  const handleFinalSubmit = async () => {
    if (!termsAccepted) {
      alert('É obrigatório ler e aceitar o Termo de Compromisso e Responsabilidade.');
      return;
    }
    if (!selectedBike) return;

    setIsSubmitting(true);
    try {
      // 1. Re-validate conflict immediately before committing
      const { conflict, conflictingReservation } = await checkReservationConflict(
        selectedBike.id,
        selectedDate,
        selectedStartTime,
        calculatedEndTime
      );

      if (conflict && conflictingReservation) {
        alert(
          `Ops! Outro cliente acabou de reservar este horário (${conflictingReservation.startTime} às ${conflictingReservation.endTime}). Por favor, selecione outro horário.`
        );
        setCurrentStep(2);
        setIsSubmitting(false);
        return;
      }

      // 2. Save/Update Customer record
      const customerPayload: CustomerData = {
        fullName: fullName.trim(),
        cpf: cpf.trim(),
        birthDate: birthDate.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim(),
        fullAddress: fullAddress.trim(),
        photoBase64: photoBase64,
      };

      const customerId = await saveOrUpdateClient(customerPayload);

      // 3. Generate sequential code
      const reservationCode = await generateNextReservationCode();

      // 4. Create reservation
      const newReservation: Omit<Reservation, 'id'> = {
        code: reservationCode,
        bikeId: selectedBike.id,
        bikeSnapshot: {
          code: selectedBike.code,
          name: selectedBike.name,
          model: selectedBike.model,
          color: selectedBike.color,
          photoUrl: selectedBike.photoUrl,
        },
        customerId,
        customerSnapshot: customerPayload,
        date: selectedDate,
        startTime: selectedStartTime,
        endTime: calculatedEndTime,
        durationHours: selectedPlan.durationHours,
        totalPrice: selectedPlan.price,
        pixKey: settings.pixKey,
        status: 'aguardando_pagamento',
        termAgreedOnline: true,
        termAgreedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const docId = await createReservation(newReservation);
      const createdWithId: Reservation = {
        ...newReservation,
        id: docId,
      };

      // Generate QR Code data url
      try {
        const qr = await QRCode.toDataURL(reservationCode, {
          margin: 1,
          width: 180,
          color: { dark: '#000000', light: '#ffffff' },
        });
        setQrCodeUrl(qr);
      } catch (err) {
        console.warn(err);
      }

      setCreatedReservation(createdWithId);
      setCurrentStep(5);
      onFinished(createdWithId);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao processar reserva. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(settings.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  const copyReservationCode = () => {
    if (createdReservation) {
      navigator.clipboard.writeText(createdReservation.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const openWhatsAppWithProof = () => {
    if (!createdReservation) return;
    const url = getWhatsAppReservationUrl(createdReservation, settings.whatsappDisplay);
    window.open(url, '_blank');
  };

  const openWhatsAppToMySelf = () => {
    if (!createdReservation) return;
    const url = getWhatsAppClientSelfUrl(createdReservation);
    window.open(url, '_blank');
  };

  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('O arquivo do comprovante deve ter no máximo 5MB.');
      return;
    }

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPaymentProofBase64(base64);

      if (createdReservation) {
        try {
          await updateReservationStatus(createdReservation.id, 'aguardando_pagamento', {
            paymentProofBase64: base64,
            paymentProofUploadedAt: Date.now(),
          });
          setCreatedReservation((prev) =>
            prev ? { ...prev, paymentProofBase64: base64, paymentProofUploadedAt: Date.now() } : null
          );
          setProofSavedSuccess(true);
          setTimeout(() => setProofSavedSuccess(false), 4000);
        } catch (err) {
          console.error('Erro ao salvar comprovante:', err);
        }
      }
      setIsUploadingProof(false);
    };
    reader.readAsDataURL(file);
  };

  const stepsList = [
    { num: 1, label: 'Bike' },
    { num: 2, label: 'Horário' },
    { num: 3, label: 'Cadastro' },
    { num: 4, label: 'Resumo' },
    { num: 5, label: 'Pagamento' },
    { num: 6, label: 'Confirmação' },
  ];

  return (
    <div className="min-h-screen bg-black text-white py-6 px-4 sm:px-6 pb-24 sm:pb-28">
      <div className="max-w-2xl mx-auto">
        {/* Navigation / Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <button
              id="btn-booking-back"
              onClick={() => {
                if (currentStep > 1 && currentStep <= 4) {
                  setCurrentStep((prev) => (prev - 1) as Step);
                } else {
                  onCancel();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{currentStep === 1 || currentStep >= 5 ? 'Voltar ao Início' : 'Voltar Etapa'}</span>
            </button>

            <span className="text-xs font-bold text-amber-400">
              Etapa {currentStep} de 6
            </span>
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-6 gap-1.5">
            {stepsList.map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <div key={s.num} className="flex flex-col items-center">
                  <div
                    className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-amber-400'
                        : isPast
                        ? 'bg-amber-600'
                        : 'bg-zinc-800'
                    }`}
                  />
                  <span
                    className={`text-[10px] mt-1 hidden sm:block ${
                      isActive ? 'text-amber-400 font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= STEP 1: BIKE & PLAN ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                1. Escolha sua Bike e o Plano
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Selecione a bicicleta desejada e quanto tempo quer pedalar.
              </p>
            </div>

            {/* Bike Grid Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Bicicletas Disponíveis (Clique para escolher a sua):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bikes.map((bike) => {
                  const isAvailable = bike.status === 'available';
                  const isSelected = selectedBike?.id === bike.id;
                  return (
                    <div
                      key={bike.id}
                      id={`booking-select-bike-${bike.code.toLowerCase()}`}
                      onClick={() => isAvailable && setSelectedBike(bike)}
                      className={`relative rounded-2xl p-3.5 border-2 transition-all cursor-pointer flex gap-3.5 ${
                        !isAvailable
                          ? 'opacity-40 bg-zinc-950 border-zinc-800 cursor-not-allowed'
                          : isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                          : 'bg-zinc-900/90 border-zinc-800 hover:border-amber-500/50'
                      }`}
                    >
                      <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-800">
                        <img
                          src={bike.photoUrl}
                          alt={bike.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-center"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-amber-400">
                          {bike.code}
                        </span>
                      </div>
                      <div className="flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                              {bike.color}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-black text-xs font-black px-2 py-0.5 rounded-full shadow">
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> ESCOLHIDA
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-white text-base leading-snug mt-0.5">
                            {bike.name}
                          </h4>
                          <span className="text-xs text-zinc-300 font-medium">
                            {bike.model}
                          </span>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-400">
                            <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">Freios a disco</span>
                            <span className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">Câmbio suave</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-400 font-bold mt-1">
                          {isAvailable ? '🟢 Pronta para pedalar' : '🔴 Em Manutenção'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Plan Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Tempo de Aluguel:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {settings.plans.map((plan) => {
                  const isPlanSelected = selectedPlan.id === plan.id;
                  return (
                    <div
                      key={plan.id}
                      id={`booking-select-plan-${plan.id}`}
                      onClick={() => setSelectedPlan(plan)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isPlanSelected
                          ? 'bg-amber-500 text-black border-amber-400 shadow-md font-bold'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-black uppercase">{plan.label}</div>
                      <div
                        className={`text-lg font-black mt-1 ${
                          isPlanSelected ? 'text-black' : 'text-amber-400'
                        }`}
                      >
                        {plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next Button */}
            <div className="pt-4">
              <button
                id="btn-step1-next"
                disabled={!selectedBike}
                onClick={() => setCurrentStep(2)}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                <span>Avançar para Escolha de Horário</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: DATE & HORÁRIO ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                2. Escolha Data e Horário
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                A bike ficará reservada exatamente pelo período contratado ({selectedPlan.durationHours}h).
              </p>
            </div>

            {/* Selected Bike Brief */}
            {selectedBike && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedBike.photoUrl}
                    alt={selectedBike.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-16 rounded-lg object-cover bg-black border border-zinc-800"
                  />
                  <div>
                    <span className="text-[10px] font-mono font-bold text-amber-400">{selectedBike.code}</span>
                    <h4 className="font-bold text-white text-sm">{selectedBike.name}</h4>
                    <span className="text-xs text-zinc-400">{selectedPlan.label} ({selectedPlan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</span>
                  </div>
                </div>
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-amber-400 hover:underline font-bold bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-700"
                >
                  Trocar Bike
                </button>
              </div>
            )}

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-400" />
                Data da Reserva:
              </label>
              <input
                id="input-booking-date"
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-amber-400 text-sm"
              />
            </div>

            {/* Conflict Error Notice */}
            {conflictError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{conflictError}</span>
              </div>
            )}

            {/* Time Slot Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Horários de Retirada Disponíveis:
                </label>
                <span className="text-[11px] text-zinc-400">
                  {settings.openingTime} às {settings.closingTime}
                </span>
              </div>

              {loadingSlots ? (
                <div className="py-6 text-center text-xs text-zinc-400 animate-pulse">
                  Verificando disponibilidade da bike...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {getSlots().map((slot) => {
                    const isSelected = selectedStartTime === slot.time;
                    return (
                      <button
                        key={slot.time}
                        id={`btn-slot-${slot.time.replace(':', '-')}`}
                        disabled={!slot.available}
                        onClick={() => setSelectedStartTime(slot.time)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                          !slot.available
                            ? 'bg-zinc-950/70 border-zinc-900 text-zinc-600 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md ring-2 ring-amber-500/40'
                            : 'bg-zinc-900 border-zinc-800 hover:border-amber-500/50 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">{slot.time}</span>
                          <span
                            className={`w-2 h-2 rounded-full ${
                              slot.available ? 'bg-emerald-400' : 'bg-rose-500'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-[10px] mt-1 ${
                            isSelected
                              ? 'text-zinc-900 font-semibold'
                              : slot.available
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {slot.available ? '🟢 DISPONÍVEL' : '🔴 INDISPONÍVEL'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calculated Interval Preview */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400">Horário Previsto de Uso:</span>
                <div className="text-amber-300 font-bold text-sm mt-0.5">
                  {selectedStartTime} → {calculatedEndTime} ({selectedPlan.durationHours} horas)
                </div>
              </div>
              <div className="text-right">
                <span className="text-zinc-400">Devolução:</span>
                <div className="text-white font-bold">{calculatedEndTime}</div>
              </div>
            </div>

            {/* Next Button */}
            <div className="pt-2">
              <button
                id="btn-step2-next"
                onClick={validateStep2}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-amber-500/20"
              >
                <span>Avançar para Cadastro do Cliente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CUSTOMER REGISTRATION ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                3. Cadastro do Cliente
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Identificação segura para o Termo de Compromisso e Retirada.
              </p>
            </div>

            {clientFoundMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{clientFoundMessage}</span>
              </div>
            )}

            <div className="space-y-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
              {/* CPF first for auto-fill */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  CPF <span className="text-amber-400">*</span> (digite para preencher automaticamente)
                </label>
                <div className="relative">
                  <input
                    id="input-customer-cpf"
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                  {searchingClient && (
                    <span className="absolute right-3 top-3.5 text-xs text-amber-400 animate-spin">
                      ⏳
                    </span>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Nome Completo <span className="text-amber-400">*</span>
                </label>
                <input
                  id="input-customer-name"
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* WhatsApp & Birthdate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    WhatsApp <span className="text-amber-400">*</span>
                  </label>
                  <input
                    id="input-customer-whatsapp"
                    type="tel"
                    required
                    placeholder="(92) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    id="input-customer-birthdate"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  E-mail
                </label>
                <input
                  id="input-customer-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Endereço Completo <span className="text-amber-400">*</span>
                </label>
                <input
                  id="input-customer-address"
                  type="text"
                  required
                  placeholder="Rua, número, bairro, cidade (ou pousada/hotel)"
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Photo Upload / Camera */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                  Foto do Cliente <span className="text-amber-400">*</span> (Exigida para conferência na retirada)
                </label>

                {/* Camera View */}
                {isCameraActive && (
                  <div className="space-y-3 mb-3">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-w-sm mx-auto border border-amber-500/40">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <button
                      id="btn-capture-photo-now"
                      onClick={capturePhoto}
                      className="w-full py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs uppercase"
                    >
                      📸 Tirar Foto Agora
                    </button>
                  </div>
                )}

                {/* Preview or Controls */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {photoBase64 ? (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-amber-500 flex-shrink-0">
                      <img src={photoBase64} alt="Foto do Cliente" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setPhotoBase64('')}
                        className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[9px] font-bold py-0.5 text-center"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 flex-shrink-0">
                      <User className="w-8 h-8 opacity-40" />
                      <span className="text-[10px] mt-1">Sem foto</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 w-full">
                    <button
                      type="button"
                      id="btn-open-camera"
                      onClick={startCamera}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tirar com Câmera</span>
                    </button>

                    <label
                      id="label-upload-gallery"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>Escolher da Galeria</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div>
              <button
                id="btn-step3-next"
                onClick={validateStep3}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-amber-500/20"
              >
                <span>Conferir Resumo da Reserva</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: RESUMO & TERMOS ================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                4. Confira sua Reserva
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Revise com atenção todos os dados antes de finalizar.
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              {/* Header with Photo & Bike */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  {photoBase64 && (
                    <img
                      src={photoBase64}
                      alt={fullName}
                      className="w-12 h-12 rounded-full object-cover border border-amber-500"
                    />
                  )}
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Cliente</span>
                    <h4 className="font-bold text-white text-base leading-tight">{fullName}</h4>
                    <span className="text-xs text-zinc-400">CPF: {cpf}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Contato</span>
                  <div className="text-xs font-semibold text-emerald-400">{whatsapp}</div>
                </div>
              </div>

              {/* Bike & Plan Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[10px] block">Bike Escolhida</span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {selectedBike?.name}
                  </span>
                  <span className="text-[11px] text-amber-400">
                    {selectedBike?.model} ({selectedBike?.color})
                  </span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[10px] block">Data do Passeio</span>
                  <span className="font-bold text-white text-sm block mt-0.5">
                    {selectedDate.split('-').reverse().join('/')}
                  </span>
                  <span className="text-[11px] text-zinc-400">Parintins / AM</span>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                  <span className="text-zinc-500 uppercase text-[10px] block">Período de Uso</span>
                  <span className="font-bold text-amber-400 text-sm block mt-0.5">
                    {selectedStartTime} → {calculatedEndTime}
                  </span>
                  <span className="text-[11px] text-zinc-400">{selectedPlan.durationHours} horas</span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider block">Valor Total do Aluguel</span>
                  <span className="text-2xl font-black text-white">
                    {selectedPlan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-emerald-400 font-semibold block">Pagamento via PIX</span>
                  <span className="text-[10px] text-zinc-400">Chave exibida na próxima etapa</span>
                </div>
              </div>

              {/* Legal Terms Box */}
              <div className="pt-2">
                <div className="border border-zinc-800 rounded-xl p-3 bg-black/60 max-h-36 overflow-y-auto text-[11px] text-zinc-400 space-y-2 leading-relaxed">
                  <div className="font-bold text-zinc-200">
                    Termo de Compromisso e Responsabilidade Civil - PEDALAÊ
                  </div>
                  <p>{settings.termText}</p>
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      id="checkbox-terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-xs text-zinc-300">
                      Li e estou ciente do <strong className="text-amber-400">Termo de Compromisso e Responsabilidade</strong>. Declaro que realizarei a assinatura física no momento da retirada.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      id="checkbox-lgpd"
                      type="checkbox"
                      checked={lgpdAccepted}
                      onChange={(e) => setLgpdAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-[11px] text-zinc-400">
                      Concordo com o armazenamento dos meus dados para fins exclusivos desta locação e futuros atendimentos no PEDALAÊ (LGPD).
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Confirm Button */}
            <div>
              <button
                id="btn-confirm-booking-final"
                disabled={!termsAccepted || isSubmitting}
                onClick={handleFinalSubmit}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all shadow-xl shadow-amber-500/25"
              >
                {isSubmitting ? (
                  <span>Processando Reserva...</span>
                ) : (
                  <>
                    <span>Confirmar Reserva e Gerar PIX</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: PAGAMENTO PIX ================= */}
        {currentStep === 5 && createdReservation && (
          <div className="space-y-6">
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                🟡 Aguardando Pagamento
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Faça o Pagamento via PIX
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Copie a chave PIX abaixo e envie o comprovante pelo WhatsApp.
              </p>
            </div>

            {/* Pix Payment Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 text-center">
              <div>
                <span className="text-xs text-zinc-400 uppercase tracking-wider">
                  Valor a Pagar:
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 mt-1">
                  {createdReservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>

              {/* PIX Key Box */}
              <div className="bg-black border border-zinc-800 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Chave PIX Oficial ({settings.pixType}):</span>
                  <span className="text-amber-400 font-mono font-bold">PEDALAÊ</span>
                </div>
                <div className="font-mono text-sm sm:text-base text-white break-all bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-semibold select-all">
                  {settings.pixKey}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Beneficiário: {settings.pixBeneficiary || 'PEDALAÊ LOCAÇÃO DE BIKES'}
                </div>

                <button
                  id="btn-copy-pix-key"
                  onClick={copyPixKey}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copiedPix ? 'Chave Copiada com Sucesso!' : 'COPIAR CHAVE PIX'}</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-zinc-300 text-left space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Instruções para Confirmação:
                </div>
                <p>1. Faça a transferência PIX no aplicativo do seu banco.</p>
                <p>2. Envie o comprovante ou anexe-o aqui no sistema.</p>
                <p>3. Você pode enviar para o WhatsApp oficial ou receber todas as informações no seu próprio WhatsApp!</p>
              </div>

              {/* Upload Comprovante (Opcional ou Direto) */}
              <div className="bg-black border border-zinc-800 rounded-xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                    Anexar Comprovante do PIX (Opcional):
                  </span>
                  {paymentProofBase64 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> Anexado
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 items-center">
                  <label
                    id="btn-upload-pix-proof"
                    className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700 hover:border-amber-400/50 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>{paymentProofBase64 ? 'Trocar Comprovante' : 'Escolher Arquivo / Foto do Comprovante'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleProofFileUpload}
                      className="hidden"
                    />
                  </label>

                  {paymentProofBase64 && (
                    <a
                      href={paymentProofBase64}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:underline font-semibold whitespace-nowrap"
                    >
                      Visualizar
                    </a>
                  )}
                </div>

                {proofSavedSuccess && (
                  <p className="text-[11px] text-emerald-400 font-medium">
                    ✓ Comprovante anexado à reserva com sucesso!
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  id="btn-open-whatsapp-pix"
                  onClick={openWhatsAppWithProof}
                  className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>ENVIAR COMPROVANTE PARA O PEDALAÊ</span>
                </button>

                <button
                  id="btn-send-to-my-whatsapp"
                  onClick={openWhatsAppToMySelf}
                  className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border-2 border-emerald-500/50 hover:border-emerald-400 text-emerald-400 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer shadow-md"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>ENVIAR RESUMO PARA O MEU WHATSAPP</span>
                </button>

                <button
                  id="btn-proceed-to-confirmation"
                  onClick={() => setCurrentStep(6)}
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Ver Detalhes e Comprovante da Reserva
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 6: CONFIRMAÇÃO & QR CODE ================= */}
        {currentStep === 6 && createdReservation && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-500 text-black rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/30">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                🎉 RESERVA REALIZADA!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Guarde o código da sua reserva ou apresente o QR Code na retirada.
              </p>
            </div>

            {/* Reservation Voucher Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
              {/* Code Banner */}
              <div className="bg-black border border-amber-500/40 rounded-xl p-4 text-center">
                <span className="text-xs text-zinc-400 uppercase tracking-widest block">
                  Código da Reserva
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-wider">
                  {createdReservation.code}
                </span>
              </div>

              {/* QR Code Presentation */}
              {qrCodeUrl && (
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 rounded-xl border border-zinc-800/80">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code da reserva ${createdReservation.code}`}
                    className="w-40 h-40 bg-white p-2 rounded-xl shadow-md"
                  />
                  <span className="text-[11px] text-zinc-400 mt-2">
                    Apresente este QR Code no momento da retirada
                  </span>
                </div>
              )}

              {/* Key Details */}
              <div className="space-y-2 text-xs border-y border-zinc-800 py-3">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-bold text-white">{createdReservation.customerSnapshot.fullName}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Bike:</span>
                  <span className="font-bold text-white">
                    {createdReservation.bikeSnapshot.name} ({createdReservation.bikeSnapshot.code})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Data:</span>
                  <span className="font-bold text-white">
                    {createdReservation.date.split('-').reverse().join('/')}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Horário:</span>
                  <span className="font-bold text-amber-400">
                    {createdReservation.startTime} às {createdReservation.endTime} ({createdReservation.durationHours}h)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Valor Total:</span>
                  <span className="font-bold text-white">
                    {createdReservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-400">Status:</span>
                  <span className="font-bold text-amber-400">🟡 AGUARDANDO PAGAMENTO</span>
                </div>
              </div>

              {/* Actions Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  id="btn-copy-booking-details"
                  onClick={copyReservationCode}
                  className="py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copiedCode ? 'Código Copiado!' : 'COPIAR RESERVA'}</span>
                </button>

                <button
                  id="btn-download-pdf-client"
                  onClick={() => generateReservationPDF(createdReservation, settings)}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
                >
                  <FileText className="w-4 h-4 text-black" />
                  <span>BAIXAR TERMO EM PDF</span>
                </button>
              </div>

              <div className="space-y-2.5">
                <button
                  id="btn-send-to-my-whatsapp-step6"
                  onClick={openWhatsAppToMySelf}
                  className="w-full py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/50 hover:border-emerald-400 text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>ENVIAR TUDO PARA O MEU WHATSAPP</span>
                </button>

                <button
                  id="btn-open-whatsapp-client-end"
                  onClick={openWhatsAppWithProof}
                  className="w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>ABRIR WHATSAPP OFICIAL (PEDALAÊ)</span>
                </button>
              </div>

              <button
                id="btn-finish-and-back-home"
                onClick={onCancel}
                className="w-full text-center text-xs text-zinc-400 hover:text-white py-2"
              >
                ← Voltar para a Página Inicial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
