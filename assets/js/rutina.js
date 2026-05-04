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
────────────────────────────────────────────────────────── */
const CONFIG = {
  JWT_KEY: 'apex_token',
  TEMA_KEY: 'apex_tema',
};

function getDb() {
  const db = window.supabaseClient;
  if (!db) {
    console.error('[APEX] Supabase client no inicializado');
    console.warn('[APEX] Verifica que config.js y supabase-client.js estén en el HTML');
  }
  return db;
}

/* Estado global de la aplicación */
const Estado = {
  modoEdicion: false,      // false = entrenamiento, true = edición
  rutinaCargada: null,       // ID de la rutina abierta actualmente
  ejerciciosEnRutina: [],    // Array de ejercicios en la rutina actual (draft)
  contadorSerie: 0,        // Contador para generar IDs únicos de series
  
  // Estado de la biblioteca
  bibliotecaAbierta: false,
  musculoFiltro: 'todos',
  queryBusqueda: '',
  ejerciciosBiblioteca: [],
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
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[APEX] Error lucide:', e.message);
    }
  }
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
async function abrirRutina(rutinaId) {
  Estado.rutinaCargada = rutinaId;

  // Actualizar el título de la cabecera
  const titulo = document.getElementById('titulo-rutina-actual');
  if (titulo) {
    // Si la rutina viene de la lista, podemos sacar el nombre de ahí temporalmente
    const tarjeta = document.querySelector(`.tarjeta-rutina[data-rutina-id="${rutinaId}"]`);
    if (tarjeta) {
      titulo.textContent = tarjeta.querySelector('.tarjeta-rutina-nombre').textContent;
    }
  }

  // Cargar ejercicios reales
  await cargarEjerciciosRutina(rutinaId);

  // Actualizar datos del creador en el panel
  if (window.ApexAuth) {
    const user = await window.ApexAuth.getUser();
    if (user) {
      const db = getDb();
      if (db) {
        const { data: profile } = await db.from('profiles').select('full_name, username').eq('id', user.id).single();
        const fullName = profile?.full_name || user.user_metadata?.full_name || 'Usuario';
        const handle = profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'usuario';
        
        const avatarEl = document.querySelector('.creador-avatar');
        const handleEl = document.querySelector('.creador-handle');
        if (avatarEl) avatarEl.textContent = fullName.charAt(0).toUpperCase();
        if (handleEl) handleEl.textContent = '@' + handle;
      }
    }
  }

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
  document.getElementById('boton-nueva-rutina')?.addEventListener('click', crearNuevaRutina);
  
  // Botones de biblioteca
  document.getElementById('boton-anadir-ejercicio')?.addEventListener('click', abrirBiblioteca);
  document.getElementById('btn-biblioteca-cerrar')?.addEventListener('click', cerrarBiblioteca);
  document.getElementById('overlay-biblioteca')?.addEventListener('click', cerrarBiblioteca);
  
  // Buscador y filtros de biblioteca
  document.getElementById('input-busqueda-biblioteca')?.addEventListener('input', (e) => {
    Estado.queryBusqueda = e.target.value;
    filtrarBiblioteca();
  });
  
  document.getElementById('filtros-musculo-biblioteca')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip-filtro');
    if (!chip) return;
    
    document.querySelectorAll('.chip-filtro').forEach(c => c.classList.remove('activo'));
    chip.classList.add('activo');
    Estado.musculoFiltro = chip.dataset.musculo;
    filtrarBiblioteca();
  });
}

/**
 * Crea una nueva rutina en la base de datos y la abre en modo edición.
 */
