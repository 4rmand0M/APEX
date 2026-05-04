/* ============================================================
   APEX FITNESS — Perfil (perfil.js)
   Conectado al backend Supabase
============================================================ */
'use strict';

const db = window.supabaseClient;

/* ── CURSOR ── */
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

/* ── TEMA ── */
function inicializarTema() {
  const html = document.documentElement;
  const btn  = document.getElementById('boton-tema');
  html.setAttribute('data-tema', localStorage.getItem('apex_tema') || 'oscuro');
  btn?.addEventListener('click', () => {
    const nuevo = html.getAttribute('data-tema') === 'oscuro' ? 'claro' : 'oscuro';
    html.setAttribute('data-tema', nuevo);
    localStorage.setItem('apex_tema', nuevo);
  });
}

/* ── ÍCONOS ── */
function inicializarIconos() {
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* ── BACKEND ── */
const MESES_PERFIL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

async function cargarDatosPerfil() {
  const user = await window.ApexAuth.requireAuth();
  if (!user) return;

  // Cargar Perfil
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error cargando perfil:', profileError);
    return;
  }

  if (profile) {
    perfilCargado = profile; // guardar referencia para el drawer
    // Info principal
    const nombreCompleto = profile.full_name || 'Usuario';
    const iniciales = nombreCompleto.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    document.getElementById('perfil-nombre').textContent = nombreCompleto;
    document.getElementById('perfil-handle').textContent = '@' + (profile.username || 'usuario');
    document.getElementById('perfil-avatar-iniciales').textContent = iniciales;

    // Info de contacto
    document.getElementById('info-nombre').textContent = nombreCompleto;
    document.getElementById('info-email').textContent = user.email;

    // Teléfono
    document.getElementById('info-telefono').textContent = profile.phone || '—';

    // Fecha de nacimiento
    if (profile.date_of_birth) {
      const d = new Date(profile.date_of_birth + 'T12:00:00');
      document.getElementById('info-nacimiento').textContent = `${d.getDate()} ${MESES_PERFIL[d.getMonth()]} ${d.getFullYear()}`;
    }

    // Miembro desde
    const createdAt = new Date(profile.created_at);
    const miembroDesde = `${MESES_PERFIL[createdAt.getMonth()]} ${createdAt.getFullYear()}`;
    const elMiembro = document.querySelector('.perfil-fila-valor[id]')?.closest('.perfil-seccion-body');
    // Actualizar "Miembro desde" en la sección Cuenta
    document.querySelectorAll('.perfil-fila-valor').forEach(el => {
      if (el.textContent === 'Dic 2025') el.textContent = miembroDesde;
    });
  }

  // Cargar Medidas más recientes
  const { data: measurements } = await db
    .from('user_measurements')
    .select('*')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (measurements && measurements.length > 0) {
    const m = measurements[0];
    document.getElementById('medida-peso').textContent = m.weight ? m.weight + ' kg' : '—';
    document.getElementById('medida-grasa').textContent = m.body_fat_percentage ? m.body_fat_percentage + '%' : '—';
    document.getElementById('medida-imc').textContent = m.imc ? parseFloat(m.imc).toFixed(1) : '—';
  }

  // Cargar altura desde el perfil
  if (profile && profile.height) {
    document.getElementById('medida-altura').textContent = profile.height + ' cm';
  }

  // ── STATS DINÁMICOS ──
  await cargarStatsPerfil(user.id);
}

async function cargarStatsPerfil(userId) {
  // Total sesiones
  const { data: sesiones } = await db
    .from('workout_sessions')
    .select('id, start_time')
    .eq('user_id', userId);

  const totalEntrenos = sesiones?.length || 0;

  // Total PRs
  const { count: totalPRs } = await db
    .from('workout_logs')
    .select('id', { count: 'exact', head: true })
    .eq('is_pr', true)
    .in('session_id', (sesiones || []).map(s => s.id));

  // Racha actual
  let rachaActual = 0;
  if (sesiones && sesiones.length > 0) {
    const diasUnicos = [...new Set(sesiones.map(s => s.start_time.slice(0, 10)))].sort().reverse();
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
  }

  // Meses activo
  const mesesActivo = new Set();
  (sesiones || []).forEach(s => {
    const d = new Date(s.start_time);
    mesesActivo.add(`${d.getFullYear()}-${d.getMonth()}`);
  });

  // Actualizar los 4 stats del hero
  const statsEls = document.querySelectorAll('.perfil-stat-valor');
  if (statsEls[0]) statsEls[0].textContent = totalEntrenos;
  if (statsEls[1]) statsEls[1].textContent = totalPRs || 0;
  if (statsEls[2]) statsEls[2].textContent = rachaActual;
  if (statsEls[3]) statsEls[3].textContent = mesesActivo.size;
}

