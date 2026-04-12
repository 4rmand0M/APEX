/**
 * APEX FITNESS — analisis.js
 * Drawer de Análisis activado desde el menú ⋮ de workout.html.
 *
 * Requiere:
 *  - Chart.js 4.x cargado antes de este script
 *  - analisis.css enlazado en el <head>
 *  - drawer-analisis.html pegado en el body de workout.html
 *  - El botón del dropdown con id="btn-abrir-analisis"
 *
 * BACKEND: cada sección marcada con // BACKEND indica
 * el endpoint REST que debe reemplazar los datos mock.
 */

'use strict';

/* ════════════════════════════
   DATOS MOCK
   ════════════════════════════ */

// BACKEND: GET /analytics/summary?user_id={id}&period={p}
const DA_RESUMEN = {
  '7d':  { sesiones:6,  series:78,  volumen:'12.4k', prs:4,  racha:7,  tiempo:'4h 50m', dSes:'+2', dSer:'+8',  dVol:'+1.8k', dPr:'+4',  dRac:'mejor', dTie:'+40m' },
  '30d': { sesiones:24, series:312, volumen:'48.2k', prs:11, racha:7,  tiempo:'18h 40m',dSes:'+3', dSer:'=',   dVol:'+6.1k', dPr:'+4',  dRac:'mejor', dTie:'+2h'  },
  '3m':  { sesiones:68, series:880, volumen:'136k',  prs:22, racha:14, tiempo:'52h',    dSes:'+10',dSer:'+90', dVol:'+20k', dPr:'+8',  dRac:'mejor', dTie:'+6h'  },
  '6m':  { sesiones:120,series:1560,volumen:'241k',  prs:35, racha:14, tiempo:'94h',    dSes:'+15',dSer:'+120',dVol:'+35k', dPr:'+12', dRac:'=',     dTie:'+10h' },
  '1y':  { sesiones:210,series:2730,volumen:'420k',  prs:58, racha:14, tiempo:'162h',   dSes:'+30',dSer:'+200',dVol:'+60k', dPr:'+18', dRac:'mejor', dTie:'+18h' },
  'all': { sesiones:350,series:4550,volumen:'700k',  prs:90, racha:14, tiempo:'270h',   dSes:'+',  dSer:'+',   dVol:'+',    dPr:'+',   dRac:'-',     dTie:'+'    },
};

