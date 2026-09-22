import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bike, 
  CustomerData, 
  Reservation, 
  ReservationStatus, 
  SystemSettings,
  RentalPlan
} from '../types';
import { 
  createBike, 
  updateBike, 
  deleteBike, 
  updateSettings, 
  updateReservationStatus,
  deleteReservation
} from '../lib/dbService';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  Bike as BikeIcon, 
  Users, 
  DollarSign, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  Search, 
  Filter, 
  Check, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  LogOut, 
  Plus, 
  Edit2, 
  Trash2, 
  Camera, 
  QrCode, 
  Download, 
  Eye, 
  EyeOff,
  Send,
  Lock,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  UserCheck,
  RefreshCw,
  ChevronRight,
  MapPin,
  PenTool
} from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { generateReservationPDF } from '../lib/pdfGenerator';
import { OFFICIAL_WHATSAPP_LINK, getWhatsAppSendTermToClientUrl } from '../lib/whatsapp';

interface AdminPanelProps {
  settings: SystemSettings;
  bikes: Bike[];
  reservations: Reservation[];
  clients: CustomerData[];
  onClose: () => void;
}

type AdminTab = 
  | 'dashboard'
  | 'reservas'
  | 'calendario'
  | 'bikes'
  | 'clientes'
  | 'financeiro'
  | 'documentos'
  | 'relatorios'
  | 'configuracoes';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  settings,
  bikes,
  reservations,
  clients,
  onClose,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('pedalae_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loggedAdminUser, setLoggedAdminUser] = useState<User | null>(null);

  // Dedicated Password & Access Management in Settings
  const [editAdminEmail, setEditAdminEmail] = useState(settings.adminEmail || 'sergiobruce19@gmail.com');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Navigation tab with localStorage persistence
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    try {
      const savedTab = localStorage.getItem('pedalae_admin_tab') as AdminTab;
      const validTabs: AdminTab[] = [
        'dashboard',
        'reservas',
        'calendario',
        'bikes',
        'clientes',
        'financeiro',
        'documentos',
        'relatorios',
        'configuracoes',
      ];
      if (savedTab && validTabs.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
    return 'dashboard';
  });

  const handleSetActiveTab = (tab: AdminTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('pedalae_admin_tab', tab);
    } catch {}
  };

  // Selected reservation for check-in / check-out modal
  const [selectedResForDetail, setSelectedResForDetail] = useState<Reservation | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemainingSeconds(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setAuthError('');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  // Sync Google Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedAdminUser(user);
      if (user && user.email) {
        const allowedEmail = (settings.adminEmail || 'sergiobruce19@gmail.com').toLowerCase();
        if (user.email.toLowerCase() === allowedEmail) {
          setIsAuthenticated(true);
          sessionStorage.setItem('pedalae_admin_auth', 'true');
        }
      }
    });
    return () => unsub();
  }, [settings.adminEmail]);

  // Check-in modal form
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinOperator, setCheckinOperator] = useState('Admin Pedalaê');
  const [checkinBikeOk, setCheckinBikeOk] = useState(true);
  const [checkinNotes, setCheckinNotes] = useState('');
  const [checkinTermSigned, setCheckinTermSigned] = useState(true);

  // Check-out modal form
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutOperator, setCheckoutOperator] = useState('Admin Pedalaê');
  const [checkoutCondition, setCheckoutCondition] = useState<'normal' | 'avaria' | 'problema_mecanico' | 'outros'>('normal');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutPhoto, setCheckoutPhoto] = useState<string>('');

  // Bike Management Modal
  const [isBikeModalOpen, setIsBikeModalOpen] = useState(false);
  const [editingBike, setEditingBike] = useState<Bike | null>(null);
  const [bikeCode, setBikeCode] = useState('');
  const [bikeName, setBikeName] = useState('');
  const [bikeModel, setBikeModel] = useState('');
  const [bikeColor, setBikeColor] = useState('');
  const [bikeDescription, setBikeDescription] = useState('');
  const [bikePhotoUrl, setBikePhotoUrl] = useState('');
  const [bikeStatus, setBikeStatus] = useState<'available' | 'maintenance' | 'inactive'>('available');
  const [bikeNotes, setBikeNotes] = useState('');

  // Settings Form State
  const [editCompanyName, setEditCompanyName] = useState(settings.companyName);
  const [editSlogan, setEditSlogan] = useState(settings.slogan);
  const [editAddress, setEditAddress] = useState(settings.address);
  const [editWhatsappDisplay, setEditWhatsappDisplay] = useState(settings.whatsappDisplay);
  const [editPixKey, setEditPixKey] = useState(settings.pixKey);
  const [editOpeningTime, setEditOpeningTime] = useState(settings.openingTime);
  const [editClosingTime, setEditClosingTime] = useState(settings.closingTime);
  const [editTermText, setEditTermText] = useState(settings.termText);
  const [editPlans, setEditPlans] = useState<RentalPlan[]>(settings.plans);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setEditCompanyName(settings.companyName);
    setEditSlogan(settings.slogan);
    setEditAddress(settings.address);
    setEditWhatsappDisplay(settings.whatsappDisplay);
    setEditPixKey(settings.pixKey);
    setEditOpeningTime(settings.openingTime);
    setEditClosingTime(settings.closingTime);
    setEditTermText(settings.termText);
    setEditPlans(settings.plans);
  }, [settings]);

  // Filters
  const [reservationSearch, setReservationSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Quick QR Code Scanner input
  const [qrScanInput, setQrScanInput] = useState('');

  // Current date string for filtering "Today"
  const todayStr = new Date().toISOString().split('T')[0];

  // Handle Master Password Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
      setAuthError(`Acesso bloqueado temporariamente por segurança. Aguarde ${lockoutRemainingSeconds}s.`);
      return;
    }

    const validPass = settings.adminPasswordHash || 'admin123';
    if (passwordInput.trim() === validPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('pedalae_admin_auth', 'true');
      setAuthError('');
      setPasswordInput('');
      setFailedAttempts(0);
      setLockoutUntil(null);
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      if (newAttempts >= 5) {
        const lockTime = Date.now() + 60000;
        setLockoutUntil(lockTime);
        setLockoutRemainingSeconds(60);
        setAuthError('Bloqueio de segurança ativado após 5 tentativas incorretas. Aguarde 60 segundos.');
      } else {
        const remaining = 5 - newAttempts;
        setAuthError(`Senha incorreta. Acesso restrito exclusivamente ao administrador do PEDALAÊ. (${remaining} ${remaining === 1 ? 'tentativa restante' : 'tentativas restantes'})`);
      }
    }
  };

  // Handle Google Admin OAuth Login
  const handleGoogleAdminLogin = async () => {
    setIsGoogleLoading(true);
    setAuthError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const loggedEmail = result.user.email?.toLowerCase() || '';
      const allowedEmail = (settings.adminEmail || 'sergiobruce19@gmail.com').toLowerCase();

      if (loggedEmail === allowedEmail) {
        setIsAuthenticated(true);
        sessionStorage.setItem('pedalae_admin_auth', 'true');
        setAuthError('');
        setFailedAttempts(0);
        setLockoutUntil(null);
      } else {
        await signOut(auth);
        setAuthError(`Acesso Negado: A conta Google "${result.user.email}" não possui permissão de Administrador. Apenas ${allowedEmail} tem acesso.`);
      }
    } catch (err: any) {
      console.warn('Google sign-in:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('A janela de login do Google foi bloqueada pelo navegador. Permita popups para este site ou entre usando sua senha.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setAuthError('Não foi possível autenticar com o Google. Utilize a sua Senha Mestre de administrador.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('pedalae_admin_auth');
    try {
      await signOut(auth);
    } catch {}
  };

  // Dedicated Password Change Handler
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeError('');
    setPasswordChangeSuccess('');

    if (!newAdminPassword || newAdminPassword.trim().length < 4) {
      setPasswordChangeError('A nova senha deve conter no mínimo 4 caracteres.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordChangeError('A confirmação de senha não confere. Digite a mesma senha nos dois campos.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateSettings({
        adminPasswordHash: newAdminPassword.trim(),
        adminEmail: editAdminEmail.trim() || 'sergiobruce19@gmail.com',
      });
      setPasswordChangeSuccess('✅ Senha de Administrador atualizada com sucesso no banco de dados! Apenas você com esta senha ou sua conta Google autorizada tem acesso.');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setPasswordChangeError('Erro ao salvar no banco de dados: ' + err.message);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Status Colors & Badges
  const getStatusBadge = (status: ReservationStatus) => {
    switch (status) {
      case 'aguardando_pagamento':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Aguardando Pagamento
          </span>
        );
      case 'pagamento_confirmado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Pagamento Confirmado
          </span>
        );
      case 'aguardando_retirada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Aguardando Retirada
          </span>
        );
      case 'bike_retirada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Bike Retirada
          </span>
        );
      case 'bike_em_uso':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            Bike em Uso
          </span>
        );
      case 'devolvida_finalizada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Check className="w-3 h-3 text-emerald-400" />
            Devolvida / Finalizada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Cancelada
          </span>
        );
      case 'cancelamento_solicitado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-950/60 text-red-300 border border-red-500/40">
            Cancelamento Solicitado
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  // Overdue check
  const isOverdue = (res: Reservation) => {
    if (res.status !== 'bike_retirada' && res.status !== 'bike_em_uso') return false;
    const now = new Date();
    const [year, month, day] = res.date.split('-').map(Number);
    const [endHour, endMin] = res.endTime.split(':').map(Number);
    const endDateTime = new Date(year, month - 1, day, endHour, endMin);
    return now.getTime() > endDateTime.getTime();
  };

  // Dashboard Metrics
  const todayReservations = reservations.filter((r) => r.date === todayStr);
  const availableBikesCount = bikes.filter((b) => b.status === 'available').length;
  const inUseBikesCount = reservations.filter(
    (r) => r.status === 'bike_retirada' || r.status === 'bike_em_uso'
  ).length;
  const waitingPaymentCount = reservations.filter(
    (r) => r.status === 'aguardando_pagamento'
  ).length;
  const confirmedTodayCount = todayReservations.filter(
    (r) => r.status !== 'cancelada' && r.status !== 'aguardando_pagamento'
  ).length;
  const finishedTodayCount = todayReservations.filter(
    (r) => r.status === 'devolvida_finalizada'
  ).length;
  const revenueToday = todayReservations
    .filter((r) => r.status !== 'cancelada' && r.paymentConfirmedAt)
    .reduce((acc, curr) => acc + curr.totalPrice, 0);

  // Overdue reservations list
  const overdueReservations = reservations.filter(isOverdue);

  // Filtered reservations list
  const filteredReservations = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    if (reservationSearch) {
      const q = reservationSearch.toLowerCase();
      const codeMatch = r.code.toLowerCase().includes(q);
      const nameMatch = r.customerSnapshot.fullName.toLowerCase().includes(q);
      const cpfMatch = r.customerSnapshot.cpf.includes(q);
      const bikeMatch = r.bikeSnapshot.name.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !cpfMatch && !bikeMatch) return false;
    }
    return true;
  });

  // Action: Confirm Payment
  const handleConfirmPayment = async (reservation: Reservation) => {
    if (confirm(`Confirmar recebimento do pagamento da reserva ${reservation.code}?`)) {
      const now = Date.now();
      await updateReservationStatus(reservation.id, 'pagamento_confirmado', {
        paymentConfirmedAt: now,
        paymentConfirmedBy: 'Sergio de Sousa Bruce (Administrador)',
      });
      // Refresh current detail modal if open
      setSelectedResForDetail((prev) =>
        prev && prev.id === reservation.id
          ? { ...prev, status: 'pagamento_confirmado', paymentConfirmedAt: now, paymentConfirmedBy: 'Sergio de Sousa Bruce (Administrador)' }
          : prev
      );
    }
  };

  // Action: Open Checkin Modal
  const openCheckin = (res: Reservation) => {
    setSelectedResForDetail(res);
    setCheckinOperator('Administrador Pedalaê');
    setCheckinBikeOk(true);
    setCheckinNotes('');
    setCheckinTermSigned(true);
    setIsCheckinModalOpen(true);
  };

  const handleConfirmCheckin = async () => {
    if (!selectedResForDetail) return;
    await updateReservationStatus(selectedResForDetail.id, 'bike_em_uso', {
      checkin: {
        checkedInAt: Date.now(),
        checkedInBy: checkinOperator,
        bikeConditionOk: checkinBikeOk,
        notes: checkinNotes,
        termAgreedPhysically: checkinTermSigned,
      },
    });
    setIsCheckinModalOpen(false);
    setSelectedResForDetail(null);
  };

  // Action: Open Checkout Modal
  const openCheckout = (res: Reservation) => {
    setSelectedResForDetail(res);
    setCheckoutOperator('Administrador Pedalaê');
    setCheckoutCondition('normal');
    setCheckoutNotes('');
    setCheckoutPhoto('');
    setIsCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedResForDetail) return;
    await updateReservationStatus(selectedResForDetail.id, 'devolvida_finalizada', {
      checkout: {
        checkedOutAt: Date.now(),
        checkedOutBy: checkoutOperator,
        conditionStatus: checkoutCondition,
        notes: checkoutNotes,
        photoUrl: checkoutPhoto,
      },
    });
    setIsCheckoutModalOpen(false);
    setSelectedResForDetail(null);
  };

  // Action: Cancel Reservation
  const handleCancelReservation = async (reservation: Reservation) => {
    const reason = prompt('Informe o motivo do cancelamento da reserva:');
    if (reason !== null) {
      await updateReservationStatus(reservation.id, 'cancelada', {
        cancellationReason: reason || 'Cancelado pela administração',
        cancellationReviewedAt: Date.now(),
        cancellationReviewedBy: 'Administrador Pedalaê',
      });
    }
  };

  // Action: Delete Reservation Permanently
  const [resToDelete, setResToDelete] = useState<Reservation | null>(null);
  const [isDeletingRes, setIsDeletingRes] = useState<boolean>(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);
  const [pdfConfirmedToast, setPdfConfirmedToast] = useState<string | null>(null);

  // Automatic confirmation of payment when admin marks paid and downloads PDF
  const handleDownloadPDFAndMarkPaid = async (res: Reservation) => {
    try {
      // 1. If not yet paid, mark as paid first
      if (res.status === 'aguardando_pagamento') {
        const now = Date.now();
        await updateReservationStatus(res.id, 'pagamento_confirmado', {
          paymentConfirmedAt: now,
          paymentConfirmedBy: 'Sergio de Sousa Bruce (Administrador)',
        });

        const updatedRes: Reservation = {
          ...res,
          status: 'pagamento_confirmado',
          paymentConfirmedAt: now,
          paymentConfirmedBy: 'Sergio de Sousa Bruce (Administrador)',
        };

        if (selectedResForDetail?.id === res.id) {
          setSelectedResForDetail(updatedRes);
        }

        // Generate PDF with updated paid status
        await generateReservationPDF(updatedRes, settings);

        setPdfConfirmedToast(`Pagamento da reserva ${res.code} confirmado! PDF com sua assinatura (Sergio de Sousa Bruce) e foto de ${res.customerSnapshot.fullName} baixado.`);
        setTimeout(() => setPdfConfirmedToast(null), 6000);
      } else {
        await generateReservationPDF(res, settings);
        setPdfConfirmedToast(`PDF oficial da reserva ${res.code} baixado com sucesso!`);
        setTimeout(() => setPdfConfirmedToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Erro ao processar download do PDF e confirmação:', err);
    }
  };

  // Open WhatsApp directly to send PDF/Confirmation to client
  const handleSendPdfToClientWhatsApp = (res: Reservation) => {
    const url = getWhatsAppSendTermToClientUrl(res);
    window.open(url, '_blank');
  };

  const handleDeleteReservationConfirm = async () => {
    if (!resToDelete) return;
    setIsDeletingRes(true);
    try {
      await deleteReservation(resToDelete.id);
      setDeleteSuccessToast(`Reserva ${resToDelete.code} excluída permanentemente com sucesso!`);
      if (selectedResForDetail?.id === resToDelete.id) {
        setSelectedResForDetail(null);
      }
      setResToDelete(null);
      setTimeout(() => setDeleteSuccessToast(null), 4000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao excluir reserva do sistema.');
    } finally {
      setIsDeletingRes(false);
    }
  };

  // Bike CRUD
  const openAddBikeModal = () => {
    setEditingBike(null);
    const nextNum = bikes.length + 1;
    setBikeCode(`PED-${String(nextNum).padStart(3, '0')}`);
    setBikeName('');
    setBikeModel('Colli Aro 29');
    setBikeColor('');
    setBikeDescription('');
    setBikePhotoUrl('https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80');
    setBikeStatus('available');
    setBikeNotes('');
    setIsBikeModalOpen(true);
  };

  const openEditBikeModal = (bike: Bike) => {
    setEditingBike(bike);
    setBikeCode(bike.code);
    setBikeName(bike.name);
    setBikeModel(bike.model);
    setBikeColor(bike.color);
    setBikeDescription(bike.description);
    setBikePhotoUrl(bike.photoUrl);
    setBikeStatus(bike.status);
    setBikeNotes(bike.notes || '');
    setIsBikeModalOpen(true);
  };

  const handleSaveBike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bikeName || !bikeCode) {
      alert('Nome e Código são obrigatórios.');
      return;
    }

    if (editingBike) {
      await updateBike(editingBike.id, {
        code: bikeCode,
        name: bikeName,
        model: bikeModel,
        color: bikeColor,
        description: bikeDescription,
        photoUrl: bikePhotoUrl,
        status: bikeStatus,
        notes: bikeNotes,
      });
    } else {
      await createBike({
        code: bikeCode,
        name: bikeName,
        model: bikeModel,
        color: bikeColor,
        description: bikeDescription,
        photoUrl: bikePhotoUrl,
        status: bikeStatus,
        notes: bikeNotes,
        createdAt: Date.now(),
      });
    }
    setIsBikeModalOpen(false);
  };

  const handleDeleteBike = async (bike: Bike) => {
    if (confirm(`Tem certeza que deseja excluir a bike ${bike.name} (${bike.code})?`)) {
      await deleteBike(bike.id);
    }
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const cleanPhone = editWhatsappDisplay.replace(/\D/g, '');
      const waUrl = cleanPhone.length >= 10 ? `https://wa.me/55${cleanPhone}` : `https://wa.me/${cleanPhone}`;
      await updateSettings({
        companyName: editCompanyName,
        slogan: editSlogan,
        address: editAddress,
        whatsappDisplay: editWhatsappDisplay,
        whatsappOfficialUrl: waUrl,
        pixKey: editPixKey,
        openingTime: editOpeningTime,
        closingTime: editClosingTime,
        termText: editTermText,
        plans: editPlans,
        adminEmail: editAdminEmail.trim() || 'sergiobruce19@gmail.com',
      });
      alert('Configurações atualizadas com sucesso no Firebase!');
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  // Quick QR Scan Search
  const handleQuickQrSearch = () => {
    if (!qrScanInput) return;
    const clean = qrScanInput.trim().toUpperCase();
    const found = reservations.find((r) => r.code.toUpperCase() === clean);
    if (found) {
      setSelectedResForDetail(found);
    } else {
      alert(`Nenhuma reserva encontrada com o código ${clean}`);
    }
    setQrScanInput('');
  };

  // ---------------- LOGIN SCREEN (PROTECTED AUTHENTICATION) ----------------
  if (!isAuthenticated) {
    const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;
    const targetAdminEmail = settings.adminEmail || 'sergiobruce19@gmail.com';

    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-900 transition-colors"
            title="Fechar e voltar ao site público"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <img src="/logo.png" alt="PEDALAÊ" className="w-20 h-20 rounded-full border-2 border-amber-500 shadow-lg shadow-amber-500/20 object-cover" />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black p-1.5 rounded-full shadow">
                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3 h-3" />
              Área Administrativa Restrita
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">Painel de Controle</h2>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Acesso exclusivo para o proprietário: <span className="text-amber-400 font-semibold">{targetAdminEmail}</span>
            </p>
          </div>

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-4 p-4 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-3 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300">Acesso temporariamente suspenso</p>
                <p className="mt-0.5 text-zinc-300">
                  Por medidas de segurança contra invasão, aguarde <strong>{lockoutRemainingSeconds}s</strong> para tentar novamente.
                </p>
              </div>
            </div>
          )}

          {/* Primary Option: Google Authentication */}
          <div className="space-y-4">
            <button
              id="btn-admin-google-login"
              type="button"
              disabled={isLocked || isGoogleLoading}
              onClick={handleGoogleAdminLogin}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
            >
              {isGoogleLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-700" />
                  <span>Verificando Conta Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Entrar com Google do Administrador</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-zinc-800 w-full" />
              <span className="bg-zinc-950 px-3 text-[10px] uppercase font-bold text-zinc-500 tracking-wider flex-shrink-0">
                Ou acesse com sua Senha
              </span>
              <div className="border-t border-zinc-800 w-full" />
            </div>

            {/* Password Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Senha de Administrador</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Apenas proprietário</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    id="input-admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLocked}
                    placeholder="Digite sua senha de acesso"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                id="btn-admin-submit-login"
                type="submit"
                disabled={isLocked}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Entrar no Painel</span>
              </button>
            </form>
          </div>

          {/* Security Information Footer */}
          <div className="mt-6 pt-5 border-t border-zinc-900/80 text-center space-y-2">
            <p className="text-[11px] text-zinc-500 leading-relaxed flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Proteção com criptografia e controle de acesso restrito</span>
            </p>
            <div>
              <button
                onClick={onClose}
                className="text-xs text-zinc-500 hover:text-amber-400 transition-colors inline-flex items-center gap-1 font-medium"
              >
                ← Voltar para o Site Público
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- AUTHENTICATED ADMIN DASHBOARD ----------------
  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-zinc-950 border-r border-zinc-900 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-4 sm:p-5 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PEDALAÊ" className="w-10 h-10 rounded-full border border-amber-500" />
              <div>
                <h3 className="font-black text-white text-base">PEDALAÊ</h3>
                <span className="text-[10px] text-amber-400 block font-semibold">ADMINISTRAÇÃO</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="md:hidden text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick QR Search in Sidebar */}
          <div className="p-3 border-b border-zinc-900">
            <div className="flex items-center gap-1.5 bg-zinc-900 rounded-xl px-2.5 py-1.5 border border-zinc-800">
              <QrCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Buscar cód. PED-000001"
                value={qrScanInput}
                onChange={(e) => setQrScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickQrSearch()}
                className="bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none w-full"
              />
              <button
                onClick={handleQuickQrSearch}
                className="text-[10px] bg-amber-500 text-black font-bold px-2 py-1 rounded-md"
              >
                Ir
              </button>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'reservas', label: 'Reservas', icon: Clock },
              { id: 'calendario', label: 'Calendário', icon: CalendarIcon },
              { id: 'bikes', label: 'Bikes', icon: BikeIcon },
              { id: 'clientes', label: 'Clientes', icon: Users },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
              { id: 'documentos', label: 'Documentos', icon: FileText },
              { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
              { id: 'configuracoes', label: 'Configurações', icon: SettingsIcon },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`btn-nav-tab-${item.id}`}
                  onClick={() => handleSetActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & Identity */}
        <div className="p-3 border-t border-zinc-900 space-y-2">
          {/* Authenticated Admin Account Pill */}
          <div className="px-3 py-2 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Admin Conectado</span>
            </div>
            <p className="text-[11px] text-zinc-200 font-medium truncate mt-0.5">
              {loggedAdminUser?.email || settings.adminEmail || 'sergiobruce19@gmail.com'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Site Público</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-black">
        {/* Security Advisory Banner if default password is in use */}
        {(!settings.adminPasswordHash || settings.adminPasswordHash === 'admin123') && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-amber-300 text-sm">
                  Ação de Segurança Recomendada: Cadastre sua Senha Mestre Pessoal
                </h4>
                <p className="text-xs text-amber-200/80">
                  O painel está utilizando a senha inicial temporária. Para garantir que <strong>apenas você</strong> acesse os contratos, fotos de documentos e dados financeiros, cadastre uma senha exclusiva agora.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setActiveTab('configuracoes');
                setTimeout(() => {
                  const el = document.getElementById('section-admin-security');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl whitespace-nowrap cursor-pointer transition-all shadow-md shadow-amber-500/20"
            >
              Criar Minha Senha Agora
            </button>
          </div>
        )}

        {/* Overdue Alert Banner if any */}
        {overdueReservations.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/70 border-2 border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/40">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
              <div>
                <h4 className="font-black text-rose-300 text-sm">
                  ⚠️ ALERTA: {overdueReservations.length} {overdueReservations.length === 1 ? 'BIKE EM ATRASO' : 'BIKES EM ATRASO'}!
                </h4>
                <p className="text-xs text-rose-200/80">
                  O horário previsto de devolução foi ultrapassado. Verifique os dados com o cliente.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {overdueReservations.map((ov) => (
                <button
                  key={ov.id}
                  onClick={() => setSelectedResForDetail(ov)}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg"
                >
                  Ver {ov.code}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= 1. TAB: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">RESERVAS DE HOJE</h2>
                <p className="text-xs text-zinc-400">
                  Visão operacional em tempo real de Parintins/AM ({todayStr.split('-').reverse().join('/')})
                </p>
              </div>
              <button
                onClick={() => handleSetActiveTab('reservas')}
                className="bg-zinc-900 border border-zinc-800 hover:border-amber-500 text-xs font-bold text-zinc-300 px-3.5 py-2 rounded-xl self-start sm:self-auto"
              >
                Gerenciar Todas as Reservas →
              </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Bikes Disponíveis</span>
                  <BikeIcon className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                  🚲 {availableBikesCount}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Total de {bikes.length} bikes cadastradas
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Reservas Hoje</span>
                  <CalendarIcon className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-2">
                  📅 {todayReservations.length}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  {confirmedTodayCount} confirmadas
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Recebido Hoje</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
                  {revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Via pagamentos PIX confirmados
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Aguardando Pagamento</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">
                  ⏳ {waitingPaymentCount}
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Requer conferência de comprovante
                </span>
              </div>
            </div>

            {/* Today's Active Schedule */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Atendimentos de Hoje</h3>
                <span className="text-xs text-zinc-400">{todayReservations.length} agendamentos</span>
              </div>

              {todayReservations.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-sm">
                  Nenhuma reserva registrada para hoje ainda.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {todayReservations.map((res) => {
                    const overdue = isOverdue(res);
                    return (
                      <div
                        key={res.id}
                        className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          overdue ? 'bg-rose-500/10 p-3 rounded-xl' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {res.customerSnapshot.photoBase64 ? (
                            <img
                              src={res.customerSnapshot.photoBase64}
                              alt={res.customerSnapshot.fullName}
                              className="w-10 h-10 rounded-full object-cover border border-amber-500"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                              {res.customerSnapshot.fullName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {res.code}
                              </span>
                              <span className="text-sm font-bold text-white">
                                {res.customerSnapshot.fullName}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span>🚲 {res.bikeSnapshot.name} ({res.bikeSnapshot.code})</span>
                              <span>•</span>
                              <span className="text-amber-300 font-semibold">
                                {res.startTime} às {res.endTime}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {getStatusBadge(res.status)}

                          {res.status === 'aguardando_pagamento' && (
                            <button
                              onClick={() => handleConfirmPayment(res)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              Confirmar PIX
                            </button>
                          )}

                          {res.status === 'pagamento_confirmado' && (
                            <button
                              onClick={() => openCheckin(res)}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
                            >
                              Fazer Retirada
                            </button>
                          )}

                          {res.status === 'bike_em_uso' && (
                            <button
                              onClick={() => openCheckout(res)}
                              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                            >
                              Registrar Devolução
                            </button>
                          )}

                          <button
                            onClick={() => handleDownloadPDFAndMarkPaid(res)}
                            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                            title="Baixar Contrato PDF Assinado por Sergio de Sousa Bruce"
                          >
                            PDF
                          </button>

                          <button
                            onClick={() => handleSendPdfToClientWhatsApp(res)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                            title="Enviar WhatsApp com Confirmação e PDF para o Cliente"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => setSelectedResForDetail(res)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= 2. TAB: RESERVAS ================= */}
        {activeTab === 'reservas' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">GERENCIAMENTO DE RESERVAS</h2>
                <p className="text-xs text-zinc-400">
                  Todas as reservas registradas no sistema
                </p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar cliente, CPF, cód. ou bike..."
                  value={reservationSearch}
                  onChange={(e) => setReservationSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">Todos os Status</option>
                  <option value="aguardando_pagamento">Aguardando Pagamento</option>
                  <option value="pagamento_confirmado">Pagamento Confirmado</option>
                  <option value="bike_em_uso">Bike em Uso</option>
                  <option value="devolvida_finalizada">Devolvida / Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Feedback Toasts */}
            {deleteSuccessToast && (
              <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
                <span>✓ {deleteSuccessToast}</span>
                <button onClick={() => setDeleteSuccessToast(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {pdfConfirmedToast && (
              <div className="bg-amber-500/15 border-2 border-amber-500/50 text-amber-300 px-4 py-3.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-lg shadow-amber-500/10 animate-fade-in">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>{pdfConfirmedToast}</span>
                </span>
                <button onClick={() => setPdfConfirmedToast(null)} className="text-amber-400 hover:text-white ml-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Reservations Mobile Cards (Visible on Phones) */}
            <div className="md:hidden space-y-3">
              {filteredReservations.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                  Nenhuma reserva encontrada com os filtros selecionados.
                </div>
              ) : (
                filteredReservations.map((res) => (
                  <div 
                    key={`mobile-${res.id}`} 
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-amber-400 text-sm">{res.code}</span>
                        <div className="text-[11px] text-zinc-400">
                          {res.date.split('-').reverse().join('/')} • {res.startTime} às {res.endTime}
                        </div>
                      </div>
                      <div>{getStatusBadge(res.status)}</div>
                    </div>

                    <div className="bg-black/50 p-3 rounded-xl border border-zinc-800/80 text-xs space-y-1">
                      <div className="text-white font-bold">{res.customerSnapshot.fullName}</div>
                      <div className="text-[11px] text-zinc-400 flex justify-between">
                        <span>CPF: {res.customerSnapshot.cpf}</span>
                        <span className="text-amber-400 font-bold">
                          {res.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 pt-0.5 border-t border-zinc-800/60">
                        Bike: <strong className="text-zinc-200">{res.bikeSnapshot.name}</strong> ({res.bikeSnapshot.code})
                      </div>
                      {res.digitalSignatureUrl ? (
                        <div className="text-[10px] text-emerald-400 font-medium pt-1 flex items-center gap-1">
                          ✓ Contrato com Assinatura Online
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500 pt-1">
                          Assinatura digital online pendente
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedResForDetail(res)}
                        className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalhes</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPDFAndMarkPaid(res)}
                        className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1"
                        title="Baixar PDF (Identifica como Pago e Pronto para Uso)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => setResToDelete(res)}
                        className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1"
                        title="Excluir Reserva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reservations Desktop Table */}
            <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Código / Data</th>
                      <th className="py-3 px-4">Cliente / CPF</th>
                      <th className="py-3 px-4">Bicicleta</th>
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Valor</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                          Nenhuma reserva encontrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((res) => (
                        <tr key={res.id} className="hover:bg-zinc-850/50">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-bold text-amber-400">{res.code}</span>
                            <div className="text-[11px] text-zinc-400">
                              {res.date.split('-').reverse().join('/')}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">
                              {res.customerSnapshot.fullName}
                            </span>
                            <span className="text-[11px] text-zinc-400">{res.customerSnapshot.cpf}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-white">{res.bikeSnapshot.name}</span>
                            <div className="text-[10px] text-zinc-500">{res.bikeSnapshot.code}</div>
                          </td>
                          <td className="py-3 px-4 text-zinc-200">
                            {res.startTime} às {res.endTime}
                            <div className="text-[10px] text-zinc-400">{res.durationHours}h</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-white">
                            {res.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(res.status)}</td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedResForDetail(res)}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => handleDownloadPDFAndMarkPaid(res)}
                              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold cursor-pointer"
                              title="Baixar Contrato PDF Assinado por Sergio de Sousa Bruce"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => handleSendPdfToClientWhatsApp(res)}
                              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                              title="Enviar Confirmação e PDF para WhatsApp do Cliente"
                            >
                              <Send className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              onClick={() => setResToDelete(res)}
                              className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Excluir Reserva"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. TAB: CALENDÁRIO ================= */}
        {activeTab === 'calendario' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">CALENDÁRIO DE RESERVAS</h2>
              <p className="text-xs text-zinc-400">
                Visualização por horário e status das bicicletas
              </p>
            </div>

            {/* Date selection */}
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-zinc-300">Data:</label>
              <input
                type="date"
                value={dateFilter || todayStr}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => setDateFilter(todayStr)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-xl text-zinc-200"
              >
                Hoje
              </button>
            </div>

            {/* Calendar Grid: Bikes (columns) x Hours (rows) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 overflow-x-auto">
              <div className="min-w-[650px] space-y-3">
                <div className="grid grid-cols-5 gap-2 border-b border-zinc-800 pb-2 text-xs font-bold text-zinc-400 uppercase">
                  <div className="col-span-1">Horário</div>
                  {bikes.slice(0, 4).map((b) => (
                    <div key={b.id} className="text-center text-white">
                      {b.code} ({b.name})
                    </div>
                  ))}
                </div>

                {/* Rows for each hour 08:00 to 22:00 */}
                {Array.from({ length: 14 }).map((_, idx) => {
                  const hour = 8 + idx;
                  const hourStr = `${String(hour).padStart(2, '0')}:00`;
                  const targetDate = dateFilter || todayStr;

                  return (
                    <div key={hour} className="grid grid-cols-5 gap-2 items-center py-1.5 border-b border-zinc-900 text-xs">
                      <div className="col-span-1 font-mono text-zinc-400">{hourStr}</div>
                      {bikes.slice(0, 4).map((b) => {
                        const matchingRes = reservations.find((r) => {
                          if (r.bikeId !== b.id || r.date !== targetDate || r.status === 'cancelada') return false;
                          const rStart = parseInt(r.startTime.split(':')[0], 10);
                          const rEnd = parseInt(r.endTime.split(':')[0], 10);
                          return hour >= rStart && hour < rEnd;
                        });

                        if (matchingRes) {
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedResForDetail(matchingRes)}
                              className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 text-center cursor-pointer hover:bg-amber-500/30 truncate"
                            >
                              {matchingRes.code} • {matchingRes.customerSnapshot.fullName.split(' ')[0]}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={b.id}
                            className="p-1.5 rounded-lg bg-zinc-950 text-zinc-600 text-[10px] text-center"
                          >
                            Livre
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. TAB: BIKES ================= */}
        {activeTab === 'bikes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">CADASTRO E GESTÃO DE BIKES</h2>
                <p className="text-xs text-zinc-400">
                  Cadastre quantas bicicletas desejar para a frota do PEDALAÊ
                </p>
              </div>
              <button
                id="btn-add-bike-modal"
                onClick={openAddBikeModal}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>ADICIONAR BIKE</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {bikes.map((bike) => (
                <div
                  key={bike.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 rounded-xl overflow-hidden mb-3 bg-zinc-950">
                      <img src={bike.photoUrl} alt={bike.name} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-black/80 font-mono text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded">
                        {bike.code}
                      </span>
                      <span
                        className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                          bike.status === 'available'
                            ? 'bg-emerald-500/80 text-black'
                            : 'bg-rose-500/80 text-white'
                        }`}
                      >
                        {bike.status === 'available' ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{bike.name}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {bike.model} • {bike.color}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2">
                      {bike.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
                    <button
                      onClick={() => openEditBikeModal(bike)}
                      className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBike(bike)}
                      className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 5. TAB: CLIENTES ================= */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">CADASTRO PERMANENTE DE CLIENTES</h2>
              <p className="text-xs text-zinc-400">
                Histórico completo e proteção de dados (LGPD)
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Foto / Nome</th>
                      <th className="py-3 px-4">CPF</th>
                      <th className="py-3 px-4">WhatsApp</th>
                      <th className="py-3 px-4">Endereço</th>
                      <th className="py-3 px-4 text-center">Locações</th>
                      <th className="py-3 px-4">Última Reserva</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {clients.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          Nenhum cliente cadastrado ainda.
                        </td>
                      </tr>
                    ) : (
                      clients.map((c) => (
                        <tr key={c.id || c.cpf} className="hover:bg-zinc-850/50">
                          <td className="py-3 px-4 flex items-center gap-3">
                            {c.photoBase64 ? (
                              <img
                                src={c.photoBase64}
                                alt={c.fullName}
                                className="w-9 h-9 rounded-full object-cover border border-amber-500 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                                {c.fullName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-bold text-white">{c.fullName}</span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-mono">{c.cpf}</td>
                          <td className="py-3 px-4 text-emerald-400">{c.whatsapp}</td>
                          <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">{c.fullAddress}</td>
                          <td className="py-3 px-4 text-center font-bold text-amber-400">
                            {c.totalReservations || 1}
                          </td>
                          <td className="py-3 px-4 text-zinc-400">
                            {c.lastReservationAt
                              ? new Date(c.lastReservationAt).toLocaleDateString('pt-BR')
                              : 'Hoje'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. TAB: FINANCEIRO ================= */}
        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">RELATÓRIO FINANCEIRO</h2>
              <p className="text-xs text-zinc-400">
                Controle de receitas, ticket médio e locações por bicicleta
              </p>
            </div>

            {/* Financial metric overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <span className="text-xs text-zinc-400 font-semibold uppercase">Total Recebido Hoje</span>
                <div className="text-3xl font-black text-emerald-400 mt-1">
                  {revenueToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  {todayReservations.filter((r) => r.paymentConfirmedAt).length} locações pagas
                </span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <span className="text-xs text-zinc-400 font-semibold uppercase">Total Geral de Receita</span>
                <div className="text-3xl font-black text-white mt-1">
                  {reservations
                    .filter((r) => r.paymentConfirmedAt)
                    .reduce((a, b) => a + b.totalPrice, 0)
                    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Acumulado histórico
                </span>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <span className="text-xs text-zinc-400 font-semibold uppercase">Ticket Médio</span>
                <div className="text-3xl font-black text-amber-400 mt-1">
                  {(
                    reservations.filter((r) => r.paymentConfirmedAt).length > 0
                      ? reservations
                          .filter((r) => r.paymentConfirmedAt)
                          .reduce((a, b) => a + b.totalPrice, 0) /
                        reservations.filter((r) => r.paymentConfirmedAt).length
                      : 15.00
                  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <span className="text-[11px] text-zinc-500 mt-1 block">
                  Por reserva finalizada
                </span>
              </div>
            </div>

            {/* Bikes revenue rank */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h3 className="font-bold text-white text-base mb-4">Bikes Mais Alugadas</h3>
              <div className="space-y-3">
                {bikes.map((b) => {
                  const bikeReservations = reservations.filter((r) => r.bikeId === b.id && r.status !== 'cancelada');
                  const bikeRevenue = bikeReservations
                    .filter((r) => r.paymentConfirmedAt)
                    .reduce((acc, curr) => acc + curr.totalPrice, 0);

                  return (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-850">
                      <div className="flex items-center gap-3">
                        <img src={b.photoUrl} alt={b.name} className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <span className="font-mono text-xs text-amber-400 font-bold">{b.code}</span>
                          <h4 className="font-bold text-white text-sm">{b.name}</h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400">
                          {bikeRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <div className="text-[11px] text-zinc-400">{bikeReservations.length} reservas</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= 7. TAB: DOCUMENTOS ================= */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">TERMOS E FICHAS DE LOCAÇÃO</h2>
              <p className="text-xs text-zinc-400">
                Gere e imprima os termos oficiais de responsabilidade com QR Code e dados completos
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservations.map((r) => (
                <div key={r.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-amber-400">{r.code}</span>
                      <h4 className="font-bold text-white text-sm">{r.customerSnapshot.fullName}</h4>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1">
                    <div>Data: {r.date.split('-').reverse().join('/')}</div>
                    <div>Horário: {r.startTime} às {r.endTime}</div>
                    <div>Bike: {r.bikeSnapshot.name}</div>
                  </div>

                  <button
                    onClick={() => generateReservationPDF(r, settings)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>BAIXAR / IMPRIMIR PDF OFICIAL</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= 8. TAB: RELATÓRIOS ================= */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">CENTRAL DE RELATÓRIOS</h2>
              <p className="text-xs text-zinc-400">
                Exportação de dados operacionais e métricas de desempenho
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-white text-base">Relatório de Reservas</h3>
                <p className="text-xs text-zinc-400">
                  Exportar lista completa de reservas com dados de horário, clientes e status.
                </p>
                <button
                  onClick={() => {
                    const csvContent =
                      'data:text/csv;charset=utf-8,' +
                      'Codigo,Cliente,CPF,Bike,Data,Inicio,Fim,Valor,Status\n' +
                      reservations
                        .map(
                          (r) =>
                            `"${r.code}","${r.customerSnapshot.fullName}","${r.customerSnapshot.cpf}","${r.bikeSnapshot.name}","${r.date}","${r.startTime}","${r.endTime}","${r.totalPrice}","${r.status}"`
                        )
                        .join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `pedalae_reservas_${todayStr}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar Reservas (CSV)</span>
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-white text-base">Relatório de Clientes</h3>
                <p className="text-xs text-zinc-400">
                  Exportar base de clientes cadastrados, telefones e frequência de locações.
                </p>
                <button
                  onClick={() => {
                    const csvContent =
                      'data:text/csv;charset=utf-8,' +
                      'Nome,CPF,WhatsApp,Email,Endereco,TotalReservas\n' +
                      clients
                        .map(
                          (c) =>
                            `"${c.fullName}","${c.cpf}","${c.whatsapp}","${c.email}","${c.fullAddress}","${c.totalReservations || 1}"`
                        )
                        .join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `pedalae_clientes_${todayStr}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exportar Clientes (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 9. TAB: CONFIGURAÇÕES ================= */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">CONFIGURAÇÕES DO SISTEMA</h2>
              <p className="text-xs text-zinc-400">
                Altere preços, horários de funcionamento, chave PIX e dados da empresa
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* General business info */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">
                  Dados da Empresa & Contato
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Nome da Empresa
                    </label>
                    <input
                      type="text"
                      value={editCompanyName}
                      onChange={(e) => setEditCompanyName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Slogan Oficial
                    </label>
                    <input
                      type="text"
                      value={editSlogan}
                      onChange={(e) => setEditSlogan(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      WhatsApp para Exibição
                    </label>
                    <input
                      type="text"
                      value={editWhatsappDisplay}
                      onChange={(e) => setEditWhatsappDisplay(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Chave PIX Oficial
                    </label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                    Endereço Completo em Parintins
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Operating Hours */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">
                  Horário de Funcionamento
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Hora de Abertura
                    </label>
                    <input
                      type="time"
                      value={editOpeningTime}
                      onChange={(e) => setEditOpeningTime(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Hora de Fechamento
                    </label>
                    <input
                      type="time"
                      value={editClosingTime}
                      onChange={(e) => setEditClosingTime(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Rental Plans (Prices) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">
                  Tabela de Preços dos Planos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {editPlans.map((p, idx) => (
                    <div key={p.id} className="bg-black border border-zinc-800 rounded-xl p-3">
                      <span className="text-xs font-bold text-white block mb-1">{p.label}</span>
                      <label className="text-[10px] text-zinc-400">Valor (R$):</label>
                      <input
                        type="number"
                        step="0.50"
                        value={p.price}
                        onChange={(e) => {
                          const updated = [...editPlans];
                          updated[idx] = { ...updated[idx], price: parseFloat(e.target.value) || 0 };
                          setEditPlans(updated);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Term Text */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">
                  Termo de Compromisso e Responsabilidade
                </h3>
                <textarea
                  rows={6}
                  value={editTermText}
                  onChange={(e) => setEditTermText(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl p-3 text-xs text-white leading-relaxed font-mono"
                />
              </div>

              {/* Security & Access Management Card */}
              <div id="section-admin-security" className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider">
                      Segurança e Controle de Acesso Restrito
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Garantia de que <strong>somente você</strong> pode acessar o painel administrativo, gerenciar contratos e visualizar os dados dos clientes e financeiro.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      E-mail do Administrador Titular
                    </label>
                    <input
                      type="email"
                      value={editAdminEmail}
                      onChange={(e) => setEditAdminEmail(e.target.value)}
                      placeholder="sergiobruce19@gmail.com"
                      className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Apenas login com este e-mail do Google oficial é aceito pelo sistema.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">
                      Status da Senha de Administrador
                    </label>
                    <div className="bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-xs">
                        {(!settings.adminPasswordHash || settings.adminPasswordHash === 'admin123') ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> Senha temporária ativa
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Senha pessoal exclusiva ativa
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Você pode redefinir sua senha secreta a qualquer momento no formulário abaixo.
                    </p>
                  </div>
                </div>

                {/* Sub-form for changing master password */}
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>Cadastrar ou Redefinir Minha Senha Mestre</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Nova Senha Mestre
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Digite a nova senha secreta"
                          className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={confirmAdminPassword}
                        onChange={(e) => setConfirmAdminPassword(e.target.value)}
                        placeholder="Repita a mesma senha"
                        className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {passwordChangeError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                      {passwordChangeError}
                    </div>
                  )}

                  {passwordChangeSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{passwordChangeSuccess}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSavingPassword || !newAdminPassword}
                      onClick={handleSaveNewPassword}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      {isSavingPassword ? 'Salvando Senha...' : 'Salvar Minha Nova Senha'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20"
              >
                {savingSettings ? 'Salvando no Firebase...' : 'SALVAR TODAS AS CONFIGURAÇÕES'}
              </button>
            </form>
          </div>
        )}

        {/* ================= MODAL: DETALHES DA RESERVA ================= */}
        {selectedResForDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {selectedResForDetail.code}
                  </span>
                  <h3 className="font-black text-white text-lg">Detalhes da Reserva</h3>
                </div>
                <button
                  onClick={() => setSelectedResForDetail(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between bg-black p-3.5 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400">Status Atual:</span>
                <div>{getStatusBadge(selectedResForDetail.status)}</div>
              </div>

              {/* Client and Bike Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-black/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Dados do Cliente
                  </span>
                  <div className="flex items-center gap-3">
                    {selectedResForDetail.customerSnapshot.photoBase64 && (
                      <img
                        src={selectedResForDetail.customerSnapshot.photoBase64}
                        alt="Cliente"
                        className="w-12 h-12 rounded-full object-cover border border-amber-500"
                      />
                    )}
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {selectedResForDetail.customerSnapshot.fullName}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        CPF: {selectedResForDetail.customerSnapshot.cpf}
                      </p>
                      <a
                        href={`https://wa.me/55${selectedResForDetail.customerSnapshot.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        WhatsApp: {selectedResForDetail.customerSnapshot.whatsapp} ↗
                      </a>
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 pt-1">
                    Endereço: {selectedResForDetail.customerSnapshot.fullAddress}
                  </p>
                </div>

                <div className="bg-black/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Bicicleta & Horário
                  </span>
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedResForDetail.bikeSnapshot.photoUrl}
                      alt="Bike"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {selectedResForDetail.bikeSnapshot.name}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {selectedResForDetail.bikeSnapshot.model} • {selectedResForDetail.bikeSnapshot.color}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-amber-300 font-bold pt-1">
                    {selectedResForDetail.date.split('-').reverse().join('/')} • {selectedResForDetail.startTime} às {selectedResForDetail.endTime}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Valor: {selectedResForDetail.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </div>
              </div>

              {/* Comprovante de Pagamento Anexado */}
              {selectedResForDetail.paymentProofBase64 && (
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedResForDetail.paymentProofBase64}
                      alt="Comprovante PIX"
                      className="w-12 h-12 rounded-lg object-cover border border-emerald-500/50 bg-black cursor-pointer"
                      onClick={() => window.open(selectedResForDetail.paymentProofBase64, '_blank')}
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-400 block">
                        Comprovante do PIX Anexado pelo Cliente
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {selectedResForDetail.paymentProofUploadedAt
                          ? `Enviado em ${new Date(selectedResForDetail.paymentProofUploadedAt).toLocaleString('pt-BR')}`
                          : 'Disponível para conferência'}
                      </span>
                    </div>
                  </div>
                  <a
                    href={selectedResForDetail.paymentProofBase64}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap"
                  >
                    Ver Comprovante em Tela Cheia ↗
                  </a>
                </div>
              )}

              {/* Assinatura Digital do Locatário */}
              <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5" />
                    Assinatura Online do Contrato
                  </span>
                  {selectedResForDetail.digitalSignatureUrl ? (
                    <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Assinado Online
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
                      Assinatura Presencial Pendente
                    </span>
                  )}
                </div>

                {selectedResForDetail.digitalSignatureUrl ? (
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-xl border border-zinc-700 flex items-center justify-center">
                      <img
                        src={selectedResForDetail.digitalSignatureUrl}
                        alt={`Assinatura de ${selectedResForDetail.customerSnapshot.fullName}`}
                        className="max-h-24 object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                      <span>Signatário: <strong className="text-zinc-200">{selectedResForDetail.digitalSignerName || selectedResForDetail.customerSnapshot.fullName}</strong></span>
                      <span className="text-amber-400 font-mono text-[10px]">
                        {selectedResForDetail.digitalSignedAt
                          ? new Date(selectedResForDetail.digitalSignedAt).toLocaleString('pt-BR')
                          : new Date(selectedResForDetail.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 italic">
                    O cliente concordou com os termos online. Caso deseje, você pode coletar a assinatura física na retirada ou gerar o contrato PDF completo para impressão e arquivo.
                  </p>
                )}
              </div>

              {/* Action buttons inside detail */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-zinc-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedResForDetail.status === 'aguardando_pagamento' && (
                    <button
                      onClick={() => handleConfirmPayment(selectedResForDetail)}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Confirmar Pagamento PIX</span>
                    </button>
                  )}

                  {selectedResForDetail.status === 'pagamento_confirmado' && (
                    <button
                      onClick={() => openCheckin(selectedResForDetail)}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Iniciar Check-in / Retirada</span>
                    </button>
                  )}

                  {selectedResForDetail.status === 'bike_em_uso' && (
                    <button
                      onClick={() => openCheckout(selectedResForDetail)}
                      className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Iniciar Devolução</span>
                    </button>
                  )}

                  {/* Primary Download Button with Sergio de Sousa Bruce Signature */}
                  <button
                    onClick={() => handleDownloadPDFAndMarkPaid(selectedResForDetail)}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                    title="Baixar Contrato PDF Assinado por Sergio de Sousa Bruce com foto do cliente"
                  >
                    <FileText className="w-4 h-4 text-black" />
                    <span>Baixar PDF (Assinado por Sergio Bruce)</span>
                  </button>
                </div>

                {/* Send PDF / Confirmation directly to Client's WhatsApp */}
                <button
                  onClick={() => handleSendPdfToClientWhatsApp(selectedResForDetail)}
                  className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                  title="Enviar mensagem oficial com confirmação e enviar PDF no WhatsApp do cliente"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>Enviar Confirmação e PDF para WhatsApp do Cliente</span>
                </button>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {selectedResForDetail.status !== 'cancelada' && (
                    <button
                      onClick={() => handleCancelReservation(selectedResForDetail)}
                      className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs cursor-pointer"
                    >
                      Cancelar Reserva
                    </button>
                  )}

                  <button
                    onClick={() => setResToDelete(selectedResForDetail)}
                    className="py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Excluir Reserva Definitivamente"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL: CHECK-IN / RETIRADA ================= */}
        {isCheckinModalOpen && selectedResForDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-black text-white text-base">CHECK-IN / RETIRADA DA BIKE</h3>
                <button onClick={() => setIsCheckinModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-black p-3.5 rounded-xl border border-zinc-800 text-xs space-y-1.5">
                <div><strong>Cliente:</strong> {selectedResForDetail.customerSnapshot.fullName} ({selectedResForDetail.customerSnapshot.cpf})</div>
                <div><strong>Bike:</strong> {selectedResForDetail.bikeSnapshot.name} ({selectedResForDetail.bikeSnapshot.code})</div>
                <div><strong>Horário Contratado:</strong> {selectedResForDetail.startTime} às {selectedResForDetail.endTime}</div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkinBikeOk}
                    onChange={(e) => setCheckinBikeOk(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300 font-semibold">
                    Bike entregue em boas condições mecânicas e calibrada?
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkinTermSigned}
                    onChange={(e) => setCheckinTermSigned(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300 font-semibold">
                    Termo assinado presencialmente pelo cliente no balcão?
                  </span>
                </label>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Responsável pelo Atendimento:
                  </label>
                  <input
                    type="text"
                    value={checkinOperator}
                    onChange={(e) => setCheckinOperator(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Observações de Retirada:
                  </label>
                  <textarea
                    rows={2}
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder="Ex: Entregue com capacete, pneus 38 PSI..."
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmCheckin}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider"
              >
                CONFIRMAR RETIRADA (BIKE EM USO)
              </button>
            </div>
          </div>
        )}

        {/* ================= MODAL: DEVOLUÇÃO / CHECK-OUT ================= */}
        {isCheckoutModalOpen && selectedResForDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-black text-white text-base">CONTROLE DE DEVOLUÇÃO</h3>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Estado da Bicicleta na Devolução:
                  </label>
                  <select
                    value={checkoutCondition}
                    onChange={(e: any) => setCheckoutCondition(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="normal">☑ Bike devolvida normalmente (perfeito estado)</option>
                    <option value="avaria">☑ Com avaria (arranhões, peças tortas)</option>
                    <option value="problema_mecanico">☑ Com problema mecânico (corrente, freio)</option>
                    <option value="outros">☑ Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Observações e Possíveis Danos:
                  </label>
                  <textarea
                    rows={3}
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    placeholder="Descreva as condições da bike..."
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Responsável pelo Recebimento:
                  </label>
                  <input
                    type="text"
                    value={checkoutOperator}
                    onChange={(e) => setCheckoutOperator(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleConfirmCheckout}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs uppercase tracking-wider"
              >
                FINALIZAR LOCAÇÃO (STATUS: DEVOLVIDA)
              </button>
            </div>
          </div>
        )}

        {/* ================= MODAL: ADICIONAR / EDITAR BIKE ================= */}
        {isBikeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <h3 className="font-black text-white text-base">
                  {editingBike ? 'EDITAR BIKE' : 'ADICIONAR NOVA BIKE'}
                </h3>
                <button onClick={() => setIsBikeModalOpen(false)} className="text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBike} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Código / ID da Bike *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="PED-005"
                      value={bikeCode}
                      onChange={(e) => setBikeCode(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Nome da Bike *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bike Lotus Azul"
                      value={bikeName}
                      onChange={(e) => setBikeName(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Modelo
                    </label>
                    <input
                      type="text"
                      placeholder="Colli Aro 29"
                      value={bikeModel}
                      onChange={(e) => setBikeModel(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Cor
                    </label>
                    <input
                      type="text"
                      placeholder="Azul Metálica"
                      value={bikeColor}
                      onChange={(e) => setBikeColor(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    URL da Foto
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={bikePhotoUrl}
                    onChange={(e) => setBikePhotoUrl(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={2}
                    value={bikeDescription}
                    onChange={(e) => setBikeDescription(e.target.value)}
                    placeholder="Detalhes, marchas, suspensão..."
                    className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Status da Bike
                    </label>
                    <select
                      value={bikeStatus}
                      onChange={(e: any) => setBikeStatus(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="available">🟢 Disponível</option>
                      <option value="maintenance">🔴 Manutenção</option>
                      <option value="inactive">⚪ Inativa (Não visível)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Observações Internas
                    </label>
                    <input
                      type="text"
                      placeholder="Última revisão, peças..."
                      value={bikeNotes}
                      onChange={(e) => setBikeNotes(e.target.value)}
                      className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider"
                >
                  {editingBike ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR BICICLETA'}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* ================= MODAL: CONFIRMAR EXCLUSÃO DE RESERVA ================= */}
        {resToDelete && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">Excluir Reserva?</h3>
                  <span className="text-xs text-zinc-400">Esta ação não pode ser desfeita</span>
                </div>
              </div>

              <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Código:</span>
                  <strong className="text-amber-400 font-mono">{resToDelete.code}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Cliente:</span>
                  <strong className="text-white">{resToDelete.customerSnapshot.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CPF:</span>
                  <span className="text-zinc-300 font-mono">{resToDelete.customerSnapshot.cpf}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Data e Horário:</span>
                  <span className="text-zinc-300">
                    {resToDelete.date.split('-').reverse().join('/')} ({resToDelete.startTime} às {resToDelete.endTime})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Bicicleta:</span>
                  <span className="text-zinc-300">{resToDelete.bikeSnapshot.name}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Tem certeza que deseja apagar definitivamente este registro do banco de dados? O horário reservado voltará a ficar disponível para outros clientes.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeletingRes}
                  onClick={() => setResToDelete(null)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeletingRes}
                  onClick={handleDeleteReservationConfirm}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  {isDeletingRes ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
