/* ══════════════════════════════════════════════
   SUPABASE — Inicialización
══════════════════════════════════════════════ */
const db = window.supabaseClient;

/* ══════════════════════════════════════════════
   AUTH — Verificar sesión
══════════════════════════════════════════════ */
async function verificarSesion() {
    const user = await window.ApexAuth.requireAuth();
    if (!user) return;

    const navUsuario = document.getElementById('nav-usuario');
    const btnLogout = document.getElementById('btn-logout');

    const { data: profile } = await db
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

    if (profile && navUsuario) {
        navUsuario.textContent = profile.full_name || user.email;
    } else if (navUsuario) {
        navUsuario.textContent = user.email;
    }

    if (btnLogout) btnLogout.style.display = 'inline';
}

async function cerrarSesion() {
    await window.ApexAuth.signOut();
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
            .from('profiles')
            .select('role');

        if (error) throw error;

        const total = data.length;
        const entrenadores = data.filter(u => u.role === 'trainer').length;
        const alumnos = data.filter(u => u.role === 'user').length;
        const admins = data.filter(u => u.role === 'admin').length;

        setGrid('grid-usuarios', [
            { label: 'Total usuarios', valor: total, sub: 'registrados en DB', acento: true },
            { label: 'Entrenadores', valor: entrenadores, sub: `+ ${admins} admin(s)` },
            { label: 'Admins', valor: admins, sub: 'acceso total' },
            { label: 'Alumnos', valor: alumnos, sub: 'usuarios base' },
        ]);

        // Simulación de estados para completar el grid hasta que se implementen en DB
        setGrid('grid-estados', [
            { label: 'Activos', valor: total, sub: '100% del total', barra: 100 },
            { label: 'Pendientes', valor: 0, sub: 'email sin verificar o revisar' },
            { label: 'Inactivos/Susp.', valor: 0, sub: 'acceso restringido' },
            { label: 'Email verificado', valor: total, sub: '100% del total', barra: 100 },
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
        const { data: ents, error: e1 } = await db.from('trainer_profiles').select('user_id');
        if (e1) throw e1;

        const { data: gims, error: e2 } = await db.from('gyms').select('id');
        if (e2) throw e2;

        const entsActivos = (ents || []).length;
        const gimsActivos = (gims || []).length;

        setGrid('grid-entrenadores', [
            { label: 'Entrenadores activos', valor: entsActivos, sub: `perfiles de entrenador` },
            { label: 'Disponibles ahora', valor: entsActivos, sub: 'activos en la plataforma', barra: 100 },
            { label: 'Gimnasios activos', valor: gimsActivos, sub: `sucursales registradas` },
            { label: 'Asignaciones activas', valor: 0, sub: 'funcionalidad futura', acento: true },
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
        const { data, error } = await db.from('workout_sessions').select('total_duration_minutes, end_time');
        if (error) throw error;

        const total = (data || []).length;
        const completadas = (data || []).filter(s => s.end_time != null).length;
        const enProgreso = total - completadas;
        const duraciones = (data || []).filter(s => s.total_duration_minutes != null && s.total_duration_minutes > 0);
        const promDur = duraciones.length > 0
            ? Math.round(duraciones.reduce((acc, s) => acc + s.total_duration_minutes, 0) / duraciones.length)
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
        const { data, error } = await db.from('user_measurements').select('imc, weight');
        if (error) throw error;

        const total = (data || []).length;
        const conImc = (data || []).filter(m => m.imc != null);
        const promImc = conImc.length > 0
            ? (conImc.reduce((acc, m) => acc + parseFloat(m.imc), 0) / conImc.length).toFixed(1)
            : '—';
        const conPeso = (data || []).filter(m => m.weight != null);
        const promPeso = conPeso.length > 0
            ? (conPeso.reduce((acc, m) => acc + parseFloat(m.weight), 0) / conPeso.length).toFixed(1)
            : '—';

        setGrid('grid-imc', [
            { label: 'Registros totales', valor: total, sub: 'mediciones guardadas', acento: true },
            { label: 'IMC promedio', valor: promImc, sub: conImc.length > 0 ? `de ${conImc.length} registros` : 'sin datos' },
            { label: 'Peso promedio kg', valor: promPeso, sub: conPeso.length > 0 ? `de ${conPeso.length} registros` : 'sin datos' },
        ]);

        const datosConCategoria = (data || []).map(m => {
            let cat = 'normal';
            if(m.imc < 18.5) cat = 'bajo_peso';
            else if(m.imc >= 25 && m.imc < 30) cat = 'sobrepeso';
            else if(m.imc >= 30 && m.imc < 35) cat = 'obesidad_i';
            else if(m.imc >= 35 && m.imc < 40) cat = 'obesidad_ii';
            else if(m.imc >= 40) cat = 'obesidad_iii';
            return { categoria_imc: cat };
        });

        renderDistribucionIMC(datosConCategoria, total);

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
            { count: rutinasActivas }
        ] = await Promise.all([
            db.from('exercises').select('id', { count: 'exact', head: true }),
            db.from('routines').select('id', { count: 'exact', head: true })
        ]);

        setGrid('grid-ejercicios', [
            { label: 'Ejercicios totales', valor: totalEjercicios ?? '—', sub: 'en biblioteca', acento: true },
            { label: 'Rutinas activas', valor: rutinasActivas ?? '—', sub: 'disponibles para sesión' },
            { label: 'Rutinas públicas', valor: 0, sub: 'las rutinas son privadas' },
            { label: 'Metas activas', valor: '—', sub: 'en desarrollo' },
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
            .from('profiles')
            .select('id, full_name, username, role, created_at')
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
            <th>Nombre</th><th>Rol</th><th>Registro</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(u => {
            const fecha = new Date(u.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
            const rolCls = u.role === 'admin' ? 'rol-admin' : u.role === 'trainer' ? 'rol-entrenador' : 'rol-usuario';
            return `
              <tr>
                <td>
                  <div class="tabla-strong">${u.full_name || 'Sin nombre'}</div>
                  <div style="font-size:10px;color:var(--texto-atenuado)">@${u.username || 'usuario'}</div>
                </td>
                <td><span class="badge-rol ${rolCls}">${u.role}</span></td>
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
            .from('workout_sessions')
            .select('start_time, end_time, total_duration_minutes, profiles(full_name)')
            .order('start_time', { ascending: false })
            .limit(6);

        if (error) throw error;

        if (!data || data.length === 0) {
            document.getElementById('lista-sesiones-recientes').innerHTML = '<div class="vacio">Sin sesiones registradas</div>';
            return;
        }

        const html = data.map(s => {
            const fecha = new Date(s.start_time).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' });
            const isCompletada = s.end_time != null;
            const estadoStr = isCompletada ? 'completada' : 'en progreso';
            const estadoCls = isCompletada ? 'estado-activo' : 'estado-pendiente';
            const usuario = s.profiles ? s.profiles.full_name : 'Usuario';
            
            return `
        <div class="sesion-row">
          <div>
            <div class="sesion-nombre">${usuario}</div>
            <div class="sesion-info">${fecha} · <span class="badge-estado ${estadoCls}">${estadoStr}</span></div>
          </div>
          <div class="sesion-dur">${s.total_duration_minutes ?? '—'}<span style="font-size:10px;color:var(--texto-atenuado)">min</span></div>
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
            .from('trainer_profiles')
            .select('hourly_rate, experience_years, specialties, profiles(full_name, username)')
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
            <th>Tarifa/h</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(e => `
            <tr>
              <td>
                <div class="tabla-strong">${e.profiles?.full_name || 'Usuario'}</div>
                <div style="font-size:10px;color:var(--texto-atenuado)">@${e.profiles?.username || ''}</div>
              </td>
              <td>${(e.specialties && e.specialties.length > 0) ? e.specialties.join(', ') : '—'}</td>
              <td>${e.experience_years ?? '—'}</td>
              <td>${e.hourly_rate ? '$' + e.hourly_rate + '/h' : '—'}</td>
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
    try {
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
    } catch (e) {
        console.error('[APEX Dashboard] Error en la carga general:', e);
    }
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
