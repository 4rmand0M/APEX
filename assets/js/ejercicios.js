/* ============================================================
   APEX FITNESS — Ejercicios (ejercicios.js)
   Módulos:
   1.  Arranque: carga, cursor, tema, íconos.
   2.  Biblioteca: filtrado por músculo (chips).
   3.  Biblioteca: búsqueda con debounce.
   4.  Selección de ejercicio → actualizar panel de detalle.
   5.  Pestañas del detalle.
   6.  Chart.js: gráfica de progreso + selector de métrica.
   7.  Dropdown "Añadir a rutina".
   8.  Toast de notificación.
   9.  Carga de ejercicios desde backend (fetch + render).
   10. Helpers y utilidades.
============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────
   0. CONFIGURACIÓN
   BACKEND: Ajustar BASE_URL al servidor real.
────────────────────────────────────────────────────────── */
const CONFIG = {
  BASE_URL: 'https://api.fitmoca.edu',
  JWT_KEY: 'apex_token',
  TEMA_KEY: 'apex_tema',
  DEBOUNCE_MS: 350,
};

// Helper para obtener el cliente de Supabase de forma segura
function getDb() {
  const db = window.supabaseClient;
  if (!db) {
    console.error('[APEX] Supabase client no inicializado');
    mostrarToast('Error de conexión');
  }
  return db;
}

/* Estado global */
const Estado = {
  ejercicioActivo: null,   // ID del ejercicio actualmente seleccionado
  musculoFiltro: 'todos',
  queryBusqueda: '',
  metricaActiva: 'peso',
  rangoActivo: '12w',
  grafica: null,   // Instancia de Chart.js
};

/* ──────────────────────────────────────────────────────────
   Datos de ejercicios (mock client-side).
   BACKEND: Reemplazar con fetch a GET /exercises
   Estructura esperada de la API:
   [
     {
       id:                  "ej-001",
       nombre:              "Bench Press (Barbell)",
       equipo:              "Barbell",
       musculo_primario:    "pecho",
       musculos_primarios:  ["Pectoral mayor","Pectoral menor"],
       musculos_secundarios:["Deltoides anterior","Tríceps braquial","Serrato anterior"],
       imagen_url:          null,
       animation_url:       null,     // exercises.animation_url en BD
       muscle_map_url:      null,     // exercises.muscle_map_url en BD
       instrucciones:       [...],    // array { titulo, descripcion }
       consejos:            [...],    // array de strings
     }
   ]
────────────────────────────────────────────────────────── */
const EJERCICIOS_MOCK = {
  'ej-001': {
    id: 'ej-001', nombre: 'Bench Press (Barbell)', equipo: 'Barbell',
    musculo_primario: 'Pecho',
    musculos_primarios: ['Pectoral mayor', 'Pectoral menor'],
    musculos_secundarios: ['Deltoides anterior', 'Tríceps braquial', 'Serrato anterior'],
    // Estadísticas simuladas (BACKEND: GET /metrics/exercise/{id}?range=12w)
    stats: { mejorPeso: '85 kg', rm1: '102 kg', volumen: '12,400 kg', sesiones: '18' },
    datos_grafica: {
      peso: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], data: [65, 70, 72, 75, 77.5, 80, 82.5, 85] },
      reps: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], data: [12, 10, 10, 8, 8, 8, 8, 6] },
      '1rm': { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], data: [75, 82, 84, 87, 90, 93, 96, 102] },
      volumen: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'], data: [1200, 1400, 1500, 1600, 1700, 1800, 1900, 2100] },
    },
  },
  'ej-002': {
    id: 'ej-002', nombre: 'Arnold Press (Dumbbell)', equipo: 'Dumbbell',
    musculo_primario: 'Hombros',
    musculos_primarios: ['Deltoides anterior', 'Deltoides lateral'],
    musculos_secundarios: ['Tríceps braquial', 'Trapecios'],
    stats: { mejorPeso: '22 kg', rm1: '26 kg', volumen: '4,800 kg', sesiones: '10' },
    datos_grafica: {
      peso: { labels: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], data: [14, 16, 18, 20, 20, 22] },
      reps: { labels: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], data: [10, 10, 10, 8, 8, 8] },
      '1rm': { labels: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], data: [17, 20, 22, 24, 24, 26] },
      volumen: { labels: ['Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'], data: [700, 900, 1000, 1100, 1100, 1200] },
    },
  },
  'ej-003': {
    id: 'ej-003', nombre: 'Bent Over Row (Barbell)', equipo: 'Barbell',
    musculo_primario: 'Espalda',
    musculos_primarios: ['Dorsal ancho', 'Romboides'],
    musculos_secundarios: ['Bíceps braquial', 'Deltoides posterior', 'Trapecio inferior'],
    stats: { mejorPeso: '90 kg', rm1: '108 kg', volumen: '9,600 kg', sesiones: '14' },
    datos_grafica: {
      peso: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], data: [60, 65, 70, 75, 80, 90] },
      reps: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], data: [10, 10, 8, 8, 8, 6] },
      '1rm': { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], data: [72, 78, 84, 90, 96, 108] },
      volumen: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'], data: [1200, 1400, 1500, 1700, 1800, 1900] },
    },
  },
};

