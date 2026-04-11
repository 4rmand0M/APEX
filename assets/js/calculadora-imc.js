/* ══════════════════════════════════════════════
   SUPABASE — Inicialización
══════════════════════════════════════════════ */
const _cfg = window.__APEX_CONFIG || {};
const SUPABASE_URL = _cfg.SUPABASE_URL;
const SUPABASE_ANON = _cfg.SUPABASE_ANON;
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ══════════════════════════════════════════════
   ESTADO GLOBAL
══════════════════════════════════════════════ */
let usuarioActual = null;
let ultimoCalculo = null; // Guarda el último cálculo para poder persistirlo

/* ══════════════════════════════════════════════
   AUTH — Verificar sesión al cargar
══════════════════════════════════════════════ */
async function verificarSesion() {
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    usuarioActual = session.user;
    cargarHistorial();
  } else {
    // Sin sesión: mostrar advertencia y cargar historial vacío
    document.getElementById('error-auth').classList.add('visible');
    mostrarHistorialVacio();
  }
}

/* ══════════════════════════════════════════════
   CÁLCULO DE IMC (lógica pura, sin Supabase)
══════════════════════════════════════════════ */
function calcularIMC() {
  const peso = parseFloat(document.getElementById('peso').value);
  const altura = parseFloat(document.getElementById('altura').value);

  // Validación
  if (!peso || !altura || peso <= 0 || altura <= 0) {
    mostrarError('Ingresa peso y altura válidos.');
    return;
  }
  if (peso < 20 || peso > 300) { mostrarError('Peso fuera de rango (20-300 kg).'); return; }
  if (altura < 100 || altura > 250) { mostrarError('Altura fuera de rango (100-250 cm).'); return; }

  // Calcular IMC
  const alturaM = altura / 100;
  const imc = peso / (alturaM * alturaM);
  const imcRedondeado = Math.round(imc * 100) / 100;

  // Categoría según tabla de la DB
  const { categoria, color } = obtenerCategoria(imcRedondeado);

  // Peso ideal (fórmula de Lorentz)
  const sexo = 'neutro'; // Sin campo de sexo por ahora
  const pesoIdeal = calcularPesoIdeal(altura);
  const diferencia = Math.round((peso - pesoIdeal) * 10) / 10;

  // Posición en la barra visual (rango: 16–40 → 0%–100%)
  const posicion = Math.min(100, Math.max(0, ((imcRedondeado - 16) / (40 - 16)) * 100));

  // Actualizar UI
  document.getElementById('estado-vacio').style.display = 'none';
  document.getElementById('resultado-contenido').style.display = 'block';

  document.getElementById('imc-valor').textContent = imcRedondeado.toFixed(1);
  document.getElementById('imc-valor').style.color = color;
  document.getElementById('imc-categoria').textContent = categoria.replace(/_/g, ' ').toUpperCase();
  document.getElementById('imc-categoria').style.color = color;
  document.getElementById('imc-indicador').style.left = posicion + '%';

  document.getElementById('res-peso').textContent = peso;
  document.getElementById('res-altura').textContent = altura;
  document.getElementById('res-peso-ideal').textContent = pesoIdeal.toFixed(1);
  document.getElementById('res-diff').textContent = (diferencia >= 0 ? '+' : '') + diferencia;

  // Habilitar botón guardar solo si hay sesión
  if (usuarioActual) {
    document.getElementById('btn-guardar').disabled = false;
  }

  // Guardar estado para persistencia posterior
  ultimoCalculo = {
    peso_kg: peso,
    altura_cm: altura,
    categoria_imc: categoria, // El trigger de la DB lo recalcula, pero lo enviamos igual
    porcentaje_grasa: parseFloat(document.getElementById('grasa').value) || null,
    cintura_cm: parseFloat(document.getElementById('cintura').value) || null,
    notas: document.getElementById('notas').value.trim() || null,
    fecha_medicion: new Date().toISOString().split('T')[0],
    usuario_id: usuarioActual?.id ? null : null // se rellena en guardarMetrica()
  };
}

/* Tabla de categorías — espejo exacto de los ENUMs de la DB */
function obtenerCategoria(imc) {
  if (imc < 18.5) return { categoria: 'bajo_peso', color: '#74C0FC' };
  if (imc < 25.0) return { categoria: 'normal', color: '#C8F400' };
  if (imc < 30.0) return { categoria: 'sobrepeso', color: '#FFA94D' };
  if (imc < 35.0) return { categoria: 'obesidad_i', color: '#FF8C42' };
  if (imc < 40.0) return { categoria: 'obesidad_ii', color: '#FF6565' };
  return { categoria: 'obesidad_iii', color: '#C0392B' };
}

/* Peso ideal — Fórmula de Lorentz (sin sesgo de género) */
function calcularPesoIdeal(alturaCm) {
  // Fórmula neutra: (altura - 100) - ((altura - 150) / 4)
  return Math.round(((alturaCm - 100) - ((alturaCm - 150) / 4)) * 10) / 10;
}

