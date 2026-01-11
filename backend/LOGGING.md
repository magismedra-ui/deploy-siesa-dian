# Sistema de Logging con Redis Streams

## Descripción

Sistema de logging centralizado basado en Redis Streams que permite:
- Persistencia de logs con políticas de rotación automática
- Consultas históricas con filtros avanzados
- Streaming en tiempo real hacia dashboards frontend
- Medición automática de tiempo de ejecución de procesos y jobs

## Variables de Entorno

### Configuración del Logger

```env
# Nombre del stream de Redis (default: 'logs-stream')
LOGS_STREAM_NAME=logs-stream

# Política de retención por cantidad (default: 2000000 registros)
LOGS_MAX_LENGTH=2000000

# Usar aproximación en XTRIM para mejor rendimiento (default: true)
LOGS_TRIM_APPROXIMATE=true

# Política de retención por tiempo en días (opcional, tiene prioridad sobre MAX_LENGTH)
# Si se establece, se usa MINID en lugar de MAXLEN
LOGS_RETENTION_DAYS=30
```

### Notas sobre Retención

- **Por defecto**: Se usa `MAXLEN` con 2 millones de registros máximo
- **Si `LOGS_RETENTION_DAYS` está configurado**: Se usa `MINID` para retener los últimos N días
- **Aproximación**: `LOGS_TRIM_APPROXIMATE=true` usa `~` en XTRIM, que es más eficiente pero menos preciso

## Modelo de Datos

Cada log contiene:

```javascript
{
  id: string,              // ID generado por Redis Stream
  jobId: string,           // ID del job de BullMQ
  proceso: string,         // Nombre del proceso (ej: "excel-processing", "conciliacion-process")
  nivel: string,           // Nivel de log: "info" | "warn" | "error"
  mensaje: string,         // Mensaje descriptivo
  timestamp: number,       // Timestamp en milisegundos (epoch ms)
  duracionSegundos?: number,   // Duración en segundos (opcional)
  duracionMinutos?: number     // Duración en minutos (opcional)
}
```

## API REST - Consulta Histórica

### Endpoint: `GET /api/v1/logs`

#### Query Parameters

| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `limit` | number | No | Límite de resultados (1-1000, default: 100) | `?limit=500` |
| `jobId` | string | No | Filtrar por ID de job específico | `?jobId=123` |
| `niveles` | string | No | Filtrar por niveles separados por comas | `?niveles=info,error` |
| `from` | number | No | Timestamp inicial en milisegundos | `?from=1640995200000` |
| `to` | number | No | Timestamp final en milisegundos | `?to=1641081600000` |
| `duracionMin` | number | No | Duración mínima en segundos | `?duracionMin=60` |
| `duracionMax` | number | No | Duración máxima en segundos | `?duracionMax=300` |

#### Ejemplos de Uso

```bash
# Obtener últimos 100 logs
GET /api/v1/logs

# Obtener logs de un job específico
GET /api/v1/logs?jobId=123

# Obtener solo errores y warnings
GET /api/v1/logs?niveles=error,warn&limit=50

# Obtener logs de un rango de tiempo
GET /api/v1/logs?from=1640995200000&to=1641081600000

# Obtener logs con duración entre 1 y 5 minutos
GET /api/v1/logs?duracionMin=60&duracionMax=300

# Combinar múltiples filtros
GET /api/v1/logs?jobId=123&niveles=error&limit=10
```

#### Respuesta

```json
{
  "success": true,
  "count": 100,
  "logs": [
    {
      "id": "1640995200000-0",
      "jobId": "123",
      "proceso": "excel-processing",
      "nivel": "info",
      "mensaje": "Procesamiento completado",
      "timestamp": 1640995200000,
      "duracionSegundos": 125.5,
      "duracionMinutos": 2.09
    }
  ]
}
```

## API SSE - Streaming en Tiempo Real

### Endpoint: `GET /api/v1/logs/stream`

Stream de logs en tiempo real usando Server-Sent Events (SSE).

