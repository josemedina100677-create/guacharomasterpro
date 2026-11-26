const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const FRANJAS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM"
];

const EJES_CLASICOS = new Set(["02", "12", "19", "28", "30", "39", "53", "74"]);

const NOMBRES_77 = {
  "0": "Delfín", "00": "Ballena", "01": "Carnero", "02": "Toro", "03": "Ciempiés",
  "04": "Alacrán", "05": "León", "06": "Rana", "07": "Perico", "08": "Ratón",
  "09": "Águila", "10": "Tigre", "11": "Gato", "12": "Caballo", "13": "Mono",
  "14": "Paloma", "15": "Zorro", "16": "Oso", "17": "Pavo", "18": "Burro",
  "19": "Chivo", "20": "Cochino", "21": "Gallo", "22": "Camello", "23": "Cebra",
  "24": "Iguana", "25": "Gallina", "26": "Vaca", "27": "Perro", "28": "Zamuro",
  "29": "Elefante", "30": "Caimán", "31": "Lapa", "32": "Ardilla", "33": "Pescado",
  "34": "Venado", "35": "Jirafa", "36": "Culebra", "37": "Tortuga", "38": "Búfalo",
  "39": "Lechuza", "40": "Avispa", "41": "Canguro", "42": "Tucán", "43": "Mariposa",
  "44": "Chigüire", "45": "Garza", "46": "Puma", "47": "Pavo Real", "48": "Puercoespín",
  "49": "Pereza", "50": "Canario", "51": "Pelícano", "52": "Pulpo", "53": "Caracol",
  "54": "Grillo", "55": "Oso Hormiguero", "56": "Tiburón", "57": "Pato", "58": "Hormiga",
  "59": "Pantera", "60": "Camaleón", "61": "Panda", "62": "Cachicamo", "63": "Cangrejo",
  "64": "Gavilán", "65": "Araña", "66": "Lobo", "67": "Avestruz", "68": "Jaguar",
  "69": "Conejo", "70": "Bisonte", "71": "Guacamaya", "72": "Gorila", "73": "Hipopótamo",
  "74": "Turpial", "75": "Guácharo"
};

