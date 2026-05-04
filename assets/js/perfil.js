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
    // Info principal
    const nombreCompleto = profile.full_name || 'Usuario';
    const iniciales = nombreCompleto.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    document.getElementById('perfil-nombre').textContent = nombreCompleto;
    document.getElementById('perfil-handle').textContent = '@' + (profile.username || 'usuario');
    document.getElementById('perfil-bio').textContent = profile.bio || 'Sin biografía';
    document.getElementById('perfil-avatar-iniciales').textContent = iniciales;

    // Info de contacto
    document.getElementById('info-nombre').textContent = nombreCompleto;
    document.getElementById('info-email').textContent = user.email;
    // La BD actual de profiles no tiene location, DOB, etc., así que dejamos guiones si no hay
  }

  // Cargar Medidas más recientes
  const { data: measurements, error: measurementsError } = await db
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
}

function inicializarEventos() {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.ApexAuth.signOut();
    });
  }

  const btnCerrarSesionSecundario = document.getElementById('btn-cerrar-sesion');
  if (btnCerrarSesionSecundario) {
    btnCerrarSesionSecundario.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.ApexAuth.signOut();
    });
  }
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
