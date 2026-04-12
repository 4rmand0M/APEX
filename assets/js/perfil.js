/* ============================================================
   APEX FITNESS — Perfil (perfil.js)
   Cursor, tema, íconos y lógica de la página de perfil.
============================================================ */
'use strict';

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

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  inicializarTema();
  inicializarCursor();
  inicializarIconos();
  console.log('[APEX] Perfil inicializado.');
});
