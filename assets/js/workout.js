'use strict';

/* ══════════════════════════════════════════════════════════
   0. CONFIG
══════════════════════════════════════════════════════════ */
const CONFIG = {
  BASE_URL: 'https://api.fitmoca.edu',
  JWT_KEY:  'apex_token',
  TEMA_KEY: 'apex_tema',
};

const db = window.supabaseClient;

const Estado = {
  fechaActual:       new Date(),
  drawerAbierto:     false,
  sheetAbierto:      false,
  corporalAbierto:   false,
  ejerciciosEntreno: [],
  contadorEj:        0,
  contadorSerie:     0,
  rutinas:           [],
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
  
  const user = await window.ApexAuth.getUser();
  if (!user) {
    mostrarToast('Debes iniciar sesión para guardar');
    return;
  }

  // 1. Crear sesión de entrenamiento
  const { data: session, error: sessionError } = await db
    .from('workout_sessions')
    .insert({
      user_id: user.id,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString()
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error al guardar sesión:', sessionError);
    mostrarToast('Error al guardar el entreno');
    return;
  }

  // 2. Insertar logs de ejercicios (series)
  const logs = [];
  Estado.ejerciciosEntreno.forEach(ej => {
    ej.series.forEach((serie, idx) => {
      // Ignoramos el guardado de series sin reps ni peso
      if (!serie.reps && !serie.kg) return;
      
      logs.push({
        session_id: session.id,
        exercise_id: ej.id, // Debe ser UUID válido en la DB
        set_number: idx + 1,
        reps_completed: serie.reps || 0,
        weight_used: serie.kg || 0
      });
    });
  });

  if (logs.length > 0) {
    const { error: logsError } = await db.from('workout_logs').insert(logs);
    if (logsError) {
      console.error('Error guardando logs:', logsError);
      // Falla silente para logs, la sesión ya se guardó
    }
  }

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
async function abrirDrawerCorporal() {
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

async function renderizarHistorialCorporal() {
  const cont = document.getElementById('corporal-historial');
  if (!cont) return;

  const user = await window.ApexAuth.getUser();
  if (!user) return;

  const { data, error } = await db
    .from('body_tracking')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    cont.innerHTML = `
      <div class="corporal-hist-vacio">
        <i data-lucide="scale"></i>
        <span>Sin registros anteriores</span>
      </div>`;
    lucide.createIcons();
    return;
  }

  cont.innerHTML = data.map((r, index) => {
    const fecha = new Date(r.created_at);
    const fechaTxt = `${fecha.getDate()} ${MESES[fecha.getMonth()].substring(0,3)}`;
    
    // Calcular delta con el registro anterior (si existe)
    let delta = 0;
    if (index < data.length - 1) {
      delta = r.weight - data[index + 1].weight;
    }
    
    const signo = delta > 0 ? '+' : '';
    const cls   = delta < 0 ? 'baja' : delta > 0 ? 'sube' : 'igual';
    
    return `
      <div class="corporal-hist-fila clickable" data-id="${r.id}">
        <span class="corporal-hist-fecha">${fechaTxt}</span>
        <span class="corporal-hist-peso">${r.weight} lbs</span>
        <span class="corporal-hist-grasa">${r.body_fat || '—'}% grasa</span>
        <span class="corporal-hist-delta ${cls}">${delta !== 0 ? `${signo}${delta.toFixed(1)} lbs` : '—'}</span>
      </div>`;
  }).join('');

  // Eventos de clic
  cont.querySelectorAll('.corporal-hist-fila').forEach(el => {
    el.addEventListener('click', () => mostrarDetalleCorporal(el.dataset.id));
  });
}

async function mostrarDetalleCorporal(id) {
  const { data, error } = await db.from('body_tracking').select('*').eq('id', id).single();
  if (error || !data) {
    mostrarToast('Error al cargar detalles');
    return;
  }

  const grid = document.getElementById('detalle-corporal-grid');
  const titulo = document.querySelector('#modal-detalle-corporal-overlay .modal-titulo');
  if (!grid) return;

  const fecha = new Date(data.created_at);
  if (titulo) titulo.textContent = `Análisis del ${fecha.getDate()} ${MESES[fecha.getMonth()].substring(0,3)}`;

  const labels = {
    weight: 'Peso', body_fat: '% Grasa', muscle_mass: 'Masa Muscular', body_water: 'Agua Corporal',
    neck: 'Cuello', chest: 'Pecho', waist: 'Cintura', hip: 'Cadera',
    biceps_left: 'Bíceps (izq)', biceps_right: 'Bíceps (der)',
    thigh_left: 'Muslo (izq)', thigh_right: 'Muslo (der)',
    calf_left: 'Pantorrilla (izq)', calf_right: 'Pantorrilla (der)'
  };

  const unidades = {
    weight: 'lbs', body_fat: '%', muscle_mass: 'lbs', body_water: '%',
    neck: 'in', chest: 'in', waist: 'in', hip: 'in',
    biceps_left: 'in', biceps_right: 'in',
    thigh_left: 'in', thigh_right: 'in',
    calf_left: 'in', calf_right: 'in'
  };

  const colores = {
    weight: '#7EB8A4', body_fat: '#5CB85C', muscle_mass: '#E67E22', body_water: '#9B59B6',
    neck: '#7EB8A4', chest: '#5CB85C', waist: '#E67E22', hip: '#9B59B6',
    biceps_left: '#5B9BD5', biceps_right: '#5B9BD5',
    thigh_left: '#48C9B0', thigh_right: '#48C9B0',
    calf_left: '#F1C40F', calf_right: '#F1C40F'
  };

  grid.innerHTML = Object.entries(labels).map(([key, label]) => {
    const val = data[key];
    if (val === null) return '';
    const color = colores[key] || 'var(--acento)';
    return `
      <div class="detalle-item" style="border-left: 3px solid ${color}">
        <span class="detalle-label" style="color: ${color}">${label}</span>
        <span class="detalle-valor">${val} <span>${unidades[key]}</span></span>
      </div>`;
  }).join('');

  document.getElementById('modal-detalle-corporal-overlay')?.classList.remove('oculto');
  lucide.createIcons();
}

async function guardarCorporal() {
  const user = await window.ApexAuth.getUser();
  if (!user) {
    mostrarToast('Debes iniciar sesión para guardar');
    return;
  }

  const getVal = (id) => {
    const val = document.getElementById(id)?.value;
    return val ? parseFloat(val) : null;
  };

  const peso = getVal('corp-peso');
  if (peso === null) {
    mostrarToast('Ingresa al menos el peso');
    return;
  }

  const payload = {
    user_id: user.id,
    weight: peso,
    body_fat: getVal('corp-grasa'),
    muscle_mass: getVal('corp-musculo'),
    body_water: getVal('corp-agua'),
    neck: getVal('corp-cuello'),
    chest: getVal('corp-pecho'),
    waist: getVal('corp-cintura'),
    hip: getVal('corp-cadera'),
    biceps_left: getVal('corp-biceps-izq'),
    biceps_right: getVal('corp-biceps-der'),
    thigh_left: getVal('corp-muslo-izq'),
    thigh_right: getVal('corp-muslo-der'),
    calf_left: getVal('corp-pant-izq'),
    calf_right: getVal('corp-pant-der')
  };

  const { error } = await db.from('body_tracking').insert(payload);

  if (error) {
    console.error('Error guardando medidas:', error);
    mostrarToast('Error al guardar');
    return;
  }

  mostrarToast('Análisis guardado ✓');
  
  // Limpiar campos
  const inputs = document.querySelectorAll('.corporal-input');
  inputs.forEach(i => i.value = '');

  cerrarDrawerCorporal();
  renderizarHistorialCorporal();
}

function inicializarSeguiderCorporal() {
  document.getElementById('corporal-cancelar')?.addEventListener('click', cerrarDrawerCorporal);
  document.getElementById('corporal-guardar')?.addEventListener('click', guardarCorporal);
  
  const modal = document.getElementById('modal-detalle-corporal-overlay');
  const btnCerrar = document.getElementById('btn-cerrar-detalle-corporal');
  
  btnCerrar?.addEventListener('click', () => modal?.classList.add('oculto'));
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('oculto');
  });
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
   12. CARGA DE RUTINAS Y WIDGET
══════════════════════════════════════════════════════════ */
async function renderizarRutinas() {
  const grid = document.getElementById('rutinas-grid');
  if (!grid) return;

  const user = await window.ApexAuth.getUser();
  if (!user) return;

  const { data: rutinas, error } = await db
    .from('routines')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) {
    console.error('Error al cargar rutinas:', error);
    grid.innerHTML = '<div class="rutina-error">Error al cargar rutinas</div>';
    return;
  }

  Estado.rutinas = rutinas;

  if (rutinas.length === 0) {
    grid.innerHTML = `
      <div class="rutina-vacia">
        <p>No tienes rutinas creadas.</p>
        <a href="rutina.html" class="enlace-acento">Crear rutina</a>
      </div>`;
    return;
  }

  grid.innerHTML = rutinas.map(r => `
    <div class="rutina-card" data-rutina-id="${r.id}">
      <span class="rutina-nombre">${r.name}</span>
      <div class="rutina-meta">
        <i data-lucide="bar-chart"></i>
        <span>${r.difficulty_level || 'General'}</span>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.rutina-card').forEach(card => {
    card.addEventListener('click', () => empezarEntrenoDesdeRutina(card.dataset.rutinaId));
  });

  lucide.createIcons();
}

async function empezarEntrenoDesdeRutina(rutinaId) {
  const rutina = Estado.rutinas.find(r => r.id === rutinaId);
  if (!rutina) return;

  mostrarToast(`Iniciando ${rutina.name}...`);

  // Obtener ejercicios de la rutina
  const { data: ejercicios, error } = await db
    .from('routine_exercises')
    .select('*, exercises(*)')
    .eq('routine_id', rutinaId)
    .order('order');

  if (error || !ejercicios) {
    console.error('Error al cargar ejercicios de la rutina:', error);
    mostrarToast('Error al cargar la rutina');
    return;
  }

  // Limpiar entreno actual y cargar los de la rutina
  Estado.ejerciciosEntreno = [];
  ejercicios.forEach(re => {
    const ex = re.exercises;
    Estado.contadorEj++;
    let finalSeries = [];
    try {
      if (re.target_reps && re.target_reps.startsWith('[')) {
        const parsed = JSON.parse(re.target_reps);
        finalSeries = parsed.map(s => ({
          localId: `s-${++Estado.contadorSerie}`,
          kg: s.kg || '',
          reps: s.reps || ''
        }));
      }
    } catch(e) {}

    if (finalSeries.length === 0) {
      const targetSets = re.target_sets || 3;
      for (let i = 0; i < targetSets; i++) {
        finalSeries.push({ localId: `s-${++Estado.contadorSerie}`, kg: '', reps: re.target_reps || '' });
      }
    }

    Estado.ejerciciosEntreno.push({
      localId: `ej-local-${Estado.contadorEj}`,
      id: ex.id,
      nombre: ex.name,
      musculo: ex.muscle_group,
      color: obtenerColorMusculo(ex.muscle_group),
      series: finalSeries,
    });
  });

  renderizarListaDrawer();
  abrirDrawer();
}

function obtenerColorMusculo(musculo) {
  const colores = {
    'Espalda': '#7EB8A4', 'Pecho': '#5CB85C', 'Hombro': '#5B9BD5',
    'Bíceps': '#5CB85C', 'Tríceps': '#9B59B6', 'Piernas': '#48C9B0',
    'Trapecios': '#5CB85C', 'Antebrazos': '#5B9BD5'
  };
  return colores[musculo] || '#888';
}

async function renderizarHistorialReciente() {
  const cont = document.getElementById('journal-historial-lista');
  if (!cont) return;

  const user = await window.ApexAuth.getUser();
  if (!user) return;

  // Cargar las últimas 5 sesiones con sus logs
  const { data: sesiones, error } = await db
    .from('workout_sessions')
    .select('*, workout_logs(*, exercises(*))')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(5);

  if (error || !sesiones || sesiones.length === 0) {
    cont.innerHTML = '<div class="historial-vacio">Aún no has registrado entrenos.</div>';
    return;
  }

  cont.innerHTML = sesiones.map(s => {
    const fecha = new Date(s.start_time);
    const diaNum = fecha.getDate();
    const diaNom = DIAS[fecha.getDay()];
    const mesNom = MESES[fecha.getMonth()];
    
    // Agrupar logs por ejercicio para mostrar resumen
    const ejerciciosUnicos = [];
    s.workout_logs.forEach(log => {
      if (!ejerciciosUnicos.find(e => e.id === log.exercise_id)) {
        ejerciciosUnicos.push(log.exercises);
      }
    });

    return `
      <article class="entreno-card">
        <div class="entreno-card-inner">
          <header class="entreno-card-cabecera">
            <div class="entreno-fecha-bloque">
              <time class="entreno-dia-num">${diaNum}</time>
              <div>
                <span class="entreno-dia-nombre">${diaNom}</span>
                <span class="entreno-mes">${mesNom} ${fecha.getFullYear()}</span>
              </div>
            </div>
            <div class="entreno-musculo-dots">
              ${ejerciciosUnicos.slice(0, 4).map(e => `
                <span class="musculo-dot" style="--c:${obtenerColorMusculo(e.muscle_group)}" title="${e.muscle_group}"></span>
              `).join('')}
            </div>
          </header>
          <ul class="entreno-ejercicios">
            ${ejerciciosUnicos.slice(0, 3).map(e => `
              <li class="ejercicio-bloque">
                <div class="ejercicio-titulo-fila">
                  <span class="ejercicio-dot" style="--c:${obtenerColorMusculo(e.muscle_group)}"></span>
                  <span class="ejercicio-nombre">${e.name}</span>
                </div>
              </li>
            `).join('')}
            ${ejerciciosUnicos.length > 3 ? `<li class="ejercicio-mas">y ${ejerciciosUnicos.length - 3} más...</li>` : ''}
          </ul>
        </div>
      </article>
    `;
  }).join('');
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
  
  // Cargas iniciales Journal
  renderizarRutinas();
  renderizarHistorialReciente();
  
  console.log('[APEX] Journal inicializado.');
});