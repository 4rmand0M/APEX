# Ejemplos de Uso - CRUD de Rutinas

## 1. Crear Nueva Rutina

```javascript
// Botón "Nueva rutina" dispara:
await crearNuevaRutina();

// Hace:
// 1. Obtiene usuario autenticado
// 2. Inserta nueva rutina en BD con nombre "Nueva Rutina"
// 3. La abre en modo edición
// 4. Permite editar el nombre inmediatamente
```

---

## 2. Cargar Rutinas del Usuario

```javascript
// En inicializarApp(), se llama automáticamente:
await cargarRutinas();

// Resultado: lista de rutinas renderizada en #lista-mis-rutinas
// Datos traídos de:
// SELECT * FROM routines WHERE user_id = {id_usuario}
```

---

## 3. Abrir Rutina Específica

```javascript
// Al clicar en tarjeta de rutina:
await abrirRutina('550e8400-e29b-41d4-a716-446655440000');

// Hace:
// 1. Carga ejercicios: SELECT ... FROM routine_exercises WHERE routine_id = {id}
// 2. Renderiza ejercicios con sus series
// 3. Actualiza panel de estadísticas
// 4. Cambia a vista de detalle
```

---

## 4. Añadir Ejercicio desde Biblioteca

```javascript
// Usuario abre biblioteca y selecciona un ejercicio:
seleccionarEjercicioDeBiblioteca('exercise-uuid-123');

// Hace:
// 1. Busca ejercicio en Estado.ejerciciosBiblioteca
// 2. Crea objeto con estructura de rutina_exercises
// 3. Lo añade a Estado.ejerciciosEnRutina
// 4. Re-renderiza lista de ejercicios
// 5. Muestra toast: "Ejercicio Añadido"

// Objeto creado:
{
  id: "temp-1715000000000",
  exercise_id: "exercise-uuid-123",       // ID real del servicio
  nombre: "Bench Press",
  musculo: "Pecho",
  sets: 3,
  reps: "10",
  rest: 60,
  order: 2  // Se añade al final
}
```

---

## 5. Editar Rutina (Modo Edición)

```javascript
// Usuario hace clic en "Editar rutina":
activarModoEdicion();

// Cambios visuales:
// - Muestra campos de entrada
// - Oculta badges de lectura
// - Muestra botón "Añadir ejercicio"
// - Muestra barra de acciones (Guardar/Cancelar)

// Usuario edita:
// - Título de rutina
// - Descanso entre series
// - Tipo de serie (warmup, normal, dropset, failure)
// - Peso y reps de cada serie
// - Añade/elimina ejercicios
// - Añade/elimina series

// Luego guarda:
await guardarCambios();
```

---

## 6. Guardar Cambios (Proceso Completo)

```javascript
async function guardarCambios() {
  // 1. Recopila datos actuales del DOM
  const payload = recopilarDatosRutina();
  console.log(payload);
  // {
  //   rutina_id: "rutina-uuid",
  //   nombre: "Mi Rutina de Pecho",
  //   ejercicios: [
  //     {
  //       id: "temp-id",
  //       exercise_id: "exercise-uuid",
  //       nombre: "Bench Press",
  //       musculo: "Pecho",
  //       orden: 1,
  //       descanso_segundos: 60,
  //       series: [
  //         {
  //           id: "serie-1",
  //           orden: 1,
  //           tipo: "warmup",
  //           peso_kg: 60,
  //           repeticiones: 10
  //         },
  //         {
  //           id: "serie-2",
  //           orden: 2,
  //           tipo: "normal",
  //           peso_kg: 100,
  //           repeticiones: 8
  //         }
  //       ]
  //     }
  //   ],
  //   actualizado_en: "2026-05-04T10:30:45.123Z"
  // }

  // 2. Valida usuario autenticado
  const user = await window.ApexAuth.getUser();

  // 3. Actualiza la rutina en BD
  await db.from('routines')
    .update({ 
      name: payload.nombre,
      updated_at: payload.actualizado_en 
    })
    .eq('id', payload.rutina_id)
    .eq('user_id', user.id);

  // 4. Elimina ejercicios viejos
  await db.from('routine_exercises')
    .delete()
    .eq('routine_id', payload.rutina_id);

  // 5. Inserta nuevos ejercicios
  for (const ej of payload.ejercicios) {
    if (!isValidUUID(ej.exercise_id)) continue; // Skip si no válido
    
    await db.from('routine_exercises')
      .insert({
        routine_id: payload.rutina_id,
        exercise_id: ej.exercise_id,
        order: ej.orden,
        target_sets: ej.series.length,
        target_reps: ej.series[0].repeticiones.toString(),
        rest_time_seconds: ej.descanso_segundos
      });
  }

  // 6. Sincroniza valores en UI
  sincronizarValoresLectura();

  // 7. Muestra notificación
  mostrarToast('Cambios guardados correctamente');

  // 8. Sale del modo edición
  desactivarModoEdicion();
}
```

