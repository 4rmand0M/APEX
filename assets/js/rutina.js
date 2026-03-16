/* ============================================================
   APEX FITNESS — Rutinas (rutina.js)
   Módulos:
   1.  Arranque: pantalla de carga, cursor, tema, íconos.
   2.  Navegación entre vistas (lista ↔ detalle).
   3.  Toggle de modo (entrenamiento ↔ edición).
   4.  CRUD local de ejercicios (añadir / eliminar).
   5.  CRUD local de series (añadir / eliminar / cambio de tipo).
   6.  Descanso: controles +/− por ejercicio.
   7.  Modo entrenamiento: check de series y ejercicios.
   8.  Progreso de sesión en el panel lateral.
   9.  Recopilar datos de la rutina (listo para backend).
   10. Toast de notificación.
   11. Acordeón de la lista de rutinas.
============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────
   0. CONFIGURACIÓN
   BACKEND: Ajusta BASE_URL al servidor real (C# / n8n).
────────────────────────────────────────────────────────── */
const CONFIG = {
  BASE_URL:  'https://api.fitmoca.edu',
  JWT_KEY:   'apex_token',
  TEMA_KEY:  'apex_tema',
};

/* Estado global de la aplicación */
const Estado = {
  modoEdicion:       false,      // false = entrenamiento, true = edición
  rutinaCargada:     null,       // ID de la rutina abierta actualmente
  contadorEjercicio: 100,        // Contador para IDs únicos de nuevos ejercicios
  contadorSerie:     1000,       // Contador para IDs únicos de nuevas series
};


/* ══════════════════════════════════════════════════════════
   1. ARRANQUE
══════════════════════════════════════════════════════════ */

function inicializarPantallaCarga() {
  const pantalla = document.getElementById('pantalla-carga');
  if (!pantalla) return;
  setTimeout(() => {
    pantalla.classList.add('saliendo');
    pantalla.addEventListener('animationend', () => {
      pantalla.remove();
      inicializarApp();
    }, { once: true });
  }, 3200);
}

function inicializarCursor() {
  const punto = document.getElementById('cursor-punto');
  if (!punto) return;
  if (window.matchMedia('(hover: none), (max-width: 820px)').matches) return;
  let rafId;
  document.addEventListener('mousemove', (e) => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      punto.style.left = `${e.clientX}px`;
      punto.style.top  = `${e.clientY}px`;
    });
  });
  const interactivos = 'button, a, input, textarea, select, .tarjeta-rutina, .tarjeta-ejercicio';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactivos)) document.body.classList.add('sobre-interactivo');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactivos)) document.body.classList.remove('sobre-interactivo');
  });
}

function inicializarTema() {
  const html = document.documentElement;
  const btn  = document.getElementById('boton-tema');
  const guardado = localStorage.getItem(CONFIG.TEMA_KEY) || 'oscuro';
  html.setAttribute('data-tema', guardado);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const nuevo = html.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', nuevo);
    localStorage.setItem(CONFIG.TEMA_KEY, nuevo);
  });
}

function inicializarIconos() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}


/* ══════════════════════════════════════════════════════════
   2. NAVEGACIÓN ENTRE VISTAS
   Lista de rutinas ↔ Detalle de rutina
══════════════════════════════════════════════════════════ */

function mostrarVistaLista() {
  document.getElementById('vista-lista-rutinas')?.classList.remove('oculto');
  document.getElementById('vista-detalle-rutina')?.classList.add('oculto');
  // Si había modo edición activo, lo desactivamos al volver
  if (Estado.modoEdicion) desactivarModoEdicion();
  Estado.rutinaCargada = null;
}

function mostrarVistaDetalle() {
  document.getElementById('vista-lista-rutinas')?.classList.add('oculto');
  document.getElementById('vista-detalle-rutina')?.classList.remove('oculto');
  // Inicializar el panel de progreso con los ejercicios actuales
  actualizarIndicadoresProgreso();
  actualizarStatsPanel();
}

/**
 * Abre el detalle de una rutina específica.
 * BACKEND: Aquí harías GET /routines/{routineId} para cargar los ejercicios reales.
 * @param {string} rutinaId - ID de la rutina seleccionada
 */
