/* ============================================================
   APEX FITNESS — Workout (workout.js)
   Módulos:
   1.  Arranque: carga, cursor, tema, íconos.
   2.  Navegación de fecha (←/→).
   3.  Drawer de nuevo entreno (abrir/cerrar/guardar).
   4.  Sheet de selección de ejercicios (abrir/cerrar/buscar).
   5.  CRUD de ejercicios y series dentro del drawer.
   6.  Compartir entreno.
   7.  Toast de notificación.
   8.  Scroll infinito (sentinel).
============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────
   0. CONFIG
   BACKEND: Cambiar BASE_URL al endpoint real.
────────────────────────────────────────────────────────── */
const CONFIG = {
  BASE_URL: 'https://api.fitmoca.edu',
  JWT_KEY:  'apex_token',
  TEMA_KEY: 'apex_tema',
};

/* Estado global */
const Estado = {
  fechaActual:        new Date(),
  drawerAbierto:      false,
  sheetAbierto:       false,
  ejerciciosEntreno:  [], // [{ id, nombre, musculo, color, series:[{kg,reps}] }]
  contadorEj:         0,
  contadorSerie:      0,
};

/* ══════════════════════════════════════════════════════════
   1. ARRANQUE
══════════════════════════════════════════════════════════ */

function inicializarCursor() {
  const punto = document.getElementById('cursor-punto');
  if (!punto) return;
  if (window.matchMedia('(hover: none), (max-width: 820px)').matches) return;
  let raf;
  document.addEventListener('mousemove', e => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      punto.style.left = `${e.clientX}px`;
      punto.style.top  = `${e.clientY}px`;
    });
  });
  const sel = 'button, a, input';
  document.addEventListener('mouseover', e => { if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo'); });
  document.addEventListener('mouseout',  e => { if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo'); });
}

function inicializarTema() {
  const html = document.documentElement;
  const btn  = document.getElementById('boton-tema');
  html.setAttribute('data-tema', localStorage.getItem(CONFIG.TEMA_KEY) || 'oscuro');
  btn?.addEventListener('click', () => {
    const nuevo = html.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', nuevo);
    localStorage.setItem(CONFIG.TEMA_KEY, nuevo);
  });
}

function inicializarIconos() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}


/* ══════════════════════════════════════════════════════════
   2. NAVEGACIÓN DE FECHA
   BACKEND: Al cambiar fecha, hacer GET /sessions?user_id={id}&date={fecha}
══════════════════════════════════════════════════════════ */

const DIAS    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatearFechaLabel(fecha) {
  const hoy   = new Date();
  const ayer  = new Date(); ayer.setDate(hoy.getDate() - 1);
  const mismoD = d1 => d1.toDateString() === fecha.toDateString();
  if (mismoD(hoy))  return 'HOY';
  if (mismoD(ayer)) return 'AYER';
  return `${DIAS[fecha.getDay()]}, ${MESES[fecha.getMonth()].toUpperCase()} ${fecha.getDate()}`;
}

function actualizarFechaLabel() {
  const el = document.getElementById('label-fecha');
  if (el) el.textContent = formatearFechaLabel(Estado.fechaActual);
}

function inicializarNavFecha() {
  document.getElementById('btn-fecha-prev')?.addEventListener('click', () => {
    Estado.fechaActual.setDate(Estado.fechaActual.getDate() - 1);
    actualizarFechaLabel();
    // BACKEND: cargarSesionesPorFecha(Estado.fechaActual);
  });
  document.getElementById('btn-fecha-next')?.addEventListener('click', () => {
    const hoy = new Date();
    if (Estado.fechaActual >= hoy) return; // no avanzar más allá de hoy
    Estado.fechaActual.setDate(Estado.fechaActual.getDate() + 1);
    actualizarFechaLabel();
    // BACKEND: cargarSesionesPorFecha(Estado.fechaActual);
  });
  actualizarFechaLabel();
}


/* ══════════════════════════════════════════════════════════
   3. DRAWER — NUEVO ENTRENO
══════════════════════════════════════════════════════════ */

function abrirDrawer() {
  Estado.drawerAbierto = true;
  document.getElementById('drawer-nuevo')?.classList.add('abierto');
  document.getElementById('overlay-global')?.classList.remove('oculto');
  // Actualizar fecha en el drawer
  const hoy = new Date();
  const el  = document.getElementById('drawer-fecha-texto');
  if (el) el.textContent = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  lucide.createIcons();
}

function cerrarDrawer() {
  Estado.drawerAbierto = false;
  document.getElementById('drawer-nuevo')?.classList.remove('abierto');
  if (!Estado.sheetAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function inicializarDrawer() {
  // Botones que abren el drawer
  ['btn-nuevo-workout-nav','btn-vacio-nuevo'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', abrirDrawer);
  });
  document.getElementById('drawer-cancelar')?.addEventListener('click', cerrarDrawer);
  document.getElementById('overlay-global')?.addEventListener('click', () => {
    cerrarDrawer();
    cerrarSheet();
  });

  // Guardar entreno
  // BACKEND: POST /sessions con ejerciciosEntreno
  document.getElementById('drawer-guardar')?.addEventListener('click', guardarEntreno);

  // Abrir sheet de ejercicios
  document.getElementById('drawer-btn-anadir')?.addEventListener('click', abrirSheet);
}

/**
 * Recoge los datos del entreno y los envía al backend.
 * BACKEND: POST /sessions
 *   Body: { fecha: ..., ejercicios: Estado.ejerciciosEntreno }
 *   Headers: { Authorization: Bearer {jwt} }
 */
async function guardarEntreno() {
  if (Estado.ejerciciosEntreno.length === 0) {
    mostrarToast('Añade al menos un ejercicio');
    return;
  }

  const payload = {
    usuario_id:  'usuario-actual', // BACKEND: extraer del JWT
    fecha:       new Date().toISOString(),
    ejercicios:  Estado.ejerciciosEntreno.map(ej => ({
      ejercicio_id: ej.id,
      nombre:       ej.nombre,
      series:       ej.series,
    })),
  };

  console.log('[APEX] POST /sessions — payload:', JSON.stringify(payload, null, 2));
  // BACKEND:
  // const res = await fetch(`${CONFIG.BASE_URL}/sessions`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem(CONFIG.JWT_KEY)}` },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) { mostrarToast('Error al guardar'); return; }

  mostrarToast('Entreno guardado ✓');
  Estado.ejerciciosEntreno = [];
  renderizarListaDrawer();
  cerrarDrawer();
}


/* ══════════════════════════════════════════════════════════
   4. SHEET — SELECTOR DE EJERCICIOS
   Búsqueda en tiempo real sobre los grupos/ejercicios del DOM.
══════════════════════════════════════════════════════════ */

function abrirSheet() {
  Estado.sheetAbierto = true;
  document.getElementById('sheet-ejercicios')?.classList.add('abierto');
  document.getElementById('overlay-global')?.classList.remove('oculto');
  document.getElementById('sheet-search')?.focus();
}

function cerrarSheet() {
  Estado.sheetAbierto = false;
  document.getElementById('sheet-ejercicios')?.classList.remove('abierto');
  if (!Estado.drawerAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function inicializarSheet() {
  document.getElementById('sheet-cerrar')?.addEventListener('click', cerrarSheet);

  // Expandir/colapsar grupos
  document.querySelectorAll('.sheet-grupo-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const expandido  = btn.getAttribute('aria-expanded') === 'true';
      const targetId   = btn.getAttribute('aria-controls');
      const lista      = document.getElementById(targetId);
      btn.setAttribute('aria-expanded', String(!expandido));
      lista?.classList.toggle('oculto', expandido);
    });
  });

  // Seleccionar ejercicio
  document.getElementById('sheet-grupos')?.addEventListener('click', e => {
    const btn = e.target.closest('.sg-ej-btn');
    if (!btn) return;
    const item = btn.closest('.sg-ej-item');
    if (!item) return;
    const ejId     = item.dataset.ejId;
    const ejNombre = item.querySelector('.sg-ej-nombre')?.textContent || '';
    const ejMusculo = item.dataset.ejMusculo || '';
    const ejColor   = item.dataset.ejColor   || '#888';
    agregarEjercicioAlEntreno(ejId, ejNombre, ejMusculo, ejColor);
    cerrarSheet();
  });

  // Búsqueda
  document.getElementById('sheet-search')?.addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    buscarEnSheet(q);
  });
}

