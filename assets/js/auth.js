/* ============================================================
   APEX FITNESS — auth.js
   Supabase Auth integrado (HTML/JS puro, sin backend)
============================================================ */

/* ─── SUPABASE — INICIALIZACIÓN ────────────────────────── */
const SUPABASE_URL  = 'https://lvxsnyycqubnnwaxlgzx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eHNueXljcXVibm53YXhsZ3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzU1NjAsImV4cCI6MjA4ODA1MTU2MH0.p67j4YxMVXjlVTuqfpVKsuqaL9sWB6D6zlHRZ3WBFYk';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

const ROL_ID = { entrenador: 2, monitor: 2, alumno: 1 };

/* ─── 1. PANTALLA DE CARGA ──────────────────────────────── */
(function iniciarCargador() {
  var TIEMPO_CARGA = 3700;
  window.addEventListener('load', function () {
    setTimeout(function () {
      var pantalla = document.getElementById('pantalla-carga');
      var app      = document.getElementById('app');
      pantalla.classList.add('saliendo');
      setTimeout(function () {
        pantalla.style.display = 'none';
        app.classList.add('visible');
      }, 650);
    }, TIEMPO_CARGA);
  });
})();

/* ─── 2. CONTROL DE TEMA ────────────────────────────────── */
var modoOscuro = true;
function alternarTema() {
  modoOscuro = !modoOscuro;
  document.documentElement.setAttribute('data-tema', modoOscuro ? 'oscuro' : 'claro');
  document.getElementById('icono-luna').style.display = modoOscuro ? 'block' : 'none';
  document.getElementById('icono-sol').style.display  = modoOscuro ? 'none'  : 'block';
}

/* ─── 3. CURSOR PERSONALIZADO ───────────────────────────── */
(function iniciarCursor() {
  var punto = document.getElementById('cursor-punto');
  document.addEventListener('mousemove', function (e) {
    punto.style.left = e.clientX + 'px';
    punto.style.top  = e.clientY + 'px';
  });
  var sel = 'button, a, .tarjeta-rol, input, select, textarea';
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo');
  });
})();

/* ─── 4. NAVEGACIÓN ENTRE VISTAS ───────────────────────── */
function mostrarVista(idVista) {
  document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
  document.getElementById(idVista).classList.add('activa');
  if (idVista === 'vista-registro') reiniciarRegistro();
  if (idVista === 'vista-olvidaste') {
    document.getElementById('formulario-recuperacion').style.display = 'block';
    document.getElementById('exito-recuperacion').classList.remove('visible');
    document.getElementById('olv-correo').value = '';
    ocultarError('error-olvidaste');
  }
}

/* ─── 5. VISIBILIDAD DE CONTRASEÑA ─────────────────────── */
function alternarVisibilidad(idCampo, boton) {
  var campo  = document.getElementById(idCampo);
  var oculto = campo.type === 'password';
  campo.type        = oculto ? 'text' : 'password';
  boton.textContent = oculto ? 'ocultar' : 'ver';
}

/* ─── 6. FORTALEZA DE CONTRASEÑA ───────────────────────── */
function verificarFuerza(campo) {
  var valor   = campo.value;
  var puntaje = 0;
  if (valor.length >= 8)           puntaje++;
  if (/[A-Z]/.test(valor))         puntaje++;
  if (/[0-9]/.test(valor))         puntaje++;
  if (/[^A-Za-z0-9]/.test(valor))  puntaje++;
  var barra   = document.getElementById('barra-fuerza');
  var colores = ['transparent', '#FF6565', '#FFA94D', '#74C0FC', '#C8F400'];
  barra.style.width      = ((puntaje / 4) * 100) + '%';
  barra.style.background = colores[puntaje] || 'transparent';
}

