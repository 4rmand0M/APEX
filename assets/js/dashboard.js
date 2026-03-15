/* ══════════════════════════════════════════════
   SUPABASE — Inicialización
══════════════════════════════════════════════ */
const SUPABASE_URL = 'https://lvxsnyycqubnnwaxlgzx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eHNueXljcXVibm53YXhsZ3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzU1NjAsImV4cCI6MjA4ODA1MTU2MH0.p67j4YxMVXjlVTuqfpVKsuqaL9sWB6D6zlHRZ3WBFYk';
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ══════════════════════════════════════════════
   AUTH — Verificar sesión
══════════════════════════════════════════════ */
async function verificarSesion() {
    const { data: { session } } = await db.auth.getSession();

    if (session) {
        const email = session.user.email;
        document.getElementById('nav-usuario').textContent = email;
        document.getElementById('btn-logout').style.display = 'inline';
    } else {
        document.getElementById('nav-usuario').textContent = 'Sin sesión';
    }
}

async function cerrarSesion() {
    await db.auth.signOut();
    window.location.href = 'login.html';
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function mostrarError(msg) {
    const el = document.getElementById('error-global');
    el.textContent = '⚠ ' + msg;
    el.classList.add('visible');
}

function renderCard(contenedor, valor, sub, acento = false) {
    contenedor.innerHTML = `
    <div class="card-valor">${valor}</div>
    <div class="card-sub">${sub}</div>
  `;
    if (acento) contenedor.closest('.card').classList.add('card-accent');
}

function setGrid(gridId, items) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = items.map(item => `
    <div class="card ${item.acento ? 'card-accent' : ''}">
      <div class="card-label">${item.label}</div>
      <div class="card-valor">${item.valor}</div>
      <div class="card-sub">${item.sub || ''}</div>
      ${item.barra !== undefined ? `
        <div class="mini-barra-fondo">
          <div class="mini-barra-relleno" style="width:${item.barra}%"></div>
        </div>` : ''}
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════
   BLOQUE 1 — ESTADÍSTICAS DE USUARIOS
══════════════════════════════════════════════ */
async function cargarEstadisticasUsuarios() {
    try {
        const { data, error } = await db
            .from('usuarios')
            .select('rol_id, estado, email_verificado')
            .is('deleted_at', null);

        if (error) throw error;

        const total = data.length;
        const entrenadores = data.filter(u => u.rol_id === 2).length;
        const alumnos = data.filter(u => u.rol_id === 1).length;
        const admins = data.filter(u => u.rol_id === 3).length;
        const activos = data.filter(u => u.estado === 'activo').length;
        const pendientes = data.filter(u => u.estado === 'pendiente').length;
        const inactivos = data.filter(u => u.estado === 'inactivo' || u.estado === 'suspendido').length;
        const verificados = data.filter(u => u.email_verificado).length;

        const pctActivos = total > 0 ? Math.round((activos / total) * 100) : 0;
        const pctVerif = total > 0 ? Math.round((verificados / total) * 100) : 0;

        setGrid('grid-usuarios', [
            { label: 'Total usuarios', valor: total, sub: 'registrados en DB', acento: true },
            { label: 'Entrenadores', valor: entrenadores, sub: `+ ${admins} admin(s)` },
            { label: 'Monitores / Rol 2', valor: entrenadores, sub: 'mismo rol que entrenador' },
            { label: 'Alumnos (rol 1)', valor: alumnos, sub: 'usuarios base' },
        ]);

        setGrid('grid-estados', [
            { label: 'Activos', valor: activos, sub: `${pctActivos}% del total`, barra: pctActivos },
            { label: 'Pendientes', valor: pendientes, sub: 'email sin verificar o revisar' },
            { label: 'Inactivos/Susp.', valor: inactivos, sub: 'acceso restringido' },
            { label: 'Email verificado', valor: verificados, sub: `${pctVerif}% del total`, barra: pctVerif },
        ]);

    } catch (e) {
        mostrarError('Error cargando usuarios: ' + e.message);
        console.error('[APEX Dashboard] usuarios:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 2 — ENTRENADORES Y GIMNASIOS
══════════════════════════════════════════════ */
async function cargarEstadisticasEntrenadores() {
    try {
        const { data: ents, error: e1 } = await db.from('entrenadores').select('id, estado, disponible');
        if (e1) throw e1;

        const { data: gims, error: e2 } = await db.from('gimnasios').select('id, estado').is('deleted_at', null);
        if (e2) throw e2;

        const { data: asigs, error: e3 } = await db.from('usuario_entrenador').select('id, estado').eq('estado', 'activo');
        if (e3) throw e3;

        const entsActivos = (ents || []).filter(e => e.estado === 'activo').length;
        const entsDisponibles = (ents || []).filter(e => e.disponible && e.estado === 'activo').length;
        const gimsActivos = (gims || []).filter(g => g.estado === 'activo').length;

        setGrid('grid-entrenadores', [
            { label: 'Entrenadores activos', valor: entsActivos, sub: `de ${(ents || []).length} total` },
            { label: 'Disponibles ahora', valor: entsDisponibles, sub: 'con disponible=true', barra: entsActivos > 0 ? Math.round((entsDisponibles / entsActivos) * 100) : 0 },
            { label: 'Gimnasios activos', valor: gimsActivos, sub: `de ${(gims || []).length} registrados` },
            { label: 'Asignaciones activas', valor: (asigs || []).length, sub: 'usuario ↔ entrenador', acento: true },
        ]);

    } catch (e) {
        mostrarError('Error cargando entrenadores: ' + e.message);
        console.error('[APEX Dashboard] entrenadores:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 3 — SESIONES DE ENTRENAMIENTO
══════════════════════════════════════════════ */
async function cargarEstadisticasSesiones() {
    try {
        const { data, error } = await db.from('sesiones').select('estado, duracion_minutos, calorias_quemadas, fecha_inicio');
        if (error) throw error;

        const total = (data || []).length;
        const completadas = (data || []).filter(s => s.estado === 'completada').length;
        const enProgreso = (data || []).filter(s => s.estado === 'en_progreso').length;
        const duraciones = (data || []).filter(s => s.duracion_minutos != null && s.duracion_minutos > 0);
        const promDur = duraciones.length > 0
            ? Math.round(duraciones.reduce((acc, s) => acc + s.duracion_minutos, 0) / duraciones.length)
            : 0;
        const pctComp = total > 0 ? Math.round((completadas / total) * 100) : 0;

        setGrid('grid-sesiones', [
            { label: 'Total sesiones', valor: total, sub: 'historial completo', acento: true },
            { label: 'Completadas', valor: completadas, sub: `${pctComp}% del total`, barra: pctComp },
            { label: 'En progreso', valor: enProgreso, sub: 'sesiones abiertas' },
            { label: 'Prom. duración (min)', valor: promDur || '—', sub: duraciones.length > 0 ? `de ${duraciones.length} con datos` : 'sin datos' },
        ]);

    } catch (e) {
        mostrarError('Error cargando sesiones: ' + e.message);
        console.error('[APEX Dashboard] sesiones:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 4 — MÉTRICAS FÍSICAS (IMC)
══════════════════════════════════════════════ */
async function cargarEstadisticasIMC() {
    try {
        const { data, error } = await db.from('metricas_fisicas').select('imc, peso_kg, categoria_imc');
        if (error) throw error;

        const total = (data || []).length;
        const conImc = (data || []).filter(m => m.imc != null);
        const promImc = conImc.length > 0
            ? (conImc.reduce((acc, m) => acc + parseFloat(m.imc), 0) / conImc.length).toFixed(1)
            : '—';
        const conPeso = (data || []).filter(m => m.peso_kg != null);
        const promPeso = conPeso.length > 0
            ? (conPeso.reduce((acc, m) => acc + parseFloat(m.peso_kg), 0) / conPeso.length).toFixed(1)
            : '—';

        setGrid('grid-imc', [
            { label: 'Registros totales', valor: total, sub: 'mediciones guardadas', acento: true },
            { label: 'IMC promedio', valor: promImc, sub: conImc.length > 0 ? `de ${conImc.length} registros` : 'sin datos' },
            { label: 'Peso promedio kg', valor: promPeso, sub: conPeso.length > 0 ? `de ${conPeso.length} registros` : 'sin datos' },
        ]);

        renderDistribucionIMC(data || [], total);

    } catch (e) {
        mostrarError('Error cargando métricas IMC: ' + e.message);
        console.error('[APEX Dashboard] imc:', e);
    }
}

function renderDistribucionIMC(data, total) {
    const categorias = ['normal', 'sobrepeso', 'bajo_peso', 'obesidad_i', 'obesidad_ii', 'obesidad_iii'];
    const labels = {
        normal: 'Normal', sobrepeso: 'Sobrepeso', bajo_peso: 'Bajo Peso',
        obesidad_i: 'Obesidad I', obesidad_ii: 'Obesidad II', obesidad_iii: 'Obesidad III'
    };

    const conteos = {};
    categorias.forEach(c => { conteos[c] = 0; });
    data.forEach(m => { if (m.categoria_imc && conteos[m.categoria_imc] !== undefined) conteos[m.categoria_imc]++; });

    if (total === 0) {
        document.getElementById('imc-distribucion').innerHTML = '<div class="vacio">Sin registros de métricas</div>';
        return;
    }

    const html = categorias.map(cat => {
        const count = conteos[cat];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span class="badge-imc imc-${cat}">${labels[cat]}</span>
          <span style="font-size:11px;color:var(--texto-atenuado)">${count} — ${pct}%</span>
        </div>
        <div class="mini-barra-fondo">
          <div class="mini-barra-relleno" style="width:${pct}%"></div>
        </div>
      </div>
    `;
    }).join('');

    document.getElementById('imc-distribucion').innerHTML = html;
}

