# 📋 APEX FITNESS — Estado Actual del Sistema
> **Fecha:** 25 de Marzo, 2026 — 7:16 PM  
> **Autor:** Antigravity (Agente Front-End)

---

## 1. Arquitectura General

```
APEX/
├── index.html              # Landing page principal
├── 404.html                # Página de error
├── pages/
│   ├── workout.html        # Feed de entrenamientos (estilo Reels)
│   ├── ejercicios.html     # Biblioteca de ejercicios + panel de detalle
│   ├── calendario.html     # Calendario de sesiones
│   ├── rutina.html         # Creación y edición de rutinas
│   ├── dashboard.html      # Panel de usuario
│   ├── login.html          # Autenticación
│   ├── chat.html           # Chat / Widget de soporte
│   ├── calculadora-imc.html # Calculadora de IMC
│   ├── privacidad.html     # Política de privacidad
│   └── terminos.html       # Términos y condiciones
├── assets/
│   ├── css/
│   │   ├── variables.css   # Tokens de diseño (colores, fuentes)
│   │   ├── base.css        # Estilos globales + sistema de dropdowns
│   │   ├── workout.css     # Estilos del feed de entrenamientos
│   │   ├── ejercicios.css  # Estilos de la biblioteca de ejercicios
│   │   ├── rutina.css      # Estilos de la página de rutinas
│   │   ├── auth.css        # Estilos de la pasarela de auth
│   │   ├── calendario.css  # Estilos del calendario
│   │   ├── dashboard.css   # Estilos del dashboard
│   │   └── ...             # login, privacidad, terminos, calculadora
│   ├── js/
│   │   ├── workout.js      # Feed + scroll Reels + dropdowns + navegación
│   │   ├── ejercicios.js   # Biblioteca + gráfica Chart.js + dropdowns
│   │   ├── rutina.js       # Editor de rutinas
│   │   ├── calendario.js   # Lógica del calendario
│   │   ├── auth.js         # JWT + login/registro
│   │   ├── dashboard.js    # Métricas + configuración
│   │   ├── chat-widget.js  # Widget de chat
│   │   └── ...             # login, privacidad, terminos, calculadora
│   ├── data/               # Datos estáticos / mocks
│   └── media/              # Imágenes, íconos, assets visuales
├── notes/                  # Documentación y notas de cambios
├── scripts/                # Scripts auxiliares de Python
├── referenceMedia/         # Imágenes de referencia de diseño (FitNotes, Hevy)
└── test/                   # Archivos de pruebas
```

---

## 2. Estado por Módulo

### ✅ Completados

| Módulo | Archivo | Estado | Notas |
|--------|---------|--------|-------|
| **Landing Page** | `index.html` | ✅ Completo | Página de aterrizaje funcional |
| **Login/Registro** | `login.html` + `auth.js` | ✅ UI Completa | Pendiente: conectar JWT al backend |
| **Workout Feed** | `workout.html` + `workout.js` | ✅ Refactorizado | Scroll Reels, top-bar con logo, selector de fecha, botones flotantes |
| **Biblioteca Ejercicios** | `ejercicios.html` + `ejercicios.js` | ✅ Refactorizado | Panel de detalle, gráficas Chart.js, dropdowns funcionales |
| **Rutinas** | `rutina.html` + `rutina.js` | ✅ UI Completa | Editor completo con drag & drop |
| **Calendario** | `calendario.html` + `calendario.js` | ✅ UI Completa | Vista mensual con marcadores |
| **Dashboard** | `dashboard.html` + `dashboard.js` | ✅ UI Completa | Métricas de usuario |
| **Calculadora IMC** | `calculadora-imc.html` | ✅ Funcional | Cálculo en tiempo real |
| **Chat Widget** | `chat.html` + `chat-widget.js` | ✅ UI Completa | Pendiente: conectar al backend |
| **Privacidad / Términos** | `privacidad.html`, `terminos.html` | ✅ Completo | Páginas estáticas legales |
| **404** | `404.html` | ✅ Completo | Página de error personalizada |

### 🔧 Sistema de Componentes Globales

| Componente | Ubicación | Estado |
|-----------|-----------|--------|
| **Dropdown Menu** | `base.css` (`.dropdown-wrap`, `.btn-opciones`, `.dropdown-menu`) | ✅ Global y reutilizable |
| **Toast Notifications** | Cada página tiene su propio toast | ✅ Funcional |
| **Sidebar Navigation** | Replicada en cada HTML | ✅ Consistente |
| **Bottom Nav (Mobile)** | Cada página (5 tabs: Workout, Calendario, +, Ejercicios, Perfil) | ✅ Funcional |
| **Theme Switcher** | `base.css` + cada JS | ✅ Oscuro/Claro |

---

## 3. Cambios Recientes (Sesión 25/03/2026)

