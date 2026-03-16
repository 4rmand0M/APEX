/* ============================================================
   APEX FITNESS — Feed Principal (feed.js)
   Responsabilidades:
   1. Pantalla de carga y arranque de la app.
   2. Cursor personalizado (punto).
   3. Toggle de tema oscuro/claro.
   4. Inicialización de iconos Lucide.
   5. Navegación (marcar enlace activo).
   6. Interacciones del feed (like, comentarios, ver más).
   7. Skeleton / estados de carga (preparado para backend).
   8. Scroll infinito (Intersection Observer).
   9. Hooks listos para fetch al backend.
============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────
   0. CONFIGURACIÓN GLOBAL
   BACKEND: Cambiar BASE_URL al endpoint real de la API.
────────────────────────────────────────────────────────── */
const CONFIG = {
  BASE_URL: 'https://api.fitmoca.edu', // BACKEND: URL base de la API
  JWT_KEY:  'apex_token',              // BACKEND: Clave de localStorage para el JWT
  TEMA_KEY: 'apex_tema',               // Clave para persistir el tema elegido
};


/* ══════════════════════════════════════════════════════════
   1. PANTALLA DE CARGA
══════════════════════════════════════════════════════════ */

function inicializarPantallaCarga() {
  const pantalla = document.getElementById('pantalla-carga');
  if (!pantalla) return;

  // La animación de la barra dura ~3.5s (1.5s delay + 2s animación).
  // Esperamos ese tiempo antes de ocultar la pantalla.
  setTimeout(() => {
    pantalla.classList.add('saliendo');

    // Tras la animación de salida (600ms), eliminamos del DOM.
    pantalla.addEventListener('animationend', () => {
      pantalla.remove();
      // Inicializar el resto de la app una vez que la carga termina.
      inicializarApp();
    }, { once: true });
  }, 3200);
}


/* ══════════════════════════════════════════════════════════
   2. CURSOR PERSONALIZADO (Punto)
   Solo en dispositivos con hover (no táctil).
══════════════════════════════════════════════════════════ */

function inicializarCursor() {
  const punto = document.getElementById('cursor-punto');
  if (!punto) return;

  // Si es dispositivo táctil o pantalla pequeña, no activar.
  if (window.matchMedia('(hover: none), (max-width: 820px)').matches) return;

  let rafId;

  document.addEventListener('mousemove', (e) => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      punto.style.left = `${e.clientX}px`;
      punto.style.top  = `${e.clientY}px`;
    });
  });

  // Agrandar el punto al pasar sobre elementos interactivos.
  const selectoresInteractivos = [
    'button', 'a', 'input', 'textarea',
    '.tarjeta-publicacion', '.tarjeta-perfil-panel',
    '.tarjeta-actividad-panel', '.tarjeta-sugeridos-panel',
    '.stat-perfil', '.item-ejercicio-sesion',
  ].join(', ');

  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(selectoresInteractivos)) {
      document.body.classList.add('sobre-interactivo');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(selectoresInteractivos)) {
      document.body.classList.remove('sobre-interactivo');
    }
  });
}


/* ══════════════════════════════════════════════════════════
   3. GESTIÓN DE TEMA (oscuro / claro)
══════════════════════════════════════════════════════════ */

function inicializarTema() {
  const html        = document.documentElement;
  const botonTema   = document.getElementById('boton-tema');
  const temaGuardado = localStorage.getItem(CONFIG.TEMA_KEY) || 'oscuro';

  // Aplicar tema guardado al arrancar.
  html.setAttribute('data-tema', temaGuardado);

  if (!botonTema) return;

  botonTema.addEventListener('click', () => {
    const temaActual = html.getAttribute('data-tema');
    const nuevoTema  = temaActual === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', nuevoTema);
    localStorage.setItem(CONFIG.TEMA_KEY, nuevoTema);
  });
}


/* ══════════════════════════════════════════════════════════
   4. ICONOS LUCIDE
══════════════════════════════════════════════════════════ */

function inicializarIconos() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}


/* ══════════════════════════════════════════════════════════
   5. NAVEGACIÓN — MARCAR ENLACE ACTIVO
══════════════════════════════════════════════════════════ */

