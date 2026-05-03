'use strict';

/* ══════════════════════════════════════════════════════════
   0. CONFIG
══════════════════════════════════════════════════════════ */
const CONFIG = {
  BASE_URL: 'https://api.fitmoca.edu',
  JWT_KEY:  'apex_token',
  TEMA_KEY: 'apex_tema',
};

const Estado = {
  fechaActual:       new Date(),
  drawerAbierto:     false,
  sheetAbierto:      false,
  corporalAbierto:   false,
  ejerciciosEntreno: [],
  contadorEj:        0,
  contadorSerie:     0,
};

const DIAS  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

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
      punto.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
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
══════════════════════════════════════════════════════════ */
function formatearFechaLabel(fecha) {
  const hoy  = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString())  return 'HOY';
  if (fecha.toDateString() === ayer.toDateString()) return 'AYER';
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
  });
  document.getElementById('btn-fecha-next')?.addEventListener('click', () => {
    if (Estado.fechaActual >= new Date()) return;
    Estado.fechaActual.setDate(Estado.fechaActual.getDate() + 1);
    actualizarFechaLabel();
  });
  actualizarFechaLabel();
}

/* ══════════════════════════════════════════════════════════
   3. DROPDOWN DE 3 PUNTOS
══════════════════════════════════════════════════════════ */
function inicializarDropdown() {
  const btnOpciones = document.getElementById('btn-opciones-workout');
  const menuDropdown = document.getElementById('dropdown-menu-workout');

  if (!btnOpciones || !menuDropdown) return;

  // Abrir / cerrar al hacer clic en el botón
  btnOpciones.addEventListener('click', (e) => {
    e.stopPropagation();
    const estaOculto = menuDropdown.classList.contains('oculto');
    // Cerrar todos los dropdowns primero
    document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('oculto'));
    // Abrir este si estaba cerrado
    if (estaOculto) {
      menuDropdown.classList.remove('oculto');
      btnOpciones.setAttribute('aria-expanded', 'true');
    } else {
      btnOpciones.setAttribute('aria-expanded', 'false');
    }
  });

  // Evitar que clic dentro del menú lo cierre
  menuDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', () => {
    if (!menuDropdown.classList.contains('oculto')) {
      menuDropdown.classList.add('oculto');
      btnOpciones.setAttribute('aria-expanded', 'false');
    }
  });

  // Ítem: Análisis
  document.getElementById('btn-abrir-analisis')?.addEventListener('click', () => {
    menuDropdown.classList.add('oculto');
    abrirAnalisis();
  });

  // Ítem: Seguidor Corporal
  document.getElementById('btn-abrir-corporal')?.addEventListener('click', () => {
    menuDropdown.classList.add('oculto');
    abrirDrawerCorporal();
  });
}

/* ══════════════════════════════════════════════════════════
   4. DRAWER — NUEVO ENTRENO
══════════════════════════════════════════════════════════ */
function abrirDrawer() {
  Estado.drawerAbierto = true;
  document.getElementById('drawer-nuevo')?.classList.add('abierto');
  document.getElementById('overlay-global')?.classList.remove('oculto');
  const hoy = new Date();
  const el  = document.getElementById('drawer-fecha-texto');
  if (el) el.textContent = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  lucide.createIcons();
}