function normalizarTexto(str = "") {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const NOMBRE_A_CODIGO = Object.fromEntries(
  Object.entries(NOMBRES_77).map(([cod, nom]) => [normalizarTexto(nom), cod])
);

function calcularEspejo(cod) {
  if (cod === "0") return "00";
  if (cod === "00") return "0";
  const inv = cod.padStart(2, "0").split("").reverse().join("");
  return NOMBRES_77[inv] ? inv : cod;
}

function calcularDespeje(cod) {
  if (cod === "0" || cod === "00") return "75";
  const num = parseInt(cod, 10);
  const res = 76 - num;
  if (res < 0 || res > 75) return cod;
  return res === 0 ? "0" : String(res).padStart(2, "0");
}

function resolverMarca(entrada) {
  const limpio = String(entrada || "").trim();
  const matchCod = limpio.match(/^(00|0|[1-9]|[1-6][0-9]|7[0-5])\b/);
  let codigo = null;

  if (matchCod) {
    const raw = matchCod[1];
    codigo = (raw === "0" || raw === "00") ? raw : raw.padStart(2, "0");
  } else {
    const norm = normalizarTexto(limpio);
    for (const [nombreKey, cod] of Object.entries(NOMBRE_A_CODIGO)) {
      if (norm.includes(nombreKey)) {
        codigo = cod;
        break;
      }
    }
  }

  if (!codigo || !NOMBRES_77[codigo]) return null;
  return {
    codigo,
    nombre: NOMBRES_77[codigo],
    espejo: calcularEspejo(codigo),
    despeje: calcularDespeje(codigo),
    eje_clasico: EJES_CLASICOS.has(codigo)
  };
}

const db = {
  jornadas: {},
  ordenFechas: [],
  anomalias: [],
  pronosticos: {}
};

function recalcularMotor(fechaActual) {
  const fechasCerradas = db.ordenFechas.filter(f => db.jornadas[f]?.cerrada);
  const ventana7 = fechasCerradas.slice(-7);
  const bloque4Sem = fechasCerradas.slice(-28);

  const freqMes = {};
  for (const f of bloque4Sem) {
    for (const s of Object.values(db.jornadas[f].sorteos)) {
      freqMes[s.codigo] = (freqMes[s.codigo] || 0) + 1;
    }
  }
  const maxFreqMes = Math.max(0, ...Object.values(freqMes));
  const senalMes = (bloque4Sem.length >= 7 && maxFreqMes >= 4) ? "ALTA" : "BAJA";
  const multMes = senalMes === "ALTA" ? 1.1 : 0.9;

  const freq7 = {};
  for (const f of ventana7) {
    for (const s of Object.values(db.jornadas[f].sorteos)) {
      freq7[s.codigo] = (freq7[s.codigo] || 0) + 1;
    }
  }

  const jornadaHoy = db.jornadas[fechaActual] || { sorteos: {} };
  const sorteosHoy = Object.values(jornadaHoy.sorteos);
  const freqHoy = {};
  for (const s of sorteosHoy) freqHoy[s.codigo] = (freqHoy[s.codigo] || 0) + 1;

  const fechaAyer = db.ordenFechas[db.ordenFechas.indexOf(fechaActual) - 1];
  const codigosAyer = new Set(
    fechaAyer ? Object.values(db.jornadas[fechaAyer]?.sorteos || {}).map(x => x.codigo) : []
  );

  const candidatos = Object.entries(NOMBRES_77).map(([codigo, nombre]) => {
    let factores = 0;
    let score = 0;

    const c7 = freq7[codigo] || 0;
    if (c7 > 0) {
      factores += 1;
      score += Math.min(c7 * 12, 48) * multMes;
      if (c7 >= 4) score -= (c7 - 3) * 8;
    }

    if ((freqMes[codigo] || 0) >= 2 && c7 > 0) {
      factores += 1;
      score += 15;
    }

    if (codigosAyer.has(codigo)) {
      factores += 1;
      score += 14;
    }

    const cHoy = freqHoy[codigo] || 0;
    if (cHoy === 2) {
      score -= 32;
      if (codigosAyer.has(codigo)) score -= 12;
    } else if (cHoy >= 3) {
      score -= 45;
      if (codigosAyer.has(codigo)) score -= 12;
    }

    return {
      codigo,
      nombre,
      score: Math.round(score),
      factores_activos: factores,
      presencia_ventana: c7 > 0,
      eje_clasico: EJES_CLASICOS.has(codigo),
      bloqueado_fija: cHoy >= 2
    };
  }).sort((a, b) => b.score - a.score);

  const aptasFijas = candidatos.filter(c => !c.bloqueado_fija);
  let numFijas = 2;
  if (aptasFijas.slice(0, 3).every(c => c.score >= 54 && c.factores_activos >= 3)) {
    numFijas = 3;
  } else if (aptasFijas[0]?.score >= 55 && aptasFijas[0]?.factores_activos >= 3 && (aptasFijas[1]?.score || 0) < 50) {
    numFijas = 1;
  } else if (aptasFijas.slice(0, 2).every(c => c.score >= 50 && c.factores_activos >= 2)) {
    numFijas = 2;
  } else {
    numFijas = 1;
  }

  const fijas = aptasFijas.slice(0, numFijas).map(m => ({
    ...m,
    es_fija: true,
    motivo: `Score ${m.score} con ${m.factores_activos} factores activos`
  }));

  const seisMarcas = [];
  let ejesUsados = 0;

  for (const m of fijas) {
    seisMarcas.push({
      ...m,
      es_fija: true,
      pronostico_fuerte: m.factores_activos >= 2 && m.presencia_ventana
    });
    if (m.eje_clasico) ejesUsados += 1;
  }

  for (const m of candidatos) {
    if (seisMarcas.length >= 6) break;
    if (seisMarcas.some(x => x.codigo === m.codigo)) continue;
    if (m.eje_clasico && ejesUsados >= 4) continue;
    seisMarcas.push({
      ...m,
      es_fija: false,
      pronostico_fuerte: m.factores_activos >= 2 && m.presencia_ventana
    });
    if (m.eje_clasico) ejesUsados += 1;
  }

  const pronostico = {
    fecha: fechaActual,
    senal_mensual: { estado: senalMes, dias_procesados: bloque4Sem.length },
    fijas,
    pronostico_ciego_6: seisMarcas.map((x, idx) => ({ orden: idx + 1, ...x })),
    ejes_clasicos_usados: ejesUsados
  };

  db.pronosticos[fechaActual] = pronostico;
  return pronostico;
}

app.post("/api/sorteos", (req, res) => {
  const { fecha, franja, entrada } = req.body;
  if (!fecha || !FRANJAS.includes(franja)) {
    return res.status(400).json({ ok: false, error: "Fecha o franja inválida" });
  }
  const marca = resolverMarca(entrada);
  if (!marca) {
    return res.status(400).json({ ok: false, error: "Marca no reconocida en el catálogo de 77 entradas" });
  }

  if (!db.jornadas[fecha]) {
    db.jornadas[fecha] = { fecha, sorteos: {}, cerrada: false, rotada: false };
    db.ordenFechas.push(fecha);
  }

  let diasPausa = null;
  for (let i = db.ordenFechas.length - 1; i >= 0; i--) {
    const fPrev = db.ordenFechas[i];
    if (fPrev === fecha) continue;
    const salio = Object.values(db.jornadas[fPrev].sorteos).some(s => s.codigo === marca.codigo);
    if (salio) {
      diasPausa = db.ordenFechas.length - 1 - i;
      break;
    }
  }

  db.jornadas[fecha].sorteos[franja] = marca;

  const conteoHoy = Object.values(db.jornadas[fecha].sorteos).filter(s => s.codigo === marca.codigo).length;
  const anomaliasHoy = [];
  if (conteoHoy >= 2) {
    anomaliasHoy.push({
      tipo: conteoHoy >= 3 ? "repeticion_intradia_3plus" : "repeticion_intradia_2",
      codigo: marca.codigo,
      nombre: marca.nombre,
      ajuste_puntos: conteoHoy >= 3 ? -45 : -32
    });
  }
  if (diasPausa !== null && diasPausa >= 5) {
    anomaliasHoy.push({
      tipo: diasPausa >= 10 ? "latencia_extrema_10d" : "marca_fria_5d",
      codigo: marca.codigo,
      nombre: marca.nombre,
      pausa_dias: diasPausa
    });
  }
  db.anomalias.push({ fecha, franja, anomalias: anomaliasHoy });

  const totalFranjas = Object.keys(db.jornadas[fecha].sorteos).length;
  if (franja === "07:00 PM" || totalFranjas === 12) {
    db.jornadas[fecha].cerrada = true;
    db.jornadas[fecha].rotada = true;
  }

  const pronostico = recalcularMotor(fecha);
  res.json({
    ok: true,
    jornada: db.jornadas[fecha],
    sorteo_normalizado: { ...marca, dias_desde_ultima_vez: diasPausa },
    anomalias_detectadas: anomaliasHoy,
    pronostico
  });
});

app.get("/api/estado-actual", (req, res) => {
  const fecha = req.query.fecha || db.ordenFechas[db.ordenFechas.length - 1] || "2026-11-26";
  const pronostico = db.pronosticos[fecha] || recalcularMotor(fecha);
  res.json({
    ok: true,
    jornada: db.jornadas[fecha] || { fecha, sorteos: {}, cerrada: false, rotada: false },
    pronostico
  });
});

app.get("/", (req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Guácharo Master Pro V2.9.10</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 16px; }
    .card { background: #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
    input, select, button { width: 100%; padding: 10px; margin-top: 8px; border-radius: 8px; border: 1px solid #334155; font-size: 15px; box-sizing: border-box; }
    input, select { background: #0f172a; color: #fff; }
    button { background: #22c55e; color: #052e16; font-weight: 700; cursor: pointer; border: none; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 12px; background: #334155; margin-left: 6px; }
    .fuerte { background: #16a34a; color: #fff; }
  </style>
</head>
<body>
  <h2>Guácharo Master Pro (V2.9.10)</h2>

  <div class="card">
    <h3>Registrar Sorteo en Tiempo Real</h3>
    <input id="fecha" type="date" value="2026-11-26" />
    <select id="franja">
      <option>08:00 AM</option><option>09:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
      <option>12:00 PM</option><option>01:00 PM</option><option>02:00 PM</option><option>03:00 PM</option>
      <option>04:00 PM</option><option>05:00 PM</option><option selected>06:00 PM</option><option>07:00 PM</option>
    </select>
    <input id="entrada" type="text" placeholder="Ej: 02 Toro o 22 Camello" />
    <button onclick="enviarSorteo()">Enviar y Recalcular</button>
    <div id="estado-jornada" style="margin-top:10px; font-size:13px; color:#cbd5e1;"></div>
  </div>

  <div class="card">
    <h3>Fijas Elegidas por el Motor</h3>
    <div id="fijas">Sin calcular aún</div>
  </div>

  <div class="card">
    <h3>Pronóstico Ciego (6 Marcas)</h3>
    <div id="seis">Sin calcular aún</div>
  </div>

  <script>
    async function cargarEstado() {
      const fecha = document.getElementById("fecha").value;
      const res = await fetch("/api/estado-actual?fecha=" + encodeURIComponent(fecha));
      const data = await res.json();
      if (data.ok) {
        renderJornada(data.jornada);
        renderPronostico(data.pronostico);
      }
    }

    async function enviarSorteo() {
      const payload = {
        fecha: document.getElementById("fecha").value,
        franja: document.getElementById("franja").value,
        entrada: document.getElementById("entrada").value
      };
      const res = await fetch("/api/sorteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.ok) return alert(data.error);
      document.getElementById("entrada").value = "";
      renderJornada(data.jornada);
      renderPronostico(data.pronostico);
    }

    function renderJornada(j) {
      const count = Object.keys(j.sorteos || {}).length;
      document.getElementById("estado-jornada").textContent =
        "Jornada " + j.fecha + " · " + count + "/12 franjas · Estado: " + (j.cerrada ? "Cerrada y rotada" : "En curso");
    }

    function renderPronostico(p) {
      document.getElementById("fijas").innerHTML = (p.fijas || []).map(f =>
        "<div><b>" + f.codigo + " " + f.nombre + "</b> <span class='badge'>" + f.motivo + "</span></div>"
      ).join("") || "Ninguna";

      document.getElementById("seis").innerHTML = (p.pronostico_ciego_6 || []).map(m =>
        "<div>" + m.orden + ". <b>" + m.codigo + " " + m.nombre + "</b> (" + m.score + " pts)" +
        (m.es_fija ? " <span class='badge'>FIJA</span>" : "") +
        (m.pronostico_fuerte ? " <span class='badge fuerte'>Pronóstico fuerte</span>" : "") + "</div>"
      ).join("");
    }

    cargarEstado();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log("Guácharo Master Pro API activa en puerto " + PORT);
});
  
