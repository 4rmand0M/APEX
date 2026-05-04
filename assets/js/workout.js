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
  const drawer = document.getElementById('drawer-nuevo');
  if (drawer) {
    drawer.classList.remove('oculto');
    requestAnimationFrame(() => drawer.classList.add('abierto'));
  }
  document.getElementById('overlay-global')?.classList.remove('oculto');
  const hoy = new Date();
  const el  = document.getElementById('drawer-fecha-texto');
  if (el) el.textContent = `${DIAS[hoy.getDay()]}, ${hoy.getDate()} de ${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;
  lucide.createIcons();
}

function cerrarDrawer() {
  Estado.drawerAbierto = false;
  const drawer = document.getElementById('drawer-nuevo');
  if (drawer) {
    drawer.classList.remove('abierto');
    setTimeout(() => {
      if (!Estado.drawerAbierto) drawer.classList.add('oculto');
    }, 300); // Coincidir con la transición CSS
  }
  
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
  await renderizarHistorialReciente();
  cerrarDrawer();
}

/* ══════════════════════════════════════════════════════════
   5. SHEET — SELECTOR DE EJERCICIOS
══════════════════════════════════════════════════════════ */
function abrirSheet() {
  Estado.sheetAbierto = true;
  const sheet = document.getElementById('sheet-ejercicios');
  if (sheet) {
    sheet.classList.remove('oculto');
    requestAnimationFrame(() => sheet.classList.add('abierto'));
  }
  document.getElementById('overlay-global')?.classList.remove('oculto');
  document.getElementById('sheet-search')?.focus();
}

function cerrarSheet() {
  Estado.sheetAbierto = false;
  const sheet = document.getElementById('sheet-ejercicios');
  if (sheet) {
    sheet.classList.remove('abierto');
    setTimeout(() => {
      if (!Estado.sheetAbierto) sheet.classList.add('oculto');
    }, 300);
  }
  if (!Estado.drawerAbierto && !Estado.corporalAbierto) {
    document.getElementById('overlay-global')?.classList.add('oculto');
  }
}

function inicializarSheet() {
  document.getElementById('sheet-cerrar')?.addEventListener('click', cerrarSheet);

  document.getElementById('sheet-grupos')?.addEventListener('click', e => {
    // 1. Expandir/Colapsar grupo
    const btnGrupo = e.target.closest('.sheet-grupo-row');
    if (btnGrupo) {
      const expandido = btnGrupo.getAttribute('aria-expanded') === 'true';
      const listaId = btnGrupo.getAttribute('aria-controls');
      const lista = document.getElementById(listaId);
      btnGrupo.setAttribute('aria-expanded', String(!expandido));
      lista?.classList.toggle('oculto', expandido);
      return;
    }

    // 2. Seleccionar ejercicio
    const btnEj = e.target.closest('.sg-ej-btn');
    if (btnEj) {
      const item = btnEj.closest('.sg-ej-item');
      if (!item) return;
      agregarEjercicioAlEntreno(
        item.dataset.ejId,
        item.querySelector('.sg-ej-nombre')?.textContent || '',
        item.dataset.ejMusculo || '',
        item.dataset.ejColor   || '#888'
      );
      cerrarSheet();
    }
  });

  document.getElementById('sheet-search')?.addEventListener('input', e => {
    buscarEnSheet(e.target.value.trim().toLowerCase());
  });

  cargarEjerciciosBibliotecaSheet();
}

async function cargarEjerciciosBibliotecaSheet() {
  const user = await window.ApexAuth.getUser();
  if (!user) return;

  const { data: exercises, error } = await db
    .from('exercises')
    .select('*')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error || !exercises) {
    console.error('Error cargando ejercicios:', error);
    return;
  }

  // Agrupar por músculo
  const grupos = {};
  exercises.forEach(ex => {
    const m = ex.muscle_group || 'Otros';
    if (!grupos[m]) grupos[m] = [];
    grupos[m].push(ex);
  });

  const contenedor = document.getElementById('sheet-grupos');
  if (!contenedor) return;

  // Limpiar antes de renderizar, manteniendo solo el elemento "Sin resultados"
  const sinRes = contenedor.querySelector('#sheet-sin-res');
  contenedor.innerHTML = '';
  if (sinRes) contenedor.appendChild(sinRes);

  let html = '';
  Object.keys(grupos).sort().forEach((musculo, index) => {
    const idGrupo = `sg-${index}`;
    const color = obtenerColorMusculo(musculo);
    const ejs = grupos[musculo];

    let lis = ejs.map(ej => `
      <li class="sg-ej-item" data-ej-id="${ej.id}" data-ej-musculo="${musculo}" data-ej-color="${color}">
        <button class="sg-ej-btn" aria-label="Añadir ${ej.name}">
          <span class="sg-ej-nombre">${ej.name}</span>
          <i data-lucide="plus" class="sg-ej-plus"></i>
        </button>
      </li>
    `).join('');

    html += `
      <li class="sheet-grupo-item" data-grupo-id="${idGrupo}" data-color="${color}">
        <button class="sheet-grupo-row" aria-expanded="false" aria-controls="${idGrupo}-lista">
          <span class="sg-dot" style="background:${color}"></span>
          <span class="sg-nombre">${musculo}</span>
          <i data-lucide="chevron-right" class="sg-chevron"></i>
        </button>
        <ul class="sg-ejercicios oculto" id="${idGrupo}-lista" role="list">
          ${lis}
        </ul>
      </li>
    `;
  });

  // Insertar html antes de "Sin resultados"
  contenedor.insertAdjacentHTML('afterbegin', html);
  lucide.createIcons();
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
   8. ANÁLISIS — Lógica 100% funcional con Supabase
══════════════════════════════════════════════════════════ */

let graficaFrecuencia = null;
let graficaProgresion = null;
let graficaPeso       = null;
let ejercicioSeleccionado = null; // { id, nombre, color }

function abrirAnalisis() {
  const drawer = document.getElementById('drawer-analisis');
  if (!drawer) return;
  drawer.classList.remove('oculto');
  requestAnimationFrame(() => drawer.classList.add('abierto'));
  document.getElementById('overlay-global')?.classList.remove('oculto');
  lucide.createIcons();
  cargarAnalisis();
}

function cerrarAnalisis() {
  const drawer = document.getElementById('drawer-analisis');
  if (drawer) {
    drawer.classList.remove('abierto');
    setTimeout(() => drawer.classList.add('oculto'), 300);
  }
  document.getElementById('overlay-global')?.classList.add('oculto');
}

async function cargarAnalisis() {
  const user = await window.ApexAuth.getUser();
  if (!user) return;

  // Ejecutar todas las cargas en paralelo
  await Promise.all([
    cargarKPIs(user.id),
    cargarGraficaFrecuencia(user.id),
    cargarVolumenPorMusculo(user.id),
    cargarSelectorEjercicios(user.id),
    cargarGraficaPeso(user.id),
    cargarPRsRecientes(user.id),
    cargarRachas(user.id),
  ]);
}

/* ── KPIs ── */
async function cargarKPIs(userId) {
  const { data: sesiones } = await db
    .from('workout_sessions')
    .select('id, start_time, end_time')
    .eq('user_id', userId);

  const { data: logs } = await db
    .from('workout_logs')
    .select('id, weight_used, reps_completed, is_pr, session_id, workout_sessions!inner(user_id)')
    .eq('workout_sessions.user_id', userId);

  if (!sesiones) return;

  const totalSesiones = sesiones.length;
  const totalSeries   = logs?.length || 0;
  const totalVolumen  = logs?.reduce((s, l) => s + (l.weight_used || 0) * (l.reps_completed || 0), 0) || 0;
  const totalPRs      = logs?.filter(l => l.is_pr).length || 0;

  // Tiempo promedio en minutos
  let tiempoTotal = 0;
  sesiones.forEach(s => {
    if (s.start_time && s.end_time) {
      tiempoTotal += (new Date(s.end_time) - new Date(s.start_time)) / 60000;
    }
  });
  const tiempoPromedio = totalSesiones > 0 ? Math.round(tiempoTotal / totalSesiones) : 0;

  document.getElementById('da-kpi-sesiones').textContent = totalSesiones;
  document.getElementById('da-kpi-series').textContent   = totalSeries;
  document.getElementById('da-kpi-volumen').textContent  = totalVolumen > 1000
    ? `${(totalVolumen / 1000).toFixed(1)}t`
    : `${Math.round(totalVolumen)}kg`;
  document.getElementById('da-kpi-prs').textContent     = totalPRs;
  document.getElementById('da-kpi-tiempo').textContent  = tiempoPromedio ? `${tiempoPromedio}min` : '—';
}

/* ── GRÁFICA FRECUENCIA (últimas 12 semanas) ── */
async function cargarGraficaFrecuencia(userId) {
  const { data: sesiones } = await db
    .from('workout_sessions')
    .select('start_time')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(200);

  if (!sesiones || sesiones.length === 0) return;

  // Agrupar por semana (últimas 12)
  const semanas = {};
  sesiones.forEach(s => {
    const d = new Date(s.start_time);
    const inicio = new Date(d);
    inicio.setDate(d.getDate() - d.getDay()); // Domingo de la semana
    const clave = inicio.toISOString().slice(0, 10);
    semanas[clave] = (semanas[clave] || 0) + 1;
  });

  const claves = Object.keys(semanas).sort().slice(-12);
  const labels = claves.map(c => {
    const d = new Date(c);
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
  });
  const valores = claves.map(c => semanas[c]);
  const promedio = valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1) : 0;
  document.getElementById('da-meta-freq').textContent = `${promedio} días/sem`;

  const ctx = document.getElementById('da-grafico-frecuencia');
  if (!ctx) return;
  graficaFrecuencia?.destroy();
  graficaFrecuencia = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: valores,
        backgroundColor: 'rgba(126,184,164,0.55)',
        borderColor: '#7EB8A4',
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#aaa', stepSize: 1 }, beginAtZero: true }
      },
      responsive: true, maintainAspectRatio: true,
    }
  });
}

/* ── VOLUMEN POR MÚSCULO ── */
async function cargarVolumenPorMusculo(userId) {
  const { data: logs } = await db
    .from('workout_logs')
    .select('weight_used, reps_completed, exercises(muscle_group), workout_sessions!inner(user_id)')
    .eq('workout_sessions.user_id', userId);

  if (!logs || logs.length === 0) {
    document.getElementById('da-barras-lista').innerHTML = '<p style="color:var(--texto-secundario)">Sin datos</p>';
    return;
  }

  const volPorMusculo = {};
  logs.forEach(l => {
    const m = l.exercises?.muscle_group || 'Otros';
    volPorMusculo[m] = (volPorMusculo[m] || 0) + (l.weight_used || 0) * (l.reps_completed || 0);
  });

  const max = Math.max(...Object.values(volPorMusculo));
  const sorted = Object.entries(volPorMusculo).sort((a, b) => b[1] - a[1]);

  document.getElementById('da-barras-lista').innerHTML = sorted.map(([musculo, vol]) => {
    const pct = max > 0 ? (vol / max) * 100 : 0;
    const color = obtenerColorMusculo(musculo);
    return `
      <div class="da-barra-fila">
        <span class="da-barra-nombre">${musculo}</span>
        <div class="da-barra-track">
          <div class="da-barra-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
        <span class="da-barra-val">${Math.round(vol)}kg</span>
      </div>`;
  }).join('');
}

/* ── SELECTOR EJERCICIOS Y GRÁFICA PROGRESIÓN ── */
async function cargarSelectorEjercicios(userId) {
  const { data: exercises } = await db
    .from('exercises')
    .select('id, name, muscle_group')
    .eq('user_id', userId)
    .order('name');

  if (!exercises || exercises.length === 0) return;

  const dropdown = document.getElementById('da-sel-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = exercises.map((ex, i) => {
    const color = obtenerColorMusculo(ex.muscle_group);
    return `
      <li role="option" class="da-sel-opcion ${i === 0 ? 'activa' : ''}"
          data-ej-id="${ex.id}" data-color="${color}" data-nombre="${ex.name}">
        <span class="da-sel-opt-dot" style="background:${color}"></span>${ex.name}
      </li>`;
  }).join('');

  // Seleccionar el primero por defecto
  const primero = exercises[0];
  ejercicioSeleccionado = { id: primero.id, nombre: primero.name, color: obtenerColorMusculo(primero.muscle_group) };
  document.getElementById('da-sel-nombre').textContent = primero.name;
  document.getElementById('da-sel-dot').style.background = ejercicioSeleccionado.color;
  cargarGraficaProgresion(userId, ejercicioSeleccionado.id);

  // Toggle dropdown
  document.getElementById('da-selector-btn')?.addEventListener('click', () => {
    const dd = document.getElementById('da-sel-dropdown');
    const open = !dd.classList.contains('oculto');
    dd.classList.toggle('oculto', open);
    document.getElementById('da-selector-btn').setAttribute('aria-expanded', String(!open));
  });

  // Selección
  dropdown.addEventListener('click', async e => {
    const op = e.target.closest('.da-sel-opcion');
    if (!op) return;
    dropdown.querySelectorAll('.da-sel-opcion').forEach(o => o.classList.remove('activa'));
    op.classList.add('activa');
    ejercicioSeleccionado = { id: op.dataset.ejId, nombre: op.dataset.nombre, color: op.dataset.color };
    document.getElementById('da-sel-nombre').textContent = ejercicioSeleccionado.nombre;
    document.getElementById('da-sel-dot').style.background = ejercicioSeleccionado.color;
    document.getElementById('da-sel-dropdown').classList.add('oculto');
    document.getElementById('da-selector-btn').setAttribute('aria-expanded', 'false');
    const user = await window.ApexAuth.getUser();
    if (user) cargarGraficaProgresion(user.id, ejercicioSeleccionado.id);
  });
}

async function cargarGraficaProgresion(userId, exerciseId) {
  const { data: logs } = await db
    .from('workout_logs')
    .select('weight_used, reps_completed, is_pr, workout_sessions!inner(user_id, start_time)')
    .eq('exercise_id', exerciseId)
    .eq('workout_sessions.user_id', userId)
    .order('workout_sessions(start_time)', { ascending: true });

  const badge = document.getElementById('da-pr-badge');
  const ctx   = document.getElementById('da-grafico-progresion');
  if (!ctx) return;

  if (!logs || logs.length === 0) {
    badge.textContent = 'Sin datos';
    graficaProgresion?.destroy();
    return;
  }

  // Un punto por sesión = max weight x reps (1RM estimado: w × (1 + r/30))
  const porSesion = {};
  logs.forEach(l => {
    const fecha = l.workout_sessions?.start_time?.slice(0, 10) || '';
    const orm   = (l.weight_used || 0) * (1 + (l.reps_completed || 0) / 30);
    if (!porSesion[fecha] || orm > porSesion[fecha]) porSesion[fecha] = orm;
  });

  const claves  = Object.keys(porSesion).sort();
  const labels  = claves.map(c => { const d = new Date(c); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; });
  const valores = claves.map(c => +porSesion[c].toFixed(1));

  const prMax = Math.max(...logs.map(l => l.weight_used || 0));
  badge.textContent = prMax > 0 ? `PR — ${prMax}kg` : '';

  const color = ejercicioSeleccionado?.color || '#7EB8A4';
  graficaProgresion?.destroy();
  graficaProgresion = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: valores,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: color,
        fill: true,
        tension: 0.35,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 10 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.07)' }, ticks: { color: '#aaa' } }
      },
      responsive: true, maintainAspectRatio: true,
    }
  });
}

/* ── PESO CORPORAL ── */
async function cargarGraficaPeso(userId) {
  const { data: registros } = await db
    .from('body_tracking')
    .select('weight, body_fat, muscle_mass, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(60);

  const meta = document.getElementById('da-meta-peso');
  if (!registros || registros.length === 0) {
    if (meta) meta.textContent = 'Sin registros';
    return;
  }

  if (meta) meta.textContent = `${registros.length} registros`;

  const labels  = registros.map(r => { const d = new Date(r.created_at); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`; });
  const pesos   = registros.map(r => r.weight || null);
  const grasas  = registros.map(r => r.body_fat || null);
  const musculos= registros.map(r => r.muscle_mass || null);

  const ctx = document.getElementById('da-grafico-peso');
  if (!ctx) return;
  graficaPeso?.destroy();
  graficaPeso = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Peso (lbs)',
          data: pesos,
          borderColor: '#7EB8A4', backgroundColor: '#7EB8A422',
          borderWidth: 2, pointRadius: 2.5, fill: true, tension: 0.35,
        },
        {
          label: '% Grasa',
          data: grasas,
          borderColor: '#E67E22', backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35,
          borderDash: [4, 4],
        },
        {
          label: 'Músculo',
          data: musculos,
          borderColor: '#5B9BD5', backgroundColor: 'transparent',
          borderWidth: 1.5, pointRadius: 2, fill: false, tension: 0.35,
          borderDash: [4, 4],
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2.8,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: '#aaa', font: { size: 10 }, boxWidth: 10, padding: 8 }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 9 }, maxTicksLimit: 6 } },
        y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#aaa', font: { size: 9 } } }
      },
    }
  });

  // Stats resumen
  const ultimo = registros[registros.length - 1];
  const primero = registros[0];
  const difPeso = ultimo.weight && primero.weight ? (ultimo.weight - primero.weight).toFixed(1) : null;
  const statsEl = document.getElementById('da-peso-stats');
  if (statsEl && difPeso !== null) {
    const signo = difPeso > 0 ? '+' : '';
    const cls = difPeso < 0 ? 'baja' : difPeso > 0 ? 'sube' : 'igual';
    statsEl.innerHTML = `
      <div class="da-peso-stat-item">
        <span class="da-peso-stat-label">Peso actual</span>
        <span class="da-peso-stat-val">${ultimo.weight} lbs</span>
      </div>
      <div class="da-peso-stat-item">
        <span class="da-peso-stat-label">Cambio total</span>
        <span class="da-peso-stat-val corporal-hist-delta ${cls}">${signo}${difPeso} lbs</span>
      </div>
      ${ultimo.body_fat ? `
      <div class="da-peso-stat-item">
        <span class="da-peso-stat-label">% Grasa actual</span>
        <span class="da-peso-stat-val">${ultimo.body_fat}%</span>
      </div>` : ''}
      ${ultimo.muscle_mass ? `
      <div class="da-peso-stat-item">
        <span class="da-peso-stat-label">Masa muscular</span>
        <span class="da-peso-stat-val">${ultimo.muscle_mass} lbs</span>
      </div>` : ''}`;
  }
}

