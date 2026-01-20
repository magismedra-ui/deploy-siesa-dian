-- Script de migración para actualizar ENUMs
-- Ejecutar este script en bases de datos existentes

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;

-- Actualizar ENUM de estado en proc_documentos_staging
ALTER TABLE `proc_documentos_staging` 
MODIFY COLUMN `estado` ENUM(
  'PENDIENTE',
  'EMPAREJADO',
  'CONCILIADO',
  'CONCILIADO CON DIFERENCIA',
  'NO CONCILIADO SOLO EN SIESA',
  'NO CONCILIADO SOLO EN DIAN'
) NOT NULL DEFAULT 'PENDIENTE';

-- Actualizar ENUM de tipo_resultado en repo_resultados
ALTER TABLE `repo_resultados`
MODIFY COLUMN `tipo_resultado` ENUM(
  'CONCILIADO',
  'CONCILIADO CON DIFERENCIA',
  'NO CONCILIADO SOLO EN SIESA',
  'NO CONCILIADO SOLO EN DIAN'
) NOT NULL;

COMMIT;