/* ══════════════════════════════════════════════════════════
   DRAWER — EDITAR PERFIL
══════════════════════════════════════════════════════════ */
let perfilCargado = null; // referencia al profile cargado

function abrirDrawerEditar() {
  const drawer  = document.getElementById('perfil-drawer');
  const overlay = document.getElementById('perfil-overlay');
  if (!drawer || !overlay) return;

  // Poblar campos con datos actuales
  if (perfilCargado) {
    document.getElementById('edit-nombre').value    = perfilCargado.full_name || '';
    document.getElementById('edit-username').value   = perfilCargado.username || '';
    document.getElementById('edit-telefono').value   = perfilCargado.phone || '';
    document.getElementById('edit-nacimiento').value = perfilCargado.date_of_birth || '';
    document.getElementById('edit-altura').value     = perfilCargado.height || '';
    document.getElementById('edit-peso').value       = perfilCargado.weight || '';
    document.getElementById('edit-objetivo').value   = perfilCargado.fitness_goal || '';
  }

  // Mostrar con animación
  drawer.classList.remove('oculto');
  overlay.classList.remove('oculto');
  requestAnimationFrame(() => {
    drawer.classList.add('abierto');
    overlay.classList.add('abierto');
  });

  lucide.createIcons();
}

function cerrarDrawerEditar() {
  const drawer  = document.getElementById('perfil-drawer');
  const overlay = document.getElementById('perfil-overlay');
  if (!drawer) return;

  drawer.classList.remove('abierto');
  overlay?.classList.remove('abierto');

  setTimeout(() => {
    drawer.classList.add('oculto');
    overlay?.classList.add('oculto');
  }, 320);
}

async function guardarPerfil() {
  const user = await window.ApexAuth.getUser();
  if (!user) return;

  const username      = document.getElementById('edit-username').value.trim();
  const phone         = document.getElementById('edit-telefono').value.trim();
  const date_of_birth = document.getElementById('edit-nacimiento').value || null;
  const height        = parseFloat(document.getElementById('edit-altura').value) || null;
  const weight        = parseFloat(document.getElementById('edit-peso').value) || null;
  const fitness_goal  = document.getElementById('edit-objetivo').value || null;

  // Calcular IMC si hay peso y altura
  let imc = null;
  if (weight && height) {
    const hMetros = height / 100;
    imc = parseFloat((weight / (hMetros * hMetros)).toFixed(1));
  }

  const { error } = await db
    .from('profiles')
    .update({
      username,
      phone,
      date_of_birth,
      height,
      weight,
      imc,
      fitness_goal,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error guardando perfil:', error);
    alert('Error al guardar: ' + error.message);
    return;
  }

  cerrarDrawerEditar();

  // Recargar datos en la página
  await cargarDatosPerfil();
  lucide.createIcons();
}

function inicializarEventos() {
  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await window.ApexAuth.signOut();
  });

  document.getElementById('btn-cerrar-sesion')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await window.ApexAuth.signOut();
  });

  // Drawer Editar
  document.getElementById('btn-editar-perfil')?.addEventListener('click', abrirDrawerEditar);
  document.getElementById('perfil-drawer-cerrar')?.addEventListener('click', cerrarDrawerEditar);
  document.getElementById('perfil-overlay')?.addEventListener('click', cerrarDrawerEditar);
  document.getElementById('perfil-drawer-guardar')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await guardarPerfil();
  });
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  inicializarEventos();
  cargarDatosPerfil();
  console.log('[APEX] Perfil inicializado.');
});