/* ─── 7. SELECCIÓN DE ROL ───────────────────────────────── */
var rolSeleccionado = null;
function seleccionarRol(tarjeta, rol) {
  document.querySelectorAll('.tarjeta-rol').forEach(t => t.classList.remove('seleccionado'));
  tarjeta.classList.add('seleccionado');
  rolSeleccionado = rol;
  ocultarError('error-rol');
}
function cargarInfoPorRol() {
  document.querySelectorAll('.info-por-rol').forEach(s => s.classList.remove('visible'));
  if (rolSeleccionado) {
    var seccion = document.getElementById('info-' + rolSeleccionado);
    if (seccion) seccion.classList.add('visible');
  }
}

/* ─── 8. NAVEGACIÓN ENTRE PASOS ────────────────────────── */
var pasoActual = 1;
function avanzarPaso(numeroPaso) {
  if (numeroPaso > pasoActual && !validarPaso(pasoActual)) return;
  if (numeroPaso === 3) cargarInfoPorRol();
  document.getElementById('paso-' + pasoActual).classList.remove('activo');
  document.getElementById('paso-' + numeroPaso).classList.add('activo');
  pasoActual = numeroPaso;
  actualizarIndicadores();
}
function actualizarIndicadores() {
  for (var i = 1; i <= 4; i++) {
    document.getElementById('ind-' + i).classList.toggle('completado', i <= pasoActual);
  }
}
function reiniciarRegistro() {
  rolSeleccionado = null;
  pasoActual = 1;
  document.querySelectorAll('.tarjeta-rol').forEach(t => t.classList.remove('seleccionado'));
  document.querySelectorAll('.paso-registro').forEach(p => p.classList.remove('activo'));
  document.getElementById('paso-1').classList.add('activo');
  document.querySelectorAll('.info-por-rol').forEach(s => s.classList.remove('visible'));
  actualizarIndicadores();
}

/* ─── 9. UTILIDADES UI ──────────────────────────────────── */
function esCorreoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}
function mostrarError(idError, mensaje) {
  var el = document.getElementById(idError);
  if (mensaje) el.textContent = mensaje;
  el.classList.add('visible');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('visible'), 4500);
}
function ocultarError(idError) {
  document.getElementById(idError).classList.remove('visible');
}
function setBtnCargando(idBtn, cargando, textoOriginal) {
  var btn = document.getElementById(idBtn);
  if (!btn) return;
  btn.disabled      = cargando;
  btn.textContent   = cargando ? 'Cargando...' : textoOriginal;
  btn.style.opacity = cargando ? '0.6' : '1';
}
function validarPaso(paso) {
  switch (paso) {
    case 1:
      if (!rolSeleccionado) { mostrarError('error-rol', 'Selecciona un rol para continuar.'); return false; }
      return true;
    case 2:
      var nombre = document.getElementById('reg-nombre').value.trim();
      var correo = document.getElementById('reg-correo').value.trim();
      if (!nombre) { mostrarError('error-paso2', 'El nombre completo es obligatorio.'); return false; }
      if (!correo || !esCorreoValido(correo)) { mostrarError('error-paso2', 'Ingresa un correo electrónico válido.'); return false; }
      return true;
    case 3:
      var campo = rolSeleccionado === 'entrenador' ? 'ent-especialidad'
                : rolSeleccionado === 'monitor'    ? 'mon-area'
                : rolSeleccionado === 'alumno'     ? 'alu-objetivo' : null;
      if (campo && !document.getElementById(campo).value) {
        mostrarError('error-paso3', 'Completa el campo requerido para continuar.');
        return false;
      }
      return true;
    default: return true;
  }
}

/* ─── 10. LOGIN ─────────────────────────────────────────── */
async function manejarLogin() {
  var correo     = document.getElementById('login-correo').value.trim();
  var contrasena = document.getElementById('login-contrasena').value;

  if (!correo || !esCorreoValido(correo)) { mostrarError('error-login', 'Ingresa un correo electrónico válido.'); return; }
  if (!contrasena)                         { mostrarError('error-login', 'Ingresa tu contraseña.'); return; }

  setBtnCargando('btn-login', true, 'Entrar →');

  const { data, error } = await db.auth.signInWithPassword({ email: correo, password: contrasena });

  setBtnCargando('btn-login', false, 'Entrar →');

  if (error) {
    const msgs = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed':        'Verifica tu correo antes de entrar.',
      'Too many requests':          'Demasiados intentos. Espera unos minutos.'
    };
    mostrarError('error-login', msgs[error.message] || 'Error al iniciar sesión.');
    return;
  }

  /* Actualizar último login */
  await db.from('usuarios').update({ ultimo_login: new Date().toISOString() }).eq('uuid', data.user.id);

  window.location.href = '../pages/dashboard.html';
}