async function crearNuevaRutina() {
  try {
    const user = await window.ApexAuth.getUser();
    if (!user) throw new Error('No autenticado');

    const db = getDb();
    const { data, error } = await db
      .from('routines')
      .insert({
        user_id: user.id,
        name: 'Nueva Rutina',
        difficulty_level: 'Intermedio'
      })
      .select()
      .single();

    if (error) throw error;

    mostrarToast('Rutina creada');
    await cargarRutinas(); // Recargar lista
    abrirRutina(data.id);
    activarModoEdicion();
    
    // Enfocar el nombre para editarlo
    setTimeout(() => {
      const inputNombre = document.getElementById('titulo-rutina-actual');
      if (inputNombre) {
        inputNombre.setAttribute('contenteditable', 'true');
        inputNombre.focus();
      }
    }, 500);

  } catch (err) {
    console.error('[APEX] Error al crear rutina:', err);
    mostrarToast('Error al crear la rutina');
  }
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

  // Nombre de la rutina editable
  const titulo = document.getElementById('titulo-rutina-actual');
  if (titulo) {
    if (activo) {
      titulo.setAttribute('contenteditable', 'true');
      titulo.classList.add('editando-titulo');
    } else {
      titulo.removeAttribute('contenteditable');
      titulo.classList.remove('editando-titulo');
    }
  }
}

function inicializarToggleModo() {
  const toggle = document.getElementById('toggle-modo');
  const btnGuardar = document.getElementById('boton-guardar-cambios');
  const btnCancelar = document.getElementById('boton-cancelar-edicion');

  if (toggle) {
    const activar = () => {
      if (Estado.modoEdicion) desactivarModoEdicion();
      else                     activarModoEdicion();
    };
    toggle.addEventListener('click', activar);
  }
  
  btnGuardar?.addEventListener('click', guardarCambiosRutina);
  btnCancelar?.addEventListener('click', () => {
    desactivarModoEdicion();
    cargarEjerciciosRutina(Estado.rutinaCargada); // Revertir cambios recargando
  });
}

/**
 * Guarda los cambios de la rutina en el backend.
 */
async function guardarCambiosRutina() {
  if (!Estado.rutinaCargada) return;

  try {
    const db = getDb();
    const titulo = document.getElementById('titulo-rutina-actual').textContent;

    // 1. Actualizar nombre de la rutina
    const { error: errorRoutine } = await db
      .from('routines')
      .update({ name: titulo })
      .eq('id', Estado.rutinaCargada);

    if (errorRoutine) throw errorRoutine;

    // 2. Sincronizar ejercicios (simplificado: borrar y re-insertar o upsert)
    // Para esta versión, haremos un borrado de los ejercicios actuales y re-inserción
    // para asegurar el orden y la integridad.
    
    const { error: errorDelete } = await db
      .from('routine_exercises')
      .delete()
      .eq('routine_id', Estado.rutinaCargada);

    if (errorDelete) throw errorDelete;

    // Recopilar datos actuales de las tarjetas
    const ejerciciosParaGuardar = [];
    document.querySelectorAll('.tarjeta-ejercicio').forEach((tarjeta, index) => {
      const exerciseId = tarjeta.dataset.realExerciseId;
      const rest = parseInt(tarjeta.querySelector('.input-descanso').value) || 60;
      
      const setsData = [];
      tarjeta.querySelectorAll('.fila-serie').forEach(fila => {
        const kg = fila.querySelector('.celda-kg input')?.value || '';
        const reps = fila.querySelector('.celda-reps input')?.value || '10';
        const tipo = fila.dataset.tipo || 'normal';
        setsData.push({ kg, reps, tipo });
      });

      const sets = setsData.length;

      ejerciciosParaGuardar.push({
        routine_id: Estado.rutinaCargada,
        exercise_id: exerciseId,
        order: index + 1,
        target_sets: sets,
        target_reps: JSON.stringify(setsData),
        rest_time_seconds: rest
      });
    });

    if (ejerciciosParaGuardar.length > 0) {
      const { error: errorInsert } = await db
        .from('routine_exercises')
        .insert(ejerciciosParaGuardar);
      
      if (errorInsert) throw errorInsert;
    }

    mostrarToast('Cambios guardados correctamente');
    desactivarModoEdicion();
    await cargarRutinas(); // Recargar lista lateral
    await cargarEjerciciosRutina(Estado.rutinaCargada); // Refrescar vista

  } catch (err) {
    console.error('[APEX] Error al guardar cambios:', err);
    mostrarToast('Error al guardar los cambios');
  }
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

async function confirmarEliminacionRutina() {
  if (!MenuContexto.rutinaId) return;

  try {
    const db = getDb();
    const { error } = await db
      .from('routines')
      .delete()
      .eq('id', MenuContexto.rutinaId);

    if (error) throw error;

    const tarjeta = document.querySelector(`.tarjeta-rutina[data-rutina-id="${MenuContexto.rutinaId}"]`);
    if (tarjeta) tarjeta.remove();

    if (Estado.rutinaCargada === MenuContexto.rutinaId) {
      mostrarVistaLista();
    }

    actualizarBadgeTotalRutinas();
    mostrarToast(`Rutina eliminada`);
    cerrarModalConfirmacion();
  } catch (err) {
    console.error('[APEX] Error al eliminar rutina:', err);
    mostrarToast('Error al eliminar la rutina');
  }
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
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[APEX] Error creando iconos drag:', e.message);
    }
  }

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