function cerrarDrawer() {
  Estado.drawerAbierto = false;
  document.getElementById('drawer-nuevo')?.classList.remove('abierto');
  if (!Estado.sheetAbierto && !Estado.corporalAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function inicializarDrawer() {
  ['btn-nuevo-workout-nav', 'btn-vacio-nuevo'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', abrirDrawer);
  });
  document.getElementById('drawer-cancelar')?.addEventListener('click', cerrarDrawer);
  document.getElementById('overlay-global')?.addEventListener('click', () => {
    cerrarDrawer();
    cerrarSheet();
    cerrarDrawerCorporal();
  });
  document.getElementById('drawer-guardar')?.addEventListener('click', guardarEntreno);
  document.getElementById('drawer-btn-anadir')?.addEventListener('click', abrirSheet);
}

async function guardarEntreno() {
  if (Estado.ejerciciosEntreno.length === 0) {
    mostrarToast('Añade al menos un ejercicio');
    return;
  }
  const payload = {
    usuario_id: 'usuario-actual',
    fecha:      new Date().toISOString(),
    ejercicios: Estado.ejerciciosEntreno.map(ej => ({
      ejercicio_id: ej.id,
      nombre:       ej.nombre,
      series:       ej.series,
    })),
  };
  console.log('[APEX] POST /sessions —', payload);
  mostrarToast('Entreno guardado ✓');
  Estado.ejerciciosEntreno = [];
  renderizarListaDrawer();
  cerrarDrawer();
}

/* ══════════════════════════════════════════════════════════
   5. SHEET — SELECTOR DE EJERCICIOS
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
  if (!Estado.drawerAbierto && !Estado.corporalAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function inicializarSheet() {
  document.getElementById('sheet-cerrar')?.addEventListener('click', cerrarSheet);

  document.querySelectorAll('.sheet-grupo-row').forEach(btn => {
    btn.addEventListener('click', () => {
      const expandido = btn.getAttribute('aria-expanded') === 'true';
      const lista     = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!expandido));
      lista?.classList.toggle('oculto', expandido);
    });
  });

  document.getElementById('sheet-grupos')?.addEventListener('click', e => {
    const btn = e.target.closest('.sg-ej-btn');
    if (!btn) return;
    const item = btn.closest('.sg-ej-item');
    if (!item) return;
    agregarEjercicioAlEntreno(
      item.dataset.ejId,
      item.querySelector('.sg-ej-nombre')?.textContent || '',
      item.dataset.ejMusculo || '',
      item.dataset.ejColor   || '#888'
    );
    cerrarSheet();
  });

  document.getElementById('sheet-search')?.addEventListener('input', e => {
    buscarEnSheet(e.target.value.trim().toLowerCase());
  });
}

function buscarEnSheet(query) {
  const grupos = document.querySelectorAll('.sheet-grupo-item');
  const sinRes = document.getElementById('sheet-sin-res');
  let hayAlgo  = false;

  grupos.forEach(grupo => {
    let grupoCoinc = false;
    grupo.querySelectorAll('.sg-ej-item').forEach(ej => {
      const nombre = ej.querySelector('.sg-ej-nombre')?.textContent.toLowerCase() || '';
      const coinc  = !query || nombre.includes(query);
      ej.style.display = coinc ? '' : 'none';
      if (coinc) grupoCoinc = true;
    });

    if (!query) {
      grupo.style.display = '';
      hayAlgo = true;
    } else {
      grupo.style.display = grupoCoinc ? '' : 'none';
      if (grupoCoinc) {
        const btn  = grupo.querySelector('.sheet-grupo-row');
        const lista = document.getElementById(btn?.getAttribute('aria-controls'));
        btn?.setAttribute('aria-expanded', 'true');
        lista?.classList.remove('oculto');
        hayAlgo = true;
      }
    }
  });

  sinRes?.classList.toggle('oculto', hayAlgo || !query);
}

/* ══════════════════════════════════════════════════════════
   6. CRUD EJERCICIOS Y SERIES
══════════════════════════════════════════════════════════ */
function agregarEjercicioAlEntreno(id, nombre, musculo, color) {
  if (Estado.ejerciciosEntreno.find(e => e.id === id)) {
    mostrarToast(`"${nombre}" ya está en el entreno`);
    return;
  }
  Estado.contadorEj++;
  Estado.ejerciciosEntreno.push({
    localId: `ej-local-${Estado.contadorEj}`,
    id, nombre, musculo, color,
    series: [{ localId: `s-${++Estado.contadorSerie}`, kg: '', reps: '' }],
  });
  renderizarListaDrawer();
  mostrarToast(`${nombre} añadido`);
}

function eliminarEjercicioDelEntreno(localId) {
  Estado.ejerciciosEntreno = Estado.ejerciciosEntreno.filter(e => e.localId !== localId);
  renderizarListaDrawer();
}

function agregarSerieAEjercicio(localId) {
  const ej = Estado.ejerciciosEntreno.find(e => e.localId === localId);
  if (ej) {
    ej.series.push({ localId: `s-${++Estado.contadorSerie}`, kg: '', reps: '' });
    renderizarListaDrawer();
  }
}

function eliminarSerieDeEjercicio(ejLocalId, serieLocalId) {
  const ej = Estado.ejerciciosEntreno.find(e => e.localId === ejLocalId);
  if (!ej || ej.series.length <= 1) return;
  ej.series = ej.series.filter(s => s.localId !== serieLocalId);
  renderizarListaDrawer();
}

function actualizarValorSerie(ejLocalId, serieLocalId, campo, valor) {
  const ej    = Estado.ejerciciosEntreno.find(e => e.localId === ejLocalId);
  const serie = ej?.series.find(s => s.localId === serieLocalId);
  if (serie) serie[campo] = valor;
}

function renderizarListaDrawer() {
  const lista = document.getElementById('drawer-lista-ejercicios');
  const hint  = document.getElementById('drawer-empty-hint');
  if (!lista) return;

  lista.querySelectorAll('.drawer-ejercicio-item').forEach(el => el.remove());
  hint?.classList.toggle('oculto', Estado.ejerciciosEntreno.length !== 0);

  Estado.ejerciciosEntreno.forEach((ej, ejIdx) => {
    const li = document.createElement('li');
    li.className = 'drawer-ejercicio-item';
    li.dataset.ejLocalId = ej.localId;

    const seriesHTML = ej.series.map((s, sIdx) => `
      <li class="drawer-ej-serie-fila" data-serie-local-id="${s.localId}">
        <span class="serie-num-badge">${sIdx + 1}</span>
        <input type="number" class="drawer-input-serie" placeholder="kg" value="${s.kg}"
               data-campo="kg" data-ej-id="${ej.localId}" data-serie-id="${s.localId}"
               aria-label="Peso en kg" min="0" step="0.5" />
        <input type="number" class="drawer-input-serie" placeholder="reps" value="${s.reps}"
               data-campo="reps" data-ej-id="${ej.localId}" data-serie-id="${s.localId}"
               aria-label="Repeticiones" min="1" step="1" />
        <button class="drawer-ej-del-serie" data-ej-id="${ej.localId}" data-serie-id="${s.localId}">
          <i data-lucide="x"></i>
        </button>
      </li>`).join('');

    li.innerHTML = `
      <div class="drawer-ej-titulo-fila">
        <div class="drawer-ej-nombre-wrap">
          <span class="drawer-ej-dot" style="--c:${ej.color}"></span>
          <span class="drawer-ej-nombre">${ej.nombre}</span>
        </div>
        <button class="drawer-ej-eliminar" data-ej-id="${ej.localId}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <ul class="drawer-ej-series">${seriesHTML}</ul>
      <button class="drawer-btn-add-serie" data-ej-id="${ej.localId}">
        <i data-lucide="plus"></i> Añadir serie
      </button>`;

    lista.appendChild(li);
  });

  lucide.createIcons();
}

function inicializarEventosDrawerLista() {
  const lista = document.getElementById('drawer-lista-ejercicios');
  if (!lista) return;

  lista.addEventListener('click', e => {
    const btnElimEj = e.target.closest('.drawer-ej-eliminar');
    if (btnElimEj) { eliminarEjercicioDelEntreno(btnElimEj.dataset.ejId); return; }

    const btnElimSerie = e.target.closest('.drawer-ej-del-serie');
    if (btnElimSerie) { eliminarSerieDeEjercicio(btnElimSerie.dataset.ejId, btnElimSerie.dataset.serieId); return; }

    const btnAddSerie = e.target.closest('.drawer-btn-add-serie');
    if (btnAddSerie) { agregarSerieAEjercicio(btnAddSerie.dataset.ejId); return; }
  });

  lista.addEventListener('change', e => {
    const input = e.target.closest('.drawer-input-serie');
    if (!input) return;
    actualizarValorSerie(input.dataset.ejId, input.dataset.serieId, input.dataset.campo, input.value);
  });
}

/* ══════════════════════════════════════════════════════════
   7. SEGUIDOR CORPORAL
══════════════════════════════════════════════════════════ */
const HISTORIAL_CORPORAL_MOCK = [
  { fecha: '18 Mar', peso: 187.4, grasa: 18.2, delta: -0.6 },
  { fecha: '11 Mar', peso: 188.0, grasa: 18.5, delta: +0.4 },
  { fecha: '04 Mar', peso: 187.6, grasa: 18.3, delta: -1.2 },
  { fecha: '25 Feb', peso: 188.8, grasa: 18.9, delta: -0.3 },
];

function abrirDrawerCorporal() {
  Estado.corporalAbierto = true;
  const drawer = document.getElementById('drawer-corporal');
  if (!drawer) return;
  drawer.classList.remove('oculto');
  requestAnimationFrame(() => drawer.classList.add('abierto'));
  document.getElementById('overlay-global')?.classList.remove('oculto');

  const hoy = new Date();
  const el  = document.getElementById('corporal-fecha-texto');
  if (el) el.textContent = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;

  renderizarHistorialCorporal();
  lucide.createIcons();
}

function cerrarDrawerCorporal() {
  Estado.corporalAbierto = false;
  const drawer = document.getElementById('drawer-corporal');
  if (!drawer) return;
  drawer.classList.remove('abierto');
  setTimeout(() => drawer.classList.add('oculto'), 360);
  if (!Estado.drawerAbierto && !Estado.sheetAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function renderizarHistorialCorporal() {
  const cont = document.getElementById('corporal-historial');
  if (!cont || HISTORIAL_CORPORAL_MOCK.length === 0) return;

  cont.innerHTML = HISTORIAL_CORPORAL_MOCK.map(r => {
    const signo = r.delta > 0 ? '+' : '';
    const cls   = r.delta < 0 ? 'baja' : r.delta > 0 ? 'sube' : 'igual';
    return `
      <div class="corporal-hist-fila">
        <span class="corporal-hist-fecha">${r.fecha}</span>
        <span class="corporal-hist-peso">${r.peso} lbs</span>
        <span class="corporal-hist-grasa">${r.grasa}% grasa</span>
        <span class="corporal-hist-delta ${cls}">${signo}${r.delta} lbs</span>
      </div>`;
  }).join('');
}

function guardarCorporal() {
  const campos = ['peso','grasa','musculo','agua','cuello','pecho','cintura','cadera',
                  'biceps-izq','biceps-der','muslo-izq','muslo-der','pant-izq','pant-der'];
  const payload = { fecha: new Date().toISOString() };
  campos.forEach(c => {
    const val = document.getElementById(`corp-${c}`)?.value;
    if (val) payload[c.replace(/-/g, '_')] = parseFloat(val);
  });

  if (!payload.peso) { mostrarToast('Ingresa al menos el peso'); return; }
  console.log('[APEX] POST /body-tracking —', payload);
  mostrarToast('Medidas guardadas ✓');
  cerrarDrawerCorporal();
}

function inicializarSeguiderCorporal() {
  document.getElementById('corporal-cancelar')?.addEventListener('click', cerrarDrawerCorporal);
  document.getElementById('corporal-guardar')?.addEventListener('click', guardarCorporal);
}

/* ══════════════════════════════════════════════════════════
   8. ANÁLISIS (abrir drawer existente)
══════════════════════════════════════════════════════════ */
function abrirAnalisis() {
  const drawer = document.getElementById('drawer-analisis');
  if (!drawer) return;
  drawer.classList.remove('oculto');
  requestAnimationFrame(() => drawer.classList.add('abierto'));
  document.getElementById('overlay-global')?.classList.remove('oculto');
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   9. COMPARTIR
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
   10. TOAST
══════════════════════════════════════════════════════════ */
let toastTimer;
function mostrarToast(msg, ms = 3000) {
  const t = document.getElementById('toast-notificacion');
  const m = document.getElementById('toast-mensaje');
  if (!t || !m) return;
  m.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), ms);
}

/* ══════════════════════════════════════════════════════════
   11. SCROLL INFINITO
══════════════════════════════════════════════════════════ */
function inicializarScrollInfinito() {
  const sentinel = document.getElementById('sentinel-scroll');
  if (!sentinel) return;
  new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      // BACKEND: cargarMasSesiones();
    }
  }, { rootMargin: '200px' }).observe(sentinel);
}

/* ══════════════════════════════════════════════════════════
   12. SCROLL BOTONES ARRIBA / ABAJO
══════════════════════════════════════════════════════════ */
function inicializarScrollBotones() {
  const btnUp   = document.getElementById('btn-scroll-up');
  const btnDown = document.getElementById('btn-scroll-down');
  const feed    = document.querySelector('.workout-feed');
  if (!btnUp || !btnDown || !feed) return;

  btnUp.addEventListener('click', () => {
    feed.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
  });
  btnDown.addEventListener('click', () => {
    feed.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
  });
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarNavFecha();
  inicializarDropdown();
  inicializarDrawer();
  inicializarSheet();
  inicializarEventosDrawerLista();
  inicializarSeguiderCorporal();
  inicializarCompartir();
  inicializarScrollInfinito();
  inicializarScrollBotones();
  console.log('[APEX] Workout inicializado.');
});