---

## 7. Eliminar Ejercicio

```javascript
// Usuario hace clic en botón eliminar de ejercicio:
eliminarEjercicio('temp-1715000000000');

// Hace:
// 1. Busca tarjeta con data-ejercicio-id
// 2. Animación de fade-out
// 3. Elimina del DOM
// 4. Actualiza Estado.ejerciciosEnRutina
// 5. Re-calcula estadísticas
// 6. Muestra toast: "Ejercicio eliminado"

// NO elimina de BD hasta que se guarden los cambios
```

---

## 8. Añadir Serie a Ejercicio

```javascript
// Usuario hace clic en "+ Añadir serie":
anadirSerie('temp-exercise-id');

// Hace:
// 1. Cuenta series actuales del ejercicio
// 2. Genera ID único: serie-nueva-{contador}
// 3. Crea nueva fila HTML
// 4. Inserta en tbody del ejercicio
// 5. Incrementa Estado.contadorSerie
// 6. Recrea iconos lucide
// 7. Actualiza estadísticas

// Nueva serie con valores por defecto:
// - Tipo: normal
// - Peso: vacío
// - Reps: vacío
```

---

## 9. Eliminar Serie

```javascript
// Usuario hace clic en X de serie:
eliminarSerie(botonElement);

// Hace:
// 1. Encuentra fila más cercana
// 2. Animación de fade-out
// 3. Elimina fila del DOM
// 4. Re-numera series restantes (1, 2, 3...)
// 5. Actualiza estadísticas
// 6. Actualiza progreso

// Ejemplo resultado:
// Si había: SET 1, SET 2, SET 3
// Usuario elimina SET 2
// Resultado: SET 1, SET 2 (antes 3)
```

---

## 10. Marcar Serie como Completada (Modo Entrenamiento)

```javascript
// Usuario hace clic en botón ✓ de serie:
toggleCheckSerie(botonCheckElement);

// Hace:
// 1. Toggle aria-pressed del botón
// 2. Toggle clase .completado en botón
// 3. Verifica si TODAS las series del ejercicio están completadas
// 4. Si sí: marca ejercicio como completado
// 5. Actualiza barra de progreso general
// 6. Actualiza indicadores de ejercicios

// Resultado visual:
// - Botón ✓ se activa/desactiva
// - Barra de progreso sube
// - Indicador de ejercicio se marca como completado
```

---

## 11. Cargar Biblioteca de Ejercicios

```javascript
// Primera vez que se abre biblioteca:
await cargarBiblioteca();

// Hace:
// 1. SELECT * FROM exercises ORDER BY name
// 2. Guarda en Estado.ejerciciosBiblioteca
// 3. Llama filtrarBiblioteca() automáticamente

// Datos traídos (ejemplo):
[
  {
    id: "exercise-uuid-1",
    name: "Bench Press",
    muscle_group: "Pecho",
    description: "Ejercicio básico...",
    equipment: "Barbell",
    media_url: "https://..."
  },
  // ... más ejercicios
]
```

---

## 12. Filtrar Biblioteca

```javascript
// Usuario:
// - Escribe en buscador: "bench"
// - Selecciona músculo: "Pecho"

// Se dispara automáticamente cada cambio:
filtrarBiblioteca();

// Hace:
// 1. Lee Estado.queryBusqueda (ej: "bench")
// 2. Lee Estado.musculoFiltro (ej: "Pecho")
// 3. Filtra Estado.ejerciciosBiblioteca:
//    - nombre contiene "bench" (case-insensitive)
//    - muscle_group es "Pecho" o filterMusculo es "todos"
// 4. Renderiza resultados filtrados

// Resultado: solo "Bench Press" se muestra
```

---

## 13. Modo Entrenamiento vs Edición