/* ══════════════════════════════════════════════════════════
   4. CRUD BACKEND — RUTINAS Y EJERCICIOS
══════════════════════════════════════════════════════════ */

async function cargarRutinas() {
  try {
    // Verificar disponibilidad de ApexAuth
    if (!window.ApexAuth) {
      console.error('[APEX] ApexAuth no disponible');
      const lista = document.getElementById('lista-mis-rutinas');
      if (lista) lista.innerHTML = '<div class="rutina-error">Sistema no disponible</div>';
      return;
    }
    
    const user = await window.ApexAuth.getUser();
    if (!user) {
      const lista = document.getElementById('lista-mis-rutinas');
      if (lista) lista.innerHTML = '<div class="rutina-vacia">Por favor, inicia sesión</div>';
      return;
    }

    const db = getDb();
    if (!db) {
      const lista = document.getElementById('lista-mis-rutinas');
      if (lista) lista.innerHTML = '<div class="rutina-error">Error de BD</div>';
      return;
    }
    
    const { data, error } = await db
      .from('routines')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderizarListaRutinas(data);
  } catch (err) {
    console.error('[APEX] Error al cargar rutinas:', err);
    const lista = document.getElementById('lista-mis-rutinas');
    if (lista) lista.innerHTML = '<div class="rutina-error">Error al cargar rutinas</div>';
  }
}

function renderizarListaRutinas(rutinas) {
  const lista = document.getElementById('lista-mis-rutinas');
  const badge = document.getElementById('badge-total-rutinas');
  if (!lista) return;

  if (badge) badge.textContent = rutinas.length;

  if (rutinas.length === 0) {
    lista.innerHTML = '<div class="rutina-vacia">No tienes rutinas creadas todavía.</div>';
    return;
  }

  lista.innerHTML = rutinas.map(r => `
    <li class="tarjeta-rutina" data-rutina-id="${r.id}" tabindex="0" role="button" aria-label="Abrir rutina ${r.name}">
      <div class="tarjeta-rutina-info" onclick="abrirRutina('${r.id}')">
        <h3 class="tarjeta-rutina-nombre">${r.name}</h3>
        ${r.description ? `<p class="tarjeta-rutina-ejercicios">${r.description}</p>` : ''}
      </div>
      <button class="boton-opciones-rutina" aria-label="Opciones de la rutina ${r.name}" aria-haspopup="true">
        <i data-lucide="more-horizontal"></i>
      </button>
    </li>
  `).join('');

  // Recrear iconos después de renderizar
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
      console.log('[APEX] Iconos lucide creados');
    } catch (e) {
      console.warn('[APEX] No se pudieron crear los iconos:', e.message);
    }
  } else {
    console.warn('[APEX] lucide no está disponible');
  }
}

