# Guía para Actualizar Docker

## Opción 1: Reconstruir solo los servicios modificados (Recomendado)

### Si solo modificaste el backend (excel-worker.service.js):
```bash
docker-compose build api
docker-compose up -d api
```

### Si solo modificaste el frontend:
```bash
docker-compose build frontend
docker-compose up -d frontend nginx
```

### Si modificaste ambos:
```bash
docker-compose build api frontend
docker-compose up -d api frontend nginx
```

## Opción 2: Reconstruir todo desde cero (Más lento pero más seguro)

```bash
# Detener todos los contenedores
docker-compose down

# Reconstruir todas las imágenes
docker-compose build --no-cache

# Iniciar todos los servicios
docker-compose up -d
```

## Opción 3: Reconstruir y reiniciar todo (Recomendado para producción)

```bash
# Reconstruir sin usar caché (asegura que los cambios se apliquen)
docker-compose build --no-cache api frontend

# Reiniciar los servicios
docker-compose up -d
```

## Verificar que todo esté funcionando

```bash
# Ver el estado de los contenedores
docker-compose ps

# Ver los logs del backend
docker-compose logs -f api

# Ver los logs del frontend
docker-compose logs -f frontend

# Ver todos los logs
docker-compose logs -f
```

## Comandos útiles adicionales

```bash
# Ver logs en tiempo real de un servicio específico
docker-compose logs -f api

# Detener un servicio específico
docker-compose stop api

# Reiniciar un servicio específico
docker-compose restart api

# Ver el uso de recursos
docker stats

# Limpiar imágenes y contenedores no utilizados (cuidado)
docker system prune -a
```

## Para producción en AWS Ubuntu

Si estás en tu servidor AWS, usa los mismos comandos pero asegúrate de estar en el directorio correcto:

```bash
# Navegar al directorio del proyecto
cd /ruta/a/tu/proyecto

# Reconstruir y actualizar
docker-compose build --no-cache api
docker-compose up -d api

# Verificar logs
docker-compose logs -f api
```