1. **Dropdowns Estilo FitNotes** — Creados en `base.css`, aplicados a `workout.html` (cabecera) y `ejercicios.html` (biblioteca + gráfica).
2. **Navbar de Ejercicios** — Corregida para incluir: Workout, Calendario, Añadir, Ejercicios, Perfil.
3. **Feed Estilo Reels** — `workout-feed` ahora usa `scroll-snap-type: y mandatory` para navegar verticalmente entre días.
4. **Top App Bar** — Barra superior con logo APEX (solo móvil), selector de fecha central, y menú de 3 puntos.
5. **Botones Flotantes Up/Down** — FABs para navegar rápidamente entre tarjetas de entrenamiento.
6. **Fix Z-Index en Biblioteca** — Los menús desplegables de ejercicios ya no quedan recortados.
7. **Eliminación de Barra de Flechas** — Removida la navegación horizontal por flechas `< HOY >`.

---

## 4. Dependencias Externas

| Dependencia | Versión | Uso |
|------------|---------|-----|
| **Lucide Icons** | CDN (latest) | Sistema de íconos SVG |
| **Chart.js** | CDN (v4.x) | Gráficas de progreso en ejercicios |
| **Google Fonts** | DM Sans, Bebas Neue | Tipografía del sistema |

> ⚠️ No hay bundler ni framework JS. Todo es **Vanilla HTML/CSS/JS** servido estáticamente.

---

## 5. Comentarios para Backend

Todos los puntos de integración están marcados con comentarios `<!-- BACKEND: ... -->` en HTML y `// BACKEND:` en JS. Los endpoints esperados incluyen:

- `GET /exercises` — Lista de ejercicios con filtros
- `GET /exercises/{id}` — Detalle de ejercicio
- `GET /metrics/exercise/{id}` — Métricas y datos de gráfica
- `GET /sessions` — Historial de entrenamientos
- `POST /sessions` — Crear sesión
- `GET /routines` — Listar rutinas
- `POST /routines/{id}/exercises` — Añadir ejercicio a rutina
- `DELETE /exercises/{id}` — Eliminar ejercicio
- Auth: JWT en `localStorage` bajo la key `apex_token`

---

## 6. Próximos Pasos (Roadmap)

### 🔴 Prioridad Alta
- [ ] **Integración Backend (API REST):** Conectar todos los endpoints marcados con `// BACKEND:` a un servidor real.
- [ ] **DatePicker Funcional:** Implementar un calendario emergente al hacer clic en "HOY 📅" en `workout.html`, que permita saltar a una fecha específica.
- [ ] **Autenticación Real:** Conectar `auth.js` y `login.js` a un endpoint de JWT real (`POST /auth/login`, `POST /auth/register`).
- [ ] **CRUD de Ejercicios:** Hacer funcionales los botones "Editar" y "Eliminar" del menú desplegable de la biblioteca.

### 🟡 Prioridad Media
- [ ] **Animaciones de Ejercicios:** Integrar GIFs o videos en el tab "Cómo hacerlo" desde `exercises.animation_url`.
- [ ] **Mapa Muscular Visual:** Conectar el mapa SVG del cuerpo en el tab "Músculos" desde `exercises.muscle_map_url`.
- [ ] **Notificaciones Push:** Implementar recordatorios de entrenamiento.
- [ ] **Compartir Entreno:** Funcionalidad de compartir via Web Share API o generar imagen.
- [ ] **Paginación Infinita:** Activar el `IntersectionObserver` de `workout.js` para cargar más sesiones al hacer scroll.

### 🟢 Prioridad Baja
- [ ] **PWA (Progressive Web App):** Añadir `manifest.json` y service worker para instalar como app.
- [ ] **Dark/Light Auto:** Detectar `prefers-color-scheme` del OS y aplicar tema automáticamente.
- [ ] **I18n (Internacionalización):** Soporte para inglés y español.
- [ ] **Estadísticas Avanzadas:** Gráficas comparativas entre ejercicios, tendencias semanales/mensuales.
- [ ] **Social Feed:** Implementar un feed social donde los usuarios puedan ver entrenamientos de otros.
- [ ] **Exportar Datos:** Permitir exportar historial a CSV o PDF.
- [ ] **Tests E2E:** Crear suite de pruebas automatizadas con Playwright o Cypress.

### 🔵 Mejoras de UX/UI
- [ ] **Micro-animaciones:** Añadir transiciones de entrada/salida a las tarjetas del feed.
- [ ] **Skeleton Loaders:** Placeholder animados mientras cargan datos del backend.
- [ ] **Haptic Feedback (Mobile):** Vibración sutil al completar una serie.
- [ ] **Onboarding Flow:** Tutorial guiado para nuevos usuarios.
- [ ] **Accesibilidad (a11y):** Auditoría completa con axe-core o Lighthouse.