/* ── PRs RECIENTES ── */
async function cargarPRsRecientes(userId) {
  const { data: prs } = await db
    .from('workout_logs')
    .select('weight_used, reps_completed, exercises(name, muscle_group), workout_sessions!inner(user_id, start_time)')
    .eq('is_pr', true)
    .eq('workout_sessions.user_id', userId)
    .order('workout_sessions(start_time)', { ascending: false })
    .limit(10);

  const lista = document.getElementById('da-pr-lista');
  if (!lista) return;

  if (!prs || prs.length === 0) {
    lista.innerHTML = '<li style="color:var(--texto-secundario);padding:0.5rem 0">Sin récords aún</li>';
    return;
  }

  lista.innerHTML = prs.map(pr => {
    const ex    = pr.exercises;
    const fecha = new Date(pr.workout_sessions?.start_time || Date.now());
    const color = obtenerColorMusculo(ex?.muscle_group || '');
    return `
      <li class="da-pr-item">
        <span class="da-pr-dot" style="--c:${color}"></span>
        <div class="da-pr-info">
          <span class="da-pr-ejercicio">${ex?.name || '—'}</span>
          <span class="da-pr-musculo" style="color:${color}">${ex?.muscle_group || '—'}</span>
        </div>
        <div class="da-pr-nums">
          <span class="da-pr-peso">${pr.weight_used || 0}kg</span>
          <span class="da-pr-reps">× ${pr.reps_completed || 0}</span>
          <span class="da-pr-fecha">${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}</span>
        </div>
      </li>`;
  }).join('');
}

