'use strict';

/* 
   COLORES DE MÉTRICAS
 */
const SEG_COLORES = {
  peso:    '#C8F400',   // acento del proyecto
  grasa:   '#FF6565',   // --error
  musculo: '#60A5FA',   // azul frío
};

/* 
   1. ESTADO Y PERSISTENCIA
   BACKEND: sustituir localStorage por GET/POST /body-metrics
 */
const STORAGE_KEY = 'apex_seguidor_corporal';

const EstadoSeg = {
  abierto:         false,
  tabActiva:       'progreso',     // 'progreso' | 'grafica' | 'historial'
  metricaGrafica:  'peso',         // 'peso' | 'grasa' | 'musculo'
  rangoGrafica:    '30d',          // '7d' | '30d' | '90d' | 'todo'
  registros: [],                   // [{ id, fecha, peso, grasa, musculo }]
  chartInstance: null,
};

function cargarRegistros() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    EstadoSeg.registros = raw ? JSON.parse(raw) : [];
  } catch {
    EstadoSeg.registros = [];
  }
}

function guardarRegistros() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(EstadoSeg.registros));
  } catch (e) {
    console.warn('[APEX Seguidor] No se pudo persistir:', e);
  }
}

/* 
   2. APERTURA / CIERRE DEL DRAWER
*/
function abrirSeguidor() {
  EstadoSeg.abierto = true;
  document.getElementById('drawer-seguidor')?.classList.add('abierto');
  document.getElementById('overlay-global')?.classList.remove('oculto');
  lucide.createIcons();
  actualizarFechaForm();
  renderizarResumen();
  if (EstadoSeg.tabActiva === 'grafica') renderizarGrafica();
  if (EstadoSeg.tabActiva === 'historial') renderizarHistorial();
}

function cerrarSeguidor() {
  EstadoSeg.abierto = false;
  document.getElementById('drawer-seguidor')?.classList.remove('abierto');
  // Solo ocultar overlay si no hay otro drawer abierto
  const hayOtroDrawer = document.querySelector('.drawer-nuevo.abierto');
  if (!hayOtroDrawer) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}


function cambiarTab(tab) {
  EstadoSeg.tabActiva = tab;

  // Botones
  document.querySelectorAll('.seg-tab-btn').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.tab === tab);
  });

  // Paneles
  document.querySelectorAll('.seg-panel').forEach(panel => {
    panel.classList.toggle('activo', panel.dataset.panel === tab);
  });

  // Renderizar contenido del tab activado
  if (tab === 'grafica')   renderizarGrafica();
  if (tab === 'historial') renderizarHistorial();
}

function inicializarTabs() {
  document.querySelectorAll('.seg-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
  });
}

/* ─
   4. FORMULARIO — NUEVA MEDIDA
 */
function actualizarFechaForm() {
  const el = document.getElementById('seg-fecha-texto');
  if (!el) return;
  const hoy = new Date();
  const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  el.textContent = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
}