/**
 * Carga los ejercicios de una rutina específica desde la base de datos.
 */
async function cargarEjerciciosRutina(rutinaId) {
  try {
    const db = getDb();
    const { data, error } = await db
      .from('routine_exercises')
      .select(`
        *,
        exercises (*)
      `)
      .eq('routine_id', rutinaId)
      .order('order', { ascending: true });

    if (error) throw error;

    Estado.ejerciciosEnRutina = data.map(re => {
      let parsedReps = '10';
      let parsedSetsData = [];
      try {
        if (re.target_reps && re.target_reps.startsWith('[')) {
          parsedSetsData = JSON.parse(re.target_reps);
          parsedReps = parsedSetsData[0]?.reps || '10';
        } else {
          parsedReps = re.target_reps || '10';
          const count = re.target_sets || 3;
          for(let i=0; i<count; i++) {
             parsedSetsData.push({ reps: parsedReps, kg: '', tipo: 'normal' });
          }
        }
      } catch (e) {
        parsedReps = re.target_reps || '10';
        const count = re.target_sets || 3;
        for(let i=0; i<count; i++) {
            parsedSetsData.push({ reps: parsedReps, kg: '', tipo: 'normal' });
        }
      }

      return {
        id: re.id,
        exercise_id: re.exercise_id,
        nombre: re.exercises.name,
        musculo: re.exercises.muscle_group,
        sets: re.target_sets || 3,
        reps: parsedReps,
        setsData: parsedSetsData,
        rest: re.rest_time_seconds || 60,
        order: re.order
      };
    });

    renderizarEjerciciosRutina(Estado.ejerciciosEnRutina);
  } catch (err) {
    console.error('[APEX] Error al cargar ejercicios de rutina:', err);
    mostrarToast('Error al cargar ejercicios');
  }
}

function renderizarEjerciciosRutina(ejercicios) {
  const lista = document.getElementById('lista-ejercicios-rutina');
  if (!lista) return;

  if (ejercicios.length === 0) {
    lista.innerHTML = '<div class="rutina-vacia-detalle">Esta rutina no tiene ejercicios. Añade uno desde la biblioteca.</div>';
    return;
  }

  lista.innerHTML = ejercicios.map((ej, index) => plantillaEjercicio(ej, index + 1)).join('');
  
  // Recrear iconos después de renderizar
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[APEX] Error recreando iconos:', e.message);
    }
  }
  
  actualizarStatsPanel();
  actualizarIndicadoresProgreso();
}

/**
 * Elimina un ejercicio de la rutina actual.
 * @param {string} ejId - ID del ejercicio a eliminar
 */
function eliminarEjercicio(ejId) {
  const tarjeta = document.querySelector(`.tarjeta-ejercicio[data-ejercicio-id="${ejId}"]`);
  if (!tarjeta) return;

  // Animación de salida
  tarjeta.style.transition = 'opacity 0.2s ease';
  tarjeta.style.opacity = '0';
  
  setTimeout(() => {
    tarjeta.remove();
    
    // Actualizar Estado
    Estado.ejerciciosEnRutina = Estado.ejerciciosEnRutina.filter(ej => ej.id !== ejId);
    
    // Actualizar UI
    actualizarStatsPanel();
    actualizarIndicadoresProgreso();
    
    mostrarToast('Ejercicio eliminado');
  }, 200);
}

