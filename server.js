const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'draws_history.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. CATALOGO CANONICO DE 77 ENTRADAS (0, 00 y 01-75)
const CATALOGO_77 = [
  { code: '0', name: 'Delfín' },
  { code: '00', name: 'Ballena' },
  { code: '01', name: 'Carnero' },
  { code: '02', name: 'Toro' },
  { code: '03', name: 'Ciempiés' },
  { code: '04', name: 'Alacrán' },
  { code: '05', name: 'León' },
  { code: '06', name: 'Rana' },
  { code: '07', name: 'Perico' },
  { code: '08', name: 'Ratón' },
  { code: '09', name: 'Águila' },
  { code: '10', name: 'Tigre' },
  { code: '11', name: 'Gato' },
  { code: '12', name: 'Caballo' },
  { code: '13', name: 'Mono' },
  { code: '14', name: 'Paloma' },
  { code: '15', name: 'Zorro' },
  { code: '16', name: 'Oso' },
  { code: '17', name: 'Pavo' },
  { code: '18', name: 'Burro' },
  { code: '19', name: 'Chivo' },
  { code: '20', name: 'Cochino' },
  { code: '21', name: 'Gallo' },
  { code: '22', name: 'Camello' },
  { code: '23', name: 'Cebra' },
  { code: '24', name: 'Iguana' },
  { code: '25', name: 'Gallina' },
  { code: '26', name: 'Vaca' },
  { code: '27', name: 'Perro' },
  { code: '28', name: 'Zamuro' },
  { code: '29', name: 'Elefante' },
  { code: '30', name: 'Caimán' },
  { code: '31', name: 'Lapa' },
  { code: '32', name: 'Ardilla' },
  { code: '33', name: 'Pescado' },
  { code: '34', name: 'Venado' },
  { code: '35', name: 'Jirafa' },
  { code: '36', name: 'Culebra' },
  { code: '37', name: 'Tortuga' },
  { code: '38', name: 'Búfalo' },
  { code: '39', name: 'Lechuza' },
  { code: '40', name: 'Avispa' },
  { code: '41', name: 'Canguro' },
  { code: '42', name: 'Tucán' },
  { code: '43', name: 'Mariposa' },
  { code: '44', name: 'Chigüire' },
  { code: '45', name: 'Garza' },
  { code: '46', name: 'Puma' },
  { code: '47', name: 'Pavo Real' },
  { code: '48', name: 'Puercoespín' },
  { code: '49', name: 'Pereza' },
  { code: '50', name: 'Canario' },
  { code: '51', name: 'Pelícano' },
  { code: '52', name: 'Pulpo' },
  { code: '53', name: 'Caracol' },
  { code: '54', name: 'Grillo' },
  { code: '55', name: 'Oso Hormiguero' },
  { code: '56', name: 'Tiburón' },
  { code: '57', name: 'Pato' },
  { code: '58', name: 'Hormiga' },
  { code: '59', name: 'Pantera' },
  { code: '60', name: 'Camaleón' },
  { code: '61', name: 'Panda' },
  { code: '62', name: 'Cachicamo' },
  { code: '63', name: 'Cangrejo' },
  { code: '64', name: 'Gavilán' },
  { code: '65', name: 'Araña' },
  { code: '66', name: 'Lobo' },
  { code: '67', name: 'Avestruz' },
  { code: '68', name: 'Jaguar' },
  { code: '69', name: 'Conejo' },
  { code: '70', name: 'Bisonte' },
  { code: '71', name: 'Guacamaya' },
  { code: '72', name: 'Gorila' },
  { code: '73', name: 'Hipopótamo' },
  { code: '74', name: 'Turpial' },
  { code: '75', name: 'Guácharo' }
];

const FRANJAS_12 = [
  '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM',
  '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
];

