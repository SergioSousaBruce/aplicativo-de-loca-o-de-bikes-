import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Reservation, SystemSettings } from '../types';

export async function generateReservationPDF(
  reservation: Reservation,
  settings: SystemSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Header Background
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Gold accent bar
  doc.setFillColor(245, 184, 0); // #F5B800
  doc.rect(0, 42, pageWidth, 3, 'F');

  // Brand Name & Slogan
  doc.setTextColor(245, 184, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PEDALAÊ', margin, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(settings.slogan || 'ALUGUE. PEDALE. VIVA O MOMENTO.', margin, 26);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('PARINTINS - AM • LOCAÇÃO DE BIKES', margin, 32);

  // Reservation Code badge in header right
  doc.setFillColor(245, 184, 0);
  doc.roundedRect(pageWidth - margin - 50, 12, 50, 18, 2, 2, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Nº DA RESERVA', pageWidth - margin - 47, 18);
  doc.setFontSize(13);
  doc.text(reservation.code, pageWidth - margin - 47, 26);

  let y = 52;

  // Title of Document
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TERMO E FICHA OFICIAL DE LOCAÇÃO', margin, y);
  y += 7;

  // QR Code Generation
  try {
    const qrDataUrl = await QRCode.toDataURL(reservation.code, {
      margin: 1,
      width: 120,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 26, y - 6, 26, 26);
  } catch (err) {
    console.warn('QR code generation note:', err);
  }

  // Section 1: Customer Data
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth - 30, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DADOS DO CLIENTE', margin + 3, y + 4.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const client = reservation.customerSnapshot;
  doc.text(`Nome Completo: ${client.fullName}`, margin + 3, y);
  doc.text(`CPF: ${client.cpf}`, margin + 95, y);
  y += 5;
  doc.text(`WhatsApp: ${client.whatsapp}`, margin + 3, y);
  doc.text(`Data Nasc.: ${client.birthDate || 'Não informada'}`, margin + 95, y);
  y += 5;
  doc.text(`E-mail: ${client.email}`, margin + 3, y);
  y += 5;
  doc.text(`Endereço: ${client.fullAddress}`, margin + 3, y);
  y += 8;

  // Section 2: Bike & Reservation Data
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('DADOS DA BIKE E DO PERÍODO', margin + 3, y + 4.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  const bike = reservation.bikeSnapshot;
  const parts = reservation.date.split('-');
  const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : reservation.date;

  doc.text(`Bicicleta: ${bike.name} (${bike.code})`, margin + 3, y);
  doc.text(`Modelo/Cor: ${bike.model} - ${bike.color}`, margin + 95, y);
  y += 5;
  doc.text(`Data da Reserva: ${dateFormatted}`, margin + 3, y);
  doc.text(`Duração: ${reservation.durationHours} ${reservation.durationHours === 1 ? 'hora' : 'horas'}`, margin + 95, y);
  y += 5;
  doc.text(`Horário de Retirada: ${reservation.startTime}`, margin + 3, y);
  doc.text(`Devolução Prevista: ${reservation.endTime}`, margin + 95, y);
  y += 5;
  doc.text(
    `Devolução Efetiva: ${reservation.checkout?.checkedOutAt ? new Date(reservation.checkout.checkedOutAt).toLocaleTimeString('pt-BR') : 'Pendente'}`,
    margin + 3,
    y
  );
  doc.text(
    `Valor Total: ${reservation.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
    margin + 95,
    y
  );
  y += 8;

  // Section 3: Status & Payment
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('PAGAMENTO E STATUS OPERACIONAL', margin + 3, y + 4.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Forma de Pagamento: PIX (${settings.pixKey})`, margin + 3, y);
  doc.text(`Status Atual: ${reservation.status.toUpperCase().replace('_', ' ')}`, margin + 95, y);
  y += 5;
  doc.text(
    `Confirmação de Pagamento: ${reservation.paymentConfirmedAt ? new Date(reservation.paymentConfirmedAt).toLocaleString('pt-BR') : 'Aguardando verificação'}`,
    margin + 3,
    y
  );
  y += 8;

  // Section 4: Inspection (Retirada & Devolução)
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('FICHA DE VISTORIA: RETIRADA E DEVOLUÇÃO', margin + 3, y + 4.5);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const checkinTime = reservation.checkin?.checkedInAt
    ? new Date(reservation.checkin.checkedInAt).toLocaleString('pt-BR')
    : 'Não registrado';
  doc.text(
    `RETIRADA: Entregue em boas condições? [ ${reservation.checkin?.bikeConditionOk ? 'SIM' : '___'} ]  Data/Hora: ${checkinTime}`,
    margin + 3,
    y
  );
  y += 4.5;
  doc.text(`Resp. Retirada: ${reservation.checkin?.checkedInBy || 'Equipe Pedalaê'}  Obs: ${reservation.checkin?.notes || 'Nenhuma'}`, margin + 3, y);
  y += 6;

  const checkoutTime = reservation.checkout?.checkedOutAt
    ? new Date(reservation.checkout.checkedOutAt).toLocaleString('pt-BR')
    : 'Não registrado';
  doc.text(
    `DEVOLUÇÃO: Estado: [ ${reservation.checkout?.conditionStatus || 'Aguardando devolução'} ]  Data/Hora: ${checkoutTime}`,
    margin + 3,
    y
  );
  y += 4.5;
  doc.text(`Resp. Devolução: ${reservation.checkout?.checkedOutBy || 'Equipe Pedalaê'}  Obs: ${reservation.checkout?.notes || 'Nenhuma'}`, margin + 3, y);
  y += 9;

  // Section 5: Legal Term Summary
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 5, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TERMO DE COMPROMISSO E RESPONSABILIDADE CIVIL', margin + 3, y + 3.8);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(50, 50, 50);
  const termSummary = `O LOCATÁRIO declara expressamente ter inspecionado a bicicleta acima descrita, atestando suas perfeitas condições mecânicas e de segurança. Assume integral e irrestrita responsabilidade civil e criminal pelo uso do equipamento durante o período de locação, inclusive por danos materiais, avarias, perda de peças, furto, roubo ou danos a terceiros. Compromete-se a respeitar as leis de trânsito e devolver o equipamento no horário previsto no PEDALAÊ em Parintins/AM.`;
  const splitText = doc.splitTextToSize(termSummary, contentWidth - 4);
  doc.text(splitText, margin + 2, y);
  y += splitText.length * 3.6 + 6;

  // Signature lines
  y = Math.max(y, 242);
  const colWidth = (contentWidth - 10) / 2;

  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y, margin + colWidth, y);
  doc.line(margin + colWidth + 10, y, margin + contentWidth, y);

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('ASSINATURA DO CLIENTE / LOCATÁRIO', margin + 6, y);
  doc.text('RESPONSÁVEL PEDALAÊ PARINTINS', margin + colWidth + 16, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text(`CPF: ${client.cpf}`, margin + 6, y);
  doc.text(`Data: ____/____/2026`, margin + colWidth + 16, y);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `PEDALAÊ - Parintins/AM • ${settings.address} • WhatsApp: ${settings.whatsappDisplay}`,
    pageWidth / 2,
    288,
    { align: 'center' }
  );

  // Save the PDF
  doc.save(`Pedalae_Reserva_${reservation.code}.pdf`);
}