// BACKEND: GET /analytics/frequency?user_id={id}&period={p}
const DA_FRECUENCIA = {
  '7d':  { labels:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'], datos:[1,0,1,1,0,1,0], prom:'4.0' },
  '30d': { labels:['S1','S2','S3','S4'],                       datos:[4,3,5,4],        prom:'4.0' },
  '3m':  { labels:['Ene','Feb','Mar'],                          datos:[22,20,26],       prom:'4.5' },
  '6m':  { labels:['Oct','Nov','Dic','Ene','Feb','Mar'],        datos:[18,20,22,22,20,26],prom:'4.4'},
  '1y':  { labels:['Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic','Ene','Feb','Mar'], datos:[14,18,16,20,22,18,18,20,22,22,20,26],prom:'4.2'},
  'all': { labels:['2024','2025','2026'],                       datos:[120,170,60],     prom:'4.3' },
};

// BACKEND: GET /analytics/volume-by-muscle?user_id={id}&period={p}
const DA_VOLUMEN_MUSCULO = [
  { nombre:'Espalda',   color:'#7EB8A4', pct:82, valor:'18,540 lbs' },
  { nombre:'Pecho',     color:'#5CB85C', pct:68, valor:'15,340 lbs' },
  { nombre:'Hombro',    color:'#5B9BD5', pct:45, valor:'10,120 lbs' },
  { nombre:'Bíceps',    color:'#5CB85C', pct:38, valor:'8,580 lbs'  },
  { nombre:'Tríceps',   color:'#9B59B6', pct:30, valor:'6,760 lbs'  },
  { nombre:'Piernas',   color:'#48C9B0', pct:22, valor:'4,960 lbs'  },
  { nombre:'Trapecios', color:'#5CB85C', pct:15, valor:'3,380 lbs'  },
  { nombre:'Antebrazos',color:'#5B9BD5', pct: 9, valor:'2,040 lbs'  },
];

// BACKEND: GET /analytics/exercise-progress?user_id={id}&exercise_id={eid}&period={p}
const DA_PROGRESION = {
  'ej-001': { nombre:'Jalón Al Pecho Neutro',    color:'#7EB8A4', pr:'120 lbs', labels:['02 Mar','06 Mar','10 Mar','14 Mar','17 Mar','20 Mar'], pesos:[100,105,110,110,115,120] },
  'ej-002': { nombre:'Remo Cerrado En Polea',    color:'#7EB8A4', pr:'133 lbs', labels:['03 Mar','07 Mar','11 Mar','15 Mar','18 Mar','20 Mar'], pesos:[111,111,120,120,128,133] },
  'ej-003': { nombre:'Jalón Unilateral C/Polea', color:'#7EB8A4', pr:'45 lbs',  labels:['02 Mar','08 Mar','14 Mar','20 Mar'],                   pesos:[35,40,40,45]            },
  'ej-004': { nombre:'Curl Bíceps Mancuerna',    color:'#5CB85C', pr:'22 lbs',  labels:['01 Mar','06 Mar','12 Mar','17 Mar','20 Mar'],           pesos:[17.5,20,20,22,22]       },
  'ej-006': { nombre:'Press Inclinado Mancuerna',color:'#5CB85C', pr:'45 lbs',  labels:['02 Mar','07 Mar','12 Mar','17 Mar','19 Mar'],           pesos:[35,37.5,40,42.5,45]     },
  'ej-007': { nombre:'Apertura De Pecho Maquina',color:'#5CB85C', pr:'110 lbs', labels:['03 Mar','08 Mar','13 Mar','18 Mar','19 Mar'],           pesos:[80,90,90,100,110]       },
  'ej-010': { nombre:'Elevaciones Laterales',    color:'#5B9BD5', pr:'11 lbs',  labels:['04 Mar','09 Mar','14 Mar','19 Mar'],                    pesos:[8,8,10,11]              },
};

/* ════════════════════════════
   ESTADO
   ════════════════════════════ */
let daPeriodo   = '7d';
let daEjercicio = 'ej-001';
let daGrafFrec  = null;
let daGrafProg  = null;
let daAbierto   = false;

/* ════════════════════════════
   HELPERS
   ════════════════════════════ */
const $  = id  => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

const esOscuro = () => document.documentElement.dataset.tema === 'oscuro';

const temaChart = () => ({
  grid:    esOscuro() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  labels:  esOscuro() ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
  tipBg:   esOscuro() ? '#1a1a1a' : '#ffffff',
  tipTxt:  esOscuro() ? '#f0f0f0' : '#111111',
});

const acento = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#C8FF00';

/* ════════════════════════════
   ABRIR / CERRAR DRAWER
   ════════════════════════════ */
const abrirDrawerAnalisis = () => {
  const drawer  = $('drawer-analisis');
  const overlay = $('overlay-global');
  if (!drawer) return;

  daAbierto = true;
  drawer.classList.remove('oculto');
  // pequeño delay para que la transición funcione tras display:flex
  requestAnimationFrame(() => {
    requestAnimationFrame(() => drawer.classList.add('abierto'));
  });

  if (overlay) {
    overlay.classList.remove('oculto');
    overlay.style.zIndex = '190';
  }

  // Renderizar todo la primera vez
  renderKpis();
  renderGrafFrecuencia();
  renderBarrasVolumen();
  renderGrafProgresion();
  renderHeatmap();
};

const cerrarDrawerAnalisis = () => {
  const drawer  = $('drawer-analisis');
  const overlay = $('overlay-global');
  if (!drawer) return;

  daAbierto = false;
  drawer.classList.remove('abierto');

  const fin = () => {
    drawer.classList.add('oculto');
    drawer.removeEventListener('transitionend', fin);
  };
  drawer.addEventListener('transitionend', fin);

  if (overlay) {
    overlay.classList.add('oculto');
    overlay.style.zIndex = '';
  }
};

/* ════════════════════════════
   KPIs
   ════════════════════════════ */
const renderKpis = () => {
  const d = DA_RESUMEN[daPeriodo];
  if (!d) return;

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  const setDelta = (id, val, cls) => {
    const el = $(id);
    if (!el) return;
    el.textContent = val;
    el.className = 'da-kpi-delta ' + cls;
  };

  set('da-kpi-sesiones', d.sesiones);
  set('da-kpi-series',   d.series);
  set('da-kpi-volumen',  d.volumen);
  set('da-kpi-prs',      d.prs);
  set('da-kpi-racha',    d.racha + 'd');
  set('da-kpi-tiempo',   d.tiempo);

  const signo = v => v && v[0] === '+' ? 'pos' : v === '=' ? 'neu' : 'neg';
  setDelta('da-delta-sesiones', d.dSes, signo(d.dSes));
  setDelta('da-delta-series',   d.dSer, signo(d.dSer));
  setDelta('da-delta-volumen',  d.dVol, signo(d.dVol));
  setDelta('da-delta-prs',      d.dPr,  signo(d.dPr));
  setDelta('da-delta-racha',    d.dRac, 'pos');
  setDelta('da-delta-tiempo',   d.dTie, signo(d.dTie));
};

/* ════════════════════════════
   GRÁFICO FRECUENCIA
   ════════════════════════════ */
const renderGrafFrecuencia = () => {
  const canvas = $('da-grafico-frecuencia');
  if (!canvas) return;

  const { grid, labels: lbl, tipBg, tipTxt } = temaChart();
  const d = DA_FRECUENCIA[daPeriodo];
  const ac = acento();

  const cfg = {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: 'Días',
        data: d.datos,
        backgroundColor: ac + '55',
        borderColor: ac,
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tipBg,
          titleColor: tipTxt,
          bodyColor: tipTxt,
          borderColor: 'rgba(128,128,128,0.2)',
          borderWidth: 1,
          callbacks: { label: c => ` ${c.raw} día${c.raw !== 1 ? 's' : ''}` }
        }
      },
      scales: {
        x: { grid: { color: grid }, ticks: { color: lbl, font: { family:'DM Sans', size:10 } }, border:{ display:false } },
        y: { beginAtZero:true, grid: { color: grid }, ticks: { color: lbl, font:{ family:'DM Sans', size:10 }, precision:0 }, border:{ display:false } }
      }
    }
  };

  if (daGrafFrec) {
    daGrafFrec.data.labels = d.labels;
    daGrafFrec.data.datasets[0].data = d.datos;
    daGrafFrec.update();
  } else {
    daGrafFrec = new Chart(canvas, cfg);
  }

  const metaEl = $('da-meta-freq');
  if (metaEl) metaEl.textContent = d.prom + ' días/sem prom.';
};