function buscarEnSheet(query) {
  const grupos   = document.querySelectorAll('.sheet-grupo-item');
  const sinRes   = document.getElementById('sheet-sin-res');
  let   hayAlgo  = false;

  grupos.forEach(grupo => {
    const ejercicios = grupo.querySelectorAll('.sg-ej-item');
    let grupoCoinc   = false;

    ejercicios.forEach(ej => {
      const nombre = ej.querySelector('.sg-ej-nombre')?.textContent.toLowerCase() || '';
      const coinc  = !query || nombre.includes(query);
      ej.style.display = coinc ? '' : 'none';
      if (coinc) grupoCoinc = true;
    });

    if (!query) {
      grupo.style.display = '';
      // restaurar estado colapsado
    } else {
      grupo.style.display = grupoCoinc ? '' : 'none';
      if (grupoCoinc) {
        // Expandir automáticamente si hay coincidencias
        const btn    = grupo.querySelector('.sheet-grupo-row');
        const ctrlId = btn?.getAttribute('aria-controls');
        const lista  = ctrlId ? document.getElementById(ctrlId) : null;
        btn?.setAttribute('aria-expanded', 'true');
        lista?.classList.remove('oculto');
        hayAlgo = true;
      }
    }
    if (!query) hayAlgo = true;
  });

  if (sinRes) sinRes.classList.toggle('oculto', hayAlgo || !query);
}


