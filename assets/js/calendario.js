/* ============================================================
   APEX FITNESS — Calendario (calendario.js)
   Módulos:
   1.  Arranque.
   2.  Vista mensual: generación del grid de días.
   3.  Vista lista: scroll por sesiones.
   4.  Vista semana: fila de 7 días + detalle.
   5.  Menú lateral (hamburguesa): vistas y filtros.
   6.  Filtros de músculo y ejercicio.
   7.  Navegación de mes/semana.
   8.  Datos mock (listos para sustituir con fetch).
============================================================ */

'use strict';

const CONFIG = { BASE_URL: 'https://api.fitmoca.edu', JWT_KEY: 'apex_token', TEMA_KEY: 'apex_tema' };
const DIAS_CORTO  = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
const DIAS_LARGO  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES       = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ══════════════════════════════════════════════════════════
   DATOS MOCK
   BACKEND: Reemplazar con fetch a GET /sessions?user_id={id}&month={m}&year={y}
   Estructura esperada: { fecha: "2026-03-20", musculos: [{nombre, color}], ejercicios: [...] }
══════════════════════════════════════════════════════════ */
const SESIONES_MOCK = [
  {
    id: 'ses-001',
    fecha: '2026-03-20',
    musculos: [
      { nombre: 'Espalda', color: '#7EB8A4' },
      { nombre: 'Bíceps',  color: '#5CB85C' },
      { nombre: 'Trapecios', color: '#5CB85C' },
      { nombre: 'Antebrazos', color: '#5B9BD5' },
    ],
    ejercicios: [
      { nombre: 'Jalón Al Pecho Neutro',   musculo: 'Espalda',   color: '#7EB8A4', series: [{ peso: '120.0 lbs', reps: 10 },{ peso: '120.0 lbs', reps: 7 },{ peso: '105.0 lbs', reps: 10 }] },
      { nombre: 'Remo Cerrado En Polea',   musculo: 'Espalda',   color: '#7EB8A4', series: [{ peso: '111.0 lbs', reps: 15 },{ peso: '133.0 lbs', reps: 10 },{ peso: '133.0 lbs', reps: 10 }] },
      { nombre: 'Curl Bíceps Mancuerna',   musculo: 'Bíceps',    color: '#5CB85C', series: [{ peso: '22.0 lbs', reps: 12 },{ peso: '22.0 lbs', reps: 10 },{ peso: '22.0 lbs', reps: 10 }] },
    ],
  },
  {
    id: 'ses-002',
    fecha: '2026-03-19',
    musculos: [
      { nombre: 'Pecho',   color: '#5CB85C' },
      { nombre: 'Hombro',  color: '#5B9BD5' },
      { nombre: 'Tríceps', color: '#9B59B6' },
    ],
    ejercicios: [
      { nombre: 'Press Inclinado Mancuerna', musculo: 'Pecho',  color: '#5CB85C', series: [{ peso: '45.0 lbs', reps: 9 },{ peso: '40.0 lbs', reps: 9 },{ peso: '40.0 lbs', reps: 10 }] },
      { nombre: 'Apertura De Pecho Maquina', musculo: 'Pecho',  color: '#5CB85C', series: [{ peso: '90.0 lbs', reps: 10 },{ peso: '90.0 lbs', reps: 10 },{ peso: '110.0 lbs', reps: 10 }] },
      { nombre: 'Elevaciones Laterales',     musculo: 'Hombro', color: '#5B9BD5', series: [{ peso: '11.0 lbs', reps: 20 },{ peso: '11.0 lbs', reps: 20 }] },
    ],
  },
  {
    id: 'ses-003',
    fecha: '2026-03-18',
    musculos: [{ nombre: 'Piernas', color: '#48C9B0' }],
    ejercicios: [
      { nombre: 'Sentadilla Barra', musculo: 'Piernas', color: '#48C9B0', series: [{ peso: '135.0 lbs', reps: 8 },{ peso: '135.0 lbs', reps: 8 }] },
    ],
  },
];