function abrirRutina(rutinaId) {
  Estado.rutinaCargada = rutinaId;

  // Actualizar el título de la cabecera con el nombre de la tarjeta clicada
  const tarjeta = document.querySelector(`.tarjeta-rutina[data-rutina-id="${rutinaId}"]`);
  const nombre  = tarjeta?.querySelector('.tarjeta-rutina-nombre')?.textContent || 'Rutina';
  const titulo  = document.getElementById('titulo-rutina-actual');
  if (titulo) titulo.textContent = nombre;

  // BACKEND: await cargarEjerciciosRutina(rutinaId);
  //   const res  = await fetch(`${CONFIG.BASE_URL}/routines/${rutinaId}`, { headers: authHeaders() });
  //   const data = await res.json();
  //   renderizarEjerciciosRutina(data.exercises);

  mostrarVistaDetalle();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Exponer globalmente para los onclick del HTML
window.abrirRutina = abrirRutina;

function inicializarNavegacion() {
  // Botón volver
  document.getElementById('boton-volver')?.addEventListener('click', mostrarVistaLista);

  // Botón "editar rutina" en el panel lateral → activa modo edición
  document.getElementById('boton-editar-rutina-panel')?.addEventListener('click', () => {
    activarModoEdicion();
  });

  // Botón "copiar enlace"
  document.getElementById('boton-copiar-enlace')?.addEventListener('click', () => {
    const url = `${window.location.origin}/rutina/${Estado.rutinaCargada}`;
    navigator.clipboard?.writeText(url).then(() => mostrarToast('Enlace copiado al portapapeles'));
  });

  // Botón nueva rutina
  // BACKEND: POST /routines — crear rutina vacía y redirigir a su detalle en modo edición
  document.getElementById('boton-nueva-rutina')?.addEventListener('click', () => {
    mostrarToast('Función de nueva rutina: conectar a POST /routines');
  });
}


/* ══════════════════════════════════════════════════════════
   3. TOGGLE DE MODO (entrenamiento ↔ edición)
══════════════════════════════════════════════════════════ */

function activarModoEdicion() {
  Estado.modoEdicion = true;
  const toggle = document.getElementById('toggle-modo');
  if (toggle) {
    toggle.classList.add('activo');
    toggle.setAttribute('aria-checked', 'true');
  }
  aplicarModoEdicion(true);
}

function desactivarModoEdicion() {
  Estado.modoEdicion = false;
  const toggle = document.getElementById('toggle-modo');
  if (toggle) {
    toggle.classList.remove('activo');
    toggle.setAttribute('aria-checked', 'false');
  }
  aplicarModoEdicion(false);
}

/**
 * Aplica o revierte los cambios visuales del modo edición.
 * @param {boolean} activo
 */
function aplicarModoEdicion(activo) {
  // Aviso informativo
  const aviso = document.getElementById('aviso-modo-edicion');
  if (aviso) activo ? aviso.classList.remove('oculto') : aviso.classList.add('oculto');

  // Barra de acciones (guardar / cancelar)
  const barra = document.getElementById('barra-acciones-edicion');
  if (barra) activo ? barra.classList.remove('oculto') : barra.classList.add('oculto');

  // Elementos que solo se muestran en edición
  document.querySelectorAll('.campo-edicion').forEach(el => {
    activo ? el.classList.remove('oculto') : el.classList.add('oculto');
  });

  // Elementos de lectura que se ocultan en edición
  document.querySelectorAll('.modo-lectura-tipo').forEach(el => {
    activo ? el.classList.add('oculto') : el.classList.remove('oculto');
  });

  // Controles de eliminar ejercicio
  document.querySelectorAll('.controles-ejercicio-edicion').forEach(el => {
    activo ? el.classList.remove('oculto') : el.classList.add('oculto');
  });

  // Columna "eliminar serie" en tabla
  document.querySelectorAll('.modo-edicion-col').forEach(el => {
    activo ? el.classList.remove('oculto') : el.classList.add('oculto');
  });

  // Columna "check" — siempre visible en entrenamiento, oculta en edición
  document.querySelectorAll('.modo-entrenamiento-col').forEach(el => {
    activo ? el.classList.add('oculto') : el.classList.remove('oculto');
  });

  // Botón añadir ejercicio
  const btnAnadirEj = document.getElementById('boton-anadir-ejercicio');
  if (btnAnadirEj) activo ? btnAnadirEj.classList.remove('oculto') : btnAnadirEj.classList.add('oculto');
}

function inicializarToggleModo() {
  const toggle = document.getElementById('toggle-modo');
  if (!toggle) return;

  const activar = () => {
    if (Estado.modoEdicion) desactivarModoEdicion();
    else                     activarModoEdicion();
  };

  toggle.addEventListener('click', activar);
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activar(); }
  });
}


/* ══════════════════════════════════════════════════════════   3.5 MENÚ CONTEXTUAL Y REORDENAMIENTO
══════════════════════════════════════════════════════════════════ */

const MenuContexto = {
  abierto: false,
  origen: null,            // 'lista' o 'detalle'
  rutinaId: null,
  rutinaNombre: null,
};