/* ══════════════════════════════════════════════════════════
   5. CRUD DE EJERCICIOS Y SERIES EN EL DRAWER
══════════════════════════════════════════════════════════ */

function agregarEjercicioAlEntreno(id, nombre, musculo, color) {
  // Evitar duplicados
  if (Estado.ejerciciosEntreno.find(e => e.id === id)) {
    mostrarToast(`"${nombre}" ya está en el entreno`);
    return;
  }
  Estado.contadorEj++;
  const ejLocal = {
    localId: `ej-local-${Estado.contadorEj}`,
    id, nombre, musculo, color,
    series: [{ localId: `s-${++Estado.contadorSerie}`, kg: '', reps: '' }],
  };
  Estado.ejerciciosEntreno.push(ejLocal);
  renderizarListaDrawer();
  mostrarToast(`${nombre} añadido`);
}

function eliminarEjercicioDelEntreno(localId) {
  Estado.ejerciciosEntreno = Estado.ejerciciosEntreno.filter(e => e.localId !== localId);
  renderizarListaDrawer();
}

function agregarSerieAEjercicio(localId) {
  const ej = Estado.ejerciciosEntreno.find(e => e.localId === localId);
  if (!ej) return;
  ej.series.push({ localId: `s-${++Estado.contadorSerie}`, kg: '', reps: '' });
  renderizarListaDrawer();
}

function eliminarSerieDeEjercicio(ejLocalId, serieLocalId) {
  const ej = Estado.ejerciciosEntreno.find(e => e.localId === ejLocalId);
  if (!ej || ej.series.length <= 1) return; // mínimo 1 serie
  ej.series = ej.series.filter(s => s.localId !== serieLocalId);
  renderizarListaDrawer();
}

function actualizarValorSerie(ejLocalId, serieLocalId, campo, valor) {
  const ej    = Estado.ejerciciosEntreno.find(e => e.localId === ejLocalId);
  const serie = ej?.series.find(s => s.localId === serieLocalId);
  if (serie) serie[campo] = valor;
}

/**
 * Re-renderiza la lista de ejercicios dentro del drawer.
 * Se llama cada vez que el estado cambia.
 */
