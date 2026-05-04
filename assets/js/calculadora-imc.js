/* ══════════════════════════════════════════════
   SUPABASE — Inicialización
══════════════════════════════════════════════ */
const db = window.supabaseClient;

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
    weight: peso,
    body_fat_percentage: parseFloat(document.getElementById('grasa').value) || null,
    imc: imcRedondeado,
    recorded_at: new Date().toISOString(),
    user_id: usuarioActual?.id ? null : null // se rellena en guardarMetrica()
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

  // Construir payload
  const payload = {
    user_id: usuarioActual.id,
    recorded_at: ultimoCalculo.recorded_at,
    weight: ultimoCalculo.weight,
    body_fat_percentage: ultimoCalculo.body_fat_percentage,
    imc: ultimoCalculo.imc
  };

  const { error } = await db
    .from('user_measurements')
    .insert(payload);

  // Guardar la altura en profiles
  await db
    .from('profiles')
    .update({ height: parseFloat(document.getElementById('altura').value) })
    .eq('id', usuarioActual.id);

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

  // Consulta principal: historial completo ordenado por fecha
  const { data: metricas, error } = await db
    .from('user_measurements')
    .select('recorded_at, weight, body_fat_percentage, imc')
    .eq('user_id', usuarioActual.id)
    .order('recorded_at', { ascending: false })
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
    const fecha = new Date(m.recorded_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Calcular categoría de nuevo porque ya no está en la DB
    const cat = m.imc ? obtenerCategoria(m.imc) : { categoria: '—', color: '#888' };
    const categoria = cat.categoria;
    const badgeClass = 'badge-' + categoria;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fecha}</td>
      <td><strong style="color:var(--texto)">${m.weight ?? '—'}</strong></td>
      <td>—</td>
      <td><strong style="color:var(--texto)">${m.imc ? parseFloat(m.imc).toFixed(1) : '—'}</strong></td>
      <td><span class="badge-categoria ${badgeClass}">${categoria.replace(/_/g, ' ')}</span></td>
      <td>${m.body_fat_percentage ? m.body_fat_percentage + '%' : '—'}</td>
      <td style="font-size:11px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">—</td>
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
