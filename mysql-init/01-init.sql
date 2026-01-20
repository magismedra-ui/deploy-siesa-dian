-- Script SQL para creación de tablas en phpMyAdmin / MySQL
-- Base de Datos: conciliacion_db

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------
-- 1. Tabla de Roles
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_roles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 2. Tabla de Usuarios
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sys_usuarios` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `nombre_completo` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `rol_id` INT(11) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_email` (`email`),
  CONSTRAINT `fk_usuario_rol`
    FOREIGN KEY (`rol_id`)
    REFERENCES `sys_roles` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 3. Tabla de Parámetros de Configuración
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cfg_parametros` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `clave` ENUM('TOLERANCIA_COP', 'REINTENTOS_MAX') NOT NULL,
  `valor` VARCHAR(255) NOT NULL,
  `tipo_dato` ENUM('NUMERICO', 'TEXTO', 'BOOLEANO') NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 4. Tabla de Ejecuciones de Procesos
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `proc_ejecuciones` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) NOT NULL,
  `fecha_inicio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` DATETIME DEFAULT NULL,
  `estado` ENUM('PENDIENTE', 'PROCESADO', 'FINALIZADO', 'FALLIDO') NOT NULL DEFAULT 'PENDIENTE',
  `docs_procesados` INT(11) DEFAULT 0,
  `tolerancia_usada` DECIMAL(18,2) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_ejecucion_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `sys_usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 5. Tabla de Documentos en Staging (Carga Inicial)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `proc_documentos_staging` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ejecucion_id` INT(11) NOT NULL,
  `fuente` ENUM('DIAN', 'SIESA') NOT NULL,
  `estado` ENUM('PENDIENTE', 'EMPAREJADO', 'CONCILIADO', 'CONCILIADO CON DIFERENCIA', 'NO CONCILIADO SOLO EN SIESA', 'NO CONCILIADO SOLO EN DIAN') NOT NULL DEFAULT 'PENDIENTE',
  `nit_proveedor` VARCHAR(50) NOT NULL,
  `num_factura` VARCHAR(50) NOT NULL,
  `fecha_emision` DATE NOT NULL,
  `valor_total` DECIMAL(18,2) NOT NULL,
  `impuestos` DECIMAL(18,2) DEFAULT 0.00,
  `payload_original` JSON DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_staging_ejecucion`
    FOREIGN KEY (`ejecucion_id`)
    REFERENCES `proc_ejecuciones` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 6. Tabla de Resultados de Conciliación
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `repo_resultados` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `ejecucion_id` INT(11) NOT NULL,
  `tipo_resultado` ENUM('CONCILIADO', 'CONCILIADO CON DIFERENCIA', 'NO CONCILIADO SOLO EN SIESA', 'NO CONCILIADO SOLO EN DIAN') NOT NULL,
  `nit_proveedor` VARCHAR(20) NOT NULL,
  `num_factura` VARCHAR(50) NOT NULL,
  `fecha_emision` DATE NOT NULL,
  `valor_dian` DECIMAL(18,2) DEFAULT NULL,
  `valor_siesa` DECIMAL(18,2) DEFAULT NULL,
  `diferencia` DECIMAL(18,2) DEFAULT NULL,
  `observacion` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_resultado_ejecucion`
    FOREIGN KEY (`ejecucion_id`)
    REFERENCES `proc_ejecuciones` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------
-- 7. Datos iniciales
-- --------------------------------------------------------

-- Insertar rol Admin si no existe
INSERT INTO sys_roles (nombre, descripcion)
SELECT 'Admin', 'Acceso general'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_roles WHERE nombre = 'Admin'
);

-- Insertar usuario Administrador si no existe
-- NOTA: password_hash debe ser un hash bcrypt, no texto plano
-- La contraseña es 'admin00' y su hash bcrypt es: $2a$10$2DgiyHlsZl1I./wWbym1heW5H2qjyncxW4QXpqCIQB.5eJKbA3VYS
INSERT INTO sys_usuarios (nombre_completo, email, password_hash, rol_id, estado)
SELECT 
    'Administrador',
    'admin@administrador.com',
    '$2a$10$2DgiyHlsZl1I./wWbym1heW5H2qjyncxW4QXpqCIQB.5eJKbA3VYS',
    (SELECT id FROM sys_roles WHERE nombre = 'Admin' LIMIT 1),
    'ACTIVO'
WHERE NOT EXISTS (
    SELECT 1 FROM sys_usuarios WHERE email = 'admin@administrador.com'
);

-- Si el usuario ya existe con password_hash en texto plano, actualizarlo
-- Esto solo se ejecutará si la contraseña no está hasheada (menos de 50 caracteres)
UPDATE sys_usuarios 
SET password_hash = '$2a$10$2DgiyHlsZl1I./wWbym1heW5H2qjyncxW4QXpqCIQB.5eJKbA3VYS'
WHERE email = 'admin@administrador.com' 
  AND LENGTH(password_hash) < 50;

COMMIT;