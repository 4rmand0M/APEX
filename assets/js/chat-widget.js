/**
 * chat-widget.js — Widget flotante de chat IA para APEX Fitness
 * ─────────────────────────────────────────────────────────────
 * Uso: agregar UNA sola línea al final del <body> de cualquier página:
 *
 *   <script src="../assets/js/chat-widget.js"></script>
 *
 * El widget se inyecta solo, lee knowledge.json y llama a Gemini.
 * No necesita ningún otro archivo, backend ni base de datos.
 * ─────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     CONFIGURACIÓN — ajusta estas rutas si es necesario
  ══════════════════════════════════════════════ */
  const KNOWLEDGE_URL = '/assets/data/knowledge.json'; // ruta absoluta para que funcione desde cualquier página
  const GEMINI_MODEL = 'gemini-2.5-flash';
  const SYS_PROMPT = 'Eres el asistente virtual de APEX Fitness. Ayudas con preguntas sobre entrenamiento, rutinas, nutrición y el uso de la plataforma. Responde siempre en español, de forma concisa y motivadora.';

  /* ══════════════════════════════════════════════
     ESTADO INTERNO DEL WIDGET
  ══════════════════════════════════════════════ */
  let knowledge = [];
  const _cfg = window.__APEX_CONFIG || {};
  let groqKey = localStorage.getItem('apex_groq_key') || _cfg.GROQ_API_KEY || '';
  let geminiKey = localStorage.getItem('apex_gkey') || _cfg.GEMINI_API_KEY || '';
  let estaAbierto = false;

  /* ══════════════════════════════════════════════
     ESTILOS — todo encapsulado aquí,
     no afecta al CSS de la página donde se inserte
  ══════════════════════════════════════════════ */
  const CSS = `
    /* ── Variables del tema APEX ── */
    #apex-chat-widget {
      --w-fondo:      #111111;
      --w-superficie: #1a1a1a;
      --w-borde:      #2a2a2a;
      --w-texto:      #F0F0F0;
      --w-sub:        #888888;
      --w-atenuado:   #505050;
      --w-acento:     #C8F400;
      --w-acento-rgb: 200,244,0;
      --w-boton-txt:  #080808;
      --w-error:      #FF6565;
      --w-radio:      12px;
      font-family: 'DM Sans', -apple-system, sans-serif;
    }

    /* ── Tema claro (detectado del html[data-tema]) ── */
    html[data-tema="claro"] #apex-chat-widget {
      --w-fondo:      #FFFFFF;
      --w-superficie: #F5F5F0;
      --w-borde:      #D6D6D0;
      --w-texto:      #0A0A0A;
      --w-sub:        #666660;
      --w-atenuado:   #9A9A94;
      --w-acento:     #0A0A0A;
      --w-acento-rgb: 10,10,10;
      --w-boton-txt:  #F0F0F0;
    }

    /* ── Botón flotante ── */
    #apex-chat-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #C8F400;
      border: none;
      cursor: pointer;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(200,244,0,0.35);
      transition: transform 0.2s, box-shadow 0.2s;
      outline: none;
    }
    html[data-tema="claro"] #apex-chat-btn {
      background: #0A0A0A;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    #apex-chat-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 28px rgba(200,244,0,0.45);
    }
    #apex-chat-btn svg { transition: transform 0.3s; }
    #apex-chat-btn.abierto svg { transform: rotate(45deg); }

    /* Burbuja con número de mensajes no leídos (futuro) */
    #apex-chat-badge {
      position: absolute;
      top: -2px; right: -2px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background: var(--w-error);
      font-size: 9px; font-weight: 700;
      color: #fff; display: none;
      align-items: center; justify-content: center;
    }

    /* ── Ventana del chat ── */
    #apex-chat-widget {
      position: fixed;
      bottom: 92px;
      right: 28px;
      width: 360px;
      height: 520px;
      background: var(--w-fondo);
      border: 1px solid var(--w-borde);
      border-radius: var(--w-radio);
      box-shadow: 0 16px 48px rgba(0,0,0,0.4);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      transform: scale(0.92) translateY(16px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    }
    #apex-chat-widget.visible {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    /* ── Header ── */
    #wchat-header {
      background: var(--w-superficie);
      border-bottom: 1px solid var(--w-borde);
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    #wchat-header-logo {
      width: 28px; height: 28px;
      background: var(--w-acento);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    #wchat-header-logo svg { color: var(--w-boton-txt); }
    .wchat-header-info { flex: 1; }
    .wchat-nombre {
      font-family: 'Bebas Neue', 'DM Sans', sans-serif;
      font-size: 15px; letter-spacing: 2px;
      color: var(--w-texto); line-height: 1;
    }
    .wchat-estado {
      font-size: 9px; color: var(--w-atenuado);
      letter-spacing: 1px; margin-top: 2px;
      display: flex; align-items: center; gap: 5px;
    }
    .wchat-estado-punto {
      width: 5px; height: 5px; border-radius: 50%;
      background: var(--w-atenuado); flex-shrink: 0;
    }
    .wchat-estado-punto.ok { background: var(--w-acento); }

    /* ── Mensajes ── */
    #wchat-mensajes {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: var(--w-borde) transparent;
    }
    #wchat-mensajes::-webkit-scrollbar { width: 3px; }
    #wchat-mensajes::-webkit-scrollbar-thumb { background: var(--w-borde); border-radius: 2px; }

    /* Pantalla vacía */
    .wchat-vacio {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; color: var(--w-atenuado); gap: 8px; padding: 20px;
    }
    .wchat-vacio-icono {
      font-family: 'Bebas Neue', sans-serif; font-size: 48px;
      color: transparent; -webkit-text-stroke: 1px var(--w-borde); line-height: 1;
    }
    .wchat-vacio-titulo {
      font-family: 'Bebas Neue', sans-serif; font-size: 16px;
      letter-spacing: 3px; color: var(--w-atenuado);
    }
    .wchat-vacio-desc { font-size: 10px; line-height: 1.7; max-width: 200px; }

    /* Burbujas */
    .wburbuja { display: flex; gap: 7px; align-items: flex-start; animation: waparecer .2s ease; }
    @keyframes waparecer { from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:translateY(0);} }
    .wburbuja.usuario { flex-direction: row-reverse; }
    .wavatar {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Bebas Neue', sans-serif; font-size: 8px; letter-spacing: 1px;
    }
    .wburbuja.usuario .wavatar { background: var(--w-acento); color: var(--w-boton-txt); }
    .wburbuja.bot     .wavatar { background: var(--w-superficie); color: var(--w-atenuado); border: 1px solid var(--w-borde); }
    .wburbuja-body { max-width: 78%; }
    .wburbuja-texto { padding: 8px 12px; font-size: 12px; line-height: 1.65; font-weight: 300; }
    .wburbuja.usuario .wburbuja-texto {
      background: var(--w-acento); color: var(--w-boton-txt); font-weight: 400;
      border-radius: 10px 10px 2px 10px;
    }
    .wburbuja.bot .wburbuja-texto {
      background: var(--w-superficie); color: var(--w-texto);
      border: 1px solid var(--w-borde); border-radius: 10px 10px 10px 2px;
    }
    .wburbuja-hora { font-size: 8px; color: var(--w-atenuado); margin-top: 3px; }
    .wburbuja.usuario .wburbuja-hora { text-align: right; }

    /* Pensando */
    .wpensando .wburbuja-texto { display: flex; align-items: center; gap: 4px; padding: 10px 14px; }
    .wdot { width: 4px; height: 4px; border-radius: 50%; background: var(--w-atenuado); animation: wdot 1.2s infinite; }
    .wdot:nth-child(2){animation-delay:.2s;} .wdot:nth-child(3){animation-delay:.4s;}
    @keyframes wdot{0%,80%,100%{transform:scale(1);opacity:.4;}40%{transform:scale(1.4);opacity:1;}}

    /* Pantalla de carga animada */
    .wchat-carga {
      position: absolute; inset: 0; z-index: 10;
      background: var(--w-fondo);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: opacity 0.4s ease, visibility 0.4s;
    }
    .wchat-carga.oculto { opacity: 0; visibility: hidden; pointer-events: none; }
    .wchat-carga-logo {
      width: 48px; height: 48px; margin-bottom: 20px;
    }
    .wchat-svg-trazar {
      stroke-dasharray: 200; stroke-dashoffset: 200;
      animation: wtrazar 1.8s ease-in-out infinite alternate;
    }
    @keyframes wtrazar {
      0% { stroke-dashoffset: 200; opacity: 0; }
      20% { opacity: 1; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
    .wchat-carga-barra {
      width: 120px; height: 2px; background: var(--w-borde); border-radius: 2px;
      overflow: hidden; position: relative;
    }
    .wchat-carga-progreso {
      position: absolute; top: 0; left: 0; height: 100%; width: 40%;
      background: var(--w-acento); border-radius: 2px;
      animation: wprogreso 1.5s ease-in-out infinite alternate;
    }
    @keyframes wprogreso {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }

    /* Error de Gemini dentro del chat */
    .wmsg-error { font-size: 11px; color: var(--w-error); padding: 8px 12px; background: rgba(255,101,101,.08); border: 1px solid var(--w-error); border-radius: 8px; }

    /* ── Entrada de texto ── */
    #wchat-entrada {
      display: flex; border-top: 1px solid var(--w-borde); flex-shrink: 0;
    }
    #wchat-campo {
      flex: 1; padding: 12px 14px;
      background: transparent; border: none;
      font-family: inherit; font-size: 12px; color: var(--w-texto);
      outline: none; resize: none; line-height: 1.5;
      min-height: 44px; max-height: 100px;
    }
    #wchat-campo::placeholder { color: var(--w-atenuado); }
    #wchat-btn-enviar {
      padding: 0 16px; background: var(--w-acento); color: var(--w-boton-txt);
      border: none; font-family: inherit; font-size: 9px;
      font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
      cursor: pointer; transition: opacity 0.14s; flex-shrink: 0;
    }
    #wchat-btn-enviar:hover { opacity: 0.85; }
    #wchat-btn-enviar:disabled { background: var(--w-borde); color: var(--w-atenuado); cursor: not-allowed; }

    /* ── Responsive móvil ── */
    @media (max-width: 480px) {
      #apex-chat-widget { width: calc(100vw - 24px); right: 12px; bottom: 80px; height: 70vh; }
      #apex-chat-btn    { right: 16px; bottom: 16px; }
    }
  `;

  /* ══════════════════════════════════════════════
     HTML DEL WIDGET
  ══════════════════════════════════════════════ */
  const HTML = `
    <!-- Botón flotante -->
    <button id="apex-chat-btn" title="Abrir asistente APEX" aria-label="Abrir chat">
      <div id="apex-chat-badge"></div>
      <!-- Ícono chat animado (se cambia a X cuando está abierto) -->
      <svg id="apex-icon-chat" width="22" height="22" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polygon class="wchat-svg-trazar" points="34,4 62,58 34,44 6,58" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      <svg id="apex-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080808" stroke-width="2.2" stroke-linecap="round" style="display:none">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>

    <!-- Ventana del chat -->
    <div id="apex-chat-widget" role="dialog" aria-label="Chat APEX">

      <!-- Pantalla de carga animada -->
      <div id="wchat-pantalla-carga" class="wchat-carga">
        <div class="wchat-carga-logo">
          <svg width="48" height="48" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon class="wchat-svg-trazar" points="34,4 62,58 34,44 6,58" fill="none" stroke="var(--w-acento)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
          </svg>
        </div>
        <div class="wchat-carga-barra"><div class="wchat-carga-progreso"></div></div>
      </div>

      <!-- Header -->
      <div id="wchat-header">
        <div id="wchat-header-logo">
          <svg width="14" height="14" viewBox="0 0 68 68" fill="none">
            <polygon points="34,4 62,58 34,44 6,58" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="wchat-header-info">
          <div class="wchat-nombre">APEX AI</div>
          <div class="wchat-estado">
            <div class="wchat-estado-punto" id="wchat-pt"></div>
            <span id="wchat-estado-txt">Iniciando…</span>
          </div>
        </div>
      </div>


      <!-- Área de mensajes -->
      <div id="wchat-mensajes">
        <div class="wchat-vacio" id="wchat-vacio">
          <div class="wchat-vacio-icono">AI</div>
          <div class="wchat-vacio-titulo">ASISTENTE APEX</div>
          <p class="wchat-vacio-desc">Hola, ¿en qué puedo ayudarte hoy?</p>
        </div>
      </div>

      <!-- Entrada -->
      <div id="wchat-entrada">
        <textarea id="wchat-campo" rows="1" placeholder="Escribe tu pregunta…"></textarea>
        <button id="wchat-btn-enviar" onclick="apexChatEnviar()">Enviar</button>
      </div>

    </div>
  `;

  /* ══════════════════════════════════════════════
     INYECTAR CSS Y HTML EN LA PÁGINA
  ══════════════════════════════════════════════ */
  function inyectar() {
    // CSS
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // HTML
    const wrapper = document.createElement('div');
    wrapper.innerHTML = HTML;
    document.body.appendChild(wrapper);


    // Listeners
    document.getElementById('apex-chat-btn').addEventListener('click', apexChatToggle);
    document.getElementById('wchat-campo').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); apexChatEnviar(); }
    });
    document.getElementById('wchat-campo').addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    document.addEventListener('click', (e) => {
      const widget = document.getElementById('apex-chat-widget');
      const btn = document.getElementById('apex-chat-btn');

      // Si el chat está abierto Y el clic NO fue dentro del widget Y NO fue en el botón...
      if (estaAbierto && !widget.contains(e.target) && !btn.contains(e.target)) {
        apexChatToggle();
      }
    });

    // Cargar knowledge y actualizar estado
    cargarKnowledge();
  }

  /* ══════════════════════════════════════════════
     CARGAR KNOWLEDGE.JSON
     Ruta absoluta para que funcione desde cualquier
     página del proyecto, sin importar el nivel de carpeta
  ══════════════════════════════════════════════ */
  async function cargarKnowledge() {
    setEstado(false, 'Cargando conocimiento…');
    try {
      const res = await fetch(KNOWLEDGE_URL);
      if (!res.ok) throw new Error();
      knowledge = await res.json();
      setEstado(true, `Listo · ${knowledge.length > 0 ? knowledge.length + ' temas' : 'conocimiento general'}`);
    } catch {
      knowledge = [];
      setEstado(true, 'Listo · conocimiento general');
    }
  }

  /* ══════════════════════════════════════════════
     ABRIR / CERRAR EL WIDGET
  ══════════════════════════════════════════════ */
  function apexChatToggle() {
    estaAbierto = !estaAbierto;
    const widget = document.getElementById('apex-chat-widget');
    const btn = document.getElementById('apex-chat-btn');
    const iconChat = document.getElementById('apex-icon-chat');
    const iconClose = document.getElementById('apex-icon-close');
    const carga = document.getElementById('wchat-pantalla-carga');

    if (estaAbierto) {
      widget.classList.add('visible');
      btn.classList.add('abierto');
      iconChat.style.display = 'none';
      iconClose.style.display = 'block';

      // Mostrar pantalla de carga brevemente
      carga.classList.remove('oculto');
      setTimeout(() => {
        carga.classList.add('oculto');
        setTimeout(() => document.getElementById('wchat-campo').focus(), 100);
      }, 1200); // 1.2 segundos de animación

    } else {
      widget.classList.remove('visible');
      btn.classList.remove('abierto');
      iconChat.style.display = 'block';
      iconClose.style.display = 'none';
    }
  }

  // Exponer globalmente para que el HTML inline lo llame
  window.apexChatToggle = apexChatToggle;

  /* ══════════════════════════════════════════════
     BUSCAR CONTEXTO EN KNOWLEDGE.JSON
  ══════════════════════════════════════════════ */
  function buscarContexto(pregunta) {
    if (!knowledge.length) return [];
    const palabras = pregunta.toLowerCase().split(/\s+/).filter(p => p.length > 2);
    return knowledge
      .map(item => {
        const base = (item.keywords || []).join(' ').toLowerCase();
        const pts = palabras.reduce((sum, p) => sum + (base.includes(p) ? 1 : 0), 0);
        return { content: item.content, pts };
      })
      .filter(x => x.pts > 0)
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3)
      .map(x => x.content);
  }

  /* ══════════════════════════════════════════════
     CONSTRUIR PROMPT
  ══════════════════════════════════════════════ */
  function construirPrompt(pregunta, contexto) {
    const ctx = contexto.length
      ? `\n\n--- INFORMACIÓN DE APEX FITNESS ---\n${contexto.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n--- FIN ---\n\n`
      : '\n\n';
    return `${SYS_PROMPT}${ctx}Usuario: ${pregunta}\nAsistente:`;
  }

  /* ══════════════════════════════════════════════
     LLAMAR A GEMINI API  (proveedor primario)
  ══════════════════════════════════════════════ */
  async function _llamarGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512, topP: 0.9 }
      })
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) throw new Error('Gemini sin respuesta');
    return texto.trim();
  }

  /* ══════════════════════════════════════════════
     LLAMAR A GROQ API  (fallback)
     Modelo: llama3-8b-8192 (plan gratuito disponible)
     Obtén tu key gratis en: console.groq.com
  ══════════════════════════════════════════════ */
  const GROQ_MODEL = 'llama-3.1-8b-instant';
  let proveedorActivo = 'Gemini';

  async function _llamarGroq(prompt) {
    if (!groqKey) throw new Error('No hay API key de Groq configurada.');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYS_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const texto = data?.choices?.[0]?.message?.content;
    if (!texto) throw new Error('Groq sin respuesta');
    return texto.trim();
  }

  /* ══════════════════════════════════════════════
     PIPELINE CON FALLBACK AUTOMÁTICO Gemini → Groq
  ══════════════════════════════════════════════ */
  async function llamarIA(prompt) {
    // ── Intento 1: Gemini ──
    try {
      const r = await _llamarGemini(prompt);
      if (proveedorActivo !== 'Gemini') {
        proveedorActivo = 'Gemini';
        setEstado(true, `Listo · Gemini`);
      }
      return r;
    } catch (errGemini) {
      console.warn('[APEX Chat] Gemini falló, cambiando a Groq…', errGemini.message);
    }

    // ── Intento 2: Groq (fallback) ──
    try {
      const r = await _llamarGroq(prompt);
      if (proveedorActivo !== 'Groq') {
        proveedorActivo = 'Groq';
        setEstado(true, `Listo · Groq (fallback)`);
      }
      return r;
    } catch (errGroq) {
      console.error('[APEX Chat] Groq también falló.', errGroq.message);
      throw new Error('Ambas APIs no disponibles. Intenta de nuevo más tarde.');
    }
  }

  /* ══════════════════════════════════════════════
     ENVIAR MENSAJE — PIPELINE PRINCIPAL
  ══════════════════════════════════════════════ */
  async function apexChatEnviar() {
    const campo = document.getElementById('wchat-campo');
    const pregunta = campo.value.trim();
    if (!pregunta) return;

    if (!geminiKey && !groqKey) {
      addMsgError('Error: No hay configurada ninguna API key.');
      return;
    }

    // Limpiar campo y bloquear botón
    campo.value = '';
    campo.style.height = 'auto';
    document.getElementById('wchat-btn-enviar').disabled = true;

    // Ocultar pantalla de bienvenida al primer mensaje
    document.getElementById('wchat-vacio')?.remove();

    // Mostrar mensaje del usuario
    addMsg(pregunta, 'usuario');

    // Indicador "pensando"
    const idPens = addPensando();

    try {
      const contexto = buscarContexto(pregunta);   // busca en knowledge.json
      const prompt = construirPrompt(pregunta, contexto);
      const respuesta = await llamarIA(prompt);     // ← fallback Gemini → Groq
      quitarPensando(idPens);
      addMsg(respuesta, 'bot');
    } catch (e) {
      quitarPensando(idPens);
      addMsgError(e.message);
    } finally {
      document.getElementById('wchat-btn-enviar').disabled = false;
      campo.focus();
    }
  }
  window.apexChatEnviar = apexChatEnviar;

  /* ══════════════════════════════════════════════
     HELPERS DE UI
  ══════════════════════════════════════════════ */
  function addMsg(texto, tipo) {
    const area = document.getElementById('wchat-mensajes');
    const hora = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    const div = document.createElement('div');
    div.className = `wburbuja ${tipo}`;
    div.innerHTML = `
      <div class="wavatar">${tipo === 'usuario' ? 'TÚ' : 'AI'}</div>
      <div class="wburbuja-body">
        <div class="wburbuja-texto">${texto.replace(/\n/g, '<br>')}</div>
        <div class="wburbuja-hora">${hora}</div>
      </div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function addMsgError(texto) {
    const area = document.getElementById('wchat-mensajes');
    const div = document.createElement('div');
    div.className = 'wmsg-error';
    div.innerHTML = `⚠ ${texto}`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function addPensando() {
    const area = document.getElementById('wchat-mensajes');
    const id = 'wp' + Date.now();
    const div = document.createElement('div');
    div.id = id; div.className = 'wburbuja bot wpensando';
    div.innerHTML = `<div class="wavatar">AI</div><div class="wburbuja-body"><div class="wburbuja-texto"><div class="wdot"></div><div class="wdot"></div><div class="wdot"></div></div></div>`;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
    return id;
  }

  function quitarPensando(id) { document.getElementById(id)?.remove(); }

  function setEstado(ok, texto) {
    const pt = document.getElementById('wchat-pt');
    const lb = document.getElementById('wchat-estado-txt');
    if (pt) pt.className = `wchat-estado-punto ${ok ? 'ok' : ''}`;
    if (lb) lb.textContent = texto;
  }

  /* ══════════════════════════════════════════════
     ARRANCAR cuando el DOM esté listo
  ══════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectar);
  } else {
    inyectar();
  }

})();
