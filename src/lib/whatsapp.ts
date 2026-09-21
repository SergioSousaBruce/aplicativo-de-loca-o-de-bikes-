import { Reservation } from '../types';

// Número oficial informado pelo cliente: (93) 98125-0207
export const OFFICIAL_WHATSAPP_NUMBER = '5593981250207';
export const OFFICIAL_WHATSAPP_DISPLAY = '(93) 98125-0207';
export const OFFICIAL_WHATSAPP_LINK = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}`;

/**
 * Constrói a mensagem padronizada oficial para envio de comprovante e reserva:
 *
 * "Olá! Fiz uma reserva no PEDALAÊ.
 *
 * Reserva: PED-000001
 *
 * Nome: João da Silva
 * Bike: Bike Verde
 * Data: 21/09/2026
 * Horário: 15:00
 * Duração: 2 horas
 * Valor: R$ 15,00
 *
 * Estou enviando o comprovante de pagamento."
 */
export function buildReservationWhatsAppText(reservation: Reservation): string {
  const parts = reservation.date.split('-');
  const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : reservation.date;
  const valorFormatted = reservation.totalPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return `Olá! Fiz uma reserva no PEDALAÊ.

Reserva: ${reservation.code}

Nome: ${reservation.customerSnapshot.fullName}
Bike: ${reservation.bikeSnapshot.name}
Data: ${dateFormatted}
Horário: ${reservation.startTime}
Duração: ${reservation.durationHours} ${reservation.durationHours === 1 ? 'hora' : 'horas'}
Valor: ${valorFormatted}

Estou enviando o comprovante de pagamento.`;
}

/**
 * Constrói a mensagem completa com todos os detalhes da reserva para o próprio cliente guardar no seu WhatsApp.
 */
export function buildClientSelfSummaryWhatsAppText(reservation: Reservation): string {
  const parts = reservation.date.split('-');
  const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : reservation.date;
  const valorFormatted = reservation.totalPrice.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return `🚲 *MINHA RESERVA NO PEDALAÊ — PARINTINS/AM* 🌴
"ALUGUE. PEDALE. VIVA O MOMENTO."

📋 *Código:* ${reservation.code}
👤 *Cliente:* ${reservation.customerSnapshot.fullName}
🪪 *CPF:* ${reservation.customerSnapshot.cpf}

🚲 *Bicicleta:* ${reservation.bikeSnapshot.name} (${reservation.bikeSnapshot.code})
🎨 *Modelo/Cor:* ${reservation.bikeSnapshot.model} • ${reservation.bikeSnapshot.color}
📅 *Data:* ${dateFormatted}
⏰ *Horário:* ${reservation.startTime} às ${reservation.endTime} (${reservation.durationHours}h)
💰 *Valor Total:* ${valorFormatted}
💳 *Pagamento:* PIX Oficial

📍 *Ponto de Retirada:* Orla de Parintins - AM
*Apresente este comprovante ou o QR Code ao retirar a bike.*`;
}

/**
 * Gera o link direto com o número de WhatsApp oficial configurado e texto pré-preenchido.
 */
export function getWhatsAppReservationUrl(reservation: Reservation, customNumber?: string): string {
  let phone = customNumber ? customNumber.replace(/\D/g, '') : OFFICIAL_WHATSAPP_NUMBER;
  if (phone.length === 10 || phone.length === 11) {
    phone = `55${phone}`;
  }
  const text = encodeURIComponent(buildReservationWhatsAppText(reservation));
  return `https://wa.me/${phone}?text=${text}`;
}

/**
 * Gera o link para o cliente enviar o resumo completo para o seu próprio WhatsApp.
 */
export function getWhatsAppClientSelfUrl(reservation: Reservation): string {
  let phone = reservation.customerSnapshot.whatsapp.replace(/\D/g, '');
  if (phone.length === 10 || phone.length === 11) {
    phone = `55${phone}`;
  }
  const text = encodeURIComponent(buildClientSelfSummaryWhatsAppText(reservation));
  return `https://wa.me/${phone}?text=${text}`;
}