/* ══════════════════════════════════════════════
   SUPABASE — Guardar métrica
   Tabla: metricas_fisicas
   La columna `imc` es GENERATED ALWAYS (la DB la calcula)
   La columna `categoria_imc` la setea el trigger fn_actualizar_categoria_imc()
══════════════════════════════════════════════ */
async function guardarMetrica() {
  if (!usuarioActual || !ultimoCalculo) return;

  const btn = document.getElementById('btn-guardar');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  // Obtener el ID interno del usuario (tabla usuarios, no auth.users)
  // La relación es: auth.users.id == usuarios.uuid
  const { data: usuarioDb, error: errorUser } = await db
    .from('usuarios')
    .select('id')
    .eq('uuid', usuarioActual.id)
    .single();

  if (errorUser || !usuarioDb) {
    mostrarError('No se encontró tu perfil en la base de datos.');
    btn.disabled = false;
    btn.textContent = 'Guardar en historial';
    return;
  }

  // Construir payload — NO incluir `imc` porque es GENERATED ALWAYS
  const payload = {
    usuario_id: usuarioDb.id,
    fecha_medicion: ultimoCalculo.fecha_medicion,
    peso_kg: ultimoCalculo.peso_kg,
    altura_cm: ultimoCalculo.altura_cm,
    // categoria_imc: el trigger fn_actualizar_categoria_imc la pone automáticamente
    porcentaje_grasa: ultimoCalculo.porcentaje_grasa,
    cintura_cm: ultimoCalculo.cintura_cm,
    notas: ultimoCalculo.notas
  };

  const { error } = await db
    .from('metricas_fisicas')
    .insert(payload);

  btn.textContent = 'Guardar en historial';
  btn.disabled = false;

  if (error) {
    mostrarError('Error al guardar: ' + error.message);
    return;
  }

  // Éxito: mostrar notificación y recargar historial
  mostrarNotificacion();
  cargarHistorial();
}

/* ══════════════════════════════════════════════
   SUPABASE — Cargar historial del usuario
   Usa la vista v_ultima_metrica para el resumen
   y metricas_fisicas para el historial completo
══════════════════════════════════════════════ */
async function cargarHistorial() {
  if (!usuarioActual) return;

  document.getElementById('historial-cargando').style.display = 'block';
  document.getElementById('historial-contenido').style.display = 'none';
  document.getElementById('historial-vacio').style.display = 'none';
  document.getElementById('historial-error').classList.remove('visible');

  // Obtener id interno del usuario
  const { data: usuarioDb, error: errorUser } = await db
    .from('usuarios')
    .select('id')
    .eq('uuid', usuarioActual.id)
    .single();

  if (errorUser || !usuarioDb) {
    document.getElementById('historial-cargando').style.display = 'none';
    document.getElementById('historial-error').classList.add('visible');
    return;
  }

  // Consulta principal: historial completo ordenado por fecha
  const { data: metricas, error } = await db
    .from('metricas_fisicas')
    .select('fecha_medicion, peso_kg, altura_cm, imc, categoria_imc, porcentaje_grasa, cintura_cm, notas')
    .eq('usuario_id', usuarioDb.id)
    .order('fecha_medicion', { ascending: false })
    .limit(50); // Máximo 50 registros en el historial

  document.getElementById('historial-cargando').style.display = 'none';

  if (error) {
    document.getElementById('historial-error').classList.add('visible');
    return;
  }

  if (!metricas || metricas.length === 0) {
    mostrarHistorialVacio();
    return;
  }

  // Renderizar tabla
  renderizarHistorial(metricas);
}

function renderizarHistorial(metricas) {
  document.getElementById('historial-count').textContent = metricas.length + ' registros';
  document.getElementById('historial-contenido').style.display = 'block';
  document.getElementById('historial-vacio').style.display = 'none';

  const tbody = document.getElementById('historial-tbody');
  tbody.innerHTML = '';

  metricas.forEach(m => {
    const fecha = new Date(m.fecha_medicion + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
    const categoria = m.categoria_imc || '—';
    const badgeClass = 'badge-' + categoria;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fecha}</td>
      <td><strong style="color:var(--texto)">${m.peso_kg ?? '—'}</strong></td>
      <td>${m.altura_cm ?? '—'}</td>
      <td><strong style="color:var(--texto)">${m.imc ? parseFloat(m.imc).toFixed(1) : '—'}</strong></td>
      <td><span class="badge-categoria ${badgeClass}">${categoria.replace(/_/g, ' ')}</span></td>
      <td>${m.porcentaje_grasa ? m.porcentaje_grasa + '%' : '—'}</td>
      <td style="font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.notas ?? '—'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function mostrarHistorialVacio() {
  document.getElementById('historial-cargando').style.display = 'none';
  document.getElementById('historial-contenido').style.display = 'none';
  document.getElementById('historial-vacio').style.display = 'flex';
  document.getElementById('historial-count').textContent = '0 registros';
}

/* ══════════════════════════════════════════════
   UTILIDADES UI
══════════════════════════════════════════════ */
function mostrarError(mensaje) {
  const el = document.getElementById('error-auth');
  el.textContent = '⚠ ' + mensaje;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}

function mostrarNotificacion() {
  const el = document.getElementById('notif');
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 3000);
}

/* ══════════════════════════════════════════════
   TEMA
══════════════════════════════════════════════ */
var modoOscuro = true;
function alternarTema() {
  modoOscuro = !modoOscuro;
  document.documentElement.setAttribute('data-tema', modoOscuro ? 'oscuro' : 'claro');
  document.getElementById('icono-luna').style.display = modoOscuro ? 'block' : 'none';
  document.getElementById('icono-sol').style.display = modoOscuro ? 'none' : 'block';
}

/* ══════════════════════════════════════════════
   CURSOR
══════════════════════════════════════════════ */
(function () {
  var p = document.getElementById('cursor-punto');
  document.addEventListener('mousemove', e => { p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px'; });
  var sel = 'button, a, input';
  document.addEventListener('mouseover', e => { if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo'); });
  document.addEventListener('mouseout', e => { if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo'); });
})();

/* ══════════════════════════════════════════════
   ENTER en inputs → calcular
══════════════════════════════════════════════ */
['peso', 'altura', 'grasa', 'cintura'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') calcularIMC();
  });
});

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
verificarSesion();