function plantillaEjercicio(ej, num) {
  let seriesHtml = '';
  
  if (ej.setsData && ej.setsData.length > 0) {
    ej.setsData.forEach((setData, idx) => {
      seriesHtml += plantillaSerie(ej.id, idx + 1, setData.reps, setData.tipo, setData.kg);
    });
  } else {
    const sets = parseInt(ej.sets) || 3;
    for (let i = 1; i <= sets; i++) {
      seriesHtml += plantillaSerie(ej.id, i, ej.reps, 'normal', '');
    }
  }

  return `
  <article class="tarjeta-ejercicio" data-ejercicio-id="${ej.id}" data-real-exercise-id="${ej.exercise_id}" data-nombre="${ej.nombre}" role="listitem">
    <div class="cabecera-ejercicio">
      <div class="imagen-ejercicio-wrap">
        <div class="imagen-ejercicio-placeholder" aria-hidden="true">
          <i data-lucide="dumbbell"></i>
        </div>
      </div>
      <div class="info-ejercicio-cabecera">
        <h2 class="nombre-ejercicio">${ej.nombre}</h2>
        <span class="grupo-muscular-badge">${ej.musculo}</span>
      </div>
      <div class="controles-ejercicio-edicion oculto">
        <button class="boton-eliminar-ejercicio" aria-label="Eliminar ejercicio" onclick="eliminarEjercicio('${ej.id}')">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
      <div class="indicador-completado-ejercicio" aria-hidden="true"><i data-lucide="check-circle"></i></div>
    </div>

    <div class="fila-descanso-edicion campo-edicion oculto">
      <label class="etiqueta-campo"><i data-lucide="timer"></i> Descanso entre series</label>
      <div class="selector-descanso">
        <button class="btn-descanso-dec" onclick="manejarDescanso(this)">−</button>
        <input type="number" class="input-descanso" value="${ej.rest}" min="0" max="600" step="5" aria-label="Descanso en segundos" />
        <span class="unidad-descanso">seg</span>
        <button class="btn-descanso-inc" onclick="manejarDescanso(this)">+</button>
      </div>
    </div>

    <div class="contenedor-tabla-series">
      <table class="tabla-series">
        <thead>
          <tr>
            <th class="col-set">SET</th>
            <th class="col-tipo">TIPO</th>
            <th class="col-kg">KG</th>
            <th class="col-reps">REPS</th>
            <th class="col-check modo-entrenamiento-col">✓</th>
            <th class="col-eliminar-serie modo-edicion-col oculto"></th>
          </tr>
        </thead>
        <tbody class="cuerpo-series" id="series-${ej.id}">
          ${seriesHtml}
        </tbody>
      </table>
    </div>

    <button class="boton-anadir-serie campo-edicion oculto" onclick="anadirSerie('${ej.id}')">
      <i data-lucide="plus"></i> Añadir serie
    </button>
  </article>`;
}

function plantillaSerie(ejId, num, repsDefault = '10', tipo = 'normal', kgDefault = '') {
  const serieId = `serie-${ejId}-${num}-${Date.now()}`;
  
  const mapaClase  = { normal: 'badge-tipo-normal', warmup: 'badge-tipo-warmup', dropset: 'badge-tipo-dropset', failure: 'badge-tipo-failure' };
  const mapaLetra  = { normal: 'Normal', warmup: 'Warmup', dropset: 'Dropset', failure: 'Fallo' };
  const badgeClase = mapaClase[tipo] || 'badge-tipo-normal';
  const badgeTexto = mapaLetra[tipo] || 'Normal';

  return `
  <tr class="fila-serie" data-serie-id="${serieId}" data-tipo="${tipo}">
    <td class="celda-set"><span class="numero-set">${num}</span></td>
    <td class="celda-tipo">
      <span class="badge-tipo ${badgeClase} modo-lectura-tipo">${badgeTexto}</span>
      <select class="selector-tipo-serie campo-edicion oculto" onchange="actualizarTipoBadge(this)">
        <option value="warmup" ${tipo === 'warmup' ? 'selected' : ''}>Warmup</option>
        <option value="normal" ${tipo === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="dropset" ${tipo === 'dropset' ? 'selected' : ''}>Dropset</option>
        <option value="failure" ${tipo === 'failure' ? 'selected' : ''}>Fallo</option>
      </select>
    </td>
    <td class="celda-kg">
      <span class="valor-lectura">${kgDefault || '—'}</span>
      <input type="number" class="input-serie campo-edicion oculto" value="${kgDefault}" placeholder="kg" />
    </td>
    <td class="celda-reps">
      <span class="valor-lectura">${repsDefault}</span>
      <input type="number" class="input-serie campo-edicion oculto" value="${repsDefault}" placeholder="reps" />
    </td>
    <td class="celda-check modo-entrenamiento-col">
      <button class="boton-check-serie" onclick="toggleCheckSerie(this)">
        <i data-lucide="check"></i>
      </button>
    </td>
    <td class="celda-eliminar-serie modo-edicion-col oculto">
      <button class="boton-eliminar-serie" onclick="eliminarSerie(this)">
        <i data-lucide="x"></i>
      </button>
    </td>
  </tr>`;
}