/* Función para obtener datos de un ejercicio.
   BACKEND: Reemplazar con fetch real. */
async function obtenerDatosEjercicio(ejercicioId) {
  try {
    const user = await window.ApexAuth.getUser();
    const userId = user?.id;

    const db = getDb();
    if (!db) return;

    const { data: ej, error } = await db
      .from('exercises')
      .select('*, created_by')
      .eq('id', ejercicioId)
      .single();

    if (error) throw error;

    let stats = { mejorPeso: '—', maxReps: '—' };
    let datos_grafica = { 
      peso: { labels: [], data: [] }, 
      reps: { labels: [], data: [] } 
    };

    if (userId) {
      // Obtener logs de sesiones de entrenamiento
      const { data: sessionLogs } = await db
        .from('workout_logs')
        .select('weight_used, reps_completed, created_at, workout_sessions!inner(user_id)')
        .eq('exercise_id', ejercicioId)
        .eq('workout_sessions.user_id', userId);

      // Obtener logs de progreso personal (manuales)
      const { data: personalLogs } = await db
        .from('personal_progress')
        .select('weight_used, reps_completed, created_at')
        .eq('exercise_id', ejercicioId)
        .eq('user_id', userId);

      // Combinar y ordenar por fecha
      const logs = [...(sessionLogs || []), ...(personalLogs || [])].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      if (logs && logs.length > 0) {
        // Calcular mejor peso y max reps
        const pesos = logs.map(l => parseFloat(l.weight_used));
        const reps = logs.map(l => l.reps_completed);
        
        stats.mejorPeso = `${Math.max(...pesos)} kg`;
        stats.maxReps = `${Math.max(...reps)}`;

        // Preparar datos para la gráfica (agrupando por fecha)
        const history = {};
        logs.forEach(l => {
          const date = new Date(l.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
          if (!history[date]) history[date] = { peso: 0, reps: 0 };
          history[date].peso = Math.max(history[date].peso, parseFloat(l.weight_used));
          history[date].reps = Math.max(history[date].reps, l.reps_completed);
        });

        datos_grafica.peso.labels = Object.keys(history);
        datos_grafica.peso.data = Object.values(history).map(v => v.peso);
        datos_grafica.reps.labels = Object.keys(history);
        datos_grafica.reps.data = Object.values(history).map(v => v.reps);
      }
    }
    
    return {
      id: ej.id,
      nombre: ej.name,
      equipo: ej.equipment || '—',
      musculo_primario: ej.muscle_group || '—',
      descripcion: ej.description || '',
      created_by: ej.created_by,
      stats,
      datos_grafica
    };
  } catch (err) {
    console.error('[APEX] Error al obtener datos del ejercicio:', err);
    return {
      id: ejercicioId,
      nombre: 'Error al cargar',
      stats: { mejorPeso: '—', maxReps: '—' },
      datos_grafica: { peso: { labels: [], data: [] }, reps: { labels: [], data: [] } }
    };
  }
}


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
      punto.style.top = `${e.clientY}px`;
    });
  });
  const sel = 'button, a, input, select, .item-biblioteca, .chip-musculo';
  document.addEventListener('mouseover', e => { if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo'); });
  document.addEventListener('mouseout', e => { if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo'); });
}

function inicializarTema() {
  const html = document.documentElement;
  const btn = document.getElementById('boton-tema');
  html.setAttribute('data-tema', localStorage.getItem(CONFIG.TEMA_KEY) || 'oscuro');
  btn?.addEventListener('click', () => {
    const nuevo = html.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', nuevo);
    localStorage.setItem(CONFIG.TEMA_KEY, nuevo);
    // Actualizar colores de la gráfica al cambiar tema
    if (Estado.grafica) actualizarColoresGrafica();
  });
}

function inicializarIconos() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}


/* ══════════════════════════════════════════════════════════
   2. FILTRADO POR MÚSCULO (chips)
   BACKEND: Al cambiar chip activo, llamar a:
     GET /exercises?muscle={musculo}&query={query}
     y re-renderizar con renderListaEjercicios(data)
══════════════════════════════════════════════════════════ */

function inicializarChipsMusculo() {
  const contenedor = document.getElementById('chips-musculo');
  if (!contenedor) return;

  contenedor.addEventListener('click', e => {
    const chip = e.target.closest('.chip-musculo');
    if (!chip) return;

    // Actualizar estado activo
    contenedor.querySelectorAll('.chip-musculo').forEach(c => {
      c.classList.remove('activo');
      c.setAttribute('aria-pressed', 'false');
    });
    chip.classList.add('activo');
    chip.setAttribute('aria-pressed', 'true');

    Estado.musculoFiltro = chip.dataset.musculo;

    // BACKEND: fetch(`${CONFIG.BASE_URL}/exercises?muscle=${Estado.musculoFiltro}&query=${Estado.queryBusqueda}`, ...)
    filtrarListaClienteSide();
  });
}


/* ══════════════════════════════════════════════════════════
   3. BÚSQUEDA CON DEBOUNCE
   BACKEND: GET /exercises?query={valor}&muscle={musculo}
══════════════════════════════════════════════════════════ */

function inicializarBuscador() {
  const input = document.getElementById('buscador-ejercicios');
  const limpiar = document.getElementById('buscador-limpiar');
  if (!input) return;

  let debounceTimer;

  input.addEventListener('input', () => {
    Estado.queryBusqueda = input.value.trim().toLowerCase();
    limpiar?.classList.toggle('oculto', !Estado.queryBusqueda);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // BACKEND: await cargarEjerciciosBackend(Estado.musculoFiltro, Estado.queryBusqueda);
      filtrarListaClienteSide();
    }, CONFIG.DEBOUNCE_MS);
  });

  limpiar?.addEventListener('click', () => {
    input.value = '';
    Estado.queryBusqueda = '';
    limpiar.classList.add('oculto');
    filtrarListaClienteSide();
    input.focus();
  });
}