/* ── RACHAS ── */
async function cargarRachas(userId) {
  const { data: sesiones } = await db
    .from('workout_sessions')
    .select('start_time')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (!sesiones || sesiones.length === 0) return;

  // Días únicos ordenados DESC
  const diasUnicos = [...new Set(sesiones.map(s => s.start_time.slice(0, 10)))].sort().reverse();

  // Racha actual
  let rachaActual = 0;
  const hoy = new Date().toISOString().slice(0, 10);
  let diaEsp = hoy;
  for (const dia of diasUnicos) {
    if (dia === diaEsp) {
      rachaActual++;
      const d = new Date(diaEsp);
      d.setDate(d.getDate() - 1);
      diaEsp = d.toISOString().slice(0, 10);
    } else break;
  }

  // Mejor racha histórica
  let mejorRacha = 0, contador = 1;
  for (let i = 1; i < diasUnicos.length; i++) {
    const prev = new Date(diasUnicos[i - 1]);
    const curr = new Date(diasUnicos[i]);
    const diff = (prev - curr) / 86400000;
    if (Math.round(diff) === 1) {
      contador++;
      mejorRacha = Math.max(mejorRacha, contador);
    } else {
      contador = 1;
    }
  }
  mejorRacha = Math.max(mejorRacha, rachaActual);

  // Semanas activas en últimas 8
  const semanas = new Set();
  const hace8 = new Date(); hace8.setDate(hace8.getDate() - 56);
  sesiones.forEach(s => {
    const d = new Date(s.start_time);
    if (d >= hace8) {
      const inicio = new Date(d); inicio.setDate(d.getDate() - d.getDay());
      semanas.add(inicio.toISOString().slice(0, 10));
    }
  });

  document.getElementById('da-racha-actual').textContent  = rachaActual;
  document.getElementById('da-racha-mejor').textContent   = mejorRacha;
  document.getElementById('da-racha-semanas').textContent = `${semanas.size}/8`;
  document.getElementById('da-kpi-racha').textContent     = rachaActual;
}

