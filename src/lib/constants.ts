import { Bike, SystemSettings } from '../types';

export const INITIAL_SETTINGS: SystemSettings = {
  companyName: 'PEDALAÊ - ALUGUEL DE BIKES',
  slogan: 'ALUGUE. PEDALE. VIVA O MOMENTO.',
  logoUrl: '/logo.png',
  cityState: 'Parintins - AM',
  address: 'Orla de Parintins, Centro - Parintins/AM (Próximo à Praça da Catedral)',
  whatsappOfficialUrl: 'https://wa.me/5593981250207',
  whatsappDisplay: '(93) 98125-0207',
  pixKey: 'pedalae.parintins@gmail.com',
  pixType: 'E-mail',
  pixBeneficiary: 'PEDALAÊ LOCAÇÕES DE BIKES LTDA',
  openingTime: '08:00',
  closingTime: '22:00',
  slotIntervalMinutes: 60,
  blockedWeekdays: [],
  blockedDates: [],
  plans: [
    { id: 'p1', durationHours: 1, label: '1 HORA', price: 10.00 },
    { id: 'p2', durationHours: 2, label: '2 HORAS', price: 15.00, popular: true },
    { id: 'p3', durationHours: 3, label: '3 HORAS', price: 30.00 },
    { id: 'p4', durationHours: 4, label: '4 HORAS', price: 35.00 },
  ],
  termText: `TERMO DE COMPROMISSO, LOCAÇÃO E RESPONSABILIDADE CIVIL - PEDALAÊ

1. DO OBJETO
O presente termo formaliza a locação temporária de bicicleta de uso urbano/lazer disponibilizada pelo PEDALAÊ em Parintins/AM.

2. DAS CONDIÇÕES E CONSERVAÇÃO DO EQUIPAMENTO
O LOCATÁRIO declara receber a bicicleta em perfeito estado de conservação, segurança e funcionamento mecânico (freios, corrente, pneus calibrados, selim regulado), comprometendo-se a devolvê-la nas exatas condições em que a recebeu, salvo o desgaste natural decorrente do uso regular.

3. DA RESPONSABILIDADE CIVIL E CRIMINAL
O LOCATÁRIO assume total e irrestrita responsabilidade por quaisquer danos materiais causados à bicicleta durante o período de locação, incluindo quebra, perda de componentes, avarias graves e furto ou roubo do equipamento, obrigando-se a ressarcir integralmente o PEDALAÊ pelos prejuízos avaliados.
O LOCATÁRIO é o único e exclusivo responsável por infrações de trânsito, acidentes, colisões ou danos a terceiros ocorridos durante o período em que a bicicleta estiver sob sua posse.

4. DA UTILIZAÇÃO E NORMAS DE SEGURANÇA
É expressamente proibido:
a) Conduzir sob efeito de substâncias alcoólicas ou entorpecentes;
b) Transportar passageiros em número superior à capacidade da bicicleta;
c) Realizar manobras radicais ou trafegar em locais de risco evidente;
d) Sublocar ou ceder a bicicleta a terceiros não cadastrados.

5. DA RETIRADA, IDENTIFICAÇÃO E ASSINATURA FÍSICA
A entrega da bicicleta está condicionada à conferência documental com foto e CPF e à assinatura física deste Termo no ato da retirada na unidade do PEDALAÊ em Parintins/AM.`,
  cancellationPolicy: 'Cancelamentos podem ser solicitados pelo cliente com antecedência mínima de 1 hora do início da reserva. A devolução ou crédito é avaliada e autorizada pela administração do PEDALAÊ.',
  adminPasswordHash: 'admin123', // Initial seed password, customizable by administrator in settings
  adminEmail: 'sergiobruce19@gmail.com',
};

export const INITIAL_BIKES: Bike[] = [
  {
    id: 'bike-ped-001',
    code: 'PED-001',
    name: 'BIKE 01 — LOTUS VERMELHA',
    model: 'Lotus Aro 29',
    color: 'Vermelha',
    description: 'Mais que um passeio, é uma experiência! Quadro resistente, marchas precisas, freios a disco e pneus de alta tração.',
    photoUrl: '/bike_01_lotus_vermelha_1790011655445.jpg',
    status: 'available',
    notes: 'Quadro resistente, marchas precisas, freios a disco, pneus de alta tração.',
    createdAt: Date.now(),
  },
  {
    id: 'bike-ped-002',
    code: 'PED-002',
    name: 'BIKE 02 — COLLI VERMELHA',
    model: 'Colli Aro 29',
    color: 'Vermelha',
    description: 'Mais que um passeio, é uma experiência! Quadro resistente, marchas precisas, freios a disco e pneus de alta tração.',
    photoUrl: '/bike_02_colli_vermelha_1790011674947.jpg',
    status: 'available',
    notes: 'Quadro resistente, marchas precisas, freios a disco, pneus de alta tração.',
    createdAt: Date.now(),
  },
  {
    id: 'bike-ped-003',
    code: 'PED-003',
    name: 'BIKE 03 — COLLI PRETA',
    model: 'Colli Aro 29',
    color: 'Preta',
    description: 'Mais que um passeio, é uma experiência! Quadro resistente, marchas precisas, freios a disco e pneus de alta tração.',
    photoUrl: '/bike_03_colli_preta_1790011689826.jpg',
    status: 'available',
    notes: 'Quadro resistente, marchas precisas, freios a disco, pneus de alta tração.',
    createdAt: Date.now(),
  },
  {
    id: 'bike-ped-004',
    code: 'PED-004',
    name: 'BIKE 04 — COLLI VERDE',
    model: 'Colli Aro 29',
    color: 'Verde',
    description: 'Mais que um passeio, é uma experiência! Quadro resistente, marchas precisas, freios a disco e pneus de alta tração.',
    photoUrl: '/bike_04_colli_verde_1790011712793.jpg',
    status: 'available',
    notes: 'Quadro resistente, marchas precisas, freios a disco, pneus de alta tração.',
    createdAt: Date.now(),
  },
];