/**
 * Filtra la lista de ejercicios en el lado cliente.
 * BACKEND: Eliminar esta función y reemplazar con fetch real.
 */
function filtrarListaClienteSide() {
  cargarEjerciciosBackend(Estado.musculoFiltro, Estado.queryBusqueda);
}

function actualizarContadorResultados(num) {
  const contador = document.getElementById('contador-resultados');
  if (!contador) return;
  if (Estado.musculoFiltro === 'todos' && !Estado.queryBusqueda) {
    contador.textContent = 'Todos los ejercicios';
  } else {
    contador.textContent = `${num} resultado${num !== 1 ? 's' : ''}`;
  }
}


/* ══════════════════════════════════════════════════════════
   4. SELECCIÓN DE EJERCICIO
   Al hacer clic en un item de la biblioteca,
   carga el detalle en el panel izquierdo.
══════════════════════════════════════════════════════════ */

function inicializarSeleccionEjercicio() {
  document.getElementById('lista-biblioteca')?.addEventListener('click', async e => {
    // Si se hizo clic en el menú o sus opciones, no activar la tarjeta
    if (e.target.closest('.dropdown-wrap')) return;

    const boton = e.target.closest('.boton-item');
    if (!boton) return;

    const item = boton.closest('.item-biblioteca');
    const ejercicioId = item?.dataset.ejercicioId;
    if (!ejercicioId || ejercicioId === Estado.ejercicioActivo) return;

    // Marcar activo en la lista
    document.querySelectorAll('.item-biblioteca').forEach(el => el.classList.remove('activo'));
    item.classList.add('activo');

    Estado.ejercicioActivo = ejercicioId;

    // BACKEND: Obtener datos completos del ejercicio
    try {
      const datos = await obtenerDatosEjercicio(ejercicioId);
      await poblarDetalle(datos);
    } catch (err) {
      console.error('[APEX] Error al cargar ejercicio:', err);
      mostrarToast('Error al cargar el ejercicio');
    }
  });
}

