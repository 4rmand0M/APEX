# CRUD de Rutinas — Resumen de Implementación

**Fecha:** 4 de mayo de 2026  
**Estado:** ✅ COMPLETADO  

---

## Resumen de Cambios Realizados

### 1. **Funciones CRUD Completadas**

#### ✅ CREATE (Crear)
- **`crearNuevaRutina()`** - Crea una nueva rutina en Supabase y la abre en modo edición
- **`seleccionarEjercicioDeBiblioteca(ejId)`** - Añade un ejercicio a la rutina actual desde la biblioteca
- **`anadirSerie(ejId)`** - Añade una serie a un ejercicio

#### ✅ READ (Leer)
- **`cargarRutinas()`** - Carga todas las rutinas del usuario desde Supabase
- **`cargarEjerciciosRutina(rutinaId)`** - Carga los ejercicios de una rutina específica
- **`cargarBiblioteca()`** - Carga la biblioteca global de ejercicios
- **`abrirRutina(rutinaId)`** - Abre el detalle de una rutina

#### ✅ UPDATE (Actualizar)
- **`guardarCambios()`** - Guarda los cambios de la rutina en Supabase (completa)
- **`guardarCambiosRutina()`** - Guarda cambios del nombre de la rutina
- **`sincronizarValoresLectura()`** - Sincroniza valores después de editar
- **`filtrarBiblioteca()`** - Filtra ejercicios por búsqueda y músculo

#### ✅ DELETE (Eliminar)
- **`eliminarEjercicio(ejId)`** - **[NUEVA]** Elimina un ejercicio de la rutina
- **`eliminarSerie(boton)`** - Elimina una serie de un ejercicio
- **`confirmarEliminacionRutina()`** - Elimina una rutina completa

---

### 2. **Mejoras Principales**

#### Estado Global
```javascript
const Estado = {
  modoEdicion: false,
  rutinaCargada: null,
  ejerciciosEnRutina: [],
  contadorSerie: 0,  // ✅ AÑADIDO para IDs únicos
  bibliotecaAbierta: false,
  musculoFiltro: 'todos',
  queryBusqueda: '',
  ejerciciosBiblioteca: [],
};
```

#### Funciones de Validación
- **`isValidUUID(uuid)`** - **[NUEVA]** Valida UUIDs antes de guardar en Supabase

#### Funciones de Utilidad
- **`manejarDescanso(boton)`** - Incrementa/decrementa descanso entre series
- **`toggleCheckSerie(boton)`** - Marca/desmarca serie como completada
- **`actualizarTipoBadge(select)`** - Actualiza el badge de tipo de serie
- **`actualizarProgreso()`** - Actualiza barra de progreso
- **`actualizarIndicadoresProgreso()`** - Genera indicadores de ejercicios
- **`actualizarStatsPanel()`** - Actualiza estadísticas del panel

---

### 3. **Estructura de Datos del Payload**

```javascript
{
  rutina_id: UUID,
  nombre: "Nombre de la Rutina",
  ejercicios: [
    {
      id: "temp-id",
      exercise_id: UUID, // Del ejercicio en tabla exercises
      nombre: "Nombre del Ejercicio",
      musculo: "Pecho",
      orden: 1,
      descanso_segundos: 60,
      series: [
        {
          id: "serie-id",
          orden: 1,
          tipo: "normal", // warmup, normal, dropset, failure
          peso_kg: 100,
          repeticiones: 10
        }
      ]
    }
  ],
  actualizado_en: ISO_TIMESTAMP
}
```

---

### 4. **Tablas Supabase Utilizadas**

| Tabla | Operación | Estado |
|-------|-----------|--------|
| `routines` | INSERT, UPDATE, SELECT, DELETE | ✅ |
| `routine_exercises` | INSERT, UPDATE, SELECT, DELETE | ✅ |
| `exercises` | SELECT | ✅ |
| `profiles` | SELECT (usuario actual) | ✅ |

---

### 5. **Flujo de Edición**

```
Lista de Rutinas
    ↓
Abrir Rutina (cargarEjerciciosRutina)
    ↓
Modo Entrenamiento (ver)
    ↓
Activar Modo Edición (activarModoEdicion)
    ↓
Editar Ejercicios/Series
    ↓
Guardar Cambios (guardarCambios → Supabase)
    ↓
Salir Modo Edición (desactivarModoEdicion)
    ↓
Volver a Lista (mostrarVistaLista)
```

---

### 6. **Flujo de Manejo de Biblioteca**

```
Abrir Biblioteca (abrirBiblioteca)
    ↓
¿Biblioteca Cargada?
    ├─ NO → Cargar (cargarBiblioteca)
    └─ SÍ → Filtrar (filtrarBiblioteca)
    ↓
Seleccionar Ejercicio (seleccionarEjercicioDeBiblioteca)
    ↓
Añadir a rutina (Estado.ejerciciosEnRutina)
    ↓
Renderizar (renderizarEjerciciosRutina)
    ↓
Cerrar (cerrarBiblioteca)
```

---

### 7. **Cambios en HTML/CSS**

Atributos de datos agregados a plantillas:
- `data-ejercicio-id` - ID del ejercicio
- `data-real-exercise-id` - UUID del ejercicio en tabla exercises
- `data-nombre` - Nombre del ejercicio
- `data-serie-id` - ID único de serie
- `data-tipo` - Tipo de serie (warmup, normal, dropset, failure)

---

### 8. **Testing Recomendado**

#### Casos de Uso Principales
- [ ] Crear nueva rutina
- [ ] Añadir ejercicio desde biblioteca
- [ ] Editar nombre de rutina
- [ ] Cambiar descanso entre series
- [ ] Añadir/eliminar series
- [ ] Cambiar tipo de serie
- [ ] Guardar cambios → Verificar en BD
- [ ] Eliminar ejercicio
- [ ] Eliminar rutina
- [ ] Modo entrenamiento → marcar series

#### Casos Edge
- [ ] Guardar rutina sin ejercicios
- [ ] IDs inválidos/UUIDs mal formados
- [ ] Cerrar sesión mientras se edita
- [ ] Recargar página durante edición

---

### 9. **Funciones Pendientes de Testing**

Las siguientes funciones necesitan be verificadas en contexto real:

1. **`garantizarAuth()`** - Verificar autenticación antes de operaciones DB
2. **Sincronización de estado** - Después de guardar, el estado debe actualizarse
3. **Errores de red** - Manejar desconexión durante operaciones
4. **Conflictos de concurrencia** - Si dos pestañas editan la misma rutina

---

### 10. **Notas Importantes**

- ⚠️ El `exercise_id` debe ser un UUID válido de la tabla `exercises`
- ⚠️ Los IDs de rutinas y ejercicios son UUIDs generados por Supabase
- ⚠️ La validación `isValidUUID()` previene errores en insert
- ✅ Se mantiene compatibilidad con la estructura existente
- ✅ Todas las funciones tienen documentación JSDoc

---

## Archivos Modificados

- `/assets/js/rutina.js` — Todas las funciones completadas
- Sistema de BD: Supabase (PostgreSQL)

---

## Próximos Pasos Sugeridos

1. **Validaciones de entrada** - Añadir validaciones más estrictas del lado del cliente
2. **Historial de cambios** - Guardar versiones anteriores de rutinas
3. **Compartir rutinas** - Permitir que usuarios compartan rutinas públicamente
4. **Duplicar rutina** - Opción para copiar una rutina existente
5. **Backup automático** - Guardar borradores mientras se edita
6. **Analytics** - Registrar cuándo se completan rutinas
