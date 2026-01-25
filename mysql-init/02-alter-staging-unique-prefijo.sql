-- Migración: incluir prefijo en índice único de proc_documentos_staging
-- Permite mismo NIT + Folio con distinto Prefijo (ej. BZ10, PPD1, PAV2).
-- Ejecutar en BD existente que tenga idx_unique_documento sobre (fuente, nit_proveedor, num_factura).

USE conciliacion_db;

-- Eliminar índice único anterior (3 columnas)
ALTER TABLE proc_documentos_staging DROP INDEX idx_unique_documento;

-- Crear nuevo índice único (4 columnas: incluye prefijo)
ALTER TABLE proc_documentos_staging
  ADD UNIQUE KEY idx_unique_documento (fuente, nit_proveedor, num_factura, prefijo);