/**
 * Puebla el panel de detalle con los datos del ejercicio seleccionado.
 * @param {Object} datos - Objeto del ejercicio (del backend o mock)
 */
async function poblarDetalle(datos) {
  // Mostrar el contenido y ocultar el estado vacío
  document.getElementById('detalle-vacio')?.classList.add('oculto');
  const contenido = document.getElementById('detalle-contenido');
  if (contenido) contenido.classList.remove('oculto');

  // Nombre y badges
  const elNombre = document.getElementById('detalle-nombre');
  const elEquipo = document.getElementById('detalle-equipo-texto');
  const elMusculo = document.getElementById('detalle-musculo-texto');
  if (elNombre) elNombre.textContent = datos.nombre || '—';
  if (elEquipo) elEquipo.textContent = datos.equipo || '—';
  if (elMusculo) elMusculo.textContent = datos.musculo_primario || '—';

  // Acciones CRUD (Editar/Eliminar)
  const user = await window.ApexAuth.getUser();
  const accionesWrap = document.getElementById('detalle-acciones-crud');
  if (accionesWrap) {
    if (user && datos.created_by === user.id) {
      accionesWrap.innerHTML = `
        <button class="btn-crud" id="btn-ejercicio-editar" title="Editar">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="btn-crud btn-crud-eliminar" id="btn-ejercicio-eliminar" title="Eliminar">
          <i data-lucide="trash-2"></i>
        </button>
      `;
      document.getElementById('btn-ejercicio-editar')?.addEventListener('click', () => abrirModalEditar(datos));
      document.getElementById('btn-ejercicio-eliminar')?.addEventListener('click', () => eliminarEjercicio(datos.id));
    } else {
      accionesWrap.innerHTML = '';
    }
  }


  // Gráfica
  Estado.metricaActiva = 'peso';
  actualizarBotoneMetrica('peso');
  renderizarGrafica(datos.datos_grafica?.peso || { labels: [], data: [] }, 'peso');

  // Guardar referencia a los datos del ejercicio activo para el selector de rango/métrica
  Estado.datosGraficaActivos = datos.datos_grafica || {};

  // Resetear a primera pestaña
  cambiarPestana('estadisticas');

  // Re-inicializar íconos para los elementos nuevos
  lucide.createIcons();
}




/* ══════════════════════════════════════════════════════════
   5. PESTAÑAS DEL DETALLE
══════════════════════════════════════════════════════════ */



function cambiarPestana(pestana) {
  // Solo queda la pestaña de estadísticas
  document.querySelectorAll('.pestana-btn').forEach(b => {
    b.classList.add('activa');
    b.setAttribute('aria-selected', 'true');
  });

  document.querySelectorAll('.panel-pestana').forEach(p => {
    p.classList.remove('oculto');
  });
}


/* ══════════════════════════════════════════════════════════
   6. GRÁFICA CHART.JS
   BACKEND: Los datos vienen de GET /metrics/exercise/{id}?range={range}&metric={metric}
══════════════════════════════════════════════════════════ */

/**
 * Obtiene los colores de la gráfica según el tema actual.
 */
function obtenerColoresGrafica() {
  const esClaro = document.documentElement.getAttribute('data-tema') === 'claro';
  return {
    linea: esClaro ? '#111111' : '#C8F400',
    punto: esClaro ? '#111111' : '#C8F400',
    puntoHover: esClaro ? '#111111' : '#fff',
    relleno: esClaro ? 'rgba(0,0,0,0.06)' : 'rgba(200,244,0,0.08)',
    cuadricula: esClaro ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
    etiquetas: esClaro ? '#808080' : '#505050',
    tooltip_bg: esClaro ? '#111111' : '#1a1a1a',
    tooltip_txt: esClaro ? '#EEEDE7' : '#F0F0F0',
  };
}