/* ════════════════════════════
   BARRAS VOLUMEN POR MÚSCULO
   ════════════════════════════ */
const renderBarrasVolumen = () => {
  const lista = $('da-barras-lista');
  if (!lista) return;

  lista.innerHTML = '';
  DA_VOLUMEN_MUSCULO.forEach(m => {
    const div = document.createElement('div');
    div.className = 'da-barra-fila';
    div.innerHTML = `
      <span class="da-mv-dot" style="--c:${m.color}"></span>
      <span class="da-mv-nombre">${m.nombre}</span>
      <div class="da-mv-barra-wrap">
        <div class="da-mv-barra" style="--p:${m.pct}%;--c:${m.color}"></div>
      </div>
      <span class="da-mv-valor">${m.valor}</span>
    `;
    lista.appendChild(div);
  });
};

/* ════════════════════════════
   GRÁFICO PROGRESIÓN
   ════════════════════════════ */
const renderGrafProgresion = () => {
  const canvas = $('da-grafico-progresion');
  if (!canvas) return;

  const { grid, labels: lbl, tipBg, tipTxt } = temaChart();
  const ej = DA_PROGRESION[daEjercicio];

  const cfg = {
    type: 'line',
    data: {
      labels: ej.labels,
      datasets: [{
        label: 'Peso máx.',
        data: ej.pesos,
        borderColor: ej.color,
        backgroundColor: ej.color + '22',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: ej.color,
        pointBorderColor: esOscuro() ? '#1a1a1a' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tipBg,
          titleColor: tipTxt,
          bodyColor: tipTxt,
          borderColor: 'rgba(128,128,128,0.2)',
          borderWidth: 1,
          callbacks: { label: c => ` ${c.raw} lbs` }
        }
      },
      scales: {
        x: { grid:{ color:grid }, ticks:{ color:lbl, font:{ family:'DM Sans', size:10 }, maxRotation:30 }, border:{ display:false } },
        y: { grid:{ color:grid }, ticks:{ color:lbl, font:{ family:'DM Sans', size:10 }, callback: v => v + ' lbs' }, border:{ display:false } }
      }
    }
  };

  if (daGrafProg) {
    daGrafProg.data.labels = ej.labels;
    daGrafProg.data.datasets[0].data   = ej.pesos;
    daGrafProg.data.datasets[0].borderColor     = ej.color;
    daGrafProg.data.datasets[0].backgroundColor = ej.color + '22';
    daGrafProg.data.datasets[0].pointBackgroundColor = ej.color;
    daGrafProg.update();
  } else {
    daGrafProg = new Chart(canvas, cfg);
  }

  // Badge PR y selector
  const badge = $('da-pr-badge');
  if (badge) badge.textContent = 'PR — ' + ej.pr;

  const nombre = $('da-sel-nombre');
  if (nombre) nombre.textContent = ej.nombre;

  const dot = document.getElementById('da-sel-dot');
  if (dot) dot.style.background = ej.color;
};

/* ════════════════════════════
   HEATMAP
   ════════════════════════════ */
