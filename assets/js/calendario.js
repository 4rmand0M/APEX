/* ============================================================
   APEX FITNESS — Calendario (calendario.js)
   100% dinámico con Supabase.
   Vistas: Mensual, Lista, Semanal.
============================================================ */

'use strict';

const DIAS_CORTO  = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
const DIAS_LARGO  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CONFIG      = { TEMA_KEY: 'apex_tema' };

const db = window.supabaseClient;

function obtenerColorMusculo(musculo) {
  const colores = {
    'Espalda': '#7EB8A4', 'Pecho': '#5CB85C', 'Hombro': '#5B9BD5',
    'Bíceps': '#5CB85C', 'Tríceps': '#9B59B6', 'Piernas': '#48C9B0',
    'Trapecios': '#5CB85C', 'Antebrazos': '#5B9BD5'
  };
  return colores[musculo] || '#888';
}

/* ══════════════════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════════════════ */
const Estado = {
  vista:          'mensual',
  mesActual:      new Date(new Date().getFullYear(), new Date().getMonth(), 1), // MES ACTUAL
  semanaRef:      new Date(), // HOY
  diaSeleccionado: null,
  menuAbierto:    false,
  filtrosMusculo: new Set(),
  sesionesCache:  [], // sesiones del mes/periodo cargado
};

/* ══════════════════════════════════════════════════════════
   DATA — Supabase
══════════════════════════════════════════════════════════ */

/** Carga sesiones+logs de un rango de fechas */
async function cargarSesionesRango(desde, hasta) {
  const user = await window.ApexAuth.getUser();
  if (!user) return [];

  const { data, error } = await db
    .from('workout_sessions')
    .select('id, start_time, workout_logs(id, exercise_id, set_number, weight_used, reps_completed, exercises(name, muscle_group))')
    .eq('user_id', user.id)
    .gte('start_time', desde)
    .lte('start_time', hasta)
    .order('start_time', { ascending: false });

  if (error) { console.error('Error cargando sesiones:', error); return []; }
  return data || [];
}

/** Transforma una sesión de Supabase al formato que el calendario necesita */
function transformarSesion(sesion) {
  const fecha = sesion.start_time.slice(0, 10);
  const logs  = sesion.workout_logs || [];

  // Extraer músculos únicos
  const musculosSet = new Map();
  const ejerciciosMap = new Map();

  logs.forEach(log => {
    const ex = log.exercises;
    if (!ex) return;
    const m = ex.muscle_group || 'Otros';
    if (!musculosSet.has(m)) musculosSet.set(m, obtenerColorMusculo(m));

    if (!ejerciciosMap.has(ex.name)) {
      ejerciciosMap.set(ex.name, { nombre: ex.name, musculo: m, color: obtenerColorMusculo(m), series: [] });
    }
    ejerciciosMap.get(ex.name).series.push({
      peso: `${log.weight_used || 0} kg`,
      reps: log.reps_completed || 0
    });
  });

  return {
    id: sesion.id,
    fecha,
    musculos: Array.from(musculosSet, ([nombre, color]) => ({ nombre, color })),
    ejercicios: Array.from(ejerciciosMap.values()),
  };
}

/** Obtener sesiones transformadas de una fecha específica */
function sesionesDeFecha(fechaStr) {
  return Estado.sesionesCache.filter(s => s.fecha === fechaStr);
}

/* ══════════════════════════════════════════════════════════
   ARRANQUE
══════════════════════════════════════════════════════════ */
function inicializarTema() {
  const html = document.documentElement;
  const btn  = document.getElementById('boton-tema');
  html.setAttribute('data-tema', localStorage.getItem(CONFIG.TEMA_KEY) || 'oscuro');
  btn?.addEventListener('click', () => {
    const n = html.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', n); localStorage.setItem(CONFIG.TEMA_KEY, n);
  });
}
function inicializarIconos() { if (typeof lucide !== 'undefined') lucide.createIcons(); }