/* ══════════════════════════════════════════════
   BLOQUE 5 — EJERCICIOS, RUTINAS Y METAS
══════════════════════════════════════════════ */
async function cargarEstadisticasContenido() {
    try {
        const [
            { count: totalEjercicios },
            { count: rutinasActivas },
            { count: rutinasPublicas },
            { count: metasActivas },
        ] = await Promise.all([
            db.from('ejercicios').select('id', { count: 'exact', head: true }).eq('estado', 'activo').is('deleted_at', null),
            db.from('rutinas').select('id', { count: 'exact', head: true }).eq('estado', 'activa').is('deleted_at', null),
            db.from('rutinas').select('id', { count: 'exact', head: true }).eq('es_publica', true).is('deleted_at', null),
            db.from('metas').select('id', { count: 'exact', head: true }).eq('estado', 'activa'),
        ]);

        setGrid('grid-ejercicios', [
            { label: 'Ejercicios activos', valor: totalEjercicios ?? '—', sub: 'en biblioteca', acento: true },
            { label: 'Rutinas activas', valor: rutinasActivas ?? '—', sub: 'disponibles para sesión' },
            { label: 'Rutinas públicas', valor: rutinasPublicas ?? '—', sub: 'acceso global' },
            { label: 'Metas activas', valor: metasActivas ?? '—', sub: 'objetivos en seguimiento' },
        ]);

    } catch (e) {
        mostrarError('Error cargando contenido: ' + e.message);
        console.error('[APEX Dashboard] contenido:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 6 — TABLA USUARIOS RECIENTES
══════════════════════════════════════════════ */
async function cargarUsuariosRecientes() {
    try {
        const { data, error } = await db
            .from('v_usuarios_perfil')
            .select('id, nombre_completo, email, rol, estado, email_verificado, created_at')
            .order('created_at', { ascending: false })
            .limit(8);

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('tabla-usuarios-recientes').innerHTML = '<div class="vacio">Sin usuarios registrados</div>';
            return;
        }

        const html = `
      <table class="tabla">
        <thead>
          <tr>
            <th>Nombre</th><th>Rol</th><th>Estado</th><th>Verificado</th><th>Registro</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(u => {
            const fecha = new Date(u.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
            const rolCls = u.rol === 'admin' ? 'rol-admin' : u.rol === 'entrenador' ? 'rol-entrenador' : 'rol-usuario';
            const estCls = u.estado === 'activo' ? 'estado-activo' : u.estado === 'pendiente' ? 'estado-pendiente' : 'estado-inactivo';
            return `
              <tr>
                <td>
                  <div class="tabla-strong">${u.nombre_completo}</div>
                  <div style="font-size:10px;color:var(--texto-atenuado)">${u.email}</div>
                </td>
                <td><span class="badge-rol ${rolCls}">${u.rol}</span></td>
                <td><span class="badge-estado ${estCls}">${u.estado}</span></td>
                <td style="font-size:11px">${u.email_verificado ? '✓' : '✗'}</td>
                <td style="font-size:10px;color:var(--texto-atenuado)">${fecha}</td>
              </tr>
            `;
        }).join('')}
        </tbody>
      </table>
    `;
        document.getElementById('tabla-usuarios-recientes').innerHTML = html;

    } catch (e) {
        document.getElementById('tabla-usuarios-recientes').innerHTML = '<div class="vacio" style="color:var(--error)">Error cargando datos</div>';
        console.error('[APEX Dashboard] usuarios recientes:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 7 — SESIONES RECIENTES
══════════════════════════════════════════════ */
async function cargarSesionesRecientes() {
    try {
        const { data, error } = await db
            .from('v_sesiones_historial')
            .select('usuario, rutina, fecha_inicio, duracion_minutos, estado, calorias_quemadas')
            .order('fecha_inicio', { ascending: false })
            .limit(6);

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('lista-sesiones-recientes').innerHTML = '<div class="vacio">Sin sesiones registradas</div>';
            return;
        }

        const html = data.map(s => {
            const fecha = new Date(s.fecha_inicio).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
            const estadoCls = s.estado === 'completada' ? 'estado-activo' : s.estado === 'en_progreso' ? 'estado-pendiente' : 'estado-inactivo';
            return `
        <div class="sesion-row">
          <div>
            <div class="sesion-nombre">${s.usuario}</div>
            <div class="sesion-info">${s.rutina} · ${fecha} · <span class="badge-estado ${estadoCls}">${s.estado}</span></div>
          </div>
          <div class="sesion-dur">${s.duracion_minutos ?? '—'}<span style="font-size:10px;color:var(--texto-atenuado)">min</span></div>
        </div>
      `;
        }).join('');

        document.getElementById('lista-sesiones-recientes').innerHTML = html;

    } catch (e) {
        document.getElementById('lista-sesiones-recientes').innerHTML = '<div class="vacio" style="color:var(--error)">Error</div>';
        console.error('[APEX Dashboard] sesiones recientes:', e);
    }
}

/* ══════════════════════════════════════════════
   BLOQUE 8 — TABLA ENTRENADORES POR GIMNASIO
══════════════════════════════════════════════ */
async function cargarEntrenadoresPorGimnasio() {
    try {
        const { data, error } = await db
            .from('v_entrenadores_gimnasio')
            .select('entrenador, email, especialidad, anos_experiencia, tarifa_hora, disponible, gimnasio, ciudad')
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('tabla-entrenadores').innerHTML = '<div class="vacio">Sin entrenadores registrados</div>';
            return;
        }

        const html = `
      <table class="tabla">
        <thead>
          <tr>
            <th>Entrenador</th><th>Especialidad</th><th>Exp. (años)</th>
            <th>Tarifa/h</th><th>Gimnasio</th><th>Ciudad</th><th>Disponible</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(e => `
            <tr>
              <td>
                <div class="tabla-strong">${e.entrenador}</div>
                <div style="font-size:10px;color:var(--texto-atenuado)">${e.email}</div>
              </td>
              <td>${e.especialidad ?? '—'}</td>
              <td>${e.anos_experiencia ?? '—'}</td>
              <td>${e.tarifa_hora ? '$' + e.tarifa_hora + '/h' : '—'}</td>
              <td>${e.gimnasio}</td>
              <td>${e.ciudad}</td>
              <td><span class="badge-estado ${e.disponible ? 'estado-activo' : 'estado-inactivo'}">${e.disponible ? 'Sí' : 'No'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
        document.getElementById('tabla-entrenadores').innerHTML = html;

    } catch (e) {
        document.getElementById('tabla-entrenadores').innerHTML = '<div class="vacio" style="color:var(--error)">Error cargando entrenadores</div>';
        console.error('[APEX Dashboard] entrenadores tabla:', e);
    }
}

/* ══════════════════════════════════════════════
   CARGA PRINCIPAL
══════════════════════════════════════════════ */
async function cargarTodoElDashboard() {
    const btnRefresh = document.querySelector('.btn-refresh');
    if (btnRefresh) btnRefresh.classList.add('spinning');

    await Promise.allSettled([
        cargarEstadisticasUsuarios(),
        cargarEstadisticasEntrenadores(),
        cargarEstadisticasSesiones(),
        cargarEstadisticasIMC(),
        cargarEstadisticasContenido(),
        cargarUsuariosRecientes(),
        cargarSesionesRecientes(),
        cargarEntrenadoresPorGimnasio(),
    ]);

    if (btnRefresh) btnRefresh.classList.remove('spinning');
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
    var sel = 'button, a, input, select';
    document.addEventListener('mouseover', e => { if (e.target.closest(sel)) document.body.classList.add('sobre-interactivo'); });
    document.addEventListener('mouseout', e => { if (e.target.closest(sel)) document.body.classList.remove('sobre-interactivo'); });
})();

/* ══════════════════════════════════════════════
   INIT
══════════════════════════════════════════════ */
document.getElementById('dash-fecha').textContent = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

verificarSesion();
cargarTodoElDashboard();