#### Query Parameters (Opcionales)

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `jobId` | string | Filtrar por ID de job específico | `?jobId=123` |
| `niveles` | string | Filtrar por niveles separados por comas | `?niveles=info,error` |

#### Ejemplo de Uso

```javascript
// En el frontend
const eventSource = new EventSource('/api/v1/logs/stream?niveles=error,warn');

eventSource.onmessage = (event) => {
  const log = JSON.parse(event.data);
  console.log('Nuevo log:', log);
};

eventSource.onerror = (error) => {
  console.error('Error en stream:', error);
};
```

#### Formato de Mensajes SSE

Cada mensaje sigue el formato SSE estándar:

```
data: {"id":"1640995200000-0","jobId":"123","proceso":"excel-processing",...}

```

## Integración en Workers

Los workers están instrumentados automáticamente para registrar:

### Worker de Excel (`excel-processing`)

- ✅ Log de inicio del job
- ✅ Logs de progreso cada lote procesado
- ✅ Log de finalización con duración total
- ✅ Log de error con duración parcial

### Worker de Conciliación (`conciliacion-process`)

- ✅ Log de inicio del job
- ✅ Log de progreso al iniciar procesamiento
- ✅ Log de finalización con estadísticas y duración
- ✅ Log de error con duración parcial

## Medición de Duración

El sistema mide automáticamente la duración de cada job:

1. **Captura de inicio**: Se guarda `startTime` al inicio del job usando `Map` en memoria
2. **Cálculo al finalizar**: Se calcula la diferencia entre `endTime` y `startTime`
3. **Persistencia**: Se almacena tanto en segundos como en minutos (redondeado a 2 decimales)
4. **Consistencia**: Funciona incluso si el worker reinicia el proceso (usa metadata del job cuando es posible)

## Rendimiento

### Optimizaciones Implementadas

1. **XTRIM con aproximación**: Usa `~` para operaciones más rápidas
2. **Rotación asíncrona**: `setImmediate()` para no bloquear escrituras
3. **XREAD con BLOCK**: Evita polling constante en SSE
4. **Filtrado eficiente**: Lectura optimizada con rangos de IDs cuando es posible
5. **Paginación inteligente**: Lee más registros de los necesarios para compensar filtros

### Volumen Esperado

- **500-1200 logs por minuto**: Diseñado para manejar este volumen sin problemas
- **Escritura no bloqueante**: Los logs no afectan el rendimiento de los workers
- **Lectura optimizada**: XREVRANGE paginado para consultas históricas

## Monitoreo

### Métricas Recomendadas

1. **Tamaño del stream**: Monitorear el tamaño del stream en Redis
2. **Latencia de escritura**: Tiempo de respuesta de `XADD`
3. **Latencia de lectura**: Tiempo de respuesta de `XREVRANGE` y `XREAD`
4. **Clientes SSE activos**: Número de conexiones SSE simultáneas

### Comandos Redis Útiles

```bash
# Ver tamaño del stream
XLEN logs-stream

# Ver últimos 10 logs
XREVRANGE logs-stream + - COUNT 10

# Ver información del stream
XINFO STREAM logs-stream
```

## Troubleshooting

### Problema: Logs no se están guardando

1. Verificar conexión a Redis: `redis-cli PING`
2. Verificar que el stream existe: `redis-cli XLEN logs-stream`
3. Revisar logs de consola para errores del logger

### Problema: SSE no funciona

1. Verificar headers SSE en la respuesta
2. Verificar que el cliente soporta SSE
3. Revisar logs del servidor para errores de conexión

### Problema: Alto uso de memoria en Redis

1. Reducir `LOGS_MAX_LENGTH` o habilitar `LOGS_RETENTION_DAYS`
2. Verificar que la rotación se está ejecutando: monitorear `XTRIM`
3. Considerar usar aproximación si no está habilitada

## Próximos Pasos

- [ ] Agregar índices secundarios si es necesario
- [ ] Implementar agregaciones por proceso/nivel
- [ ] Dashboard frontend para visualización
- [ ] Alertas basadas en patrones de logs
- [ ] Exportación de logs a sistemas externos