/* ══════════════════════════════════════════════════════════
   VISTA MENSUAL
══════════════════════════════════════════════════════════ */
async function generarVistaMensual() {
  const grid  = document.getElementById('cal-dias-grid');
  const label = document.getElementById('cal-periodo-label');
  const cont  = document.getElementById('cal-mes-contador');
  if (!grid) return;

  const año = Estado.mesActual.getFullYear();
  const mes = Estado.mesActual.getMonth();
  if (label) label.textContent = `${MESES[mes].toUpperCase()} ${año}`;

  // Cargar sesiones del mes
  const desde = `${año}-${String(mes + 1).padStart(2, '0')}-01T00:00:00`;
  const totalDias = new Date(año, mes + 1, 0).getDate();
  const hasta = `${año}-${String(mes + 1).padStart(2, '0')}-${totalDias}T23:59:59`;

  const sesionesRaw = await cargarSesionesRango(desde, hasta);
  Estado.sesionesCache = sesionesRaw.map(transformarSesion);

  if (cont) cont.textContent = `${Estado.sesionesCache.length} WORKOUT${Estado.sesionesCache.length !== 1 ? 'S' : ''}`;

  const primerDia  = new Date(año, mes, 1).getDay();
  const diasAntMes = new Date(año, mes, 0).getDate();
  const hoy        = new Date();

  grid.innerHTML = '';

  // Días mes anterior
  for (let i = primerDia - 1; i >= 0; i--) {
    grid.appendChild(crearCeldaDia(diasAntMes - i, true, []));
  }
  // Días del mes actual
  for (let d = 1; d <= totalDias; d++) {
    const fechaStr = `${año}-${String(mes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const sesiones = sesionesDeFecha(fechaStr);
    const esHoy    = hoy.getDate() === d && hoy.getMonth() === mes && hoy.getFullYear() === año;
    grid.appendChild(crearCeldaDia(d, false, sesiones, esHoy, fechaStr));
  }
  // Completar
  const total = primerDia + totalDias;
  const resto = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (let i = 1; i <= resto; i++) {
    grid.appendChild(crearCeldaDia(i, true, []));
  }
  lucide.createIcons();
}

function crearCeldaDia(num, otroMes, sesiones, esHoy = false, fechaStr = '') {
  const celda = document.createElement('div');
  celda.className = `cal-dia-celda${otroMes ? ' otro-mes' : ''}${esHoy ? ' hoy' : ''}`;
  if (fechaStr) celda.dataset.fecha = fechaStr;

  const numEl = document.createElement('span');
  numEl.className = 'cal-dia-num';
  numEl.textContent = num;
  celda.appendChild(numEl);

  if (sesiones.length > 0) {
    const dots = document.createElement('div');
    dots.className = 'cal-dia-dots';
    const musculosUnicos = [];
    sesiones.forEach(ses => {
      ses.musculos.forEach(m => {
        if (!musculosUnicos.find(x => x.nombre === m.nombre)) musculosUnicos.push(m);
      });
    });
    musculosUnicos.slice(0, 4).forEach(m => {
      const dot = document.createElement('span');
      dot.className = 'cal-dia-dot';
      dot.style.setProperty('--c', m.color);
      dot.title = m.nombre;
      dots.appendChild(dot);
    });
    celda.appendChild(dots);
  }

  if (fechaStr && !otroMes) {
    celda.addEventListener('click', () => {
      document.querySelectorAll('.cal-dia-celda.seleccionado').forEach(c => c.classList.remove('seleccionado'));
      celda.classList.add('seleccionado');
      Estado.diaSeleccionado = fechaStr;
    });
  }
  return celda;
}

/* ══════════════════════════════════════════════════════════
   VISTA LISTA
══════════════════════════════════════════════════════════ */
async function generarVistaLista() {
  const lista = document.getElementById('cal-lista-entrenos');
  const label = document.getElementById('cal-periodo-label');
  if (!lista) return;

  if (label) label.textContent = 'HISTORIAL';

  const user = await window.ApexAuth.getUser();
  if (!user) return;

  // Cargar últimas 30 sesiones
  const { data, error } = await db
    .from('workout_sessions')
    .select('id, start_time, workout_logs(id, exercise_id, set_number, weight_used, reps_completed, exercises(name, muscle_group))')
    .eq('user_id', user.id)
    .order('start_time', { ascending: false })
    .limit(30);

  if (error || !data || data.length === 0) {
    lista.innerHTML = '<li class="cal-lista-vacio">Sin entrenos registrados.</li>';
    return;
  }

  const sesiones = data.map(transformarSesion);

  lista.innerHTML = sesiones.map(ses => {
    const f = new Date(ses.fecha + 'T12:00:00');
    const fechaTxt = `${DIAS_LARGO[f.getDay()]} ${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;

    const ejerciciosHTML = ses.ejercicios.map(ej => `
      <li class="cal-lista-ejercicio">
        <span class="cal-lista-dot" style="--c:${ej.color}"></span>
        <div class="cal-lista-ej-detalle">
          <span class="cal-lista-ej-nombre">${ej.nombre}</span>
          <ul class="cal-lista-ej-series">
            ${ej.series.map(s => `<li>${s.peso} × ${s.reps} reps</li>`).join('')}
          </ul>
        </div>
      </li>
    `).join('');

    const chipsHTML = ses.musculos.map(m =>
      `<span class="cal-chip" style="--c:${m.color}">${m.nombre.toUpperCase()}</span>`
    ).join('');

    return `
      <li class="cal-lista-grupo">
        <div class="cal-lista-fecha-header">
          <h2 class="cal-lista-fecha-titulo">${fechaTxt}</h2>
        </div>
        <ul class="cal-lista-sesiones" role="list">${ejerciciosHTML}</ul>
        <div class="cal-lista-chips">${chipsHTML}</div>
      </li>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════
   VISTA SEMANA
══════════════════════════════════════════════════════════ */
async function generarVistaSemana() {
  const fila  = document.getElementById('sem-dias-fila');
  const label = document.getElementById('cal-periodo-label');
  if (!fila) return;

  // Obtener inicio de la semana (domingo)
  const ref    = new Date(Estado.semanaRef);
  const inicio = new Date(ref);
  inicio.setDate(ref.getDate() - ref.getDay());

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  if (label) {
    label.textContent = `${inicio.getDate()} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0, 3)} ${fin.getFullYear()}`;
  }

  // Cargar sesiones de la semana
  const desde = inicio.toISOString();
  const hastaD = new Date(fin); hastaD.setHours(23, 59, 59);
  const hasta = hastaD.toISOString();

  const sesionesRaw = await cargarSesionesRango(desde, hasta);
  Estado.sesionesCache = sesionesRaw.map(transformarSesion);

  const hoy    = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);

  fila.innerHTML = '';
  let primerActivo = false;

  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const fechaStr = d.toISOString().slice(0, 10);
    const esHoy    = fechaStr === hoyStr;
    const sesiones = sesionesDeFecha(fechaStr);

    const btn      = document.createElement('button');
    btn.className  = `sem-dia-btn${esHoy ? ' hoy' : ''}`;
    btn.dataset.fecha = fechaStr;
    btn.setAttribute('aria-label', `${DIAS_LARGO[d.getDay()]} ${d.getDate()}`);

    let dotsHTML = '';
    if (sesiones.length > 0) {
      const uMusc = [];
      sesiones.forEach(s => s.musculos.forEach(m => { if (!uMusc.find(x => x.color === m.color)) uMusc.push(m); }));
      dotsHTML = `<div class="sem-dia-dots">${uMusc.slice(0, 3).map(m => `<span class="sem-dia-dot" style="--c:${m.color}"></span>`).join('')}</div>`;
    }

    btn.innerHTML = `
      <span class="sem-dia-nombre">${DIAS_CORTO[d.getDay()]}</span>
      <span class="sem-dia-num">${d.getDate()}</span>
      ${dotsHTML}`;

    btn.addEventListener('click', () => {
      fila.querySelectorAll('.sem-dia-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      Estado.diaSeleccionado = fechaStr;
      mostrarDetalleSemana(sesiones, d);
    });

    fila.appendChild(btn);

    if (esHoy && !primerActivo) {
      btn.classList.add('activo');
      mostrarDetalleSemana(sesiones, d);
      primerActivo = true;
    }
  }

  // Si hoy no está en la semana, activar el primer día
  if (!primerActivo && fila.children.length > 0) {
    const first = fila.children[0];
    first.classList.add('activo');
    const d = new Date(inicio);
    mostrarDetalleSemana(sesionesDeFecha(d.toISOString().slice(0, 10)), d);
  }

  lucide.createIcons();
}

function mostrarDetalleSemana(sesiones, fecha) {
  const det   = document.getElementById('sem-detalle');
  const vacio = document.getElementById('sem-detalle-vacio');
  if (!det) return;

  det.querySelectorAll('.sem-sesion-bloque').forEach(el => el.remove());

  if (sesiones.length === 0) {
    if (vacio) vacio.style.display = '';
    return;
  }
  if (vacio) vacio.style.display = 'none';

  sesiones.forEach(ses => {
    const bloque = document.createElement('div');
    bloque.className = 'sem-sesion-bloque';
    bloque.innerHTML = `
      <div class="sem-sesion-cabecera">
        <span class="sem-sesion-fecha">${DIAS_LARGO[fecha.getDay()]}, ${fecha.getDate()} de ${MESES[fecha.getMonth()]}</span>
        <div class="sem-sesion-dots">
          ${ses.musculos.map(m => `<span class="musculo-dot-sm" style="--c:${m.color}" title="${m.nombre}"></span>`).join('')}
        </div>
      </div>
      <ul class="sem-sesion-ejercicios">
        ${ses.ejercicios.map(ej => `
          <li class="sem-sesion-ej">
            <span class="sem-ej-dot" style="--c:${ej.color}"></span>
            <div>
              <span class="sem-ej-nombre">${ej.nombre}</span>
              <ul class="sem-ej-series">
                ${ej.series.map(s => `<li>${s.peso} × ${s.reps} reps</li>`).join('')}
              </ul>
            </div>
          </li>`).join('')}
      </ul>`;
    det.appendChild(bloque);
  });
  lucide.createIcons();
}

/* ══════════════════════════════════════════════════════════
   MENÚ — CAMBIO DE VISTA
══════════════════════════════════════════════════════════ */
function cambiarVista(vista) {
  Estado.vista = vista;
  ['vista-mensual','vista-lista','vista-semana'].forEach(id => {
    document.getElementById(id)?.classList.add('oculto');
  });
  document.getElementById(`vista-${vista}`)?.classList.remove('oculto');

  document.querySelectorAll('.cal-vista-opcion').forEach(btn => {
    const activa = btn.dataset.vista === vista;
    btn.classList.toggle('activa', activa);
    btn.setAttribute('aria-checked', String(activa));
  });

  if (vista === 'mensual') generarVistaMensual();
  if (vista === 'semana')  generarVistaSemana();
  if (vista === 'lista')   generarVistaLista();

  cerrarMenu();
}

function abrirMenu() {
  Estado.menuAbierto = true;
  document.getElementById('cal-menu-lateral')?.classList.remove('oculto');
  document.getElementById('cal-menu-lateral')?.classList.add('abierto');
  document.getElementById('cal-overlay')?.classList.remove('oculto');
  document.getElementById('cal-hamburguesa')?.setAttribute('aria-expanded', 'true');
}

function cerrarMenu() {
  Estado.menuAbierto = false;
  document.getElementById('cal-menu-lateral')?.classList.remove('abierto');
  document.getElementById('cal-overlay')?.classList.add('oculto');
  document.getElementById('cal-hamburguesa')?.setAttribute('aria-expanded', 'false');
}

function inicializarMenu() {
  document.getElementById('cal-menu-cerrar')?.addEventListener('click', cerrarMenu);
  document.getElementById('cal-hamburguesa')?.addEventListener('click', abrirMenu);
  document.getElementById('cal-overlay')?.addEventListener('click', cerrarMenu);
  document.querySelectorAll('.cal-vista-opcion').forEach(btn => {
    btn.addEventListener('click', () => cambiarVista(btn.dataset.vista));
  });
}

/* ══════════════════════════════════════════════════════════
   NAVEGACIÓN MES/SEMANA
══════════════════════════════════════════════════════════ */
function inicializarNavegacion() {
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    if (Estado.vista === 'mensual') {
      Estado.mesActual.setMonth(Estado.mesActual.getMonth() - 1);
      generarVistaMensual();
    } else if (Estado.vista === 'semana') {
      Estado.semanaRef.setDate(Estado.semanaRef.getDate() - 7);
      generarVistaSemana();
    }
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    if (Estado.vista === 'mensual') {
      Estado.mesActual.setMonth(Estado.mesActual.getMonth() + 1);
      generarVistaMensual();
    } else if (Estado.vista === 'semana') {
      Estado.semanaRef.setDate(Estado.semanaRef.getDate() + 7);
      generarVistaSemana();
    }
  });
  document.getElementById('cal-barra-prev')?.addEventListener('click', () => {
    Estado.mesActual.setMonth(Estado.mesActual.getMonth() - 1);
    generarVistaMensual();
  });
  document.getElementById('cal-barra-next')?.addEventListener('click', () => {
    Estado.mesActual.setMonth(Estado.mesActual.getMonth() + 1);
    generarVistaMensual();
  });
}

/* ══════════════════════════════════════════════════════════
   TOAST
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
   CSS dinámico para bloques de semana
══════════════════════════════════════════════════════════ */
function inyectarEstilosSemana() {
  const estilos = `
    .sem-sesion-bloque { padding: 16px 0; border-bottom: 1px solid var(--borde); }
    .sem-sesion-bloque:last-child { border-bottom: none; }
    .sem-sesion-cabecera { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px; }
    .sem-sesion-fecha { font-size:13px;font-weight:700;color:var(--texto); }
    .sem-sesion-dots { display:flex;gap:4px; }
    .musculo-dot-sm { width:9px;height:9px;border-radius:50%;background:var(--c,#888);flex-shrink:0; }
    .sem-sesion-ejercicios { list-style:none;display:flex;flex-direction:column;gap:12px; }
    .sem-sesion-ej { display:flex;gap:10px; }
    .sem-ej-dot { width:9px;height:9px;border-radius:50%;background:var(--c,#888);flex-shrink:0;margin-top:4px; }
    .sem-ej-nombre { display:block;font-size:13.5px;font-weight:600;color:var(--texto);margin-bottom:5px; }
    .sem-ej-series { list-style:none;display:flex;flex-direction:column;gap:3px; }
    .sem-ej-series li { font-size:12px;color:var(--texto-atenuado); }
    .cal-lista-vacio { color:var(--texto-atenuado);padding:2rem;text-align:center; }
  `;
  const tag = document.createElement('style');
  tag.textContent = estilos;
  document.head.appendChild(tag);
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN
══════════════════════════════════════════════════════════ */
function inicializarApp() {
  inicializarMenu();
  inicializarNavegacion();
  inyectarEstilosSemana();
  generarVistaMensual();
  console.log('[APEX] Calendario inicializado.');
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarIconos();
  inicializarApp();
});