const renderHeatmap = () => {
  const wrap = $('da-heatmap-wrap');
  if (!wrap) return;

  // Generar datos mock para el año actual
  const hoy    = new Date();
  const inicio = new Date(hoy.getFullYear(), 0, 1);
  const mapaFechas = new Map();

  for (let d = new Date(inicio); d <= hoy; d.setDate(d.getDate() + 1)) {
    const nivel = (d.getDay() !== 0 && Math.random() > 0.42)
      ? Math.ceil(Math.random() * 4)
      : 0;
    mapaFechas.set(new Date(d).toDateString(), nivel);
  }

  // Alinear inicio a lunes
  const cursor = new Date(inicio);
  while (cursor.getDay() !== 1) cursor.setDate(cursor.getDate() - 1);

  const grid = document.createElement('div');
  grid.className = 'da-hm-grid';

  let semana = null;
  const cur  = new Date(cursor);

  while (cur <= hoy) {
    if (cur.getDay() === 1 || !semana) {
      semana = document.createElement('div');
      semana.className = 'da-hm-semana';
      grid.appendChild(semana);
    }

    const dia   = document.createElement('div');
    dia.className = 'da-hm-dia';
    const nivel = mapaFechas.get(cur.toDateString()) ?? 0;
    const futuro = cur > hoy;

    if (futuro) {
      dia.style.opacity = '0';
      dia.style.pointerEvents = 'none';
    } else {
      dia.dataset.nivel = nivel;
      const label = cur.toLocaleDateString('es-ES', { day:'numeric', month:'short' });
      dia.title = nivel > 0 ? `${label} · nivel ${nivel}` : label;
    }

    semana.appendChild(dia);
    cur.setDate(cur.getDate() + 1);
  }

  wrap.innerHTML = '';
  wrap.appendChild(grid);
  requestAnimationFrame(() => { wrap.scrollLeft = wrap.scrollWidth; });

  const totalEntrenados = [...mapaFechas.values()].filter(v => v > 0).length;
  const metaEl = $('da-meta-heatmap');
  if (metaEl) metaEl.textContent = totalEntrenados + ' días entrenados';
};

/* ════════════════════════════
   FILTROS DE PERÍODO
   ════════════════════════════ */
const initFiltros = () => {
  $$('.da-filtro').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.da-filtro').forEach(b => { b.classList.remove('activo'); b.setAttribute('aria-selected','false'); });
      btn.classList.add('activo');
      btn.setAttribute('aria-selected','true');
      daPeriodo = btn.dataset.periodo;
      renderKpis();
      renderGrafFrecuencia();
    });
  });
};

/* ════════════════════════════
   SELECTOR DE EJERCICIO
   ════════════════════════════ */
const initSelectorEjercicio = () => {
  const btn  = $('da-selector-btn');
  const drop = $('da-sel-dropdown');
  if (!btn || !drop) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = !drop.classList.contains('oculto');
    drop.classList.toggle('oculto', open);
    btn.setAttribute('aria-expanded', String(!open));
  });

  $$('.da-sel-opcion').forEach(opt => {
    opt.addEventListener('click', () => {
      daEjercicio = opt.dataset.ejId;
      $$('.da-sel-opcion').forEach(o => o.classList.remove('activa'));
      opt.classList.add('activa');
      drop.classList.add('oculto');
      btn.setAttribute('aria-expanded','false');
      renderGrafProgresion();
    });
  });

  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !drop.contains(e.target)) {
      drop.classList.add('oculto');
      btn.setAttribute('aria-expanded','false');
    }
  });
};

/* ════════════════════════════
   CERRAR CON OVERLAY / ESC
   ════════════════════════════ */
const initCierreDrawer = () => {
  const cerrar = $('da-cerrar');
  if (cerrar) cerrar.addEventListener('click', cerrarDrawerAnalisis);

  // Reutilizar el overlay-global del workout
  const overlay = $('overlay-global');
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (daAbierto) cerrarDrawerAnalisis();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && daAbierto) cerrarDrawerAnalisis();
  });
};

/* ════════════════════════════
   BOTÓN "ANÁLISIS" EN DROPDOWN ⋮
   ════════════════════════════ */
const initBotonAnalisis = () => {
  const btn = $('btn-abrir-analisis');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Cerrar el dropdown del workout si está abierto
    const ddMenu = $('dropdown-menu-workout');
    const ddBtn  = $('btn-opciones-workout');
    if (ddMenu) ddMenu.classList.add('oculto');
    if (ddBtn)  ddBtn.setAttribute('aria-expanded','false');

    abrirDrawerAnalisis();
  });
};

/* ════════════════════════════
   INIT
   ════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initBotonAnalisis();
  initCierreDrawer();
  initFiltros();
  initSelectorEjercicio();
});