// Bind cerrarAnalisis to the close button when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('da-cerrar')?.addEventListener('click', cerrarAnalisis);
});

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
    
    // Agrupar logs por ejercicio
    const logsPorEj = {};
    s.workout_logs.forEach(log => {
      if (!log.exercises) return;
      if (!logsPorEj[log.exercise_id]) {
        logsPorEj[log.exercise_id] = {
          ejercicio: log.exercises,
          series: []
        };
      }
      logsPorEj[log.exercise_id].series.push(log);
    });

    const ejerciciosUnicos = Object.values(logsPorEj);

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
                <span class="musculo-dot" style="--c:${obtenerColorMusculo(e.ejercicio.muscle_group)}" title="${e.ejercicio.muscle_group}"></span>
              `).join('')}
            </div>
          </header>
          <ul class="entreno-ejercicios">
            ${ejerciciosUnicos.slice(0, 3).map(e => `
              <li class="ejercicio-bloque">
                <div class="ejercicio-titulo-fila">
                  <span class="ejercicio-dot" style="--c:${obtenerColorMusculo(e.ejercicio.muscle_group)}"></span>
                  <span class="ejercicio-nombre">${e.ejercicio.name}</span>
                </div>
                <ul class="series-lista">
                  ${e.series.sort((a,b) => a.set_number - b.set_number).map(serie => `
                    <li class="serie-fila ${serie.is_pr ? 'serie-pr' : ''}">
                      ${serie.is_pr ? '<i data-lucide="trophy" class="icono-trofeo"></i>' : ''}
                      <span class="serie-peso">${serie.weight_used || 0} kg</span>
                      <span class="serie-reps">${serie.reps_completed || 0} reps</span>
                    </li>
                  `).join('')}
                </ul>
              </li>
            `).join('')}
            ${ejerciciosUnicos.length > 3 ? `<li class="ejercicio-mas">y ${ejerciciosUnicos.length - 3} más...</li>` : ''}
          </ul>
        </div>
      </article>
    `;
  }).join('');
  lucide.createIcons();
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