function inicializarNavegacion() {
  // Manejar clics en ambas barras de navegación (sidebar y bottom nav).
  const todosLosEnlaces = document.querySelectorAll('.enlace-nav, .enlace-nav-movil');

  todosLosEnlaces.forEach((enlace) => {
    enlace.addEventListener('click', (e) => {
      // BACKEND: Aquí se integraría el router (SPA) para cargar la vista correcta.
      // Por ahora solo gestionamos los estados activos visualmente.
      const pagina = enlace.dataset.pagina;
      if (!pagina || pagina === 'nuevo') return; // El botón "nuevo" tiene su propio handler.

      // Quitar "activo" de todos los enlaces del mismo grupo.
      const grupo = enlace.closest('.lista-nav, .nav-movil');
      if (grupo) {
        grupo.querySelectorAll('.enlace-nav, .enlace-nav-movil').forEach(el => {
          el.classList.remove('activo');
          el.removeAttribute('aria-current');
        });
      }

      // Marcar el enlace clicado como activo.
      enlace.classList.add('activo');
      enlace.setAttribute('aria-current', 'page');
    });
  });
}


/* ══════════════════════════════════════════════════════════
   6. INTERACCIONES DEL FEED

   6a. Like / Me gusta
   BACKEND: Conectar con POST /feed/{id}/like
            El estado del like debe persistir en el servidor.
══════════════════════════════════════════════════════════ */

function manejarLike(boton) {
  const estaActivo   = boton.classList.contains('activo');
  const contadorEl   = boton.querySelector('.contador-accion');
  let   contadorNum  = parseInt(contadorEl?.textContent || '0', 10);

  if (estaActivo) {
    // Quitar like.
    boton.classList.remove('activo');
    boton.setAttribute('aria-pressed', 'false');
    contadorNum = Math.max(0, contadorNum - 1);
    // BACKEND: await fetch(`${CONFIG.BASE_URL}/feed/${id}/like`, { method: 'DELETE', headers: authHeaders() });
  } else {
    // Dar like.
    boton.classList.add('activo');
    boton.setAttribute('aria-pressed', 'true');
    contadorNum += 1;
    // BACKEND: await fetch(`${CONFIG.BASE_URL}/feed/${id}/like`, { method: 'POST', headers: authHeaders() });

    // Micro-animación del botón.
    boton.style.transform = 'scale(1.25)';
    setTimeout(() => { boton.style.transform = ''; }, 200);
  }

  if (contadorEl) contadorEl.textContent = contadorNum;
}


/* ──────────────────────────────────────────────────────────
   6b. VER MÁS EJERCICIOS
   BACKEND: Podría hacer fetch de todos los ejercicios de
            la sesión para renderizarlos dinámicamente.
────────────────────────────────────────────────────────── */

function manejarVerMasEjercicios(boton) {
  const tarjeta = boton.closest('.tarjeta-publicacion');
  if (!tarjeta) return;

  // En una integración real, se mostrarían los ejercicios ocultos.
  // Por ahora simplemente ocultamos el botón como placeholder.
  boton.style.opacity = '0.5';
  boton.textContent   = 'Cargando...';
  // BACKEND: const ejercicios = await fetch(`${CONFIG.BASE_URL}/sessions/${sesionId}/exercises`);
  //          Renderizar los ejercicios restantes y ocultar el botón.
  setTimeout(() => { boton.style.display = 'none'; }, 600);
}


/* ──────────────────────────────────────────────────────────
   6c. ENVIAR COMENTARIO
   BACKEND: POST /feed/{id}/comments con { texto: "..." }
────────────────────────────────────────────────────────── */

function manejarEnvioComentario(boton) {
  const seccion = boton.closest('.seccion-comentarios');
  if (!seccion) return;

  const input   = seccion.querySelector('.input-comentario');
  const texto   = input?.value.trim();
  if (!texto) return;

  // BACKEND: await fetch(`${CONFIG.BASE_URL}/feed/${idPublicacion}/comments`, {
  //   method: 'POST',
  //   headers: { ...authHeaders(), 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ texto }),
  // });

  // Limpiar el campo tras enviar.
  input.value = '';
  input.focus();

  // Feedback visual temporal.
  boton.textContent = '✓';
  setTimeout(() => { boton.textContent = 'Publicar'; }, 1200);
}