const OPPOSITE_FRANJA = {
  '08:00 AM': '07:00 PM',
  '09:00 AM': '06:00 PM',
  '10:00 AM': '05:00 PM',
  '11:00 AM': '04:00 PM',
  '12:00 PM': '03:00 PM',
  '01:00 PM': '02:00 PM',
  '02:00 PM': '01:00 PM',
  '03:00 PM': '12:00 PM',
  '04:00 PM': '11:00 AM',
  '05:00 PM': '10:00 AM',
  '06:00 PM': '09:00 AM',
  '07:00 PM': '08:00 AM'
};

const EJES_CLASICOS = new Set(['02', '12', '30', '39', '53', '74', '19', '28']);

function stripAccents(str = '') {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

const byCode = new Map(CATALOGO_77.map(item => [item.code, item]));
const byName = new Map(CATALOGO_77.map(item => [stripAccents(item.name), item]));

function normalizeAnimal(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const cleaned = rawInput.trim();
  if (!cleaned) return null;

  const codeMatch = cleaned.match(/^(00|0|[0-7]?\d)\b/);
  if (codeMatch) {
    const rawCode = codeMatch[1];
    const normalizedCode = rawCode === '0' || rawCode === '00'
      ? rawCode
      : String(parseInt(rawCode, 10)).padStart(2, '0');
    if (byCode.has(normalizedCode)) return byCode.get(normalizedCode);
  }

  const withoutLeadingNum = cleaned.replace(/^(00|0|[0-7]?\d)\s*[-:.]?\s*/i, '');
  const normName = stripAccents(withoutLeadingNum || cleaned);
  if (byName.has(normName)) return byName.get(normName);

  for (const item of CATALOGO_77) {
    const n = stripAccents(item.name);
    if (normName.includes(n) || n.includes(normName)) return item;
  }
  return null;
}

function getEspejo(code) {
  if (code === '0') return '00';
  if (code === '00') return '0';
  const rev = code.split('').reverse().join('');
  return byCode.has(rev) ? rev : null;
}

function getDespeje(code) {
  if (code === '0' || code === '00') return '75';
  const num = parseInt(code, 10);
  const diff = 76 - num;
  if (diff >= 1 && diff <= 75) return String(diff).padStart(2, '0');
  return null;
}

function normalizeDateStr(input) {
  if (!input) return '2026-11-26';
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[/-]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '2026-11-26';
}

function toDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

function loadHistory() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(parsed.draws)) return parsed.draws;
    }
  } catch (e) {
    console.error('Error leyendo historial:', e.message);
  }
  return [];
}

function saveHistory(draws) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ draws }, null, 2));
  } catch (e) {
    console.error('Error guardando historial:', e.message);
  }
}

function sortDrawsChronologically(draws) {
  return [...draws].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return FRANJAS_12.indexOf(a.franja) - FRANJAS_12.indexOf(b.franja);
  });
}