function renderizarListaDrawer() {
  const lista   = document.getElementById('drawer-lista-ejercicios');
  const hint    = document.getElementById('drawer-empty-hint');
  if (!lista) return;

  // Limpiar excepto el hint
  lista.querySelectorAll('.drawer-ejercicio-item').forEach(el => el.remove());

  const estaVacio = Estado.ejerciciosEntreno.length === 0;
  hint?.classList.toggle('oculto', !estaVacio);

  Estado.ejerciciosEntreno.forEach((ej, ejIdx) => {
    const li = document.createElement('li');
    li.className  = 'drawer-ejercicio-item';
    li.dataset.ejLocalId = ej.localId;

    // Series HTML
    const seriesHTML = ej.series.map((s, sIdx) => `
      <li class="drawer-ej-serie-fila" data-serie-local-id="${s.localId}">
        <span class="serie-num-badge">${sIdx + 1}</span>
        <input type="number" class="drawer-input-serie" placeholder="kg" value="${s.kg}"
               data-campo="kg" data-ej-id="${ej.localId}" data-serie-id="${s.localId}"
               aria-label="Peso en kg" min="0" step="0.5" />
        <input type="number" class="drawer-input-serie" placeholder="reps" value="${s.reps}"
               data-campo="reps" data-ej-id="${ej.localId}" data-serie-id="${s.localId}"
               aria-label="Repeticiones" min="1" step="1" />
        <button class="drawer-ej-del-serie" data-ej-id="${ej.localId}" data-serie-id="${s.localId}" aria-label="Eliminar serie ${sIdx+1}">
          <i data-lucide="x"></i>
        </button>
      </li>`).join('');

    li.innerHTML = `
      <div class="drawer-ej-titulo-fila">
        <div class="drawer-ej-nombre-wrap">
          <span class="drawer-ej-dot" style="--c:${ej.color}"></span>
          <span class="drawer-ej-nombre">${ej.nombre}</span>
        </div>
        <button class="drawer-ej-eliminar" data-ej-id="${ej.localId}" aria-label="Eliminar ${ej.nombre}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <ul class="drawer-ej-series">${seriesHTML}</ul>
      <button class="drawer-btn-add-serie" data-ej-id="${ej.localId}" aria-label="Añadir serie">
        <i data-lucide="plus"></i> Añadir serie
      </button>`;

    lista.appendChild(li);
  });

  lucide.createIcons(); // Re-inicializar íconos para elementos nuevos

  // Eventos sobre los elementos nuevos (delegación en el contenedor)
}

function inicializarEventosDrawerLista() {
  const lista = document.getElementById('drawer-lista-ejercicios');
  if (!lista) return;

  lista.addEventListener('click', e => {
    // Eliminar ejercicio
    const btnElimEj = e.target.closest('.drawer-ej-eliminar');
    if (btnElimEj) { eliminarEjercicioDelEntreno(btnElimEj.dataset.ejId); return; }

    // Eliminar serie
    const btnElimSerie = e.target.closest('.drawer-ej-del-serie');
    if (btnElimSerie) { eliminarSerieDeEjercicio(btnElimSerie.dataset.ejId, btnElimSerie.dataset.serieId); return; }

    // Añadir serie
    const btnAddSerie = e.target.closest('.drawer-btn-add-serie');
    if (btnAddSerie) { agregarSerieAEjercicio(btnAddSerie.dataset.ejId); return; }
  });

  // Actualizar valores de inputs en tiempo real
  lista.addEventListener('change', e => {
    const input = e.target.closest('.drawer-input-serie');
    if (!input) return;
    actualizarValorSerie(input.dataset.ejId, input.dataset.serieId, input.dataset.campo, input.value);
  });
}


/* ══════════════════════════════════════════════════════════
   6. COMPARTIR ENTRENO
   BACKEND: Generar URL sharable de la sesión
══════════════════════════════════════════════════════════ */

function inicializarCompartir() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-compartir');
    if (!btn) return;
    const card      = btn.closest('.entreno-card');
    const sessionId = card?.dataset.sessionId || '';
    const url       = `${window.location.origin}/sesion/${sessionId}`;

    if (navigator.share) {
      navigator.share({ title: 'APEX FITNESS — Mi entreno', url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(() => mostrarToast('Enlace copiado'));
    }
  });
}


/* ══════════════════════════════════════════════════════════
   7. TOAST
══════════════════════════════════════════════════════════ */

let toastTimer;
function mostrarToast(msg, ms = 3000) {
  const t  = document.getElementById('toast-notificacion');
  const m  = document.getElementById('toast-mensaje');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), ms);
}


/* ══════════════════════════════════════════════════════════
   8. SCROLL INFINITO
   BACKEND: Observer en #sentinel-scroll dispara
            GET /sessions?page={n+1}&date={fecha}
══════════════════════════════════════════════════════════ */

function inicializarScrollInfinito() {
  const sentinel = document.getElementById('sentinel-scroll');
  if (!sentinel) return;
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      // BACKEND: cargarMasSesiones();
    }
  }, { rootMargin: '200px' });
  obs.observe(sentinel);
}


/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN PRINCIPAL
══════════════════════════════════════════════════════════ */

function inicializarApp() {
  inicializarNavFecha();
  inicializarDrawer();
  inicializarSheet();
  inicializarEventosDrawerLista();
  inicializarCompartir();
  inicializarScrollInfinito();
  console.log('[APEX] Workout inicializado.');
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarApp();
});