function crearMenuContextual() {
  if (document.getElementById('menu-contextual')) return;

  const html = `
    <div id="menu-contextual" class="menu-contextual oculto" role="menu" aria-label="Opciones">
      <button type="button" class="item-menu" data-accion="editar">
        <i data-lucide="edit-2" aria-hidden="true"></i>
        <span>Editar rutina</span>
      </button>
      <button type="button" class="item-menu" data-accion="copiar">
        <i data-lucide="copy" aria-hidden="true"></i>
        <span>Copiar enlace</span>
      </button>
      <button type="button" class="item-menu" data-accion="eliminar">
        <i data-lucide="trash-2" aria-hidden="true"></i>
        <span>Eliminar rutina</span>
      </button>
    </div>

    <div id="modal-confirmacion" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-confirm-title">
      <div class="modal-dialog">
        <header>
          <h2 id="modal-confirm-title">Eliminar rutina</h2>
          <button type="button" class="modal-close" aria-label="Cerrar">×</button>
        </header>
        <p id="modal-confirm-message">¿Estás seguro de que quieres eliminar esta rutina? Se irá para siempre.</p>
        <div class="modal-actions">
          <button type="button" class="boton-cancelar" id="modal-cancelar">Cancelar</button>
          <button type="button" class="boton-confirmar" id="modal-confirmar">Eliminar rutina</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  inicializarIconos();
}

function abrirMenuRutina({ origen, rutinaId, nombre, anchor }) {
  crearMenuContextual();
  const menu = document.getElementById('menu-contextual');
  if (!menu) return;

  MenuContexto.abierto = true;
  MenuContexto.origen  = origen;
  MenuContexto.rutinaId = rutinaId;
  MenuContexto.rutinaNombre = nombre;

  // Ajustar texto según contexto
  const editar = menu.querySelector('[data-accion="editar"]');
  const copiar = menu.querySelector('[data-accion="copiar"]');
  const eliminar = menu.querySelector('[data-accion="eliminar"]');

  if (editar) editar.querySelector('span').textContent = 'Editar rutina';
  if (copiar) copiar.querySelector('span').textContent = 'Copiar enlace';
  if (eliminar) eliminar.querySelector('span').textContent = 'Eliminar rutina';

  // Posicionar menú cerca del botón
  const rect = anchor.getBoundingClientRect();
  const top = rect.bottom + 10 + window.scrollY;
  const left = Math.min(rect.left, window.innerWidth - 240);

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.classList.remove('oculto');

  // Leer nombre para el modal
  const modalTitle = document.getElementById('modal-confirm-title');
  const modalMsg   = document.getElementById('modal-confirm-message');
  if (modalTitle) modalTitle.textContent = `Eliminar “${nombre}”`;
  if (modalMsg) modalMsg.textContent = `¿Estás seguro de que quieres eliminar la rutina “${nombre}”? Esta acción no se puede deshacer.`;

  requestAnimationFrame(() => {
    menu.querySelector('[data-accion]')?.focus();
  });
}

function cerrarMenuContextual() {
  const menu = document.getElementById('menu-contextual');
  if (!menu) return;
  menu.classList.add('oculto');
  MenuContexto.abierto = false;
}

function inicializarMenusRutina() {
  // Abrir el menú contextual desde los botones de opciones
  document.body.addEventListener('click', (e) => {
    const btnRutina = e.target.closest('.boton-opciones-rutina');
    if (btnRutina) {
      const tarjeta = btnRutina.closest('.tarjeta-rutina');
      const rutinaId = tarjeta?.dataset?.rutinaId;
      const nombre   = tarjeta?.querySelector('.tarjeta-rutina-nombre')?.textContent || 'Rutina';
      if (rutinaId) abrirMenuRutina({ origen: 'lista', rutinaId, nombre, anchor: btnRutina });
      return;
    }

    const btnDetalle = e.target.closest('.boton-opciones-detalle');
    if (btnDetalle) {
      const rutinaId = Estado.rutinaCargada;
      const nombre   = document.getElementById('titulo-rutina-actual')?.textContent || 'Rutina';
      if (rutinaId) abrirMenuRutina({ origen: 'detalle', rutinaId, nombre, anchor: btnDetalle });
      return;
    }
  });

  // Cerrar menú al clicar fuera
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('menu-contextual');
    if (!menu || menu.classList.contains('oculto')) return;
    if (e.target.closest('#menu-contextual')) return;
    if (e.target.closest('.boton-opciones-rutina') || e.target.closest('.boton-opciones-detalle')) return;
    cerrarMenuContextual();
  });

  // Navegación por teclado (ESC)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarMenuContextual();
      cerrarModalConfirmacion();
    }
  });

  // Acciones del menú
  document.body.addEventListener('click', (e) => {
    const item = e.target.closest('.item-menu');
    if (!item) return;
    const accion = item.dataset.accion;
    if (!accion) return;

    switch (accion) {
      case 'editar':
        if (MenuContexto.origen === 'lista') {
          abrirRutina(MenuContexto.rutinaId);
        } else {
          activarModoEdicion();
        }
        break;
      case 'copiar':
        if (MenuContexto.rutinaId) {
          const url = `${window.location.origin}/rutina/${MenuContexto.rutinaId}`;
          navigator.clipboard?.writeText(url).then(() => mostrarToast('Enlace copiado al portapapeles'));
        }
        break;
      case 'eliminar':
        abrirModalConfirmacion();
        break;
    }

    cerrarMenuContextual();
  });

  // Modal de confirmación
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#modal-cancelar') || e.target.closest('.modal-close')) {
      cerrarModalConfirmacion();
    }
    if (e.target.closest('#modal-confirmar')) {
      confirmarEliminacionRutina();
    }
    if (e.target.closest('#modal-confirmacion') && e.target.id === 'modal-confirmacion') {
      cerrarModalConfirmacion();
    }
  });
}

function abrirModalConfirmacion() {
  const overlay = document.getElementById('modal-confirmacion');
  if (!overlay) return;
  overlay.classList.add('activo');
}

function cerrarModalConfirmacion() {
  const overlay = document.getElementById('modal-confirmacion');
  if (!overlay) return;
  overlay.classList.remove('activo');
}

function confirmarEliminacionRutina() {
  if (!MenuContexto.rutinaId) return;

  const tarjeta = document.querySelector(`.tarjeta-rutina[data-rutina-id="${MenuContexto.rutinaId}"]`);
  if (tarjeta) tarjeta.remove();

  if (Estado.rutinaCargada === MenuContexto.rutinaId) {
    mostrarVistaLista();
  }

  actualizarBadgeTotalRutinas();
  mostrarToast(`Rutina “${MenuContexto.rutinaNombre}” eliminada`);
  cerrarModalConfirmacion();
}

function actualizarBadgeTotalRutinas() {
  const badge = document.getElementById('badge-total-rutinas');
  const total = document.querySelectorAll('.tarjeta-rutina').length;
  if (badge) badge.textContent = total;
}

function inicializarReordenamientoRutinas() {
  const lista = document.getElementById('lista-mis-rutinas');
  if (!lista) return;

  // Añadir handle de arrastre a cada rutina
  lista.querySelectorAll('.tarjeta-rutina').forEach((tarjeta) => {
    if (tarjeta.querySelector('.drag-handle')) return;

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'drag-handle';
    handle.setAttribute('aria-label', 'Arrastrar para reordenar');
    handle.setAttribute('title', 'Arrastrar para reordenar');
    handle.setAttribute('draggable', 'true');
    handle.innerHTML = '<i data-lucide="grid"></i>';

    // Evitar que el clic en el handle abra la rutina
    handle.addEventListener('click', (e) => e.stopPropagation());

    tarjeta.insertBefore(handle, tarjeta.firstChild);
  });

  // Convertir íconos recién insertados
  if (typeof lucide !== 'undefined') lucide.createIcons();

  let elementoArrastrado = null;

  lista.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;

    const tarjeta = handle.closest('.tarjeta-rutina');
    if (!tarjeta) return;

    elementoArrastrado = tarjeta;
    tarjeta.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  lista.addEventListener('dragend', () => {
    if (elementoArrastrado) elementoArrastrado.classList.remove('dragging');
    elementoArrastrado = null;
  });

  lista.addEventListener('dragover', (e) => {
    e.preventDefault();
    const tarjetaObjetivo = e.target.closest('.tarjeta-rutina');
    if (!tarjetaObjetivo || tarjetaObjetivo === elementoArrastrado) return;

    const rect = tarjetaObjetivo.getBoundingClientRect();
    const deberiaColocarseDespues = e.clientY > rect.top + rect.height / 2;

    if (deberiaColocarseDespues) {
      tarjetaObjetivo.after(elementoArrastrado);
    } else {
      tarjetaObjetivo.before(elementoArrastrado);
    }
  });

  lista.addEventListener('drop', (e) => {
    e.preventDefault();
  });
}



/* ═════════════════════════════════════════════════════════════════   4. CRUD LOCAL — EJERCICIOS
══════════════════════════════════════════════════════════ */

/**
 * Genera el HTML de una nueva tarjeta de ejercicio vacía.
 * BACKEND: Conectar con GET /exercises para búsqueda real de ejercicios.
 * @param {string} ejId - ID único generado para el nuevo ejercicio
 */
function plantillaEjercicio(ejId) {
  return `
  <article class="tarjeta-ejercicio" data-ejercicio-id="${ejId}" data-nombre="Nuevo ejercicio" role="listitem">
    <div class="cabecera-ejercicio">
      <div class="imagen-ejercicio-wrap">
        <div class="imagen-ejercicio-placeholder" aria-hidden="true">
          <i data-lucide="dumbbell"></i>
        </div>
      </div>
      <div class="info-ejercicio-cabecera">
        <!-- BACKEND: Input para búsqueda de ejercicio: GET /exercises?query={valor} -->
        <input
          type="text"
          class="nombre-ejercicio"
          style="background:none;border:none;border-bottom:1px solid var(--borde);outline:none;
                 font-size:15px;font-weight:600;color:var(--texto);width:100%;padding:2px 0;
                 font-family:'DM Sans',sans-serif;"
          placeholder="Nombre del ejercicio"
          value=""
          aria-label="Nombre del ejercicio"
        />
        <span class="grupo-muscular-badge">—</span>
      </div>
      <div class="controles-ejercicio-edicion">
        <button class="boton-eliminar-ejercicio" aria-label="Eliminar ejercicio" data-ejercicio-id="${ejId}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="indicador-completado-ejercicio" aria-hidden="true"><i data-lucide="check-circle"></i></div>
    </div>

    <div class="contenedor-nota">
      <p class="nota-ejercicio-lectura oculto-si-vacio oculto" data-campo="nota">—</p>
      <textarea class="nota-ejercicio-input campo-edicion" placeholder="Añadir nota al ejercicio..." rows="2" aria-label="Nota del ejercicio"></textarea>
    </div>

    <div class="fila-descanso-edicion campo-edicion">
      <label class="etiqueta-campo"><i data-lucide="timer"></i> Descanso entre series</label>
      <div class="selector-descanso">
        <button class="btn-descanso-dec" aria-label="Reducir descanso">−</button>
        <input type="number" class="input-descanso" value="60" min="0" max="600" step="5" aria-label="Segundos de descanso" />
        <span class="unidad-descanso">seg</span>
        <button class="btn-descanso-inc" aria-label="Aumentar descanso">+</button>
      </div>
    </div>

    <div class="contenedor-tabla-series">
      <table class="tabla-series" aria-label="Series del ejercicio">
        <thead>
          <tr>
            <th class="col-set">SET</th>
            <th class="col-tipo">TIPO</th>
            <th class="col-kg">KG</th>
            <th class="col-reps">REPS</th>
            <th class="col-check modo-entrenamiento-col oculto">✓</th>
            <th class="col-eliminar-serie modo-edicion-col" aria-label="Eliminar"></th>
          </tr>
        </thead>
        <tbody class="cuerpo-series" id="series-${ejId}">
          ${plantillaSerie(ejId, 1, 'normal')}
        </tbody>
      </table>
    </div>

    <button class="boton-anadir-serie campo-edicion" data-ejercicio-id="${ejId}" aria-label="Añadir serie">
      <i data-lucide="plus"></i> Añadir serie
    </button>
  </article>`;
}

/**
 * Añade un nuevo ejercicio vacío a la lista.
 * BACKEND: En producción, primero buscar ejercicio en GET /exercises
 *          y luego POST /routines/{routineId}/exercises
 */
function anadirEjercicio() {
  Estado.contadorEjercicio++;
  const ejId = `ej-nuevo-${Estado.contadorEjercicio}`;
  const lista = document.getElementById('lista-ejercicios-rutina');
  if (!lista) return;

  const html = plantillaEjercicio(ejId);
  lista.insertAdjacentHTML('beforeend', html);
  lucide.createIcons(); // Re-inicializar íconos para los nuevos elementos

  // Scroll al nuevo ejercicio
  const nuevo = lista.querySelector(`[data-ejercicio-id="${ejId}"]`);
  nuevo?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  actualizarStatsPanel();
  mostrarToast('Ejercicio añadido');
}

/**
 * Elimina un ejercicio del DOM.
 * BACKEND: DELETE /routines/{routineId}/exercises/{exerciseId}
 * @param {string} ejId - ID del ejercicio a eliminar
 */
function eliminarEjercicio(ejId) {
  const tarjeta = document.querySelector(`.tarjeta-ejercicio[data-ejercicio-id="${ejId}"]`);
  if (!tarjeta) return;

  // Animación de salida
  tarjeta.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
  tarjeta.style.opacity    = '0';
  tarjeta.style.transform  = 'scale(0.97)';

  setTimeout(() => {
    tarjeta.remove();
    actualizarStatsPanel();
    actualizarProgreso();
    actualizarIndicadoresProgreso();
  }, 230);
}


/* ══════════════════════════════════════════════════════════
   5. CRUD LOCAL — SERIES
══════════════════════════════════════════════════════════ */

/**
 * Genera el HTML de una nueva fila de serie.
 * @param {string} ejId    - ID del ejercicio padre
 * @param {number} numero  - Número de la serie (visual)
 * @param {string} tipo    - 'normal' | 'warmup' | 'dropset' | 'failure'
 */
function plantillaSerie(ejId, numero, tipo = 'normal') {
  Estado.contadorSerie++;
  const serieId = `serie-nueva-${Estado.contadorSerie}`;
  const badges  = { normal: 'N', warmup: 'W', dropset: 'D', failure: 'F' };
  const badgeClase = { normal: 'badge-tipo-normal', warmup: 'badge-tipo-warmup', dropset: 'badge-tipo-dropset', failure: 'badge-tipo-failure' };

  return `
  <tr class="fila-serie" data-serie-id="${serieId}" data-tipo="${tipo}">
    <td class="celda-set"><span class="numero-set">${numero}</span></td>
    <td class="celda-tipo">
      <span class="badge-tipo ${badgeClase[tipo]} modo-lectura-tipo oculto">${badges[tipo]}</span>
      <select class="selector-tipo-serie campo-edicion" aria-label="Tipo de serie">
        <option value="warmup"  ${tipo === 'warmup'  ? 'selected' : ''}>Warm-up</option>
        <option value="normal"  ${tipo === 'normal'  ? 'selected' : ''}>Normal</option>
        <option value="dropset" ${tipo === 'dropset' ? 'selected' : ''}>Drop Set</option>
        <option value="failure" ${tipo === 'failure' ? 'selected' : ''}>Failure</option>
      </select>
    </td>
    <td class="celda-kg">
      <span class="valor-lectura oculto">—</span>
      <input type="number" class="input-serie campo-edicion" value="" min="0" step="0.5" placeholder="kg" aria-label="Peso en kilogramos" />
    </td>
    <td class="celda-reps">
      <span class="valor-lectura oculto">—</span>
      <input type="number" class="input-serie campo-edicion" value="" min="1" step="1" placeholder="reps" aria-label="Repeticiones" />
    </td>
    <td class="celda-check modo-entrenamiento-col oculto">
      <button class="boton-check-serie" aria-label="Marcar serie como completada" aria-pressed="false">
        <i data-lucide="check"></i>
      </button>
    </td>
    <td class="celda-eliminar-serie modo-edicion-col">
      <button class="boton-eliminar-serie" aria-label="Eliminar serie">
        <i data-lucide="x"></i>
      </button>
    </td>
  </tr>`;
}

/**
 * Añade una serie al ejercicio especificado.
 * BACKEND: POST /exercises/{exerciseId}/sets
 * @param {string} ejId - ID del ejercicio
 */
function anadirSerie(ejId) {
  const tbody = document.getElementById(`series-${ejId}`);
  if (!tbody) return;

  const filas  = tbody.querySelectorAll('.fila-serie');
  const numero = filas.length + 1;

  tbody.insertAdjacentHTML('beforeend', plantillaSerie(ejId, numero, 'normal'));
  lucide.createIcons();
  actualizarStatsPanel();
}

/**
 * Elimina una serie del DOM y renumera las restantes.
 * BACKEND: DELETE /exercises/{exerciseId}/sets/{setId}
 * @param {HTMLElement} boton - El botón de eliminar que fue clicado
 */
function eliminarSerie(boton) {
  const fila  = boton.closest('.fila-serie');
  const tbody = fila?.closest('.cuerpo-series');
  if (!fila || !tbody) return;

  fila.style.transition = 'opacity 0.18s ease';
  fila.style.opacity    = '0';
  setTimeout(() => {
    fila.remove();
    // Renumerar series
    tbody.querySelectorAll('.fila-serie').forEach((f, i) => {
      const numSpan = f.querySelector('.numero-set');
      if (numSpan) numSpan.textContent = i + 1;
    });
    actualizarStatsPanel();
    actualizarProgreso();
  }, 200);
}

/**
 * Actualiza el badge de tipo de serie cuando el usuario cambia el select.
 * @param {HTMLSelectElement} select
 */
function actualizarTipoBadge(select) {
  const fila   = select.closest('.fila-serie');
  if (!fila) return;

  const tipo   = select.value;
  const badge  = fila.querySelector('.badge-tipo');
  if (!badge) return;

  const clases = ['badge-tipo-normal', 'badge-tipo-warmup', 'badge-tipo-dropset', 'badge-tipo-failure'];
  badge.classList.remove(...clases);

  const mapaClase  = { normal: 'badge-tipo-normal', warmup: 'badge-tipo-warmup', dropset: 'badge-tipo-dropset', failure: 'badge-tipo-failure' };
  const mapaLetra  = { normal: 'N', warmup: 'W', dropset: 'D', failure: 'F' };
  badge.classList.add(mapaClase[tipo]);
  badge.textContent = mapaLetra[tipo];
  fila.dataset.tipo = tipo;
}


/* ══════════════════════════════════════════════════════════
   6. DESCANSO: CONTROLES +/−
══════════════════════════════════════════════════════════ */

function manejarDescanso(boton) {
  const wrap  = boton.closest('.selector-descanso');
  const input = wrap?.querySelector('.input-descanso');
  if (!input) return;

  const esInc = boton.classList.contains('btn-descanso-inc');
  const paso  = 5;
  let valor   = parseInt(input.value, 10) || 0;
  valor += esInc ? paso : -paso;
  input.value = Math.max(0, Math.min(600, valor));
}


/* ══════════════════════════════════════════════════════════
   7. MODO ENTRENAMIENTO — CHECK DE SERIES Y EJERCICIOS
══════════════════════════════════════════════════════════ */

/**
 * Marca o desmarca una serie como completada.
 * Verifica si todas las series del ejercicio están completas → marca el ejercicio.
 * BACKEND: POST /sessions/{sessionId}/sets/{setId}/complete
 * @param {HTMLButtonElement} boton
 */
function toggleCheckSerie(boton) {
  const estaCompletada = boton.getAttribute('aria-pressed') === 'true';
  const nuevaVal       = !estaCompletada;

  boton.setAttribute('aria-pressed', String(nuevaVal));
  const fila = boton.closest('.fila-serie');
  if (fila) {
    nuevaVal ? fila.classList.add('completada') : fila.classList.remove('completada');
    // Animar el botón
    boton.style.transform = 'scale(1.3)';
    setTimeout(() => { boton.style.transform = ''; }, 200);
  }

  // Verificar si TODAS las series del ejercicio están completadas
  const tarjeta = boton.closest('.tarjeta-ejercicio');
  if (tarjeta) verificarEjercicioCompleto(tarjeta);

  actualizarProgreso();
}

/**
 * Verifica si todas las series de un ejercicio están marcadas.
 * Si es así, marca el ejercicio como completado y actualiza el panel.
 * @param {HTMLElement} tarjeta
 */
function verificarEjercicioCompleto(tarjeta) {
  const botonesCheck  = tarjeta.querySelectorAll('.boton-check-serie');
  const todasCompletas = Array.from(botonesCheck).every(b => b.getAttribute('aria-pressed') === 'true');

  if (todasCompletas && botonesCheck.length > 0) {
    tarjeta.classList.add('completado');
    tarjeta.querySelector('.indicador-completado-ejercicio')?.style.setProperty('display', 'flex');
    // Mover ejercicios completados al final de la lista para mantener el foco
    const lista = tarjeta.parentElement;
    if (lista) lista.appendChild(tarjeta);
  } else {
    tarjeta.classList.remove('completado');
    tarjeta.querySelector('.indicador-completado-ejercicio')?.style.setProperty('display', 'none');
  }

  actualizarIndicadoresProgreso();
}


/* ══════════════════════════════════════════════════════════
   8. PROGRESO DE SESIÓN (panel lateral)
══════════════════════════════════════════════════════════ */

/** Actualiza la barra de progreso y el texto de series completadas. */
function actualizarProgreso() {
  const totalSeries     = document.querySelectorAll('.boton-check-serie').length;
  const seriesCompletas = document.querySelectorAll('.boton-check-serie[aria-pressed="true"]').length;
  const porcentaje      = totalSeries > 0 ? Math.round((seriesCompletas / totalSeries) * 100) : 0;

  const barra  = document.getElementById('barra-progreso-relleno');
  const texto  = document.getElementById('texto-progreso');
  const wrap   = document.getElementById('barra-progreso-wrap');

  if (barra)  barra.style.width = `${porcentaje}%`;
  if (texto)  texto.textContent = `${seriesCompletas} / ${totalSeries} series`;
  if (wrap)   wrap.setAttribute('aria-valuenow', porcentaje);
}

/** Genera los indicadores de ejercicios en el panel lateral. */
function actualizarIndicadoresProgreso() {
  const contenedor = document.getElementById('indicadores-progreso');
  if (!contenedor) return;

  const ejercicios = document.querySelectorAll('.tarjeta-ejercicio');
  contenedor.innerHTML = '';

  ejercicios.forEach((ej, idx) => {
    const nombre     = ej.dataset.nombre || `Ejercicio ${idx + 1}`;
    const completado = ej.classList.contains('completado');
    const div        = document.createElement('div');
    div.className    = `indicador-ejercicio-progreso${completado ? ' completado' : ''}`;
    div.innerHTML    = `
      <div class="punto-indicador"></div>
      <span>${nombre.length > 26 ? nombre.substring(0, 24) + '…' : nombre}</span>`;
    contenedor.appendChild(div);
  });
}

/**
 * Actualiza las estadísticas del panel lateral (ejercicios, series, duración).
 * BACKEND: En producción, estos cálculos se harían en el servidor.
 */
function actualizarStatsPanel() {
  const ejercicios   = document.querySelectorAll('.tarjeta-ejercicio').length;
  const series       = document.querySelectorAll('.fila-serie').length;
  const durEstimada  = Math.round(series * 2); // ~2 min por serie como estimación básica

  const elEj   = document.getElementById('stat-total-ejercicios');
  const elSer  = document.getElementById('stat-total-series');
  const elDur  = document.getElementById('stat-duracion-estimada');
  const badgeR = document.getElementById('badge-total-rutinas');

  if (elEj)   elEj.textContent  = ejercicios;
  if (elSer)  elSer.textContent = series;
  if (elDur)  elDur.textContent = `${durEstimada}min`;
}


/* ══════════════════════════════════════════════════════════
   9. RECOPILAR DATOS DE LA RUTINA (listo para backend)
══════════════════════════════════════════════════════════ */

/**
 * Recoge todos los datos actuales de la rutina desde el DOM.
 * Devuelve un objeto JSON con la estructura esperada por el backend.
 *
 * BACKEND: Este objeto se envía a PUT /routines/{routineId}
 *          con cabecera Authorization: Bearer {jwt}
 *          El endpoint en C# o n8n lo procesa y actualiza la DB.
 *
 * @returns {Object} Payload de la rutina
 */
function recopilarDatosRutina() {
  const rutinaNombre = document.getElementById('titulo-rutina-actual')?.textContent || 'Sin nombre';
  const ejercicios   = [];

  document.querySelectorAll('.tarjeta-ejercicio').forEach((tarjeta, ejIdx) => {
    // BACKEND: Mapear el data-ejercicio-id al ID real de la DB
    const ejId       = tarjeta.dataset.ejercicioId;
    const nombre     = tarjeta.dataset.nombre || tarjeta.querySelector('.nombre-ejercicio')?.value || '';
    const nota       = tarjeta.querySelector('.nota-ejercicio-input')?.value || '';
    const descansoEl = tarjeta.querySelector('.input-descanso');
    const descanso   = descansoEl ? parseInt(descansoEl.value, 10) : 60;
    const series     = [];

    tarjeta.querySelectorAll('.fila-serie').forEach((fila, sIdx) => {
      // BACKEND: Mapear el data-serie-id al ID real de la DB
      const serieId  = fila.dataset.serieId;
      const tipoSel  = fila.querySelector('.selector-tipo-serie');
      const tipo     = tipoSel ? tipoSel.value : (fila.dataset.tipo || 'normal');
      const inputs   = fila.querySelectorAll('.input-serie');
      const kg       = inputs[0] ? parseFloat(inputs[0].value) || null : null;
      const reps     = inputs[1] ? parseInt(inputs[1].value, 10) || null : null;

      series.push({
        id:           serieId,   // BACKEND: ID de la DB o null si es nueva
        orden:        sIdx + 1,
        tipo,                    // 'normal' | 'warmup' | 'dropset' | 'failure'
        peso_kg:      kg,
        repeticiones: reps,
      });
    });

    ejercicios.push({
      id:                ejId,    // BACKEND: ID real del ejercicio en la DB
      orden:             ejIdx + 1,
      nombre,                     // BACKEND: Se reemplaza por exercise_id en producción
      nota,
      descanso_segundos: descanso,
      series,
    });
  });

  const payload = {
    // BACKEND: rutina_id viene de Estado.rutinaCargada
    rutina_id:  Estado.rutinaCargada,
    nombre:     rutinaNombre,
    ejercicios,
    actualizado_en: new Date().toISOString(),
  };

  return payload;
}

/**
 * Guarda los cambios de la rutina.
 * BACKEND: PUT /routines/{routineId}
 *   Headers: { 'Authorization': `Bearer ${localStorage.getItem(CONFIG.JWT_KEY)}` }
 *   Body: JSON.stringify(recopilarDatosRutina())
 */
async function guardarCambios() {
  const payload = recopilarDatosRutina();

  // LOG para desarrollo — en producción reemplazar con el fetch real
  console.group('[APEX] Guardar rutina — payload listo para backend:');
  console.log(JSON.stringify(payload, null, 2));
  console.groupEnd();

  // BACKEND — Descomentar para conectar:
  // try {
  //   const res = await fetch(`${CONFIG.BASE_URL}/routines/${payload.rutina_id}`, {
  //     method:  'PUT',
  //     headers: {
  //       'Content-Type':  'application/json',
  //       'Authorization': `Bearer ${localStorage.getItem(CONFIG.JWT_KEY)}`,
  //     },
  //     body: JSON.stringify(payload),
  //   });
  //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
  //   const data = await res.json();
  //   console.log('[APEX] Rutina guardada:', data);
  // } catch (err) {
  //   console.error('[APEX] Error al guardar rutina:', err);
  //   mostrarToast('Error al guardar. Intenta nuevamente.');
  //   return;
  // }

  // Sincronizar valores de lectura con los inputs editados
  sincronizarValoresLectura();

  mostrarToast('Cambios guardados correctamente');
  desactivarModoEdicion();
}

/**
 * Sincroniza los valores de los inputs (modo edición) con los spans de lectura.
 * Garantiza que al salir del modo edición se vean los valores actualizados.
 */
function sincronizarValoresLectura() {
  document.querySelectorAll('.fila-serie').forEach(fila => {
    const inputs  = fila.querySelectorAll('.input-serie');
    const valores = fila.querySelectorAll('.valor-lectura');
    inputs.forEach((input, i) => {
      if (valores[i]) valores[i].textContent = input.value || '—';
    });
    // Actualizar el badge de tipo según el select
    const selector = fila.querySelector('.selector-tipo-serie');
    if (selector) actualizarTipoBadge(selector);

    // Actualizar nota
    const textarea = fila.closest('.tarjeta-ejercicio')?.querySelector('.nota-ejercicio-input');
    const notaP    = fila.closest('.tarjeta-ejercicio')?.querySelector('.nota-ejercicio-lectura');
    if (textarea && notaP) {
      notaP.textContent = textarea.value || '—';
      notaP.classList.toggle('oculto-si-vacio', !textarea.value);
    }
  });
}


/* ══════════════════════════════════════════════════════════
   10. TOAST DE NOTIFICACIÓN
══════════════════════════════════════════════════════════ */

let toastTimer = null;

/**
 * Muestra una notificación tipo toast en la parte superior.
 * @param {string} mensaje - Texto a mostrar
 * @param {number} duracion - Milisegundos que permanece visible (default 3000)
 */
function mostrarToast(mensaje, duracion = 3000) {
  const toast    = document.getElementById('toast-notificacion');
  const mensajeEl = document.getElementById('toast-mensaje');
  if (!toast || !mensajeEl) return;

  mensajeEl.textContent = mensaje;
  toast.classList.add('visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), duracion);
}


/* ══════════════════════════════════════════════════════════
   11. ACORDEÓN DE LISTA DE RUTINAS
══════════════════════════════════════════════════════════ */

function inicializarAcordeon() {
  const btn   = document.getElementById('acordeon-mis-rutinas');
  const lista = document.getElementById('lista-mis-rutinas');
  if (!btn || !lista) return;

  btn.addEventListener('click', () => {
    const expandido = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expandido));

    if (expandido) {
      lista.style.maxHeight = lista.scrollHeight + 'px';
      requestAnimationFrame(() => { lista.style.maxHeight = '0'; lista.style.overflow = 'hidden'; });
    } else {
      lista.style.overflow  = 'hidden';
      lista.style.maxHeight = '0';
      requestAnimationFrame(() => { lista.style.maxHeight = lista.scrollHeight + 'px'; });
      lista.addEventListener('transitionend', () => { lista.style.overflow = ''; lista.style.maxHeight = ''; }, { once: true });
    }
  });

  // Inicializar estado del acordeón
  lista.style.transition = 'max-height 0.3s ease';
}


/* ══════════════════════════════════════════════════════════
   DELEGACIÓN DE EVENTOS — Un listener para todos los clicks
══════════════════════════════════════════════════════════ */

function inicializarEventosFeed() {
  document.addEventListener('click', (e) => {

    // ── Eliminar ejercicio
    const btnEliminarEj = e.target.closest('.boton-eliminar-ejercicio');
    if (btnEliminarEj) {
      const ejId = btnEliminarEj.dataset.ejercicioId;
      if (ejId) eliminarEjercicio(ejId);
      return;
    }

    // ── Añadir serie
    const btnAnadirSerie = e.target.closest('.boton-anadir-serie');
    if (btnAnadirSerie) {
      const ejId = btnAnadirSerie.dataset.ejercicioId;
      if (ejId) anadirSerie(ejId);
      return;
    }

    // ── Eliminar serie
    const btnEliminarSerie = e.target.closest('.boton-eliminar-serie');
    if (btnEliminarSerie) {
      eliminarSerie(btnEliminarSerie);
      return;
    }

    // ── Check de serie (modo entrenamiento)
    const btnCheck = e.target.closest('.boton-check-serie');
    if (btnCheck) {
      toggleCheckSerie(btnCheck);
      return;
    }

    // ── Añadir ejercicio
    if (e.target.closest('#boton-anadir-ejercicio')) {
      anadirEjercicio();
      return;
    }

    // ── Guardar cambios
    if (e.target.closest('#boton-guardar-cambios')) {
      guardarCambios();
      return;
    }

    // ── Cancelar edición
    if (e.target.closest('#boton-cancelar-edicion')) {
      desactivarModoEdicion();
      return;
    }

    // ── Descanso: dec/inc
    const btnDec = e.target.closest('.btn-descanso-dec');
    if (btnDec) { manejarDescanso(btnDec); return; }
    const btnInc = e.target.closest('.btn-descanso-inc');
    if (btnInc) { manejarDescanso(btnInc); return; }
  });

  // Cambio de tipo de serie → actualizar badge
  document.addEventListener('change', (e) => {
    const selector = e.target.closest('.selector-tipo-serie');
    if (selector) actualizarTipoBadge(selector);
  });
}


/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN PRINCIPAL
══════════════════════════════════════════════════════════ */

function inicializarApp() {
  inicializarIconos();
  inicializarNavegacion();
  inicializarToggleModo();
  inicializarEventosFeed();
  inicializarAcordeon();
  inicializarMenusRutina();
  inicializarReordenamientoRutinas();
  actualizarStatsPanel();
  actualizarProgreso();
  actualizarIndicadoresProgreso();

  console.log('[APEX] Módulo de rutinas inicializado.');
}

/* Arranque inmediato */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarApp();
});