function computeEngine(draws, activeDate) {
  const ordered = sortDrawsChronologically(draws);
  const uniqueDates = [...new Set(ordered.map(d => d.date))];
  const currentDate = activeDate || (uniqueDates[uniqueDates.length - 1] || '2026-11-26');
  const todayDraws = ordered.filter(d => d.date === currentDate);
  const franjasCount = todayDraws.length;
  const closedAndRotated = franjasCount >= 12;

  const prevDates = uniqueDates.filter(d => d < currentDate);
  const prevDate = prevDates[prevDates.length - 1] || null;
  const prevDayDraws = prevDate ? ordered.filter(d => d.date === prevDate) : [];

  const window7Dates = new Set(uniqueDates.slice(-7));
  const window7Draws = ordered.filter(d => window7Dates.has(d.date));

  const month28Dates = new Set(uniqueDates.slice(-28));
  const month28Draws = ordered.filter(d => month28Dates.has(d.date));

  const freq28 = new Map();
  for (const item of CATALOGO_77) freq28.set(item.code, 0);
  for (const d of month28Draws) freq28.set(d.code, (freq28.get(d.code) || 0) + 1);
  const activeCodes28 = [...freq28.values()].filter(c => c > 0).length;
  const maxFreq28 = Math.max(0, ...freq28.values());
  const monthlySignal = (month28Draws.length >= 168 && activeCodes28 >= 45 && maxFreq28 >= 7) ? 'ALTA' : 'BAJA';

  const freq7 = new Map();
  const days7Presence = new Map();
  const lastIndexIn7 = new Map();
  for (const item of CATALOGO_77) {
    freq7.set(item.code, 0);
    days7Presence.set(item.code, new Set());
  }
  window7Draws.forEach((d, idx) => {
    freq7.set(d.code, (freq7.get(d.code) || 0) + 1);
    days7Presence.get(d.code).add(d.date);
    lastIndexIn7.set(d.code, idx);
  });

  const freqToday = new Map();
  for (const d of todayDraws) freqToday.set(d.code, (freqToday.get(d.code) || 0) + 1);

  const prevDayCodes = new Set(prevDayDraws.map(d => d.code));
  const lastDraw = ordered[ordered.length - 1] || null;
  const openingToday = todayDraws.find(d => d.franja === '08:00 AM') || null;
  const closingToday = todayDraws.find(d => d.franja === '07:00 PM') || null;

  const nextFranja = FRANJAS_12[Math.min(franjasCount, FRANJAS_12.length - 1)];
  const oppositeFranja = OPPOSITE_FRANJA[nextFranja] || '07:00 PM';
  const symCodes = new Set(
    window7Draws
      .filter(d => d.franja === oppositeFranja || (closedAndRotated && d.franja === '07:00 PM'))
      .map(d => d.code)
  );

  const seqTargets = new Set();
  const latentTargets = new Set();
  const anchorCode = lastDraw ? lastDraw.code : null;
  const prevAnchorCode = ordered.length >= 2 ? ordered[ordered.length - 2].code : null;

  for (let i = 0; i < window7Draws.length - 1; i++) {
    const curr = window7Draws[i];
    const next = window7Draws[i + 1];
    if (anchorCode && curr.code === anchorCode) seqTargets.add(next.code);
    if (i + 2 < window7Draws.length) {
      const afterNext = window7Draws[i + 2];
      if (prevAnchorCode && curr.code === prevAnchorCode) latentTargets.add(afterNext.code);
      if (anchorCode && curr.code === anchorCode) latentTargets.add(afterNext.code);
    }
  }

  const mirrorTargets = new Set();
  const despejeTargets = new Set();
  const referenceCodes = [
    ...(lastDraw ? [lastDraw.code] : []),
    ...(openingToday ? [openingToday.code] : []),
    ...(closingToday ? [closingToday.code] : [])
  ];
  for (const c of referenceCodes) {
    const esp = getEspejo(c);
    const desp = getDespeje(c);
    if (esp) mirrorTargets.add(esp);
    if (desp) despejeTargets.add(desp);
  }

  let auditedHits = 0;
  let auditedDays = 0;
  for (let i = 1; i < uniqueDates.length; i++) {
    const dPrev = uniqueDates[i - 1];
    const dCurr = uniqueDates[i];
    const drawsPrev = ordered.filter(x => x.date <= dPrev);
    const drawsCurr = ordered.filter(x => x.date === dCurr);
    if (drawsCurr.length >= 12) {
      auditedDays += 1;
      const lastPrevCode = drawsPrev[drawsPrev.length - 1]?.code;
      const hitCodes = new Set(drawsCurr.map(x => x.code));
      if (lastPrevCode && (hitCodes.has(lastPrevCode) || hitCodes.has(getEspejo(lastPrevCode)) || hitCodes.has(getDespeje(lastPrevCode)))) {
        auditedHits += 1;
      }
    }
  }

  const scored = CATALOGO_77.map(item => {
    const c = item.code;
    const f7 = freq7.get(c) || 0;
    const d7 = days7Presence.get(c).size;
    const fToday = freqToday.get(c) || 0;
    const isAxis = EJES_CLASICOS.has(c);
    const isRebote = prevDayCodes.has(c);
    const isMirror = mirrorTargets.has(c);
    const isDespeje = despejeTargets.has(c);
    const isSymmetry = symCodes.has(c);
    const isSeq = seqTargets.has(c);
    const isLatent = latentTargets.has(c);

    const lastIdx = lastIndexIn7.has(c) ? lastIndexIn7.get(c) : -1;
    const gapDraws = lastIdx >= 0 ? (window7Draws.length - 1 - lastIdx) : window7Draws.length;
    const isCycleDue = f7 >= 1 && gapDraws >= 6 && gapDraws <= 24;

    let score = 0;
    let factors = 0;
    const reasons = [];

    if (f7 >= 2) {
      score += f7 * 4;
      factors += 1;
      reasons.push(`Ventana 7d (${f7}x en ${d7}d)`);
    } else if (f7 === 1) {
      score += 2;
      reasons.push('Presencia 7d (1x)');
    }

    if (isAxis) {
      score += 3;
      factors += 1;
      reasons.push('Eje Clásico');
    }

    if (isRebote) {
      score += 3;
      factors += 1;
      reasons.push('Rebote día previo');
    }

    if (isMirror) {
      score += 3;
      factors += 1;
      reasons.push('Puente Espejo');
    }

    if (isDespeje) {
      score += 3;
      factors += 1;
      reasons.push('Puente Despeje');
    }

    if (isSymmetry) {
      score += 2;
      factors += 1;
      reasons.push(`Simetría horaria (${oppositeFranja})`);
    }

    if (isSeq) {
      score += 2;
      factors += 1;
      reasons.push('Secuencia A -> B');
    }

    if (isLatent) {
      score += 2;
      factors += 1;
      reasons.push('Patrón latente A -> _ -> C');
    }

    if (isCycleDue) {
      score += 2;
      reasons.push(`Ciclo/latencia (${gapDraws} sorteos)`);
    }

    if (monthlySignal === 'BAJA' && f7 >= 3) {
      score -= 2;
      reasons.push('Moderación señal mensual BAJA');
    }

    if (fToday >= 2) {
      score -= 6 * fToday;
      reasons.push(`Moderación intradía (${fToday}x hoy)`);
    } else if (fToday === 1) {
      score -= 2;
      reasons.push('Salida hoy (1x)');
    }

    if (f7 >= 4) {
      score -= 4;
      reasons.push('Amortiguador anti-saturación (7d)');
    }

    const fuerte = factors >= 2 && d7 >= 1;
    return {
      ...item,
      score,
      factors,
      days7: d7,
      freq7: f7,
      isAxis,
      fuerte,
      reasons
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.factors !== a.factors) return b.factors - a.factors;
    return a.code.localeCompare(b.code);
  });

  const blind6 = [];
  let axisCount = 0;
  for (const cand of scored) {
    if (blind6.length >= 6) break;
    if (cand.isAxis && axisCount >= 4) continue;
    blind6.push(cand);
    if (cand.isAxis) axisCount += 1;
  }

  const strongCandidates = blind6.filter(x => x.fuerte);
  let desiredFixedCount = 1;
  if (strongCandidates.length >= 4 && todayDraws.length > 0) {
    desiredFixedCount = 3;
  } else if (strongCandidates.length >= 2) {
    desiredFixedCount = 2;
  }

  const fijas = blind6.slice(0, desiredFixedCount).map((item, idx) => ({
    ...item,
    fixedLabel: `FIJA ${idx + 1}`,
    justification: item.reasons.length ? item.reasons.join(' · ') : 'Balance técnico de señal activa'
  }));
  const fixedCodes = new Set(fijas.map(f => f.code));

  const openingCandidates = scored
    .filter(x => (!prevDayCodes.has(x.code) || x.isRebote) && (freqToday.get(x.code) || 0) === 0)
    .slice(0, 3);

  const zeroDayDiagnostic = ordered.length === 0
    ? 'Historial en cero: ingrese sorteos para activar cálculos de 7d y 28d.'
    : (todayDraws.length === 0
      ? `Día cero sin registros cargados para ${currentDate}; se proyecta con base en histórico previo.`
      : (strongCandidates.length === 0
        ? `Jornada ${currentDate} sin candidatos con >=2 factores en ventana activa; se aplica balance descriptivo.`
        : `Jornada ${currentDate} activa con ${strongCandidates.length} marcas de pronóstico fuerte y ${axisCount}/4 ejes clásicos.`));

  return {
    currentDate,
    displayDate: toDisplayDate(currentDate),
    franjasCount,
    closedAndRotated,
    totalDraws: ordered.length,
    window7Count: window7Draws.length,
    month28Count: month28Draws.length,
    monthlySignal,
    fijas,
    fixedCodes,
    blind6,
    openingCandidates,
    todayDraws,
    auditedHits,
    auditedDays,
    zeroDayDiagnostic
  };
}