/* ─── 11. REGISTRO ──────────────────────────────────────── */
async function manejarRegistro() {
  var contrasena   = document.getElementById('reg-contrasena').value;
  var confirmacion = document.getElementById('reg-confirmar').value;

  if (contrasena.length < 8)       { mostrarError('error-paso4', 'La contraseña debe tener al menos 8 caracteres.'); return; }
  if (contrasena !== confirmacion) { mostrarError('error-paso4', 'Las contraseñas no coinciden.'); return; }

  var nombreCompleto = document.getElementById('reg-nombre').value.trim();
  var partes   = nombreCompleto.split(' ');
  var nombre   = partes[0] || '';
  var apellido = partes.slice(1).join(' ') || '-';
  var correo     = document.getElementById('reg-correo').value.trim();
  var telefono   = document.getElementById('reg-telefono').value.trim();
  var nacimiento = document.getElementById('reg-nacimiento').value;

  setBtnCargando('btn-registro', true, 'Crear Cuenta');

  /* Paso 1 — Crear en Supabase Auth */
  const { data: authData, error: authError } = await db.auth.signUp({
    email:    correo,
    password: contrasena,
    options:  { data: { nombre, apellido, rol: rolSeleccionado } }
  });

  if (authError) {
    setBtnCargando('btn-registro', false, 'Crear Cuenta');
    const msgs = {
      'User already registered': 'Este correo ya tiene una cuenta.',
      'Password should be at least 6 characters': 'La contraseña es muy corta.'
    };
    mostrarError('error-paso4', msgs[authError.message] || 'Error al crear la cuenta.');
    return;
  }

  /* Paso 2 — Insertar en tabla usuarios */
  var datosUsuario = {
    uuid:             authData.user.id,
    nombre,
    apellido,
    email:            correo,
    password_hash:    'supabase_auth',
    fecha_nacimiento: nacimiento || '2000-01-01',
    rol_id:           ROL_ID[rolSeleccionado] || 1,
    estado:           'pendiente',
    email_verificado: false
  };
  if (telefono) datosUsuario.telefono = telefono;

  const { error: dbError } = await db.from('usuarios').insert(datosUsuario);
  if (dbError) console.warn('[APEX] No se pudo insertar en usuarios:', dbError.message);

  setBtnCargando('btn-registro', false, 'Crear Cuenta');

  /* Mostrar éxito */
  mostrarVista('vista-login');
  setTimeout(() => mostrarError('error-login', '✓ Cuenta creada. Revisa tu correo para verificarla.'), 300);
}

/* ─── 12. RECUPERAR CONTRASEÑA ──────────────────────────── */
async function manejarOlvidaste() {
  var correo = document.getElementById('olv-correo').value.trim();

  if (!correo || !esCorreoValido(correo)) { mostrarError('error-olvidaste', 'Ingresa un correo electrónico válido.'); return; }

  setBtnCargando('btn-recuperar', true, 'Enviar Enlace →');

  const { error } = await db.auth.resetPasswordForEmail(correo, {
    redirectTo: window.location.origin + '/pages/login.html'
  });

  setBtnCargando('btn-recuperar', false, 'Enviar Enlace →');

  if (error) { mostrarError('error-olvidaste', 'No se pudo enviar el correo. Intenta de nuevo.'); return; }

  document.getElementById('formulario-recuperacion').style.display = 'none';
  document.getElementById('exito-recuperacion').classList.add('visible');
}