function inicializarFormulario() {
  document.getElementById('seg-btn-guardar')?.addEventListener('click', () => {
    const peso    = parseFloat(document.getElementById('seg-input-peso')?.value)    || null;
    const grasa   = parseFloat(document.getElementById('seg-input-grasa')?.value)   || null;
    const musculo = parseFloat(document.getElementById('seg-input-musculo')?.value) || null;
    const agua    = parseFloat(document.getElementById('seg-input-agua')?.value)    || null;

    if (!peso && !grasa && !musculo && !agua) {
      mostrarToastSeg('Ingresa al menos un valor');
      return;
    }

    const nuevo = {
      id:      `seg-${Date.now()}`,
      fecha:   new Date().toISOString(),
      peso:    peso    ?? null,
      grasa:   grasa   ?? null,
      musculo: musculo ?? null,
      agua:    agua    ?? null,
    };

    // BACKEND: POST /body-metrics { ...nuevo }
    EstadoSeg.registros.push(nuevo);
    guardarRegistros();

    // Limpiar inputs
    ['seg-input-peso','seg-input-grasa','seg-input-musculo','seg-input-agua'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    renderizarResumen();
    mostrarToastSeg('Medida guardada ✓');
  });
}

/* 
   TARJETAS DE RESUMEN
 */
function renderizarResumen() {
  const registros = EstadoSeg.registros;
  const ultimo    = registros.length > 0 ? registros[registros.length - 1] : null;
  const anterior  = registros.length > 1 ? registros[registros.length - 2] : null;

  const metricas = [
    { key: 'peso',    label: 'Peso',    unidad: 'kg',  color: SEG_COLORES.peso    },
    { key: 'grasa',   label: '% Grasa', unidad: '%',   color: SEG_COLORES.grasa   },
    { key: 'musculo', label: '% Músculo',unidad: '%',  color: SEG_COLORES.musculo },
  ];

  const contenedor = document.getElementById('seg-resumen-cards');
  if (!contenedor) return;
  contenedor.innerHTML = '';

  metricas.forEach(m => {
    const val    = ultimo?.[m.key];
    const valAnt = anterior?.[m.key];
    let deltaHTML = '';

    if (val !== null && val !== undefined && valAnt !== null && valAnt !== undefined) {
      const diff  = (val - valAnt).toFixed(1);
      const clase = diff > 0 ? 'positivo' : diff < 0 ? 'negativo' : 'neutro';
      const signo = diff > 0 ? '+' : '';
      deltaHTML   = `<span class="seg-resumen-delta ${clase}">${signo}${diff} ${m.unidad}</span>`;
    }

    const card = document.createElement('div');
    card.className = 'seg-resumen-card';
    card.style.setProperty('--c', m.color);
    card.innerHTML = `
      <span class="seg-resumen-label">${m.label}</span>
      <span class="seg-resumen-valor">${val !== null && val !== undefined ? val : '—'}</span>
      <span class="seg-resumen-unidad">${m.unidad}</span>
      ${deltaHTML}
    `;
    contenedor.appendChild(card);
  });
}

/* 
   GRÁFICA — Chart.js
   BACKEND: Los datos vendrán de GET /body-metrics?range=30d
*/
function filtrarPorRango(registros, rango) {
  if (rango === 'todo') return registros;
  const dias = { '7d': 7, '30d': 30, '90d': 90 }[rango] || 30;
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  return registros.filter(r => new Date(r.fecha) >= desde);
}

function renderizarGrafica() {
  const canvas = document.getElementById('seg-canvas-grafica');
  if (!canvas) return;

  // Verificar que Chart.js esté disponible
  if (typeof Chart === 'undefined') {
    console.warn('[APEX Seguidor] Chart.js no está cargado.');
    return;
  }

  const metrica  = EstadoSeg.metricaGrafica;
  const registros = filtrarPorRango(EstadoSeg.registros, EstadoSeg.rangoGrafica)
    .filter(r => r[metrica] !== null && r[metrica] !== undefined);

  const labels = registros.map(r => {
    const d = new Date(r.fecha);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
  const datos = registros.map(r => r[metrica]);
  const color = SEG_COLORES[metrica];

  // Destruir instancia previa
  if (EstadoSeg.chartInstance) {
    EstadoSeg.chartInstance.destroy();
    EstadoSeg.chartInstance = null;
  }

  // Detectar tema actual
  const esTemaOscuro = document.documentElement.getAttribute('data-tema') !== 'claro';
  const colorTexto   = esTemaOscuro ? '#505050' : '#808080';
  const colorGrid    = esTemaOscuro ? '#212121' : '#D4D3CD';

  EstadoSeg.chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metrica.charAt(0).toUpperCase() + metrica.slice(1),
        data: datos,
        borderColor: color,
        backgroundColor: `${color}18`,
        borderWidth: 2,
        pointBackgroundColor: color,
        pointBorderColor: color,
        pointRadius: datos.length < 15 ? 4 : 2,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: esTemaOscuro ? '#111111' : '#ffffff',
          borderColor: esTemaOscuro ? '#212121' : '#D4D3CD',
          borderWidth: 1,
          titleColor: esTemaOscuro ? '#F0F0F0' : '#111111',
          bodyColor: color,
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: ctx => `${ctx.parsed.y} ${metrica === 'peso' ? 'kg' : '%'}`,
          }
        }
      },
      scales: {
        x: {
          grid: { color: colorGrid, drawBorder: false },
          ticks: { color: colorTexto, font: { family: "'DM Sans', sans-serif", size: 11 }, maxRotation: 0 },
        },
        y: {
          grid: { color: colorGrid, drawBorder: false },
          ticks: { color: colorTexto, font: { family: "'DM Sans', sans-serif", size: 11 } },
        }
      }
    }
  });
}

function inicializarGrafica() {
  // Chips de métrica
  document.querySelectorAll('.seg-chip[data-metrica]').forEach(chip => {
    chip.addEventListener('click', () => {
      EstadoSeg.metricaGrafica = chip.dataset.metrica;
      document.querySelectorAll('.seg-chip[data-metrica]').forEach(c => c.classList.toggle('activo', c === chip));
      renderizarGrafica();
    });
  });

  // Botones de rango
  document.querySelectorAll('.seg-rango-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      EstadoSeg.rangoGrafica = btn.dataset.rango;
      document.querySelectorAll('.seg-rango-btn').forEach(b => b.classList.toggle('activo', b === btn));
      renderizarGrafica();
    });
  });
}