function renderPage(state, message = '') {
  const nextFranja = FRANJAS_12[Math.min(state.franjasCount, FRANJAS_12.length - 1)];
  const statusText = state.closedAndRotated
    ? `Jornada ${state.currentDate} · 12/12 franjas · Estado: Cerrada y rotada`
    : `Jornada ${state.currentDate} · ${state.franjasCount}/12 franjas · Estado: En curso`;

  const franjaOptions = FRANJAS_12.map(f =>
    `<option value="${f}" ${f === nextFranja ? 'selected' : ''}>${f}</option>`
  ).join('');

  const fijasHtml = state.fijas.map(f => `
    <div style="margin-bottom:10px;">
      <strong>${f.code} ${f.name}</strong>
      <span class="badge">Score ${f.score} con ${f.factors} factores activos</span>
      <div class="subnote">${f.fixedLabel}: ${f.justification}</div>
    </div>
  `).join('');

  const blindHtml = state.blind6.map((b, i) => {
    const isFixed = state.fixedCodes.has(b.code);
    return `
      <li style="margin-bottom:6px;">
        <strong>${i + 1}. ${b.code} ${b.name} (${b.score} pts)</strong>
        ${isFixed ? '<span class="tag-fija">FIJA</span>' : ''}
        ${b.fuerte ? '<span class="tag-fuerte">Pronóstico fuerte</span>' : ''}
        <div class="subnote">${b.reasons.join(' · ') || 'Señal base'}</div>
      </li>
    `;
  }).join('');

  const openingHtml = state.openingCandidates.map(o =>
    `<span class="chip">${o.code} ${o.name} (${o.score} pts)</span>`
  ).join(' ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0b1120" />
  <link rel="manifest" href="/manifest.json" />
  <title>Guácharo Master Pro (V2.9.10)</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body { margin: 0; background: #090e1a; color: #f1f5f9; padding: 16px; }
    .container { max-width: 780px; margin: 0 auto; }
    h1 { margin: 0 0 14px; font-size: 1.65rem; }
    .card { background: #131c31; border: 1px solid #22304d; border-radius: 14px; padding: 18px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 1.2rem; }
    label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 4px; }
    select, input[type="text"], textarea {
      width: 100%; padding: 11px 12px; border-radius: 8px; border: 1px solid #2b3a5c;
      background: #0d1526; color: #f8fafc; font-size: 1rem; margin-bottom: 12px;
    }
    textarea { min-height: 90px; font-size: 0.9rem; }
    button {
      width: 100%; padding: 12px; border: none; border-radius: 8px;
      background: #22c55e; color: #052e16; font-weight: 700; font-size: 1rem; cursor: pointer;
    }
    button:hover { background: #16a34a; }
    button.secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; margin-top: 4px; }
    .status { margin-top: 10px; font-size: 0.9rem; color: #cbd5e1; }
    .badge { background: #1e293b; color: #e2e8f0; padding: 3px 8px; border-radius: 999px; font-size: 0.8rem; margin-left: 6px; }
    .tag-fija { background: #334155; color: #f8fafc; padding: 2px 7px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; margin-left: 6px; }
    .tag-fuerte { background: #14532d; color: #86efac; padding: 2px 7px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-left: 6px; }
    .subnote { font-size: 0.8rem; color: #94a3b8; margin-top: 2px; }
    ol { padding-left: 20px; margin: 0; }
    .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .stat-box { background: #0d1526; border: 1px solid #22304d; border-radius: 10px; padding: 10px; }
    .stat-val { font-size: 1.05rem; font-weight: 700; color: #38bdf8; }
    .chip { display: inline-block; background: #0d1526; border: 1px solid #2b3a5c; padding: 5px 10px; border-radius: 8px; margin: 3px 4px 0 0; font-size: 0.85rem; }
    .msg { background: #1e3a8a; color: #dbeafe; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 0.9rem; }
    .disclaimer { font-size: 0.78rem; color: #94a3b8; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Guácharo Master Pro (V2.9.10)</h1>

    ${message ? `<div class="msg">${message}</div>` : ''}

    <div class="card">
      <h2>Registrar Sorteo en Tiempo Real</h2>
      <form method="POST" action="/registrar">
        <label for="fecha">Fecha (DD/MM/YYYY o YYYY-MM-DD)</label>
        <input id="fecha" name="fecha" type="text" value="${state.displayDate}" required />

        <label for="franja">Franja Horaria (12 Ciclos)</label>
        <select id="franja" name="franja">${franjaOptions}</select>

        <label for="animal">Animal o Número (0, 00 o 01–75)</label>
        <input id="animal" name="animal" type="text" placeholder="Ej: 12 Caballo o 00 Ballena" required />

        <button type="submit">Guardar y Actualizar</button>
      </form>
      <div class="status">${statusText}</div>
      <div class="subnote">${state.zeroDayDiagnostic}</div>
    </div>

    <div class="card">
      <h2>Carga Rápida por Lote</h2>
      <form method="POST" action="/registrar-lote">
        <label for="lote_fecha">Fecha por defecto (opcional si viene en cada línea)</label>
        <input id="lote_fecha" name="lote_fecha" type="text" value="${state.displayDate}" />

        <label for="lote_texto">Una línea por sorteo (ej: 08:00 AM - 12 Caballo)</label>
        <textarea id="lote_texto" name="lote_texto" placeholder="08:00 AM - 12 Caballo&#10;09:00 AM - 05 León"></textarea>

        <button type="submit" class="secondary">Procesar Lote</button>
      </form>
    </div>

    <div class="card">
      <h2>Fijas del Día</h2>
      ${fijasHtml}
    </div>

    <div class="card">
      <h2>Pronóstico Blindado (Top 6)</h2>
      <ol>${blindHtml}</ol>
    </div>

    <div class="card">
      <h2>Candidatos de Apertura / Rotación</h2>
      <div>${openingHtml || '<span class="subnote">Sin candidatos pendientes</span>'}</div>
    </div>

    <div class="card">
      <h2>Ventanas y Auditoría</h2>
      <div class="grid-stats">
        <div class="stat-box">
          <div class="subnote">Ventana 7d</div>
          <div class="stat-val">${state.window7Count} sorteos</div>
        </div>
        <div class="stat-box">
          <div class="subnote">Señal 28d</div>
          <div class="stat-val">${state.monthlySignal} (${state.month28Count})</div>
        </div>
        <div class="stat-box">
          <div class="subnote">Histórico total</div>
          <div class="stat-val">${state.totalDraws} registros</div>
        </div>
        <div class="stat-box">
          <div class="subnote">Auditoría días cerrados</div>
          <div class="stat-val">${state.auditedHits}/${state.auditedDays}</div>
        </div>
      </div>
      <div class="disclaimer">Nota: Cada sorteo es un evento aleatorio independiente; las métricas y ponderaciones evalúan patrones descriptivos sin garantizar resultados futuros.</div>
    </div>
  </div>
</body>
</html>`;
}

app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'Guácharo Master Pro',
    short_name: 'Guácharo Pro',
    start_url: '/',
    display: 'standalone',
    background_color: '#090e1a',
    theme_color: '#0b1120'
  });
});

app.get('/', (req, res) => {
  const draws = loadHistory();
  const state = computeEngine(draws, req.query.fecha ? normalizeDateStr(req.query.fecha) : null);
  res.send(renderPage(state));
});

app.post('/registrar', (req, res) => {
  const draws = loadHistory();
  const date = normalizeDateStr(req.body.fecha);
  const franja = FRANJAS_12.includes(req.body.franja) ? req.body.franja : '08:00 AM';
  const animal = normalizeAnimal(req.body.animal);

  if (!animal) {
    const state = computeEngine(draws, date);
    return res.status(400).send(renderPage(state, 'Animal o código no reconocido en el catálogo de 77 entradas.'));
  }

  const filtered = draws.filter(d => !(d.date === date && d.franja === franja));
  filtered.push({ date, franja, code: animal.code, name: animal.name });
  saveHistory(filtered);

  const state = computeEngine(filtered, date);
  res.send(renderPage(state, `Registrado ${date} ${franja} -> ${animal.code} ${animal.name}.`));
});

app.post('/registrar-lote', (req, res) => {
  const draws = loadHistory();
  const defaultDate = normalizeDateStr(req.body.lote_fecha);
  const lines = String(req.body.lote_texto || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let added = 0;

  for (const line of lines) {
    const franjaMatch = line.match(/\b(0?[89]|1[0-2]|0?1|0?2|0?3|0?4|0?5|0?6|0?7):00\s*(AM|PM)\b/i);
    let franja = FRANJAS_12[Math.min(draws.filter(d => d.date === defaultDate).length, FRANJAS_12.length - 1)];
    if (franjaMatch) {
      const hr = String(parseInt(franjaMatch[1], 10)).padStart(2, '0');
      const ap = franjaMatch[2].toUpperCase();
      const candFranja = `${hr}:00 ${ap}`;
      if (FRANJAS_12.includes(candFranja)) franja = candFranja;
    }

    const dateMatch = line.match(/\b(\d{2,4}[/-]\d{1,2}[/-]\d{2,4})\b/);
    const date = dateMatch ? normalizeDateStr(dateMatch[1]) : defaultDate;

    const cleanedForAnimal = line
      .replace(/\b(\d{2,4}[/-]\d{1,2}[/-]\d{2,4})\b/g, '')
      .replace(/\b(0?[89]|1[0-2]|0?1|0?2|0?3|0?4|0?5|0?6|0?7):00\s*(AM|PM)\b/gi, '')
      .replace(/^[\s\-–—:|]+|[\s\-–—:|]+$/g, '')
      .trim();

    const animal = normalizeAnimal(cleanedForAnimal) || normalizeAnimal(line);
    if (animal) {
      const idx = draws.findIndex(d => d.date === date && d.franja === franja);
      const entry = { date, franja, code: animal.code, name: animal.name };
      if (idx >= 0) draws[idx] = entry;
      else draws.push(entry);
      added += 1;
    }
  }

  saveHistory(draws);
  const state = computeEngine(draws, defaultDate);
  res.send(renderPage(state, `Lote procesado: ${added} sorteo(s) guardado(s).`));
});

app.listen(PORT, () => {
  console.log(`Guácharo Master Pro (V2.9.10) escuchando en puerto ${PORT}`);
});