/**
 * Renderiza o actualiza la gráfica de Chart.js.
 * @param {{ labels: string[], data: number[] }} datosGrafica
 * @param {string} metrica - 'peso' | 'reps' | '1rm' | 'volumen'
 */
function renderizarGrafica(datosGrafica, metrica) {
  const canvas = document.getElementById('grafica-ejercicio');
  const sinDatos = document.getElementById('grafica-sin-datos');
  if (!canvas) return;

  const tieneDatos = datosGrafica.data?.length > 0;
  sinDatos?.classList.toggle('oculto', tieneDatos);
  canvas.style.opacity = tieneDatos ? '1' : '0';

  const colores = obtenerColoresGrafica();
  const sufijo = metrica === 'peso' || metrica === '1rm' ? ' kg' : metrica === 'volumen' ? ' kg' : '';

  // Destruir instancia anterior si existe
  if (Estado.grafica) {
    Estado.grafica.destroy();
    Estado.grafica = null;
  }

  if (!tieneDatos) return;

  Estado.grafica = new Chart(canvas, {
    type: 'line',
    data: {
      labels: datosGrafica.labels,
      datasets: [{
        label: etiquetaMetrica(metrica),
        data: datosGrafica.data,
        borderColor: colores.linea,
        backgroundColor: colores.relleno,
        pointBackgroundColor: colores.punto,
        pointHoverBackgroundColor: colores.puntoHover,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
        tension: 0.35,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colores.tooltip_bg,
          titleColor: colores.tooltip_txt,
          bodyColor: colores.tooltip_txt,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y}${sufijo}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: colores.cuadricula },
          ticks: { color: colores.etiquetas, font: { family: 'DM Sans', size: 11 } },
        },
        y: {
          grid: { color: colores.cuadricula },
          ticks: {
            color: colores.etiquetas,
            font: { family: 'DM Sans', size: 11 },
            callback: v => `${v}${sufijo}`,
          },
        },
      },
    },
  });
}

function etiquetaMetrica(metrica) {
  const m = { peso: 'Peso máximo', reps: 'Repeticiones máximas' };
  return m[metrica] || metrica;
}

function actualizarColoresGrafica() {
  if (!Estado.grafica) return;
  const colores = obtenerColoresGrafica();
  const ds = Estado.grafica.data.datasets[0];
  ds.borderColor = colores.linea;
  ds.backgroundColor = colores.relleno;
  ds.pointBackgroundColor = colores.punto;
  Estado.grafica.options.scales.x.grid.color = colores.cuadricula;
  Estado.grafica.options.scales.y.grid.color = colores.cuadricula;
  Estado.grafica.options.scales.x.ticks.color = colores.etiquetas;
  Estado.grafica.options.scales.y.ticks.color = colores.etiquetas;
  Estado.grafica.options.plugins.tooltip.backgroundColor = colores.tooltip_bg;
  Estado.grafica.options.plugins.tooltip.titleColor = colores.tooltip_txt;
  Estado.grafica.options.plugins.tooltip.bodyColor = colores.tooltip_txt;
  Estado.grafica.update();
}

function actualizarBotoneMetrica(metrica) {
  document.querySelectorAll('.btn-metrica').forEach(b => {
    const activo = b.dataset.metrica === metrica;
    b.classList.toggle('activo', activo);
    b.setAttribute('aria-pressed', String(activo));
  });
  const titulos = { peso: 'Peso máximo por sesión', reps: 'Reps máximas por sesión' };
  const elTit = document.getElementById('grafica-titulo-texto');
  if (elTit) elTit.textContent = titulos[metrica] || metrica;
}

function inicializarSelectorMetrica() {
  document.querySelector('.selector-metrica')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-metrica');
    if (!btn || !Estado.ejercicioActivo) return;
    const metrica = btn.dataset.metrica;
    Estado.metricaActiva = metrica;
    actualizarBotoneMetrica(metrica);

    // BACKEND: fetch(`${CONFIG.BASE_URL}/metrics/exercise/${Estado.ejercicioActivo}?metric=${metrica}&range=${Estado.rangoActivo}`)
    const datos = Estado.datosGraficaActivos?.[metrica] || { labels: [], data: [] };
    renderizarGrafica(datos, metrica);
  });
}