/* ══════════════════════════════════════════════════════════
   5. BIBLIOTECA DE EJERCICIOS (Drawer)
══════════════════════════════════════════════════════════ */

async function abrirBiblioteca() {
  const drawer = document.getElementById('drawer-biblioteca');
  const overlay = document.getElementById('overlay-biblioteca');
  if (!drawer || !overlay) return;

  drawer.classList.add('activo');
  overlay.classList.add('activo');
  Estado.bibliotecaAbierta = true;

  if (Estado.ejerciciosBiblioteca.length === 0) {
    await cargarBiblioteca();
  } else {
    filtrarBiblioteca();
  }
}

function cerrarBiblioteca() {
  const drawer = document.getElementById('drawer-biblioteca');
  const overlay = document.getElementById('overlay-biblioteca');
  if (!drawer || !overlay) return;

  drawer.classList.remove('activo');
  overlay.classList.remove('activo');
  Estado.bibliotecaAbierta = false;
}

async function cargarBiblioteca() {
  try {
    const db = getDb();
    const { data, error } = await db
      .from('exercises')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    Estado.ejerciciosBiblioteca = data;
    filtrarBiblioteca();
  } catch (err) {
    console.error('[APEX] Error al cargar biblioteca:', err);
    mostrarToast('Error al cargar la biblioteca');
  }
}

function filtrarBiblioteca() {
  const lista = document.getElementById('lista-ejercicios-biblioteca');
  if (!lista) return;

  const query = Estado.queryBusqueda.toLowerCase();
  const musculo = Estado.musculoFiltro;

  const filtrados = Estado.ejerciciosBiblioteca.filter(ej => {
    const matchQuery = ej.name.toLowerCase().includes(query);
    const matchMusculo = musculo === 'todos' || ej.muscle_group === musculo;
    return matchQuery && matchMusculo;
  });

  if (filtrados.length === 0) {
    lista.innerHTML = '<div class="biblioteca-vacio">No se encontraron ejercicios.</div>';
    return;
  }

  lista.innerHTML = filtrados.map(ej => `
    <li class="item-ejercicio-biblioteca" onclick="seleccionarEjercicioDeBiblioteca('${ej.id}')">
      <div class="item-ejercicio-img">
        <i data-lucide="dumbbell"></i>
      </div>
      <div class="item-ejercicio-info">
        <span class="item-ejercicio-nombre">${ej.name}</span>
        <span class="item-ejercicio-musculo">${ej.muscle_group}</span>
      </div>
      <div class="item-ejercicio-anadir">
        <i data-lucide="plus"></i>
      </div>
    </li>
  `).join('');

  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[APEX] Error en iconos biblioteca:', e.message);
    }
  }
}