/* 
 HISTORIAL
*/
function formatearFechaCorta(isoStr) {
  const d    = new Date(isoStr);
  const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return { dia: d.getDate(), mes: MESES[d.getMonth()] };
}

function renderizarHistorial() {
  const lista   = document.getElementById('seg-historial-lista');
  const vacio   = document.getElementById('seg-historial-vacio');
  if (!lista) return;

  lista.innerHTML = '';

  const registros = [...EstadoSeg.registros].reverse(); // más reciente primero

  if (registros.length === 0) {
    vacio?.classList.remove('oculto');
    return;
  }
  vacio?.classList.add('oculto');

  registros.forEach((r, idx) => {
    const { dia, mes } = formatearFechaCorta(r.fecha);
    const metricas = [
      r.peso    !== null && r.peso    !== undefined ? `<div class="seg-hist-metrica"><span class="seg-hist-metrica-label">Peso</span><span class="seg-hist-metrica-valor">${r.peso} kg</span></div>` : '',
      r.grasa   !== null && r.grasa   !== undefined ? `<div class="seg-hist-metrica"><span class="seg-hist-metrica-label">Grasa</span><span class="seg-hist-metrica-valor">${r.grasa}%</span></div>` : '',
      r.musculo !== null && r.musculo !== undefined ? `<div class="seg-hist-metrica"><span class="seg-hist-metrica-label">Músculo</span><span class="seg-hist-metrica-valor">${r.musculo}%</span></div>` : '',
      r.agua    !== null && r.agua    !== undefined ? `<div class="seg-hist-metrica"><span class="seg-hist-metrica-label">Agua</span><span class="seg-hist-metrica-valor">${r.agua}%</span></div>` : '',
    ].filter(Boolean).join('');

    const li = document.createElement('li');
    li.className = 'seg-historial-item';
    li.style.animationDelay = `${idx * 0.04}s`;
    li.innerHTML = `
      <div class="seg-hist-fecha-bloque">
        <span class="seg-hist-dia">${dia}</span>
        <span class="seg-hist-mes">${mes}</span>
      </div>
      <div class="seg-hist-datos">${metricas}</div>
      <button class="seg-hist-btn-eliminar" data-registro-id="${r.id}" aria-label="Eliminar registro">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    lista.appendChild(li);
  });

  lucide.createIcons();

  // Evento eliminar (delegación)
  lista.addEventListener('click', e => {
    const btn = e.target.closest('.seg-hist-btn-eliminar');
    if (!btn) return;
    const id = btn.dataset.registroId;
    // BACKEND: DELETE /body-metrics/{id}
    EstadoSeg.registros = EstadoSeg.registros.filter(r => r.id !== id);
    guardarRegistros();
    renderizarHistorial();
    renderizarResumen();
    mostrarToastSeg('Registro eliminado');
  }, { once: false });
}

/* 
   TOAST (reutiliza el del workout si existe, o crea uno propio)
 */
let toastSegTimer;
function mostrarToastSeg(msg, ms = 3000) {
  // Intentar usar el toast global del workout
  if (typeof mostrarToast === 'function') {
    mostrarToast(msg, ms);
    return;
  }
  const t = document.getElementById('toast-notificacion');
  const m = document.getElementById('toast-mensaje');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastSegTimer);
  toastSegTimer = setTimeout(() => t.classList.remove('visible'), ms);
}

function inicializarIntegracionDropdown() {

  document.getElementById('dropdown-seguidor-corporal')?.addEventListener('click', () => {
    // Cerrar dropdown
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('oculto'));
    abrirSeguidor();
  });

  // Cerrar al tocar el overlay (sin interferir con workout.js)
  // workout.js ya maneja el overlay, pero usamos captura para interceptar
  document.getElementById('overlay-global')?.addEventListener('click', () => {
    if (EstadoSeg.abierto) cerrarSeguidor();
  });

  // Botón cerrar del drawer
  document.getElementById('seg-btn-cerrar')?.addEventListener('click', cerrarSeguidor);
}

/*
   INICIALIZACIÓN
 */
function inicializarSeguidorCorporal() {
  cargarRegistros();
  inicializarIntegracionDropdown();
  inicializarTabs();
  inicializarFormulario();
  inicializarGrafica();
  console.log('[APEX] Seguidor Corporal inicializado.');
}

document.addEventListener('DOMContentLoaded', inicializarSeguidorCorporal);