/* ══════════════════════════════════════════════════════════
   8. TOAST DE NOTIFICACIÓN
══════════════════════════════════════════════════════════ */

let toastTimer;

function mostrarToast(mensaje, ms = 3000) {
  const toast = document.getElementById('toast-notificacion');
  const mensajeEl = document.getElementById('toast-mensaje');
  if (!toast || !mensajeEl) return;
  mensajeEl.textContent = mensaje;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), ms);
}


/* ══════════════════════════════════════════════════════════
   9. CARGA DE EJERCICIOS DESDE BACKEND
   Función lista para conectar cuando el API esté disponible.
══════════════════════════════════════════════════════════ */

/**
 * Carga la lista de ejercicios del backend y re-renderiza la biblioteca.
 * BACKEND: Descomentar y usar cuando el API esté disponible.
 * @param {string} musculo - Filtro de músculo ('todos' o el ID del músculo)
 * @param {string} query   - Texto de búsqueda
 */
async function cargarEjerciciosBackend(musculo = 'todos', query = '') {
  try {
    const db = getDb();
    if (!db) return;

    let req = db.from('exercises').select('*').limit(100);
    
    if (musculo !== 'todos') {
      req = req.ilike('muscle_group', `%${musculo}%`);
    }
    
    if (query) {
      req = req.ilike('name', `%${query}%`);
    }

    const { data, error } = await req;
    
    if (error) throw error;
    
    // Transformar al formato del frontend
    const exercisesFormatted = data.map(ej => ({
      id: ej.id,
      nombre: ej.name,
      musculo_primario: ej.muscle_group,
      thumbnail_url: ej.media_url
    }));
    
    renderListaEjercicios(exercisesFormatted);
    actualizarContadorResultados(exercisesFormatted.length);

  } catch (err) {
    console.error('[APEX] Error cargando ejercicios:', err);
    mostrarToast('Error al conectar con la base de datos');
    renderListaEjercicios([]); // Mostrar estado vacío
  }
}

/**
 * Renderiza la lista de ejercicios dinámicamente.
 * BACKEND: Llamar con el array de la respuesta de la API.
 * @param {Array} ejercicios
 */