function seleccionarEjercicioDeBiblioteca(ejId) {
  const ejBase = Estado.ejerciciosBiblioteca.find(e => e.id === ejId);
  if (!ejBase) return;

  const nuevoEj = {
    id: `temp-${Date.now()}`,
    exercise_id: ejBase.id,
    nombre: ejBase.name,
    musculo: ejBase.muscle_group,
    sets: 3,
    reps: '10',
    setsData: [
      { reps: '10', kg: '', tipo: 'normal' },
      { reps: '10', kg: '', tipo: 'normal' },
      { reps: '10', kg: '', tipo: 'normal' }
    ],
    rest: 60,
    order: Estado.ejerciciosEnRutina.length + 1
  };

  Estado.ejerciciosEnRutina.push(nuevoEj);
  renderizarEjerciciosRutina(Estado.ejerciciosEnRutina);
  cerrarBiblioteca();
  mostrarToast(`${ejBase.name} añadido`);
}


/* ══════════════════════════════════════════════════════════
   5. MANEJADORES DE SERIES Y EJERCICIOS
══════════════════════════════════════════════════════════ */
function anadirSerie(ejId) {
  const tbody = document.getElementById(`series-${ejId}`);
  if (!tbody) return;

  const filas  = tbody.querySelectorAll('.fila-serie');
  const numero = filas.length + 1;

  tbody.insertAdjacentHTML('beforeend', plantillaSerie(ejId, numero, '10', 'normal'));
  
  if (typeof lucide !== 'undefined') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('[APEX] Error serie lucide:', e.message);
    }
  }
  
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
  const mapaLetra  = { normal: 'Normal', warmup: 'Warmup', dropset: 'Dropset', failure: 'Fallo' };
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
    // ID del ejercicio (puede ser un UUID válido o temporal)
    const ejId       = tarjeta.dataset.ejercicioId;
    const exerciseId = tarjeta.dataset.realExerciseId; // El ID real del ejercicio en la tabla exercises
    const nombre     = tarjeta.dataset.nombre || '';
    const musculo    = tarjeta.querySelector('.grupo-muscular-badge')?.textContent || '';
    const nota       = tarjeta.querySelector('.nota-ejercicio-input')?.value || '';
    const descansoEl = tarjeta.querySelector('.input-descanso');
    const descanso   = descansoEl ? parseInt(descansoEl.value, 10) : 60;
    const series     = [];

    tarjeta.querySelectorAll('.fila-serie').forEach((fila, sIdx) => {
      // ID de la serie (puede ser temporal)
      const serieId  = fila.dataset.serieId;
      const tipoSel  = fila.querySelector('.selector-tipo-serie');
      const tipo     = tipoSel ? tipoSel.value : (fila.dataset.tipo || 'normal');
      const inputs   = fila.querySelectorAll('.input-serie');
      const kg       = inputs[0] ? parseFloat(inputs[0].value) || null : null;
      const reps     = inputs[1] ? parseInt(inputs[1].value, 10) || null : null;

      series.push({
        id:           serieId,   // ID de la DB o null si es nueva
        orden:        sIdx + 1,
        tipo,                    // 'normal' | 'warmup' | 'dropset' | 'failure'
        peso_kg:      kg,
        repeticiones: reps,
      });
    });

    ejercicios.push({
      id:                ejId,    // ID temporal del ejercicio en esta edición
      exercise_id:       exerciseId, // ID real de la tabla exercises
      nombre,
      musculo,
      nota,
      orden:             ejIdx + 1,
      descanso_segundos: descanso,
      series,
    });
  });

  const payload = {
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

  const user = await window.ApexAuth.getUser();
  if (!user) {
    mostrarToast('Debes iniciar sesión para guardar');
    return;
  }

  try {
    const db = getDb();
    if (!db) throw new Error('Database no disponible');
    
    // 1. Guardar/Actualizar la rutina
    let routineId = payload.rutina_id;
    
    // Si no hay ID, creamos una nueva rutina
    if (!routineId || routineId === 'nueva') {
      const { data: newRoutine, error: routineError } = await db
        .from('routines')
        .insert({
          user_id: user.id,
          name: payload.nombre,
          description: '', // Se podría añadir al UI después
          difficulty_level: 'Intermedio'
        })
        .select()
        .single();
        
      if (routineError) throw routineError;
      routineId = newRoutine.id;
      Estado.rutinaCargada = routineId;
    } else {
      // Actualizar rutina existente
      const { error: updateError } = await db
        .from('routines')
        .update({
          name: payload.nombre,
          updated_at: new Date().toISOString()
        })
        .eq('id', routineId)
        .eq('user_id', user.id);
        
      if (updateError) throw updateError;
      
      // Eliminar ejercicios viejos para reemplazar con los nuevos
      const { error: deleteError } = await db
        .from('routine_exercises')
        .delete()
        .eq('routine_id', routineId);
      
      if (deleteError) console.warn('Aviso al eliminar ejercicios viejos:', deleteError.message);
    }

    // 2. Insertar los nuevos ejercicios y sus series
    if (payload.ejercicios && payload.ejercicios.length > 0) {
      for (let ejIdx = 0; ejIdx < payload.ejercicios.length; ejIdx++) {
        const ej = payload.ejercicios[ejIdx];
        
        // El exercise_id debe ser un UUID valido — check
        if (!ej.exercise_id || typeof ej.exercise_id !== 'string' || !isValidUUID(ej.exercise_id)) {
          console.warn(`Omitiendo ejercicio ${ej.nombre} por ID inválido`);
          continue;
        }

        // Insertar relación routine_exercise
        const { data: reData, error: reError } = await db
          .from('routine_exercises')
          .insert({
            routine_id: routineId,
            exercise_id: ej.exercise_id,
            order: ej.orden,
            target_sets: ej.series.length,
            target_reps: (ej.series[0]?.repeticiones || 10).toString(),
            rest_time_seconds: ej.descanso_segundos || 60
          })
          .select()
          .single();

        if (reError) {
          console.error(`Error insertando exercise_routine para ${ej.nombre}:`, reError.message);
          continue;
        }
      }
    }
    
    console.log('[APEX] Rutina guardada correctamente en Supabase');
  } catch (err) {
    console.error('[APEX] Error al guardar rutina:', err);
    mostrarToast('Error al guardar. Intenta nuevamente.');
    return;
  }

  // Sincronizar valores de lectura con los inputs editados
  sincronizarValoresLectura();

  mostrarToast('Cambios guardados correctamente');
  desactivarModoEdicion();
}

