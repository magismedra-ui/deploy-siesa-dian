# Sistema de Sincronización y Control de Schedulers

## Descripción

Sistema completo para controlar dinámicamente la sincronización de facturas y la conciliación mediante variables globales y un endpoint de configuración.

## Variables Globales

### schedulerEnabled
- **Tipo**: `null | false | true`
- **Valores**:
  - `null`: Deshabilitado completamente, detener todos los schedulers
  - `false`: Modo manual, solo ejecución bajo demanda
  - `true`: Modo automático, ejecutar según configuración
- **Inicialización**: Desde `process.env.SCHEDULER_ENABLED` o `null` por defecto

### cronExpressionn
- **Tipo**: `string` (formato cron)
- **Descripción**: Expresión cron para el scheduler de conciliación
- **Default**: `'0 * * * *'` (cada hora)
- **Inicialización**: Desde `process.env.CRON_EXPRESSIONN` o `'0 * * * *'` por defecto

## Sincronización de Facturas

### Comportamiento

1. **Al iniciar el servidor**: Se ejecuta **siempre** una sincronización inicial
2. **Modo automático** (`schedulerEnabled === true`): Se ejecuta cada 12 horas automáticamente
3. **Modo manual** (`schedulerEnabled === false`): Solo se ejecuta mediante endpoint manual
4. **Modo deshabilitado** (`schedulerEnabled === null`): No se ejecuta automáticamente

### Funcionalidad

- Consulta facturas desde SIESA (últimos 30 días)
- Inserta en `proc_documentos_staging` con `ignoreDuplicates: true`
- No actualiza `docs_procesados` (permanece en 0)
- Mantiene `estado: 'PENDIENTE'` en ejecución
- Publica logs en Redis Streams con:
  - `proceso: "sync-facturas"`
  - Nivel: `info`, `warn`, `error`
  - Duración en segundos y minutos

### Reintentos

- Máximo 3 intentos con backoff exponencial (2s, 4s, 8s)
- Manejo de timeouts y errores de red
- Prevención de ejecuciones concurrentes

## Conciliación

### Comportamiento

El worker de conciliación (`setupConciliacionWorker()`) **siempre se inicializa** para procesar jobs manuales.

El scheduler de conciliación depende de:
- `schedulerEnabled === true`: Activa scheduler usando `cronExpressionn`
- `schedulerEnabled === false`: Solo modo manual (sin scheduler)
- `schedulerEnabled === null`: Deshabilitado completamente

### Frecuencia

Controlada exclusivamente por `cronExpressionn` cuando `schedulerEnabled === true`.

## Endpoints

### POST /api/v1/scheduler/config

Configurar schedulers dinámicamente sin reiniciar el servidor.

**Body:**
```json
{
  "schedulerEnabled": true,
  "cronExpressionn": "*/4 * * * *"
}
```

**Parámetros:**
- `schedulerEnabled` (opcional): `null | false | true`
- `cronExpressionn` (opcional): string con formato cron válido

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuración del scheduler actualizada",
  "config": {
    "schedulerEnabled": true,
    "cronExpressionn": "*/4 * * * *",
    "previous": {
      "schedulerEnabled": false,
      "cronExpressionn": "0 * * * *"
    }
  }
}
```

### GET /api/v1/scheduler/config

Obtener configuración actual.

**Respuesta:**
```json
{
  "success": true,
  "config": {
    "schedulerEnabled": true,
    "cronExpressionn": "*/4 * * * *"
  }
}
```

### POST /api/v1/scheduler/sync-facturas

Ejecutar sincronización de facturas manualmente.

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Sincronización completada exitosamente",
  "resultado": {
    "ejecucionId": 123,
    "registrosProcesados": 500,
    "duracionSegundos": 45.5,
    "duracionMinutos": 0.76
  }
}
```

**Respuesta si ya está ejecutándose:**
```json
{
  "success": false,
  "message": "La sincronización ya está en ejecución. Espere a que finalice.",
  "running": true
}
```

### GET /api/v1/scheduler/sync-facturas/status

Obtener estado de la última ejecución.

**Respuesta:**
```json
{
  "success": true,
  "running": false,
  "lastExecution": {
    "success": true,
    "timestamp": "2026-01-05T10:30:00.000Z",
    "ejecucionId": 123,
    "registrosProcesados": 500,
    "duracionSegundos": 45.5
  }
}
```

## Flujo de Inicialización

```
1. Servidor inicia
2. Se inicializan variables globales desde .env
3. Se inicializa Logger
4. Se inicializan Workers (Excel y Conciliación)
5. Se ejecuta sincronización inicial (bootstrap, asíncrono)
6. Si schedulerEnabled === true:
   - Se configura scheduler de sincronización (cada 12h)
   - Se configura scheduler de conciliación (según cronExpressionn)
7. Si schedulerEnabled === false:
   - No se configuran schedulers (modo manual)
8. Si schedulerEnabled === null:
   - No se configuran schedulers (deshabilitado)
```

## Logs en Redis Streams

Todos los logs siguen el formato estándar:

```javascript
{
  id: "1640995200000-0",
  jobId: "sync-facturas-1640995200000",
  proceso: "sync-facturas",
  nivel: "info",
  mensaje: "Sincronización completada exitosamente. Ejecución ID: 123...",
  timestamp: 1640995200000,
  duracionSegundos: 45.5,
  duracionMinutos: 0.76
}
```

## Variables de Entorno

```env
# Configuración del Scheduler
SCHEDULER_ENABLED=true          # null, false, o true
CRON_EXPRESSIONN="*/4 * * * *"  # Expresión cron para conciliación

# Configuración del Logger (ver LOGGING.md)
LOGS_STREAM_NAME=logs-stream
LOGS_MAX_LENGTH=2000000
```

## Ejemplos de Uso

### Activar modo automático con conciliación cada 4 minutos

```bash
POST /api/v1/scheduler/config
{
  "schedulerEnabled": true,
  "cronExpressionn": "*/4 * * * *"
}
```

### Desactivar schedulers (modo manual)

```bash
POST /api/v1/scheduler/config
{
  "schedulerEnabled": false
}
```

### Cambiar solo la frecuencia de conciliación

```bash
POST /api/v1/scheduler/config
{
  "cronExpressionn": "0 */6 * * *"  # Cada 6 horas
}
```

### Ejecutar sincronización manual

```bash
POST /api/v1/scheduler/sync-facturas
```

## Protecciones

- **Prevención de concurrencia**: Flag `isRunning` previene ejecuciones simultáneas
- **Gestión de schedulers**: Se detienen schedulers anteriores antes de crear nuevos
- **Manejo de errores**: Logs en Redis Streams sin afectar workers
- **Timeouts**: Configurables para evitar bloqueos
- **Reintentos**: Controlados con backoff exponencial

## Notas Técnicas

- Los schedulers usan `node-cron` con timezone `America/Bogota`
- La sincronización inicial se ejecuta con `setImmediate()` para no bloquear el inicio
- Las variables globales se actualizan en tiempo real sin reiniciar el servidor
- El worker de conciliación siempre está activo para procesar jobs manuales
- Los logs son compatibles con el dashboard existente de Redis Streams