function renderListaEjercicios(ejercicios) {
  const lista = document.getElementById('lista-biblioteca');
  const sinRes = document.getElementById('sin-resultados');
  if (!lista) return;

  // Limpiar items actuales (excepto el estado vacío)
  lista.querySelectorAll('.item-biblioteca:not(.sin-resultados)').forEach(el => el.remove());

  if (ejercicios.length === 0) {
    sinRes?.classList.remove('oculto');
    return;
  }
  sinRes?.classList.add('oculto');

  const fragment = document.createDocumentFragment();
  ejercicios.forEach(ej => {
    const li = document.createElement('li');
    li.className = 'item-biblioteca';
    li.dataset.ejercicioId = ej.id;
    li.dataset.musculo = ej.musculo_primario?.toLowerCase().replace(/\s+/g, '-') || '';
    li.innerHTML = `
      <button class="boton-item" aria-label="Ver ${ej.nombre}">
        <div class="item-img-wrap">
          ${ej.thumbnail_url
        ? `<img src="${ej.thumbnail_url}" alt="" class="item-img-placeholder" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
        : `<div class="item-img-placeholder" aria-hidden="true"><i data-lucide="dumbbell"></i></div>`
      }
        </div>
        <div class="item-info">
          <span class="item-nombre">${ej.nombre}</span>
          <span class="item-musculo">${ej.musculo_primario || '—'}</span>
        </div>
      </button>`;
    fragment.appendChild(li);
  });

  lista.insertBefore(fragment, sinRes);
  lucide.createIcons();
}


/* ══════════════════════════════════════════════════════════
   10. OTROS EVENTOS
══════════════════════════════════════════════════════════ */

function inicializarOtrosEventos() {
  // Botón "Cargar más sesiones" en historial
  // BACKEND: GET /sessions?exercise_id={id}&page=2
  document.getElementById('boton-cargar-mas')?.addEventListener('click', () => {
    mostrarToast('Conectar a GET /sessions?page=2');
  });

  // Botón "Crear ejercicio personalizado"
  document.getElementById('boton-ejercicio-custom')?.addEventListener('click', () => {
    abrirModalCrear();
  });

  // Botón cerrar animación (placeholder)
  document.getElementById('animacion-cerrar')?.addEventListener('click', () => {
    const wrap = document.getElementById('animacion-ejercicio');
    if (wrap) { wrap.style.transition = 'opacity 0.2s'; wrap.style.opacity = '0'; setTimeout(() => { wrap.style.display = 'none'; }, 200); }
  });

  inicializarModalEjercicio();
}

/* ══════════════════════════════════════════════════════════
   11. LÓGICA MODAL CRUD EJERCICIO
══════════════════════════════════════════════════════════ */

function inicializarModalEjercicio() {
  const overlay = document.getElementById('modal-ejercicio-overlay');
  const btnCerrar = document.getElementById('btn-modal-cerrar');
  const btnCancelar = document.getElementById('btn-modal-cancelar');
  const form = document.getElementById('form-ejercicio');

  if (!overlay || !form) return;

  const cerrar = () => overlay.classList.add('oculto');
  
  btnCerrar?.addEventListener('click', cerrar);
  btnCancelar?.addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cerrar();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await guardarEjercicio();
  });
}

function abrirModalCrear() {
  const titulo = document.getElementById('modal-ejercicio-titulo');
  const form = document.getElementById('form-ejercicio');
  const editId = document.getElementById('edit-ejercicio-id');
  
  if (titulo) titulo.textContent = 'Crear Ejercicio';
  if (form) form.reset();
  if (editId) editId.value = '';

  document.getElementById('modal-ejercicio-overlay')?.classList.remove('oculto');
}

function abrirModalEditar(datos) {
  const titulo = document.getElementById('modal-ejercicio-titulo');
  const editId = document.getElementById('edit-ejercicio-id');
  
  if (titulo) titulo.textContent = 'Editar Ejercicio';
  if (editId) editId.value = datos.id;

  document.getElementById('ejercicio-nombre').value = datos.nombre;
  document.getElementById('ejercicio-musculo').value = datos.musculo_primario;
  document.getElementById('ejercicio-equipo').value = datos.equipo;
  document.getElementById('ejercicio-descripcion').value = datos.descripcion || '';

  document.getElementById('modal-ejercicio-overlay')?.classList.remove('oculto');
}

async function guardarEjercicio() {
  const user = await window.ApexAuth.getUser();
  if (!user) return;

  const editId = document.getElementById('edit-ejercicio-id').value;
  const nombre = document.getElementById('ejercicio-nombre').value;
  const musculo = document.getElementById('ejercicio-musculo').value;
  const equipo = document.getElementById('ejercicio-equipo').value;
  const desc = document.getElementById('ejercicio-descripcion').value;

  const payload = {
    name: nombre,
    muscle_group: musculo,
    equipment: equipo,
    description: desc,
    created_by: user.id
  };

  const btn = document.getElementById('btn-modal-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const db = getDb();
    if (!db) return;

    let error;
    if (editId) {
      // Update
      const { error: err } = await db
        .from('exercises')
        .update(payload)
        .eq('id', editId);
      error = err;
    } else {
      // Insert
      const { error: err } = await db
        .from('exercises')
        .insert(payload);
      error = err;
    }

    if (error) throw error;

    mostrarToast(editId ? 'Ejercicio actualizado ✓' : 'Ejercicio creado ✓');
    document.getElementById('modal-ejercicio-overlay')?.classList.add('oculto');
    
    // Recargar lista
    await cargarEjerciciosBackend(Estado.musculoFiltro, Estado.queryBusqueda);
    
    // Si estábamos editando, refrescar el detalle
    if (editId === Estado.ejercicioActivo) {
      const datosNuevos = await obtenerDatosEjercicio(editId);
      await poblarDetalle(datosNuevos);
    }

  } catch (err) {
    console.error('[APEX] Error al guardar ejercicio:', err);
    mostrarToast('Error al guardar');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Ejercicio';
  }
}

async function eliminarEjercicio(id) {
  if (!confirm('¿Estás seguro de eliminar este ejercicio permanentemente?')) return;

  try {
    const db = getDb();
    if (!db) return;

    const { error } = await db
      .from('exercises')
      .delete()
      .eq('id', id);

    if (error) throw error;

    mostrarToast('Ejercicio eliminado ✓');
    
    // Limpiar detalle si era el activo
    if (Estado.ejercicioActivo === id) {
      Estado.ejercicioActivo = null;
      document.getElementById('detalle-contenido')?.classList.add('oculto');
      document.getElementById('detalle-vacio')?.classList.remove('oculto');
    }

    // Recargar lista
    await cargarEjerciciosBackend(Estado.musculoFiltro, Estado.queryBusqueda);

  } catch (err) {
    console.error('[APEX] Error al eliminar ejercicio:', err);
    mostrarToast('Error al eliminar');
  }
}


/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN PRINCIPAL
══════════════════════════════════════════════════════════ */

async function inicializarApp() {
  inicializarChipsMusculo();
  inicializarBuscador();
  inicializarSeleccionEjercicio();
  inicializarSelectorMetrica();

  inicializarOtrosEventos();

  inicializarModalProgreso();
  await cargarEjerciciosBackend();
  // Seleccionar el primer ejercicio automáticamente (como Hevy)
  setTimeout(() => {
    const primerItem = document.querySelector('#lista-biblioteca .item-biblioteca');
    if (primerItem) {
      primerItem.querySelector('.boton-item')?.click();
    }
  }, 500);

  console.log('[APEX] Módulo de ejercicios inicializado.');
}

/* Arranque */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarApp();
});

/* ══════════════════════════════════════════════════════════
   GLOBAL DROPDOWN LOGIC
══════════════════════════════════════════════════════════ */
document.addEventListener('click', (e) => {
  const isDropdownBtn = e.target.closest('.btn-opciones');
  const isDropdownMenu = e.target.closest('.dropdown-menu');
  
  if (isDropdownBtn) {
    const parentWrap = isDropdownBtn.closest('.dropdown-wrap');
    if (parentWrap) {
      const dropdown = parentWrap.querySelector('.dropdown-menu');
      if (dropdown) {
        document.querySelectorAll('.dropdown-menu').forEach(m => {
          if (m !== dropdown) m.classList.add('oculto');
        });
        dropdown.classList.toggle('oculto');
      }
    }
  } else if (!isDropdownMenu) {
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      if (m.closest('.dropdown-wrap')) {
        m.classList.add('oculto');
      }
    });
  }
});

/* ══════════════════════════════════════════════════════════
   9. MODAL DE PROGRESO PERSONAL
══════════════════════════════════════════════════════════ */

function inicializarModalProgreso() {
  const overlay = document.getElementById('modal-progreso-overlay');
  const btnAbrir = document.getElementById('btn-abrir-modal-progreso');
  const btnCerrar = document.getElementById('btn-cerrar-modal-progreso');
  const btnCancelar = document.getElementById('btn-cancelar-progreso');
  const form = document.getElementById('form-progreso-personal');

  if (!overlay || !btnAbrir) return;

  const abrir = () => {
    if (!Estado.ejercicioActivo) {
      mostrarToast('Selecciona un ejercicio primero');
      return;
    }
    overlay.classList.remove('oculto');
    form.reset();
  };

  const cerrar = () => overlay.classList.add('oculto');

  btnAbrir.addEventListener('click', abrir);
  btnCerrar.addEventListener('click', cerrar);
  btnCancelar.addEventListener('click', cerrar);
  overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const user = await window.ApexAuth.getUser();
    if (!user) return;

    const peso = parseFloat(document.getElementById('progreso-peso').value);
    const reps = parseInt(document.getElementById('progreso-reps').value);

    const btn = document.getElementById('btn-guardar-progreso');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const db = getDb();
      if (!db) return;

      const { error } = await db
        .from('personal_progress')
        .insert({
          user_id: user.id,
          exercise_id: Estado.ejercicioActivo,
          weight_used: peso,
          reps_completed: reps
        });

      if (error) throw error;

      mostrarToast('Progreso guardado ✓');
      cerrar();

      // Recargar datos del ejercicio para actualizar la gráfica
      const datos = await obtenerDatosEjercicio(Estado.ejercicioActivo);
      poblarDetalle(datos);

    } catch (err) {
      console.error('[APEX] Error al guardar progreso:', err);
      mostrarToast('Error al guardar progreso');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Dato';
    }
  });
}