/* ──────────────────────────────────────────────────────────
   6d. SEGUIR / DEJAR DE SEGUIR usuario
   BACKEND: POST /users/{id}/follow o DELETE /users/{id}/follow
────────────────────────────────────────────────────────── */

function manejarSeguir(boton) {
  const estaSiguiendo = boton.classList.contains('siguiendo');

  if (estaSiguiendo) {
    boton.classList.remove('siguiendo');
    boton.textContent = 'Seguir';
    // BACKEND: await fetch(`${CONFIG.BASE_URL}/users/${userId}/follow`, { method: 'DELETE', headers: authHeaders() });
  } else {
    boton.classList.add('siguiendo');
    boton.textContent = 'Siguiendo';
    // BACKEND: await fetch(`${CONFIG.BASE_URL}/users/${userId}/follow`, { method: 'POST', headers: authHeaders() });
  }
}


/* ──────────────────────────────────────────────────────────
   Delegación de eventos del feed (un solo listener eficiente)
────────────────────────────────────────────────────────── */

function inicializarInteraccionesFeed() {
  document.addEventListener('click', (e) => {
    // Like
    const botonLike = e.target.closest('.accion-pub[aria-label="Me gusta"]');
    if (botonLike) { manejarLike(botonLike); return; }

    // Ver más ejercicios
    const botonVerMas = e.target.closest('.boton-ver-mas-ejercicios');
    if (botonVerMas) { manejarVerMasEjercicios(botonVerMas); return; }

    // Enviar comentario
    const botonComentario = e.target.closest('.boton-enviar-comentario');
    if (botonComentario) { manejarEnvioComentario(botonComentario); return; }

    // Seguir usuario
    const botonSeguir = e.target.closest('.boton-seguir');
    if (botonSeguir) { manejarSeguir(botonSeguir); return; }

    // Enter en campo de comentario
    const inputComentario = e.target.closest('.input-comentario');
    // (manejado por keydown abajo)
  });

  // Enter en campo de comentario = enviar.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.input-comentario')) {
      const boton = e.target.closest('.campo-comentario')
                            ?.querySelector('.boton-enviar-comentario');
      if (boton) manejarEnvioComentario(boton);
    }
  });
}


/* ══════════════════════════════════════════════════════════
   7. ESTADO VACÍO
   BACKEND: Llamar a mostrarEstadoVacio() si la API
            devuelve feed.length === 0 tras el primer fetch.
══════════════════════════════════════════════════════════ */

function mostrarEstadoVacio() {
  const lista   = document.getElementById('lista-publicaciones');
  const vacio   = document.getElementById('estado-vacio');
  if (!lista || !vacio) return;

  lista.classList.add('oculto');
  vacio.classList.remove('oculto');
  vacio.setAttribute('aria-hidden', 'false');
}

function ocultarEstadoVacio() {
  const lista   = document.getElementById('lista-publicaciones');
  const vacio   = document.getElementById('estado-vacio');
  if (!lista || !vacio) return;

  lista.classList.remove('oculto');
  vacio.classList.add('oculto');
  vacio.setAttribute('aria-hidden', 'true');
}


/* ══════════════════════════════════════════════════════════
   8. SCROLL INFINITO (Intersection Observer)
   BACKEND: Al detectar el sentinel, llamar a cargarMasPublicaciones().
══════════════════════════════════════════════════════════ */

let paginaActual   = 1;
let cargandoPagina = false;
let hayMasPaginas  = true; // BACKEND: Actualizar según respuesta de la API (ej. meta.hasNextPage)

function mostrarSpinnerCarga(visible) {
  const spinner = document.getElementById('cargando-mas');
  if (!spinner) return;
  spinner.classList.toggle('oculto', !visible);
}