```javascript
// MODO ENTRENAMIENTO (por defecto)
// Visible:
// - ✓ check buttons para marcar series
// - Estadísticas del panel
// - Indicadores de progreso
// Hidden:
// - Inputs de edición
// - Botones de eliminar
// - Selector de tipo de serie

// MODO EDICIÓN
activarModoEdicion();
// Visible:
// - Inputs de peso y reps
// - Selector de tipo de serie
// - Botones de eliminar
// - Botón "Añadir serie"
// Hidden:
// - Check buttons
// - Badges de lectura

// Toggle:
const toggle = document.getElementById('toggle-modo');
toggle.click(); // Cambia entre modos
```

---

## 14. Validación de UUID

```javascript
// Antes de guardar ejercicio en BD:
isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
isValidUUID('invalid-uuid'); // false
isValidUUID(''); // false

// Se usa en:
if (!isValidUUID(ej.exercise_id)) {
  console.warn('ID inválido, omitiendo ejercicio');
  continue; // Skip this exercise
}
```

---

## 15. Estructura de Datos en Estado

```javascript
Estado = {
  // Rutina actual
  modoEdicion: false,
  rutinaCargada: 'rutina-uuid-123',
  
  // Ejercicios de la rutina actual (draft)
  ejerciciosEnRutina: [
    {
      id: 'temp-1715000000000',
      exercise_id: 'exercise-uuid',
      nombre: 'Bench Press',
      musculo: 'Pecho',
      sets: 3,
      reps: '10',
      rest: 60,
      order: 1
    }
  ],
  
  // Contador para generar IDs únicos de series
  contadorSerie: 5,
  
  // Estado de biblioteca
  bibliotecaAbierta: false,
  musculoFiltro: 'todos',
  queryBusqueda: 'bench',
  ejerciciosBiblioteca: [
    { id: 'exercise-uuid-1', name: 'Bench Press', ... },
    { id: 'exercise-uuid-2', name: 'Incline Bench', ... }
  ]
}
```

---

## Error Handling

```javascript
try {
  await guardarCambios();
} catch (err) {
  console.error('[APEX] Error:', err);
  mostrarToast('Error al guardar. Intenta nuevamente.');
}

// Errores comunes:
// 1. Usuario no autenticado → "Debes iniciar sesión"
// 2. BD no disponible → "Database no disponible"
// 3. UUID inválido → Se omite ejercicio (warn)
// 4. Conexión de red → Error de Supabase

// Validaciones:
// - ejercicio_id es UUID válido ✓
// - routine_id existe ✓
// - user_id pertenece al usuario autenticado ✓
```

---

## Casos de Uso Completos

### Caso 1: Usuario crea rutina desde cero

```javascript
// 1. Clic botón "Nueva rutina"
await crearNuevaRutina();

// 2. Se abre en modo edición automáticamente
// Estado.modoEdicion = true

// 3. Edita nombre
documento.getElementById('titulo-rutina-actual').textContent = 'Mi Rutina';

// 4. Abre biblioteca y selecciona ejercicios
await abrirBiblioteca();
seleccionarEjercicioDeBiblioteca('exercise-uuid-1');
seleccionarEjercicioDeBiblioteca('exercise-uuid-2');

// 5. Edita series de cada ejercicio
anadirSerie('temp-exercise-id-1');
// ... edita peso, reps, tipo

// 6. Guarda
await guardarCambios();

// 7. Se cierra modo edición, vuelve a lista
mostrarVistaLista();
```

### Caso 2: Usuario entrena con rutina existente

```javascript
// 1. Abre rutina
await abrirRutina('rutina-uuid');

// 2. Ya está en modo entrenamiento (defecto)
// 3. Comienza a marcar series ✓
// 4. Indicadores de progreso se actualizan
// 5. Al terminar, usuario continúa a siguiente rutina o guarda datos

// Los datos se guardan en workout_sessions/workout_logs si hay integración
```

### Caso 3: Usuario modifica rutina existente

```javascript
// 1. Abre rutina
await abrirRutina('rutina-uuid');

// 2. Activa modo edición
activarModoEdicion();

// 3. Modifica:
// - Añade ejercicio
seleccionarEjercicioDeBiblioteca('exercise-uuid-new');

// - Elimina ejercicio
eliminarEjercicio('temp-exercise-id');

// - Edita series
anadirSerie(); // +1 serie
eliminarSerie(); // -1 serie

// 4. Guarda cambios
await guardarCambios();

// 5. Vuelve a entrenamiento normal
```
