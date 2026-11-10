/*
 * K1 digital — Servicios. Showcase kiosk: bills, top-ups, transfers and tax payments.
 *
 * The coin and bill acceptors and the QR reader are real when running inside the K1 Demo Kiosk
 * app (through ../kiosk.js). Everything after the hardware is pretend: lookups, payments and
 * transfers are timers and made-up data, and nothing is ever really paid or sent.
 *
 *   Pago (facturas, impuestos):  identify (keypad or QR) → detail → insert cash → done
 *   Recarga:                     phone number → amount → insert cash → done
 *   Envío / depósito / billetera: identify → insert any amount → sending → done
 *   Remesa (retiro):             code → detail → checking → take your cash → done
 *
 * Edit CONFIG, CATEGORIES and SERVICES below to change what the kiosk shows.
 */
(function () {
  'use strict';

  /* ═══════════ configuración ═══════════ */
  const CONFIG = {
    user: 'Rosa López',
    maxDeposit: 500,          // acceptors switch off once this much is inserted
    dispenseBill: 20,         // the dispenser holds one denomination
    idleResetMs: 90000,
    successResetMs: 25000,
  };

  const CATEGORIES = [
    { id: 'fact', es: 'Facturas',       en: 'Bills',     color: '#5576FF', icon: 'receipt' },
    { id: 'rec',  es: 'Recargas',       en: 'Top-ups',   color: '#2FBFA8', icon: 'phone' },
    { id: 'trf',  es: 'Transferencias', en: 'Transfers', color: '#7B61FF', icon: 'swap' },
    { id: 'imp',  es: 'Impuestos',      en: 'Taxes',     color: '#E8953A', icon: 'bank' },
  ];

  // flow: 'pay' | 'topup' | 'send' | 'out'.  id: how the customer identifies the account.
  const ID = {
    acct:   { es: 'Número de cuenta',     en: 'Account number',   len: 10, fmt: 'plain' },
    nic:    { es: 'NIC',                  en: 'Customer number',  len: 7,  fmt: 'plain' },
    phone:  { es: 'Número de teléfono',   en: 'Phone number',     len: 8,  fmt: 'phone' },
    dui:    { es: 'DUI',                  en: 'ID number (DUI)',  len: 9,  fmt: 'dui' },
    code:   { es: 'Código de remesa',     en: 'Remittance code',  len: 8,  fmt: 'code' },
    mand:   { es: 'Número de mandamiento',en: 'Payment order no.',len: 10, fmt: 'plain' },
    esq:    { es: 'Número de esquela',    en: 'Ticket number',    len: 8,  fmt: 'plain' },
  };

  const SERVICES = [
    // Facturas
    { id: 'luz', cat: 'fact', icon: 'bolt', flow: 'pay', idType: 'nic', base: 18.4,
      es: { n: 'Energía eléctrica', d: 'Factura del mes', inst: 'Distribuidora eléctrica' },
      en: { n: 'Electricity', d: 'Monthly bill', inst: 'Power company' } },
    { id: 'agua', cat: 'fact', icon: 'drop', flow: 'pay', idType: 'acct', base: 9.75,
      es: { n: 'Agua', d: 'Factura del mes', inst: 'Administración de agua' },
      en: { n: 'Water', d: 'Monthly bill', inst: 'Water utility' } },
    { id: 'net', cat: 'fact', icon: 'wifi', flow: 'pay', idType: 'acct', base: 29.9,
      es: { n: 'Internet y cable', d: 'Servicio residencial', inst: 'Proveedor de internet' },
      en: { n: 'Internet & TV', d: 'Home service', inst: 'Internet provider' } },
    { id: 'tc', cat: 'fact', icon: 'card', flow: 'pay', idType: 'acct', base: 45,
      es: { n: 'Tarjeta de crédito', d: 'Pago mínimo o total', inst: 'Banco emisor' },
      en: { n: 'Credit card', d: 'Minimum or full payment', inst: 'Issuing bank' } },
    // Recargas
    { id: 'cel', cat: 'rec', icon: 'phone', flow: 'topup', idType: 'phone',
      amounts: [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 5 }, { a: 10 }],
      es: { n: 'Saldo celular', d: 'Recarga a cualquier operador', inst: 'Recarga de saldo' },
      en: { n: 'Mobile credit', d: 'Any carrier', inst: 'Mobile top-up' } },
    { id: 'datos', cat: 'rec', icon: 'signal', flow: 'topup', idType: 'phone',
      amounts: [{ a: 1, es: '1 día', en: '1 day' }, { a: 3, es: '7 días', en: '7 days' },
                { a: 5, es: '15 días', en: '15 days' }, { a: 10, es: '30 días', en: '30 days' }],
      es: { n: 'Paquete de datos', d: 'Internet en el celular', inst: 'Paquete de datos' },
      en: { n: 'Data bundle', d: 'Mobile internet', inst: 'Data bundle' } },
    // Transferencias
    { id: 'env', cat: 'trf', icon: 'send', flow: 'send', idType: 'phone',
      es: { n: 'Enviar dinero', d: 'A un número de teléfono', inst: 'Envío a teléfono' },
      en: { n: 'Send money', d: 'To a phone number', inst: 'Send to phone' } },
    { id: 'dep', cat: 'trf', icon: 'bank', flow: 'send', idType: 'acct',
      es: { n: 'Depósito a cuenta', d: 'Cuenta bancaria', inst: 'Depósito bancario' },
      en: { n: 'Bank deposit', d: 'Into a bank account', inst: 'Bank deposit' } },
    { id: 'rem', cat: 'trf', icon: 'cash', flow: 'out', idType: 'code', amount: 200,
      sender: 'José López',
      es: { n: 'Cobrar remesa', d: 'Retiro en efectivo', inst: 'Remesa familiar', from: 'Desde Estados Unidos' },
      en: { n: 'Collect remittance', d: 'Cash withdrawal', inst: 'Family remittance', from: 'From the United States' } },
    { id: 'wal', cat: 'trf', icon: 'qr', flow: 'send', idType: 'qr',
      es: { n: 'Cargar billetera', d: 'Escanea el QR de tu app', inst: 'Billetera digital' },
      en: { n: 'Load a wallet', d: 'Scan your app’s QR', inst: 'Digital wallet' } },
    // Impuestos
    { id: 'mun', cat: 'imp', icon: 'bank', flow: 'pay', idType: 'dui', base: 21,
      es: { n: 'Impuestos municipales', d: 'Tasas y contribuciones', inst: 'Alcaldía Municipal' },
      en: { n: 'Municipal taxes', d: 'Local rates and fees', inst: 'City hall' } },
    { id: 'hac', cat: 'imp', icon: 'doc', flow: 'pay', idType: 'mand', base: 64.5,
      es: { n: 'Mandamiento de pago', d: 'Renta, IVA y otros', inst: 'Administración tributaria' },
      en: { n: 'Tax payment order', d: 'Income tax, VAT and more', inst: 'Tax authority' } },
    { id: 'mul', cat: 'imp', icon: 'car', flow: 'pay', idType: 'esq', base: 50,
      es: { n: 'Multas de tránsito', d: 'Con número de esquela', inst: 'Autoridad de tránsito' },
      en: { n: 'Traffic fines', d: 'With the ticket number', inst: 'Traffic authority' } },
    { id: 'sol', cat: 'imp', icon: 'stamp', flow: 'pay', idType: 'dui', base: 3, fixed: true,
      es: { n: 'Solvencias y trámites', d: 'Certificaciones oficiales', inst: 'Oficina de trámites' },
      en: { n: 'Certificates', d: 'Official paperwork', inst: 'Records office' } },
  ];

  /* ═══════════ textos ═══════════ */
  const STR = {
    es: {
      home: 'Inicio', pick: '¿Qué deseas hacer hoy?', pickSub: 'Elige una categoría arriba y luego el servicio.',
      foot: 'Demostración — no se procesa ningún pago real.',
      footMock: 'Modo simulado — usa el panel de abajo a la derecha para ingresar efectivo y leer QR.',
      cancel: 'Cancelar', back: 'Atrás', cont: 'Continuar', done: 'Finalizar',
      typeYour: 'Escribe tu {x}', typeSub: 'Usa el teclado de la pantalla.', clear: 'Borrar',
      scanInstead: 'Escanear código QR', scanTitle: 'Muestra tu código', scanSub: 'Acerca el código QR o de barras a la cámara.',
      scanLooking: 'Buscando código…', k1reader: 'También puedes usar el lector bajo la pantalla.',
      simulate: 'Simular lectura', typeInstead: 'Escribir número',
      found: 'Cuenta encontrada', review: 'Revisa tu pago', holder: 'Titular', period: 'Periodo',
      due: 'Monto a pagar', pay: 'Pagar {x}',
      amountTitle: '¿Cuánto deseas recargar?', other: 'Otro monto', otherSub: 'Lo que ingreses',
      insert: 'Ingresa tu efectivo', insertOpen: 'Ingresa el monto que deseas enviar', toPay: 'A pagar', inserted: 'Ingresado',
      coins: 'Monedas', bills: 'Billetes', missing: 'Falta {x}', excess: 'Excedente {x} · se abona a tu saldo a favor',
      maxReached: 'Monto máximo alcanzado', unknown: 'No reconocido', hwErr: 'No se pudo activar el aceptador de efectivo. Avisa al operador.',
      sendX: 'Enviar {x}', topupX: 'Recargar {x}', min: 'Ingresa al menos $1.00',
      processing: 'Procesando…', sStep1: 'Conectando', sStep2: 'Validando datos', sStep3: 'Confirmando operación',
      paid: 'Pago realizado', toppedUp: 'Recarga exitosa', sent: 'Envío realizado', withdrawn: 'Retiro completado',
      ref: 'Referencia', service: 'Servicio', to: 'Destino', credit: 'Se abonaron {x} a tu saldo a favor',
      remTitle: 'Retira tu remesa', remAvail: 'Remesa disponible', sender: 'Remitente', beneficiary: 'Beneficiario',
      receive: 'Monto a recibir', withdraw: 'Retirar {x}', checking: 'Verificando tu remesa…',
      take: 'Retira tu efectivo', takeSub: '{n} billetes de {b} en la bandeja', took: 'Ya tomé mi efectivo',
      cancelled: 'Operación cancelada. En un kiosco real el efectivo ingresado se devolvería o se abonaría a tu saldo.',
      restart: 'Volverá al inicio automáticamente', month: 'long',
    },
    en: {
      home: 'Home', pick: 'What would you like to do?', pickSub: 'Pick a category above, then a service.',
      foot: 'Demonstration — no real payment is processed.',
      footMock: 'Mock mode — use the panel at bottom right to insert cash and scan QR codes.',
      cancel: 'Cancel', back: 'Back', cont: 'Continue', done: 'Done',
      typeYour: 'Enter your {x}', typeSub: 'Use the on-screen keypad.', clear: 'Clear',
      scanInstead: 'Scan a QR code', scanTitle: 'Show your code', scanSub: 'Hold the QR or barcode up to the camera.',
      scanLooking: 'Looking for a code…', k1reader: 'You can also use the reader below the screen.',
      simulate: 'Simulate scan', typeInstead: 'Type the number',
      found: 'Account found', review: 'Review your payment', holder: 'Account holder', period: 'Period',
      due: 'Amount due', pay: 'Pay {x}',
      amountTitle: 'How much would you like to add?', other: 'Other amount', otherSub: 'Whatever you insert',
      insert: 'Insert your cash', insertOpen: 'Insert the amount you want to send', toPay: 'To pay', inserted: 'Inserted',
      coins: 'Coins', bills: 'Bills', missing: '{x} to go', excess: 'Extra {x} · added to your credit balance',
      maxReached: 'Maximum amount reached', unknown: 'Not recognized', hwErr: 'Could not turn on the cash acceptor. Please call the operator.',
      sendX: 'Send {x}', topupX: 'Top up {x}', min: 'Insert at least $1.00',
      processing: 'Processing…', sStep1: 'Connecting', sStep2: 'Checking details', sStep3: 'Confirming',
      paid: 'Payment complete', toppedUp: 'Top-up complete', sent: 'Transfer sent', withdrawn: 'Withdrawal complete',
      ref: 'Reference', service: 'Service', to: 'To', credit: '{x} added to your credit balance',
      remTitle: 'Collect your remittance', remAvail: 'Remittance available', sender: 'Sender', beneficiary: 'Beneficiary',
      receive: 'Amount to receive', withdraw: 'Withdraw {x}', checking: 'Checking your remittance…',
      take: 'Take your cash', takeSub: '{n} × {b} bills in the tray', took: 'I have my cash',
      cancelled: 'Cancelled. In a real kiosk the inserted cash would be returned or added to your balance.',
      restart: 'Returns to the start automatically', month: 'long',
    },
  };
  let lang = 'es';
  const t = (k, vars) => {
    let s = STR[lang][k] || STR.es[k] || k;
    for (const [a, b] of Object.entries(vars || {})) s = s.replace('{' + a + '}', b);
    return s;
  };
  const L = svc => svc[lang];

  /* ═══════════ iconos (constantes, nunca contenido del usuario) ═══════════ */
  const P = {
    receipt: '<path d="M10 5h28v38l-5-3-5 3-4-3-4 3-5-3-5 3z"/><path d="M17 15h14M17 23h14M17 31h8"/>',
    phone:   '<rect x="14" y="4" width="20" height="40" rx="4"/><path d="M21 37h6"/>',
    swap:    '<path d="M8 16h30l-7-7M40 32H10l7 7"/>',
    bank:    '<path d="M5 18L24 7l19 11"/><path d="M10 18v17M19 18v17M29 18v17M38 18v17"/><path d="M5 40h38"/>',
    bolt:    '<path d="M26 4L10 27h12l-2 17 18-23H26z"/>',
    drop:    '<path d="M24 5s13 14 13 22a13 13 0 01-26 0C11 19 24 5 24 5z"/>',
    wifi:    '<path d="M6 18a26 26 0 0136 0M12 25a17 17 0 0124 0M18 32a8 8 0 0112 0"/><circle cx="24" cy="38" r="1.8"/>',
    card:    '<rect x="5" y="11" width="38" height="26" rx="4"/><path d="M5 19h38M11 30h9"/>',
    signal:  '<path d="M9 38v-6M17 38V26M25 38V19M33 38V12M41 38V6"/>',
    send:    '<path d="M42 6L20 28M42 6L29 42l-9-14-14-9z"/>',
    cash:    '<rect x="5" y="13" width="38" height="22" rx="3"/><circle cx="24" cy="24" r="5"/><path d="M11 19v10M37 19v10"/>',
    qr:      '<rect x="7" y="7" width="13" height="13" rx="2"/><rect x="28" y="7" width="13" height="13" rx="2"/><rect x="7" y="28" width="13" height="13" rx="2"/><path d="M28 28h5v5h-5zM36 36h5v5h-5zM36 28h5M28 41v-3"/>',
    doc:     '<path d="M28 5H13a3 3 0 00-3 3v32a3 3 0 003 3h22a3 3 0 003-3V15z"/><path d="M28 5v10h10M17 25h14M17 33h10"/>',
    car:     '<path d="M8 30l4-11a4 4 0 014-3h16a4 4 0 014 3l4 11v8H8z"/><path d="M8 30h32"/><circle cx="15" cy="35" r="1.5"/><circle cx="33" cy="35" r="1.5"/>',
    stamp:   '<path d="M19 6h10v10l6 6v6H13v-6l6-6z"/><path d="M9 34h30v6H9z"/>',
    back:    '<path d="M30 9L15 24l15 15"/>',
    close:   '<path d="M12 12l24 24M36 12L12 36"/>',
    tick:    '<path d="M10 25l9 9 19-20"/>',
  };
  function icon(name, color, width) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 48 48');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', color || 'currentColor');
    s.setAttribute('stroke-width', width || '3');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = P[name] || '';
    return s;
  }

  /* ═══════════ helpers ═══════════ */
  // Dynamic text always goes through textContent (QR contents are untrusted).
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  }
  const money = n => '$' + Number(n || 0).toFixed(2);
  const round2 = n => Math.round(n * 100) / 100;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const catOf = svc => CATEGORIES.find(c => c.id === svc.cat);
  const fakeRef = () => 'K1-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  function fmtId(digits, type, pad) {
    const spec = ID[type];
    const d = pad ? digits.padEnd(spec.len, '·') : digits;
    if (spec.fmt === 'dui')   return d.length > 8 ? d.slice(0, 8) + '-' + d.slice(8) : d;
    if (spec.fmt === 'phone') return d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d;
    if (spec.fmt === 'code')  return d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d;
    return d;
  }
  const showRef = s => (s.length > 28 ? s.slice(0, 14) + '…' + s.slice(-10) : s);

  // Deterministic demo amount from the account, so the same number always shows the same bill.
  function lookupAmount(svc, ref) {
    if (svc.fixed) return svc.base;
    let x = 0;
    for (const ch of ref) x = (x * 31 + ch.charCodeAt(0)) % 9973;
    return round2(svc.base * (0.8 + (x % 45) / 100));
  }
  function periodLabel() {
    const d = new Date();
    const s = d.toLocaleDateString(lang === 'es' ? 'es-SV' : 'en-US', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ═══════════ estado y pantallas ═══════════ */
  const screen = document.getElementById('screen');
  let tab = CATEGORIES[0].id;
  let S = null;            // current transaction
  let current = null;      // { name, leave }
  let token = 0;           // bumps on every screen change so stale async work stops
  let idleTimer = null;
  let hwOk = false;

  const newSession = svc => ({ svc, ref: '', refShown: '', amount: 0, inserted: 0, items: [], txRef: '', excess: 0 });

  function show(name, ...args) {
    if (current && current.leave) { try { current.leave(); } catch (e) { console.error(e); } }
    token++;
    screen.textContent = '';
    current = { name };
    SCREENS[name](...args);
    armIdle();
  }
  function armIdle() {
    clearTimeout(idleTimer);
    if (current && current.name !== 'home') idleTimer = setTimeout(() => goHome(), CONFIG.idleResetMs);
  }
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, armIdle, { passive: true }));

  function goHome(notice) {
    kiosk.allOff();
    S = null;
    show('home', typeof notice === 'string' ? notice : null);
  }
  function cancel() { goHome(S && S.inserted > 0 ? t('cancelled') : null); }

  /* ───── chrome ───── */
  function homeHeader() {
    const dot = h('div', { class: 'dot' + (hwOk ? ' ok' : '') });
    const langBtn = h('div', { class: 'chipbtn', onclick: () => { lang = lang === 'es' ? 'en' : 'es'; document.documentElement.lang = lang; show('home'); } },
      lang === 'es' ? 'English' : 'Español');
    return h('div', { class: 'hdr' },
      h('div', { class: 'hdr-l' }, brand(), h('div', { class: 'sep' }),
        h('div', null, h('div', { class: 'hdr-t' }, lang === 'es' ? 'Autoservicio' : 'Self-service'), h('div', { class: 'hdr-s' }, t('home')))),
      h('div', { class: 'hdr-r' }, kiosk.mode === 'mock' ? h('div', { class: 'badge' }, 'DEMO') : null, dot, langBtn));
  }
  function brand() { return h('span', { class: 'lock' }, 'K1', h('i', null, ' digital')); }

  function flowHeader(sub, opts) {
    opts = opts || {};
    const svc = S.svc;
    return h('div', { class: 'hdr', style: 'border-bottom:2px solid var(--line);padding-bottom:20px;height:128px' },
      h('div', { class: 'hdr-l' },
        opts.back ? h('div', { class: 'chipbtn sq', onclick: opts.back }, icon('back', '#272B58', '3.4')) : null,
        brand(), h('div', { class: 'sep' }),
        h('div', { style: 'min-width:0' }, h('div', { class: 'hdr-t' }, L(svc).n), h('div', { class: 'hdr-s' }, sub))),
      opts.noCancel ? null : h('div', { class: 'chipbtn', onclick: cancel }, icon('close', null, '3.4'), t('cancel')));
  }
  function tileIcon(name, color) {
    const box = h('div', { class: 'ico', style: '--c:' + color });
    box.appendChild(icon(name, '#fff', '3'));
    return box;
  }
  function instBlock(svc, sub) {
    const c = catOf(svc).color;
    return h('div', { class: 'inst' }, tileIcon(svc.icon, c),
      h('div', null, h('div', { class: 'inst-n' }, L(svc).inst), h('div', { class: 'inst-s' }, sub)));
  }
  const line = (k, v) => h('div', { class: 'line' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));

  function bodyEl() { const b = h('div', { class: 'body' }); screen.appendChild(b); return b; }

  /* ───── processing helper ───── */
  async function runSteps(list) {
    const my = token;
    for (const li of list.children) {
      await sleep(800 + Math.random() * 600);
      if (my !== token) return false;
      li.classList.add('done');
    }
    await sleep(400);
    return my === token;
  }

  /** Turns on the K1 reader and the camera over `box`; resolves with the first code read. */
  function scanQr(box) {
    const my = token;
    kiosk.k1qr.enable(true);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (my === token) kiosk.camera.start(box, { facing: 'front' }); }));
    return new Promise(resolve => {
      const off = kiosk.on('qr', e => {
        if (my !== token) return off();
        off();
        resolve(String(e.text || ''));
      });
      current.leave = () => { off(); kiosk.camera.stop(); kiosk.k1qr.enable(false); };
    });
  }

  function afterIdentified() {
    const f = S.svc.flow;
    if (f === 'pay')   { S.amount = lookupAmount(S.svc, S.ref); return show('detail'); }
    if (f === 'topup') return show('amount');
    if (f === 'send')  { S.amount = 0; return show('cash'); }
    if (f === 'out')   { S.amount = S.svc.amount; return show('remittance'); }
  }

  /* ═══════════ SCREENS ═══════════ */
  const SCREENS = {

    home(notice) {
      screen.appendChild(homeHeader());
      const cat = CATEGORIES.find(c => c.id === tab);
      screen.appendChild(h('div', { class: 'tabs' }, CATEGORIES.map(c => {
        const el = h('div', { class: 'tab' + (c.id === tab ? ' on' : ''), style: '--c:' + c.color,
          onclick: () => { if (tab !== c.id) { tab = c.id; show('home'); } } });
        el.append(icon(c.icon, null, '3'), h('span', null, c[lang]));
        return el;
      })));
      const b = bodyEl();
      if (notice) b.appendChild(h('div', { class: 'notice' }, notice));
      b.append(
        h('h1', null, cat[lang]),
        h('div', { class: 'sub' }, t('pickSub')),
        h('div', { class: 'grid' }, SERVICES.filter(s => s.cat === tab).map(s =>
          h('div', { class: 'tile', style: '--c:' + cat.color, onclick: () => start(s) },
            tileIcon(s.icon, cat.color),
            h('div', null, h('div', { class: 'tt' }, L(s).n), h('div', { class: 'ts' }, L(s).d))))),
        h('div', { class: 'grow' }),
        h('div', { class: 'foot' }, kiosk.mode === 'mock' ? t('footMock') : t('foot')));
    },

    ident() {
      const svc = S.svc, spec = ID[svc.idType];
      screen.appendChild(flowHeader(spec[lang], { back: () => goHome() }));
      const b = bodyEl();
      const val = h('div', { class: 'field-v ph' });
      const field = h('div', { class: 'field' }, val);
      const go = h('div', { class: 'btn off', onclick: () => { S.refShown = fmtId(S.ref, svc.idType); afterIdentified(); } }, t('cont'));
      function paint() {
        const full = S.ref.length >= spec.len;
        val.textContent = fmtId(S.ref, svc.idType, true);
        val.className = 'field-v' + (S.ref.length ? '' : ' ph');
        field.className = 'field' + (full ? ' ok' : '');
        go.className = 'btn' + (full ? '' : ' off');
      }
      const press = k => {
        if (k === 'del') S.ref = S.ref.slice(0, -1);
        else if (k === 'clr') S.ref = '';
        else if (S.ref.length < spec.len) S.ref += k;
        paint();
      };
      const keys = h('div', { class: 'keys' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => h('div', { class: 'key', onclick: () => press(k) }, k)),
        h('div', { class: 'key fn', onclick: () => press('clr') }, t('clear')),
        h('div', { class: 'key', onclick: () => press('0') }, '0'),
        h('div', { class: 'key fn', onclick: () => press('del') }, '⌫'));
      const scanBtn = h('div', { class: 'btn ghost', onclick: () => show('scan') }, icon('qr', '#5576FF', '3'), t('scanInstead'));
      b.append(h('h1', null, t('typeYour', { x: spec[lang] })), field, keys, h('div', { class: 'btns' }, scanBtn, go));
      paint();
    },

    scan() {
      const svc = S.svc;
      const qrOnly = svc.idType === 'qr';
      screen.appendChild(flowHeader(qrOnly ? 'QR' : ID[svc.idType][lang], { back: () => (qrOnly ? goHome() : show('ident')) }));
      const b = bodyEl();
      const cam = h('div', { class: 'cam' });   // native camera picture lands exactly here
      const reader = h('div', { class: 'k1qr' }, icon('qr', '#2FBFA8', '3'), t('k1reader'));
      b.append(
        h('h1', null, t('scanTitle')),
        h('div', { class: 'sub' }, t('scanSub')),
        h('div', { class: 'scanwrap' }, cam, h('div', { class: 'scan-hint live' }, t('scanLooking')), reader),
        h('div', { class: 'row2' },
          qrOnly ? null : h('div', { class: 'btn ghost', onclick: () => show('ident') }, t('typeInstead')),
          h('div', { class: 'btn ghost', onclick: () => accept(demoRef()) }, t('simulate'))));
      function demoRef() {
        if (svc.idType === 'qr') return 'k1wallet:demo-' + Math.random().toString(36).slice(2, 10);
        return Array.from({ length: ID[svc.idType].len }, (_, i) => String((i * 7 + 3) % 10)).join('');
      }
      function accept(text) {
        // From the camera or K1 reader: take digits if the code is numeric, otherwise keep the text.
        const digits = text.replace(/\D/g, '');
        if (svc.idType !== 'qr' && digits.length >= 4) {
          S.ref = digits.slice(-ID[svc.idType].len);
          S.refShown = fmtId(S.ref, svc.idType);
        } else {
          S.ref = text;
          S.refShown = showRef(text);
        }
        afterIdentified();
      }
      scanQr(cam).then(accept);
    },

    detail() {
      const svc = S.svc;
      screen.appendChild(flowHeader(t('review'), { back: () => show('ident') }));
      const b = bodyEl();
      b.append(
        h('div', { class: 'step' }, h('b'), t('found')),
        h('h1', { style: 'margin-top:8px' }, t('review')),
        h('div', { class: 'stack' },
          h('div', { class: 'card' }, instBlock(svc, L(svc).d)),
          h('div', { class: 'card' },
            line(t('holder'), CONFIG.user),
            line(ID[svc.idType][lang], S.refShown),
            svc.fixed ? null : line(t('period'), periodLabel())),
          h('div', { class: 'total' }, h('div', { class: 'total-k' }, t('due')), h('div', { class: 'total-v' }, money(S.amount)))),
        h('div', { class: 'grow' }),
        h('div', { class: 'btn', onclick: () => show('cash') }, t('pay', { x: money(S.amount) })));
    },

    amount() {
      const svc = S.svc, c = catOf(svc).color;
      screen.appendChild(flowHeader(fmtId(S.ref, 'phone'), { back: () => show('ident') }));
      const b = bodyEl();
      b.append(
        h('h1', null, t('amountTitle')),
        h('div', { class: 'sub' }, L(svc).inst + ' · ' + S.refShown),
        h('div', { class: 'amts' },
          svc.amounts.map(o => h('div', { class: 'amt-b', style: '--c:' + c, onclick: () => { S.amount = o.a; show('cash'); } },
            h('b', null, money(o.a).replace('.00', '')), o[lang] ? h('span', null, o[lang]) : null)),
          h('div', { class: 'amt-b open', style: '--c:' + c, onclick: () => { S.amount = 0; show('cash'); } },
            h('b', null, t('other')), h('span', null, t('otherSub')))),
        h('div', { class: 'grow' }));
    },

    cash() {
      const svc = S.svc;
      const open = !(S.amount > 0);           // open amount: whatever is inserted
      const backTo = svc.flow === 'pay' ? 'detail' : svc.flow === 'topup' ? 'amount' : 'ident';
      // Going back with money inside would lose it, so the back arrow disappears once cash is in.
      const backFn = () => (S.inserted > 0 ? null : show(backTo));
      screen.appendChild(flowHeader(lang === 'es' ? 'Efectivo' : 'Cash', { back: backFn }));
      const b = bodyEl();
      const vIn = h('div', { class: 'pv' }, money(S.inserted));
      const coinSlot = h('div', { class: 'slot' }, h('i'), t('coins'));
      const billSlot = h('div', { class: 'slot' }, h('i'), t('bills'));
      const chips = h('div', { class: 'chips' });
      const status = h('div');
      const action = svc.flow === 'pay' ? 'pay' : svc.flow === 'topup' ? 'topupX' : 'sendX';
      const go = h('div', { class: 'btn off', onclick: finish });

      b.append(
        h('h1', null, open ? t('insertOpen') : t('insert')),
        h('div', { class: 'sub' }, L(svc).inst + ' · ' + S.refShown),
        h('div', { class: 'pair' },
          open ? null : h('div', { class: 'pbox a' }, h('div', { class: 'pk' }, t('toPay')), h('div', { class: 'pv' }, money(S.amount))),
          h('div', { class: 'pbox b' }, h('div', { class: 'pk' }, t('inserted')), vIn)),
        h('div', { class: 'accept' }, h('div', { class: 'slots' }, coinSlot, billSlot), chips, status),
        go);

      function paint() {
        vIn.textContent = money(S.inserted);
        const backBtn = screen.querySelector('.chipbtn.sq');
        if (backBtn) backBtn.style.visibility = S.inserted > 0 ? 'hidden' : '';
        const ready = open ? S.inserted >= 1 : S.inserted >= S.amount;
        const charge = open ? S.inserted : S.amount;
        go.textContent = t(action, { x: money(charge) });
        go.className = 'btn' + (ready ? '' : ' off');
        status.textContent = '';
        if (S.inserted >= CONFIG.maxDeposit) status.appendChild(h('div', { class: 'pill' }, t('maxReached')));
        else if (open) { if (!ready) status.appendChild(h('div', { class: 'falta' }, t('min'))); }
        else if (!ready) status.appendChild(h('div', { class: 'falta' }, t('missing', { x: money(S.amount - S.inserted) })));
        else if (S.inserted > S.amount) status.appendChild(h('div', { class: 'pill' }, t('excess', { x: money(S.inserted - S.amount) })));
        // stop taking money once this payment is covered (fixed amount) or the cap is reached
        if ((!open && ready) || S.inserted >= CONFIG.maxDeposit) { kiosk.coins.enable(false); kiosk.bills.enable(false); }
      }
      function finish() {
        S.excess = open ? 0 : round2(S.inserted - S.amount);
        if (open) S.amount = S.inserted;
        show('processing');
      }

      const offCash = kiosk.on('cash', e => {
        if (e.amount == null) { chips.appendChild(h('span', { class: 'cchip bad' }, t('unknown'))); return; }
        S.inserted = round2(S.inserted + e.amount);
        S.items.push(e);
        chips.appendChild(h('span', { class: 'cchip ' + e.kind }, e.amount < 1 ? Math.round(e.amount * 100) + '¢' : money(e.amount).replace('.00', '')));
        vIn.classList.remove('bump'); void vIn.offsetWidth; vIn.classList.add('bump');
        paint();
      });
      const offStatus = kiosk.on('status', s => {
        coinSlot.className = 'slot' + (s.coins ? ' on' : '');
        billSlot.className = 'slot' + (s.bills ? ' on' : '');
      });
      const my = token;
      Promise.all([kiosk.coins.enable(true), kiosk.bills.enable(true)]).then(res => {
        if (my !== token) return;
        const bad = res.find(r => !['ok', 'success'].includes(r.status));
        if (bad) status.replaceChildren(h('div', { class: 'err' }, t('hwErr')));
      });
      current.leave = () => { offCash(); offStatus(); kiosk.coins.enable(false); kiosk.bills.enable(false); };
      paint();
    },

    async processing() {
      screen.appendChild(flowHeader(t('processing'), { noCancel: true }));
      const b = bodyEl();
      const list = h('ul', { class: 'steps' },
        [t('sStep1'), t('sStep2'), t('sStep3')].map(s => h('li', null, h('i'), s)));
      b.append(h('div', { class: 'mid' }, h('div', { class: 'spinner' }),
        h('h1', null, S.svc.flow === 'out' ? t('checking') : t('processing')), list));
      if (await runSteps(list)) {
        S.txRef = fakeRef();
        show(S.svc.flow === 'out' ? 'take' : 'done');
      }
    },

    remittance() {
      const svc = S.svc;
      screen.appendChild(flowHeader(t('remAvail'), { back: () => show('ident') }));
      const b = bodyEl();
      b.append(
        h('div', { class: 'step' }, h('b'), t('remAvail')),
        h('h1', { style: 'margin-top:8px' }, t('remTitle')),
        h('div', { class: 'stack' },
          h('div', { class: 'card' }, instBlock(svc, L(svc).from)),
          h('div', { class: 'card' },
            line(t('sender'), svc.sender),
            line(t('beneficiary'), CONFIG.user),
            line(ID[svc.idType][lang], S.refShown)),
          h('div', { class: 'total' }, h('div', { class: 'total-k' }, t('receive')), h('div', { class: 'total-v' }, money(S.amount)))),
        h('div', { class: 'grow' }),
        h('div', { class: 'btn', onclick: () => show('processing') }, t('withdraw', { x: money(S.amount) })));
    },

    take() {
      // No dispenser API: the operator presses the dispenser button once per bill.
      const n = Math.ceil(S.amount / CONFIG.dispenseBill);
      const bill = money(CONFIG.dispenseBill).replace('.00', '');
      screen.appendChild(flowHeader(t('take'), { noCancel: true }));
      const b = bodyEl();
      b.append(h('div', { class: 'mid' },
        h('h1', null, t('take')),
        h('div', { class: 'notes' },
          Array.from({ length: Math.min(n, 5) }, (_, i) => h('div', { class: 'note', style: 'animation-delay:' + i * 0.12 + 's' }, bill)),
          h('div', { class: 'tray' })),
        h('div', { class: 'sub', style: 'font-size:28px;font-weight:600;color:var(--ink)' }, t('takeSub', { n, b: bill }))),
        h('div', { class: 'btn', onclick: () => show('done') }, t('took')));
    },

    done() {
      const svc = S.svc, f = svc.flow;
      const title = f === 'pay' ? 'paid' : f === 'topup' ? 'toppedUp' : f === 'out' ? 'withdrawn' : 'sent';
      screen.appendChild(flowHeader(lang === 'es' ? 'Completado' : 'Complete', { noCancel: true }));
      const b = bodyEl();
      const tick = h('div', { class: 'tick' }); tick.appendChild(icon('tick', '#2FBFA8', '3.6'));
      b.append(h('div', { class: 'mid' },
        tick,
        h('h1', null, t(title)),
        h('div', { class: 'big' }, money(S.amount)),
        h('div', { class: 'card receipt' },
          line(t('service'), L(svc).inst),
          line(f === 'send' || f === 'topup' ? t('to') : ID[svc.idType] ? ID[svc.idType][lang] : 'QR', S.refShown),
          f === 'out' ? line(t('beneficiary'), CONFIG.user) : null,
          line(t('ref'), S.txRef)),
        S.excess > 0 ? h('div', { class: 'pill' }, t('credit', { x: money(S.excess) })) : null,
        h('div', { class: 'restart' }, t('restart'))),
        h('div', { class: 'btn', onclick: () => goHome() }, t('done')));
      const timer = setTimeout(() => goHome(), CONFIG.successResetMs);
      current.leave = () => clearTimeout(timer);
    },
  };

  function start(svc) {
    S = newSession(svc);
    show(svc.idType === 'qr' ? 'scan' : 'ident');
  }

  /* ═══════════ hardware events & scaling ═══════════ */
  kiosk.on('status', s => {
    hwOk = !!(s.usb && s.k1Alive);
    const d = screen.querySelector('.dot');
    if (d) d.className = 'dot' + (hwOk ? ' ok' : '');
  });
  kiosk.on('reset', () => goHome());
  kiosk.on('camera', e => { if (e.state === 'error') console.warn('camera:', e.message); });

  function fit() {
    const s = Math.min(window.innerWidth / 800, window.innerHeight / 1280);
    screen.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);
  fit();
  kiosk.ready.then(info => console.log('kiosk ready', info));
  goHome();
})();