/* BACKEND: Reemplazar esta función con el fetch real al endpoint del feed.
   GET /feed?page={paginaActual}&limit=10
   Headers: Authorization: Bearer {jwt}
*/
async function cargarMasPublicaciones() {
  if (cargandoPagina || !hayMasPaginas) return;
  cargandoPagina = true;
  mostrarSpinnerCarga(true);

  try {
    // BACKEND — Fetch real:
    // const res  = await fetch(`${CONFIG.BASE_URL}/feed?page=${paginaActual}&limit=10`, { headers: authHeaders() });
    // const data = await res.json();
    // data.items.forEach(pub => agregarTarjetaAlFeed(pub));
    // hayMasPaginas  = data.meta.hasNextPage;
    // paginaActual++;

    // Simulación: en producción, eliminar este bloque.
    await new Promise(r => setTimeout(r, 1000));
    // Simulamos que no hay más páginas tras la primera carga adicional.
    hayMasPaginas = false;

  } catch (error) {
    console.error('[APEX] Error al cargar más publicaciones:', error);
    // BACKEND: Mostrar un toast de error al usuario.
  } finally {
    cargandoPagina = false;
    mostrarSpinnerCarga(false);
  }
}

function inicializarScrollInfinito() {
  const sentinel = document.getElementById('sentinel-scroll');
  if (!sentinel) return;

  const observador = new IntersectionObserver((entradas) => {
    const entrada = entradas[0];
    if (entrada.isIntersecting && hayMasPaginas) {
      cargarMasPublicaciones();
    }
  }, {
    rootMargin: '200px', // Cargar un poco antes de llegar al final.
  });

  observador.observe(sentinel);
}


/* ══════════════════════════════════════════════════════════
   9. RENDER DINÁMICO DE TARJETA
   BACKEND: Usar esta función para insertar tarjetas desde la API.
   Parámetro `pub` = objeto de publicación del endpoint GET /feed.
══════════════════════════════════════════════════════════ */

function renderizarTarjeta(pub) {
  // BACKEND: Descomenta y adapta esta función cuando conectes la API.
  // const html = `
  //   <article class="tarjeta-publicacion" data-id="pub-${pub.id}">
  //     <header class="cabecera-publicacion">
  //       <a href="/perfil/${pub.usuario.handle}" class="enlace-autor">
  //         <div class="avatar-publicacion">${pub.usuario.inicial}</div>
  //       </a>
  //       <div class="meta-publicacion">
  //         <div class="fila-meta-superior">
  //           <a href="/perfil/${pub.usuario.handle}" class="nombre-publicacion">${pub.usuario.handle}</a>
  //         </div>
  //         <time class="fecha-publicacion" datetime="${pub.fecha}">${formatearFecha(pub.fecha)}</time>
  //       </div>
  //       <button class="boton-opciones-pub" aria-label="Opciones de publicación">
  //         <i data-lucide="more-horizontal"></i>
  //       </button>
  //     </header>
  //     <!-- ... resto del template ... -->
  //   </article>`;
  //
  // const lista = document.getElementById('lista-publicaciones');
  // lista.insertAdjacentHTML('beforeend', html);
  // lucide.createIcons(); // Re-inicializar íconos para los nuevos elementos.
}

/* BACKEND: Función auxiliar para formatear fechas de la API (ISO 8601). */
function formatearFecha(isoString) {
  return new Intl.DateTimeFormat('es-DO', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

/* BACKEND: Función auxiliar para construir las cabeceras de autenticación. */
function authHeaders() {
  const token = localStorage.getItem(CONFIG.JWT_KEY);
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}


/* ══════════════════════════════════════════════════════════
   10. INICIALIZACIÓN PRINCIPAL DE LA APP
   Se ejecuta después de que la pantalla de carga desaparece.
══════════════════════════════════════════════════════════ */

function inicializarApp() {
  inicializarIconos();         // Re-inicializar íconos tras la carga.
  inicializarNavegacion();
  inicializarInteraccionesFeed();
  inicializarScrollInfinito();

  // BACKEND: Aquí iría el fetch inicial del feed.
  // cargarMasPublicaciones();
  //
  // Si el usuario no tiene publicaciones:
  // if (data.items.length === 0) mostrarEstadoVacio();

  console.log('[APEX] App inicializada correctamente.');
}


/* ══════════════════════════════════════════════════════════
   ARRANQUE
   El cursor y el tema se inician inmediatamente (antes de
   la pantalla de carga) para evitar flashes.
══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos(); // Primera inicialización para la pantalla de carga.
  inicializarPantallaCarga();
});