/**
 * Valida si una cadena es un UUID válido.
 * @param {string} uuid
 * @returns {boolean}
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
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
  try {
    inicializarIconos();
    inicializarNavegacion();
    inicializarToggleModo();
    inicializarAcordeon();
    inicializarMenusRutina();
    
    // Cargar rutinas con delay
    setTimeout(() => {
      cargarRutinas().catch(err => {
        console.error('[APEX] Error cargando rutinas:', err);
      });
    }, 300);

    console.log('[APEX] Módulo de rutinas inicializado.');
  } catch (err) {
    console.error('[APEX] Error inicializarApp:', err);
    mostrarToast('Error al inicializar');
  }
}

/* Arranque inmediato */
async function arrancarAplicacion() {
  try {
    inicializarTema();
    inicializarCursor();
    
    // Esperar a que Supabase esté listo
    let intentos = 0;
    while (!window.supabaseClient && intentos < 50) {
      await new Promise(r => setTimeout(r, 100));
      intentos++;
    }
    
    if (!window.supabaseClient) {
      console.error('[APEX] Supabase no disponible');
      mostrarToast('Error de conexión');
      return;
    }
    
    console.log('[APEX] Supabase listo');
    inicializarIconos();
    await inicializarApp();
  } catch (err) {
    console.error('[APEX] Error arranque:', err);
    mostrarToast('Error al inicializar');
  }
}

document.addEventListener('DOMContentLoaded', arrancarAplicacion);
