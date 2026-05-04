/* ============================================================
   APEX FITNESS — supabase-client.js
   Cliente centralizado de Supabase
============================================================ */

'use strict';

const _cfg = window.__APEX_CONFIG || {};
const SUPABASE_URL = _cfg.SUPABASE_URL;
const SUPABASE_ANON = _cfg.SUPABASE_ANON;

// Inicializar cliente
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Utilidades comunes
window.ApexAuth = {
  /**
   * Obtiene la sesión actual
   * @returns {Promise<Object|null>} Session object or null
   */
  getSession: async function() {
    const { data: { session }, error } = await window.supabaseClient.auth.getSession();
    if (error) {
      console.error('[APEX] Error getting session:', error);
      return null;
    }
    return session;
  },

  /**
   * Obtiene el usuario actual
   * @returns {Promise<Object|null>} User object or null
   */
  getUser: async function() {
    const session = await this.getSession();
    return session ? session.user : null;
  },

  /**
   * Verifica si hay un usuario autenticado. Si no lo hay, redirige al login.
   * @param {string} redirectUrl - Opcional. URL de redirección tras login.
   */
  requireAuth: async function(redirectUrl = '') {
    const user = await this.getUser();
    if (!user) {
      let url = '../pages/login.html';
      if (redirectUrl) url += '?redirect=' + encodeURIComponent(redirectUrl);
      window.location.href = url;
      return null;
    }
    return user;
  },

  /**
   * Cierra la sesión
   */
  signOut: async function() {
    await window.supabaseClient.auth.signOut();
    window.location.href = '../pages/login.html';
  }
};