/** Retorna las sesiones de una fecha específica (YYYY-MM-DD) */
function sesionesDeFecha(fechaStr) {
  return SESIONES_MOCK.filter(s => s.fecha === fechaStr);
}

/** Retorna sesiones de la semana que contiene la fecha dada */
function sesionesDeSemana(fechaRef) {
  const inicio = new Date(fechaRef);
  inicio.setDate(inicio.getDate() - inicio.getDay()); // domingo
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return { fecha: d, sesiones: sesionesDeFecha(d.toISOString().slice(0, 10)) };
  });
}

/* ══════════════════════════════════════════════════════════
   ESTADO
══════════════════════════════════════════════════════════ */
const Estado = {
  vista:          'mensual',  // 'mensual' | 'lista' | 'semana'
  mesActual:      new Date(2026, 2, 1), // Marzo 2026
  semanaRef:      new Date(2026, 2, 23), // semana actual
  diaSeleccionado: null,
  menuAbierto:    false,
  filtrosMusculo: new Set(),
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
    raf = requestAnimationFrame(() => { punto.style.left = `${e.clientX}px`; punto.style.top = `${e.clientY}px`; });
  });
}
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
   2. VISTA MENSUAL
══════════════════════════════════════════════════════════ */

function generarVistaMensual() {
  const grid  = document.getElementById('cal-dias-grid');
  const label = document.getElementById('cal-periodo-label');
  const cont  = document.getElementById('cal-mes-contador');
  if (!grid) return;

  const año = Estado.mesActual.getFullYear();
  const mes = Estado.mesActual.getMonth();
  if (label) label.textContent = `${MESES[mes].toUpperCase()} ${año}`;

  // Calcular primer día y total de días
  const primerDia   = new Date(año, mes, 1).getDay();
  const totalDias   = new Date(año, mes + 1, 0).getDate();
  const diasAntMes  = new Date(año, mes, 0).getDate();
  const hoy         = new Date();

  // Contar entrenos del mes
  const entrenosMes = SESIONES_MOCK.filter(s => {
    const d = new Date(s.fecha);
    return d.getFullYear() === año && d.getMonth() === mes;
  }).length;
  if (cont) cont.textContent = `${entrenosMes} WORKOUT${entrenosMes !== 1 ? 'S' : ''}`;

  grid.innerHTML = '';

  // Días del mes anterior
  for (let i = primerDia - 1; i >= 0; i--) {
    grid.appendChild(crearCeldaDia(diasAntMes - i, true, []));
  }
  // Días del mes actual
  for (let d = 1; d <= totalDias; d++) {
    const fechaStr = `${año}-${String(mes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const sesiones = sesionesDeFecha(fechaStr);
    const esHoy    = hoy.getDate() === d && hoy.getMonth() === mes && hoy.getFullYear() === año;
    const celda    = crearCeldaDia(d, false, sesiones, esHoy, fechaStr);
    grid.appendChild(celda);
  }
  // Completar con días del mes siguiente
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
    // Mostrar hasta 4 puntos de distintos músculos
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
   4. VISTA SEMANA
══════════════════════════════════════════════════════════ */

function generarVistaSemana() {
  const fila  = document.getElementById('sem-dias-fila');
  const label = document.getElementById('cal-periodo-label');
  if (!fila) return;

  const diasSem = sesionesDeSemana(Estado.semanaRef);
  const hoy     = new Date();
  const hoyStr  = hoy.toISOString().slice(0, 10);

  if (label) {
    const inicio = diasSem[0].fecha;
    const fin    = diasSem[6].fecha;
    label.textContent = `${inicio.getDate()} – ${fin.getDate()} ${MESES[fin.getMonth()].slice(0,3)} ${fin.getFullYear()}`;
  }

  fila.innerHTML = '';
  diasSem.forEach(({ fecha, sesiones }, i) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const esHoy    = fechaStr === hoyStr;
    const btn      = document.createElement('button');
    btn.className  = `sem-dia-btn${esHoy ? ' hoy' : ''}`;
    btn.dataset.fecha = fechaStr;
    btn.setAttribute('aria-label', `${DIAS_LARGO[fecha.getDay()]} ${fecha.getDate()}`);

    let dotsHTML = '';
    if (sesiones.length > 0) {
      const uMusc = [];
      sesiones.forEach(s => s.musculos.forEach(m => { if (!uMusc.find(x => x.color === m.color)) uMusc.push(m); }));
      dotsHTML = `<div class="sem-dia-dots">${uMusc.slice(0,3).map(m => `<span class="sem-dia-dot" style="--c:${m.color}"></span>`).join('')}</div>`;
    }

    btn.innerHTML = `
      <span class="sem-dia-nombre">${DIAS_CORTO[fecha.getDay()]}</span>
      <span class="sem-dia-num">${fecha.getDate()}</span>
      ${dotsHTML}`;

    btn.addEventListener('click', () => {
      fila.querySelectorAll('.sem-dia-btn').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      Estado.diaSeleccionado = fechaStr;
      mostrarDetalleSemana(sesiones, fecha);
    });

    fila.appendChild(btn);

    // Activar el día de hoy por defecto
    if (esHoy) {
      btn.classList.add('activo');
      mostrarDetalleSemana(sesiones, fecha);
    }
  });
  lucide.createIcons();
}

function mostrarDetalleSemana(sesiones, fecha) {
  const det   = document.getElementById('sem-detalle');
  const vacio = document.getElementById('sem-detalle-vacio');
  if (!det) return;

  // Limpiar contenido anterior (sin eliminar el vacio)
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
   5. MENÚ LATERAL — CAMBIO DE VISTA
══════════════════════════════════════════════════════════ */

function cambiarVista(vista) {
  Estado.vista = vista;
  // Ocultar todas las secciones
  ['vista-mensual','vista-lista','vista-semana'].forEach(id => {
    document.getElementById(id)?.classList.add('oculto');
  });
  document.getElementById(`vista-${vista}`)?.classList.remove('oculto');

  // Marcar activo en el menú
  document.querySelectorAll('.cal-vista-opcion').forEach(btn => {
    const activa = btn.dataset.vista === vista;
    btn.classList.toggle('activa', activa);
    btn.setAttribute('aria-checked', String(activa));
  });

  // Regenerar la vista seleccionada
  if (vista === 'mensual') generarVistaMensual();
  if (vista === 'semana')  generarVistaSemana();
  // Lista ya está en el HTML estático (se actualiza cuando hay fetch real)

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
  document.getElementById('cal-hamburguesa')?.addEventListener('click', abrirMenu);
  document.getElementById('cal-overlay')?.addEventListener('click', cerrarMenu);
  document.querySelectorAll('.cal-vista-opcion').forEach(btn => {
    btn.addEventListener('click', () => cambiarVista(btn.dataset.vista));
  });
}

/* ══════════════════════════════════════════════════════════
   6. FILTROS DE MÚSCULO
   BACKEND: Al cambiar filtros, refetch GET /sessions con ?muscles[]= params
══════════════════════════════════════════════════════════ */

function inicializarFiltros() {
  document.querySelectorAll('.cal-filtro-check').forEach(check => {
    check.addEventListener('change', () => {
      const musculo = check.dataset.musculo;
      if (check.checked) Estado.filtrosMusculo.add(musculo);
      else               Estado.filtrosMusculo.delete(musculo);
      // BACKEND: aplicarFiltros(Estado.filtrosMusculo);
      // Por ahora regenerar la vista actual
      if (Estado.vista === 'mensual') generarVistaMensual();
      if (Estado.vista === 'semana')  generarVistaSemana();
    });
  });
}

/* ══════════════════════════════════════════════════════════
   7. NAVEGACIÓN DE MES/SEMANA
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
  // Barra inferior del calendario mensual
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
   CSS dinámico para bloques de semana (no cargados estáticos)
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
  inicializarFiltros();
  inyectarEstilosSemana();
  generarVistaMensual();
  console.log('[APEX] Calendario inicializado.');
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarApp();
});
