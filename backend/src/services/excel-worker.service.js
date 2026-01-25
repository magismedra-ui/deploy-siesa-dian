const { Worker } = require("bullmq");
const { Op } = require("sequelize");
const { redisConnection } = require("../config/queue");
const XLSX = require("xlsx");
const fs = require("fs");
const Ejecucion = require("../database/models/Ejecucion");
const DocumentoStaging = require("../database/models/DocumentoStaging");
const { log, calcularDuracionMinutos } = require("../logger/redisLogger");

// Helper robusto para parsear fechas (acepta múltiples formatos)
// Compatible con el código existente y maneja datos planos sin formatos
const parseDate = (dateInput) => {
  // Si es null o undefined, retornar null
  if (!dateInput) return null;
  
  // Si ya es un objeto Date válido, retornarlo
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  // Si es número (serial date de Excel), convertir
  if (typeof dateInput === 'number') {
    // Excel serial date: días desde 1900-01-01 (pero Excel cuenta desde 1900-01-00)
    // JavaScript Date: milisegundos desde 1970-01-01
    // Excel epoch: 30 de diciembre de 1899
    const excelEpoch = new Date(1899, 11, 30); // Mes 11 = diciembre (0-based)
    const jsDate = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
    return isNaN(jsDate.getTime()) ? null : jsDate;
  }
  
  // Si no es string, convertir a string
  const dateStr = typeof dateInput === 'string' ? dateInput.trim() : String(dateInput).trim();
  if (!dateStr || dateStr === '') return null;
  
  // Intentar parseo directo con new Date() primero
  let parsedDate = new Date(dateStr);
  
  // Si new Date() funciona y es válida, retornarla
  if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 1900) {
    return parsedDate;
  }
  
  // Si falla, intentar parseo manual para formatos comunes
  // Formatos soportados: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, YYYY/MM/DD, DD.MM.YYYY
  const separators = /[-/.]/;
  const parts = dateStr.split(separators);
  
  if (parts.length === 3) {
    let day, month, year;
    
    // Detectar formato: si el primer elemento tiene 4 dígitos, es YYYY-MM-DD
    if (parts[0].length === 4 && parts[0].match(/^\d{4}$/)) {
      // Formato: YYYY-MM-DD o YYYY/MM/DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1; // 0-based
      day = parseInt(parts[2], 10);
    } else {
      // Formato: DD-MM-YYYY o DD/MM/YYYY (asumir año al final)
      if (parts[2].length === 4 && parts[2].match(/^\d{4}$/)) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // 0-based
        year = parseInt(parts[2], 10);
      } else {
        // Formato ambiguo, intentar ambos
        // Primero intentar DD-MM-YY (año de 2 dígitos)
        if (parts[2].length === 2) {
          const year2 = parseInt(parts[2], 10);
          const year4 = year2 < 50 ? 2000 + year2 : 1900 + year2; // 00-49 = 2000-2049, 50-99 = 1950-1999
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = year4;
        } else {
          return null; // Formato no reconocido
        }
      }
    }
    
    // Validar que los valores son válidos
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
        day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900) {
      parsedDate = new Date(year, month, day);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }
  
  // Si todo falla, retornar null
  return null;
};

// Mapa para almacenar startTime por jobId (evitar bloquear workers)
const jobStartTimes = new Map();

const setupWorker = () => {
  console.log("Inicializando Worker de Excel...");
  const worker = new Worker(
    "excel-processing",
    async (job) => {
      const { filePath, ejecucionId, usuarioId } = job.data;
      const jobId = String(job.id);
      const startTime = Date.now();
      
      // Guardar startTime
      jobStartTimes.set(jobId, startTime);

      console.log(`Procesando Job ${job.id} para ejecución ${ejecucionId}`);

      // Log de inicio
      await log({
        jobId: jobId,
        proceso: "excel-processing",
        nivel: "info",
        mensaje: `Inicio de procesamiento de archivo Excel. Ejecución ID: ${ejecucionId}`,
      });

      try {
        // Validar que el archivo existe y es accesible
        if (!filePath || !fs.existsSync(filePath)) {
          throw new Error(`El archivo no existe o no es accesible: ${filePath}`);
        }

        // Validar extensión del archivo
        const fileExtension = filePath.toLowerCase().split('.').pop();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
          throw new Error(`El archivo debe ser un Excel (.xlsx o .xls). Extensión recibida: .${fileExtension}`);
        }

        // Validar firma del archivo (magic number) para detectar archivos corruptos o falsos
        const fileStats = fs.statSync(filePath);
        const fileSize = fileStats.size;
        
        if (fileSize === 0) {
          throw new Error('El archivo está vacío (0 bytes). Por favor, verifica que el archivo no esté corrupto.');
        }

        // Leer los primeros bytes para verificar la firma del archivo
        const fileBuffer = fs.readFileSync(filePath, { start: 0, end: 8 });
        const fileSignature = fileBuffer.toString('hex').toUpperCase();
        
        // Firmas conocidas:
        // XLSX: 50 4B 03 04 (ZIP file signature, ya que .xlsx es un ZIP)
        // XLS (BIFF8): D0 CF 11 E0 A1 B1 1A E1 (OLE2 compound document)
        const isXLSX = fileSignature.startsWith('504B0304') || fileSignature.startsWith('504B0506') || fileSignature.startsWith('504B0708');
        const isXLS = fileSignature.startsWith('D0CF11E0A1B11AE1');
        
        if (fileExtension === 'xlsx' && !isXLSX) {
          console.error(`[Excel Worker] Firma inválida para .xlsx. Firma detectada: ${fileSignature.substring(0, 8)}...`);
          throw new Error(`El archivo no parece ser un archivo Excel válido (.xlsx). La firma del archivo no coincide. Esto puede indicar que el archivo está corrupto o no es realmente un archivo Excel. Firma detectada: ${fileSignature.substring(0, 16)}`);
        }
        
        if (fileExtension === 'xls' && !isXLS) {
          console.error(`[Excel Worker] Firma inválida para .xls. Firma detectada: ${fileSignature.substring(0, 16)}...`);
          throw new Error(`El archivo no parece ser un archivo Excel válido (.xls). La firma del archivo no coincide. Esto puede indicar que el archivo está corrupto o no es realmente un archivo Excel. Firma detectada: ${fileSignature.substring(0, 16)}`);
        }

        // No cambiar el estado - debe permanecer en PENDIENTE para datos de DIAN
        const errores = [];
        let processedCount = 0;
        let batch = [];
        const BATCH_SIZE = 1000;

        // Validar estructura ZIP ANTES de intentar leer con ExcelJS
        let zipValidationInfo = '';
        let zipValidationPassed = false;
        if (fileExtension === 'xlsx') {
          try {
            const AdmZip = require('adm-zip');
            const zip = new AdmZip(filePath);
            const zipEntries = zip.getEntries();
            
            const hasWorkbook = zipEntries.some(e => 
              e.entryName.includes('xl/workbook.xml') || 
              e.entryName.includes('xl/worksheets/') ||
              e.entryName === 'xl/workbook.xml'
            );
            
            const hasSharedStrings = zipEntries.some(e => 
              e.entryName.includes('xl/sharedStrings.xml')
            );
            
            const workbookEntries = zipEntries.filter(e => 
              e.entryName.includes('xl/workbook.xml') || 
              e.entryName.includes('xl/worksheets/')
            );
            
            zipValidationInfo = `
Validación ZIP previa:
- Total entradas en ZIP: ${zipEntries.length}
- Contiene workbook.xml: ${hasWorkbook ? 'Sí' : 'No'}
- Contiene sharedStrings.xml: ${hasSharedStrings ? 'Sí' : 'No'}
- Entradas de worksheets: ${workbookEntries.length}
- Primeras entradas: ${zipEntries.slice(0, 10).map(e => e.entryName).join(', ')}`;
            
            if (!hasWorkbook) {
              throw new Error('El archivo ZIP no contiene workbook.xml, lo que indica corrupción severa o que no es un archivo Excel válido.');
            }
            
            zipValidationPassed = true;
            console.log(`[Excel Worker] Validación ZIP previa exitosa: ${zipEntries.length} entradas encontradas`);
          } catch (zipError) {
            zipValidationInfo = `\nError en validación ZIP previa: ${zipError.message}`;
            console.error(`[Excel Worker] Error en validación ZIP previa: ${zipError.message}`);
            // Continuar de todos modos, ExcelJS puede manejar algunos casos que adm-zip no
          }
        }

        // ============================================
        // LECTURA CON SHEETJS (XLSX) - SOLO VALORES RAW
        // ============================================
        // SheetJS ignora completamente estilos, formatos, sharedStrings
        // Solo lee valores finales de las celdas (raw values)
        // ============================================
        
        let workbook;
        try {
          console.log(`[Excel Worker] Leyendo archivo con SheetJS (solo valores raw): ${filePath}`);
          
          // Leer el archivo con SheetJS
          // Opciones: cellDates: false (no convertir fechas automáticamente)
          //          raw: true (leer valores raw, no formateados)
          workbook = XLSX.readFile(filePath, {
            cellDates: false,  // No convertir fechas automáticamente
            cellNF: false,     // No leer formatos de número
            cellStyles: false, // No leer estilos
            sheetStubs: false, // No incluir hojas vacías
            bookVBA: false,    // No leer macros VBA
            bookSheets: false, // No leer metadatos de hojas
            bookProps: false,  // No leer propiedades del libro
            bookFiles: false,  // No leer archivos incrustados
            bookSST: false,   // No usar shared strings (leer valores directamente)
            type: 'buffer'     // Leer como buffer para mejor rendimiento
          });
          
          console.log(`[Excel Worker] Archivo leído exitosamente. Hojas encontradas: ${workbook.SheetNames.length}`);
        } catch (readError) {
          console.error(`[Excel Worker] ========== ERROR AL LEER ARCHIVO ==========`);
          console.error(`[Excel Worker] Mensaje: ${readError.message}`);
          console.error(`[Excel Worker] Tipo: ${readError.name}`);
          console.error(`[Excel Worker] Stack: ${readError.stack}`);
          console.error(`[Excel Worker] Archivo: ${filePath}`);
          console.error(`[Excel Worker] Tamaño: ${fileSize} bytes`);
          console.error(`[Excel Worker] ===========================================`);
          
          if (readError.message && (
              readError.message.includes('invalid') ||
              readError.message.includes('corrupt') ||
              readError.message.includes('ZIP') ||
              readError.message.includes('signature')
            )) {
            throw new Error('El archivo no es un archivo Excel válido o está corrupto. Por favor, verifica que el archivo sea un .xlsx válido y no esté dañado, o en su defecto quita todos los formatos del doc y vuelve a subirlo');
          }
          
          throw new Error(`Error al leer el archivo Excel: ${readError.message}`);
        }

        // ============================================
        // VALIDACIONES DE FORMATO Y ESTRUCTURA
        // ============================================
        
        // 1. Validar estructura del Excel (headers esperados)
        // folio → num_factura en proc_documentos_staging (y en clave de deduplicación)
        const COLUMNAS_ESPERADAS = {
          nit: ["NIT Receptor"],
          cufe: ["CUFE/CUDE", "cufe/cude"],
          folio: ["Folio"], // exclusivo para num_factura; no usar CUFE
          fecha: ["Fecha Emisión", "fecha emision", "fecha_emision", "fecha de emision"],
          total: ["Total"],
          iva: ["IVA"],
          prefijo: ["Prefijo"],
          razon_social: ["Nombre Receptor"],
          tipo_documento: ["Tipo de documento"],
        };
        
        // Función para validar que existen las columnas mínimas requeridas
        const validarEstructuraHeaders = (headers) => {
          const headersLower = headers.map(h => h.toLowerCase().trim());
          const errores = [];
          
          // Verificar que existe al menos una columna de NIT
          const tieneNit = COLUMNAS_ESPERADAS.nit.some(col => 
            headersLower.some(h => h.includes(col.toLowerCase()))
          );
          if (!tieneNit) {
            errores.push(`Falta columna de NIT. Columnas esperadas: ${COLUMNAS_ESPERADAS.nit.join(', ')}`);
          }
          
          // Verificar que existe al menos una columna de factura (CUFE o Folio)
          const tieneFactura = COLUMNAS_ESPERADAS.cufe.some(col => 
            headersLower.some(h => h.includes(col.toLowerCase()))
          ) || COLUMNAS_ESPERADAS.folio.some(col => 
            headersLower.some(h => h.includes(col.toLowerCase()))
          );
          if (!tieneFactura) {
            errores.push(`Falta columna de Factura/CUFE/Folio. Columnas esperadas: ${COLUMNAS_ESPERADAS.cufe.join(', ')} o ${COLUMNAS_ESPERADAS.folio.join(', ')}`);
          }
          
          // Verificar que existe al menos una columna de fecha
          const tieneFecha = COLUMNAS_ESPERADAS.fecha.some(col => 
            headersLower.some(h => h.includes(col.toLowerCase()))
          );
          if (!tieneFecha) {
            errores.push(`Falta columna de Fecha. Columnas esperadas: ${COLUMNAS_ESPERADAS.fecha.join(', ')}`);
          }
          
          return {
            valido: errores.length === 0,
            errores,
            headersEncontrados: headers
          };
        };
        
        // Función para validar formato y tipo de datos según reglas del sistema destino
        const validarDatosDocumento = (documento, rowNumber) => {
          const errores = [];
          
          // Validar NIT (STRING(50), not null). Solo dígitos (0-9).
          if (!documento.nit_proveedor) {
            errores.push("NIT es requerido y no puede estar vacío");
          } else {
            const nitStr = String(documento.nit_proveedor).trim();
            if (nitStr.length === 0) {
              errores.push("NIT no puede estar vacío");
            } else if (nitStr.length > 50) {
              errores.push(`NIT excede longitud máxima (50 caracteres). Longitud actual: ${nitStr.length}`);
            } else if (!/^[0-9]+$/.test(nitStr)) {
              errores.push(`NIT contiene caracteres inválidos. Solo se permiten números. Valor: "${nitStr}"`);
            }
          }
          
          // Validar Número de Factura (STRING(50), not null)
          if (!documento.num_factura) {
            errores.push("Número de Factura/CUFE es requerido y no puede estar vacío");
          } else {
            const facturaStr = String(documento.num_factura).trim();
            if (facturaStr.length === 0) {
              errores.push("Número de Factura no puede estar vacío");
            } else if (facturaStr.length > 50) {
              errores.push(`Número de Factura excede longitud máxima (50 caracteres). Longitud actual: ${facturaStr.length}`);
            }
          }
          
          // Validar Fecha de Emisión (DATEONLY, not null)
          if (!documento.fecha_emision) {
            errores.push("Fecha de Emisión es requerida y no puede estar vacía");
          } else {
            const fecha = documento.fecha_emision;
            if (!(fecha instanceof Date)) {
              errores.push(`Fecha de Emisión debe ser una fecha válida. Tipo recibido: ${typeof fecha}`);
            } else if (isNaN(fecha.getTime())) {
              errores.push("Fecha de Emisión es inválida");
            } else {
              // Validar rango de fechas razonable (no antes de 1900, no futuras más de 1 año)
              const año = fecha.getFullYear();
              const añoActual = new Date().getFullYear();
              if (año < 1900) {
                errores.push(`Fecha de Emisión tiene año inválido: ${año}`);
              } else if (año > añoActual + 1) {
                errores.push(`Fecha de Emisión es futura más de 1 año: ${año}`);
              }
            }
          }
          
          // Validar Valor Total (DECIMAL(18, 2), not null)
          if (documento.valor_total === null || documento.valor_total === undefined) {
            errores.push("Valor Total es requerido y no puede estar vacío");
          } else {
            const valor = parseFloat(documento.valor_total);
            if (isNaN(valor)) {
              errores.push(`Valor Total debe ser un número válido. Valor recibido: "${documento.valor_total}"`);
            } else if (valor < 0) {
              errores.push(`Valor Total no puede ser negativo. Valor: ${valor}`);
            } else if (valor > 9999999999999999.99) {
              errores.push(`Valor Total excede el máximo permitido (DECIMAL(18,2)). Valor: ${valor}`);
            }
          }
          
          // Validar Impuestos (DECIMAL(18, 2), default 0.0)
          if (documento.impuestos !== null && documento.impuestos !== undefined) {
            const impuestos = parseFloat(documento.impuestos);
            if (isNaN(impuestos)) {
              errores.push(`Impuestos debe ser un número válido. Valor recibido: "${documento.impuestos}"`);
            } else if (impuestos < 0) {
              errores.push(`Impuestos no puede ser negativo. Valor: ${impuestos}`);
            } else if (impuestos > 9999999999999999.99) {
              errores.push(`Impuestos excede el máximo permitido (DECIMAL(18,2)). Valor: ${impuestos}`);
            }
          }
          
          return {
            valido: errores.length === 0,
            errores
          };
        };
        
        let headers = null;
        const COLUMNAS = COLUMNAS_ESPERADAS;

        // Evitar duplicidad en proc_documentos_staging: se considera duplicado si coinciden
        // Folio (Excel) = num_factura (tabla), NIT Receptor (Excel) = nit_proveedor (tabla),
        // Prefijo (Excel) = prefijo (tabla). Clave única: nit_proveedor|num_factura|prefijo.
        const keyDian = (d) =>
          `${d.nit_proveedor || ''}|${d.num_factura || ''}|${d.prefijo ?? ''}`;

        const filtrarDuplicadosDian = async (batch) => {
          if (!batch || batch.length === 0) return [];
          const nits = [...new Set(batch.map((d) => d.nit_proveedor).filter(Boolean))];
          if (nits.length === 0) return batch;
          const existing = await DocumentoStaging.findAll({
            where: {
              fuente: "DIAN",
              nit_proveedor: { [Op.in]: nits },
            },
            attributes: ["nit_proveedor", "num_factura", "prefijo"],
            raw: true,
          });
          const existingKeys = new Set(
            existing.map((r) =>
              `${r.nit_proveedor || ''}|${r.num_factura || ''}|${r.prefijo ?? ''}`
            )
          );
          const seen = new Set();
          return batch.filter((d) => {
            const k = keyDian(d);
            if (existingKeys.has(k) || seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        };

        // ============================================
        // PROCESAMIENTO CON SHEETJS - SOLO VALORES RAW COMO STRING
        // ============================================
        // SheetJS ya lee solo valores raw, ahora los convertimos todos a string
        // ============================================
        
        try {
          // Procesar cada hoja del workbook
          for (let sheetIndex = 0; sheetIndex < workbook.SheetNames.length; sheetIndex++) {
            const sheetName = workbook.SheetNames[sheetIndex];
            console.log(`[Excel Worker] Procesando hoja ${sheetIndex + 1}/${workbook.SheetNames.length}: "${sheetName}"`);
            
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet) {
              console.warn(`[Excel Worker] Hoja "${sheetName}" está vacía o no existe`);
              continue;
            }
            
            // Convertir hoja a JSON con opciones que solo devuelvan valores raw
            // raw: true -> devuelve valores raw (números como números, fechas como números serial)
            // defval: '' -> valor por defecto para celdas vacías
            // header: 1 -> primera fila como headers, devuelve array de objetos
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              raw: true,        // Valores raw (sin formato)
              defval: '',       // Valor por defecto para celdas vacías
              header: 1,        // Primera fila como headers, devuelve array de arrays
              blankrows: false, // No incluir filas completamente vacías
              range: null       // Procesar toda la hoja
            });
            
            if (!jsonData || jsonData.length === 0) {
              console.warn(`[Excel Worker] Hoja "${sheetName}" no tiene datos`);
              continue;
            }
            
            console.log(`[Excel Worker] Hoja "${sheetName}" tiene ${jsonData.length} filas`);
            
            // Procesar cada fila
            for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
              const row = jsonData[rowIndex];
              
              // Fila 0 es headers
              if (rowIndex === 0) {
                // Extraer headers y convertir todos a string
                headers = row.map((h) => {
                  if (h === null || h === undefined || h === '') {
                    return '';
                  }
                  // Convertir a string y limpiar
                  return String(h).trim();
                }).filter((h, i) => h !== '' || i === 0); // Filtrar headers vacíos excepto el primero
                
                // Validar estructura de headers
                const validacionHeaders = validarEstructuraHeaders(headers);
                if (!validacionHeaders.valido) {
                  const errorMsg = `Estructura de columnas inválida en la fila 1 (headers):\n${validacionHeaders.errores.join('\n')}\n\nColumnas encontradas: ${headers.join(', ')}\n\nColumnas esperadas:\n- NIT: ${COLUMNAS.nit.join(', ')}\n- Factura/CUFE/Folio: ${COLUMNAS.cufe.join(', ')} o ${COLUMNAS.folio.join(', ')}\n- Fecha: ${COLUMNAS.fecha.join(', ')}\n- Total: ${COLUMNAS.total.join(', ')}\n- IVA (opcional): ${COLUMNAS.iva.join(', ')}`;
                  throw new Error(errorMsg);
                }
                
                console.log(`[Excel Worker] Headers validados: ${headers.join(', ')}`);
                continue;
              }
              
              if (!headers || headers.length === 0) {
                errores.push({
                  fila: rowIndex + 1,
                  error: "No se encontraron headers en la fila 1",
                  data: {}
                });
                continue;
              }
              
              // ============================================
              // CONVERTIR TODOS LOS VALORES A STRING
              // ============================================
              // SheetJS ya devuelve valores raw, ahora los convertimos todos a string
              // Esto asegura que no dependamos de formatos ni tipos inferidos
              // ============================================
              
              const rowData = {};
              
              // Función para convertir cualquier valor a string
              const convertirAString = (valor) => {
                // Si es null, undefined o vacío, retornar string vacío
                if (valor === null || valor === undefined) {
                  return '';
                }
                
                // Si ya es string, limpiar y retornar
                if (typeof valor === 'string') {
                  return valor.trim();
                }
                
                // Si es número, convertir a string (sin formato)
                if (typeof valor === 'number') {
                  // Si es NaN o Infinity, retornar string vacío
                  if (isNaN(valor) || !isFinite(valor)) {
                    return '';
                  }
                  return String(valor);
                }
                
                // Si es boolean, convertir a string
                if (typeof valor === 'boolean') {
                  return valor ? 'true' : 'false';
                }
                
                // Si es Date, convertir a string ISO (YYYY-MM-DD)
                if (valor instanceof Date) {
                  if (isNaN(valor.getTime())) {
                    return '';
                  }
                  return valor.toISOString().split('T')[0];
                }
                
                // Cualquier otro tipo, convertir a string
                return String(valor).trim();
              };
              
              // Mapear headers a valores (todos convertidos a string)
              headers.forEach((h, i) => {
                const valorRaw = row[i] !== undefined ? row[i] : '';
                rowData[h] = convertirAString(valorRaw);
              });

              // Procesar cada fila de datos
              try {
                const getValue = (keys) => {
                  for (const key of keys) {
                    const found = headers.find(
                      (h) => h && h.toLowerCase().includes(key.toLowerCase())
                    );
                    if (found && rowData[found] !== undefined && rowData[found] !== '') {
                      return rowData[found];
                    }
                  }
                  return '';
                };

                // Obtener valores como strings (ya están convertidos a string)
                // NIT Receptor → nit_proveedor; Folio → num_factura; Prefijo → prefijo (usados en deduplicación)
                const nitStr = getValue(COLUMNAS.nit);
                const totalStr = getValue(COLUMNAS.total);
                const ivaStr = getValue(COLUMNAS.iva);
                const fechaStr = getValue(COLUMNAS.fecha);
                const prefijoStr = getValue(COLUMNAS.prefijo);
                const razonSocialStr = getValue(COLUMNAS.razon_social);
                const tipoDocumentoStr = getValue(COLUMNAS.tipo_documento);

                // Excluir registros con "Application response" en Tipo de documento
                if (tipoDocumentoStr && tipoDocumentoStr.trim().toLowerCase() === "application response") {
                  continue;
                }
                
                const numFacturaStr = getValue(COLUMNAS.folio);
                
                // ============================================
                // CONVERSIÓN DE TIPOS DESDE STRING
                // ============================================
                // Todos los valores vienen como string, ahora los convertimos a los tipos necesarios
                // ============================================
                
                // NIT Receptor (Excel) → nit_proveedor (tabla). Solo dígitos; quitar puntos, guiones y caracteres especiales.
                let nitProveedor = (nitStr != null ? String(nitStr).trim() : '') || null;
                if (nitProveedor) {
                  nitProveedor = nitProveedor.replace(/\D/g, '') || null;
                }
                
                // Folio (Excel) → num_factura (tabla); usado en deduplicación. No usar CUFE.
                const numFactura =
                  (numFacturaStr != null ? String(numFacturaStr).trim() : '') || null;
                
                // Fecha: parsear desde string
                let fechaEmision = null;
                if (!fechaStr || fechaStr.trim() === '') {
                  throw new Error(`Fecha inválida o vacía`);
                }
                
                // Intentar parsear la fecha desde string
                fechaEmision = parseDate(fechaStr.trim());
                
                // Si parseDate falla, intentar parsear como número serial de Excel
                if (!fechaEmision) {
                  const fechaNum = parseFloat(fechaStr.trim());
                  if (!isNaN(fechaNum) && fechaNum > 0) {
                    // Excel serial date
                    const excelEpoch = new Date(1899, 11, 30);
                    fechaEmision = new Date(excelEpoch.getTime() + fechaNum * 24 * 60 * 60 * 1000);
                  }
                }
                
                // Validar que la fecha fue parseada correctamente
                if (!fechaEmision || !(fechaEmision instanceof Date) || isNaN(fechaEmision.getTime())) {
                  throw new Error(`Fecha inválida o vacía: "${fechaStr}". Esperado: YYYY-MM-DD, DD-MM-YYYY, o número serial de Excel`);
                }
                
                // Valor Total: convertir desde string a número
                let valorTotal = 0;
                if (!totalStr || totalStr.trim() === '') {
                  throw new Error("Valor Total es requerido y no puede estar vacío");
                }
                
                // Limpiar string: remover separadores de miles y convertir coma decimal a punto
                const totalCleaned = totalStr.trim()
                  .replace(/[^\d.,-]/g, '') // Remover caracteres no numéricos excepto .,-
                  .replace(/,/g, '.') // Convertir coma a punto
                  .replace(/\.(?=.*\.)/g, ''); // Remover puntos excepto el último (separadores de miles)
                
                const totalParsed = parseFloat(totalCleaned);
                if (isNaN(totalParsed)) {
                  throw new Error(`Valor Total inválido: "${totalStr}". Debe ser un número.`);
                }
                valorTotal = totalParsed;
                
                // Impuestos: convertir desde string a número (opcional, default 0)
                let impuestos = 0;
                if (ivaStr && ivaStr.trim() !== '') {
                  const ivaCleaned = ivaStr.trim()
                    .replace(/[^\d.,-]/g, '')
                    .replace(/,/g, '.')
                    .replace(/\.(?=.*\.)/g, '');
                  
                  const ivaParsed = parseFloat(ivaCleaned);
                  if (!isNaN(ivaParsed)) {
                    impuestos = ivaParsed;
                  }
                }
                
                // Construir payload_original con todos los valores como strings
                const payloadPlano = {};
                Object.keys(rowData).forEach(key => {
                  payloadPlano[key] = rowData[key]; // Ya son strings
                });
                
                const documento = {
                  ejecucion_id: ejecucionId,
                  fuente: "DIAN",
                  nit_proveedor: nitProveedor != null ? String(nitProveedor).trim() : null, // NIT Receptor
                  num_factura:
                    numFactura != null ? String(numFactura).trim() : null, // Folio → num_factura
                  prefijo: prefijoStr && prefijoStr.trim() !== '' ? prefijoStr.trim() : null, // Prefijo
                  razon_social: razonSocialStr && razonSocialStr.trim() !== '' ? razonSocialStr.trim() : null,
                  fecha_emision: fechaEmision,
                  valor_total: valorTotal,
                  impuestos: impuestos,
                  payload_original: payloadPlano, // Todos los valores como strings
                };

                // Validar datos según reglas del sistema destino
                const validacion = validarDatosDocumento(documento, rowIndex + 1);
                if (!validacion.valido) {
                  throw new Error(`Errores de validación:\n${validacion.errores.join('\n')}`);
                }

                batch.push(documento);
                processedCount++;

                if (batch.length >= BATCH_SIZE) {
                  try {
                    const aInsertar = await filtrarDuplicadosDian(batch);
                    if (aInsertar.length > 0) {
                      await DocumentoStaging.bulkCreate(aInsertar, {
                        ignoreDuplicates: true,
                      });
                    }
                    await log({
                      jobId: jobId,
                      proceso: "excel-processing",
                      nivel: "info",
                      mensaje: `Procesados ${processedCount} registros hasta el momento`,
                    });
                  } catch (batchError) {
                    console.error("Error insertando Batch:", batchError.message);
                    throw new Error(
                      `Error insertando lote de ${BATCH_SIZE} registros: ${batchError.message}`
                    );
                  } finally {
                    batch = [];
                  }
                }
              } catch (rowError) {
                errores.push({
                  fila: rowIndex + 1,
                  error: rowError.message,
                  data: rowData,
                });
              }
            }
            
            console.log(`[Excel Worker] Hoja "${sheetName}" procesada completamente. Total filas procesadas: ${jsonData.length - 1} (excluyendo headers)`);
          }
          
          console.log(`[Excel Worker] Procesamiento completado. Total hojas procesadas: ${workbook.SheetNames.length}`);
        } catch (readError) {
          // Capturar errores durante la lectura/iteración del archivo
          console.error(`[Excel Worker] ========== ERROR DURANTE PROCESAMIENTO DEL ARCHIVO ==========`);
          console.error(`[Excel Worker] Mensaje completo: ${readError.message}`);
          console.error(`[Excel Worker] Tipo de error: ${readError.name}`);
          console.error(`[Excel Worker] Stack trace completo:`);
          console.error(readError.stack);
          console.error(`[Excel Worker] Archivo: ${filePath}`);
          console.error(`[Excel Worker] Tamaño: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
          console.error(`[Excel Worker] Firma inicial: ${fileSignature.substring(0, 16)}...`);
          
          // Log del error completo para debug
          if (readError.code) {
            console.error(`[Excel Worker] Código de error: ${readError.code}`);
          }
          console.error(`[Excel Worker] =====================================================`);
          
          // Verificar si el error ya es el mensaje simplificado (para evitar duplicar)
          if (readError.message && readError.message.includes('El archivo no es un archivo Excel válido')) {
            throw readError; // Re-lanzar tal cual
          }
          
          if (readError.message && (
              readError.message.includes('invalid signature') || 
              readError.message.includes('0x') ||
              readError.message.includes('ZIP') ||
              readError.message.includes('corrupt') ||
              readError.message.includes('Unexpected end of data') ||
              readError.message.includes('End of data') ||
              readError.message.includes('bad signature') ||
              readError.message.includes('Invalid')
            )) {
            console.error(`[Excel Worker] Error de corrupción detectado en catch general`);
            throw new Error('El archivo no es un archivo Excel válido o está corrupto. Por favor, verifica que el archivo sea un .xlsx válido y no esté dañado, o en su defecto quita todos los formatos del doc y vuelve a subirlo');
          }
          
          throw new Error(`Error al procesar el archivo Excel: ${readError.message}. Tipo de error: ${readError.name || 'Desconocido'}. Archivo: ${filePath}`);
        }

        if (batch.length > 0) {
          try {
            const aInsertar = await filtrarDuplicadosDian(batch);
            if (aInsertar.length > 0) {
              await DocumentoStaging.bulkCreate(aInsertar, {
                ignoreDuplicates: true,
              });
            }
          } catch (e) {
            errores.push({
              fila: "BATCH_FINAL",
              error: e.message,
              data: "Remanentes",
            });
          }
        }

        // Calcular duración
        const endTime = Date.now();
        const duracionMs = endTime - startTime;
        const duracionSegundos = duracionMs / 1000;
        const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

        // Para datos de DIAN (Excel), mantener estado en PENDIENTE y docs_procesados en 0
        await Ejecucion.update(
          {
            estado: "PENDIENTE",
            docs_procesados: 0,
            errores: errores.length > 0 ? errores : null,
          },
          { where: { id: ejecucionId } }
        );

        if (errores.length > 0) {
          console.error(
            `[Excel Worker] Ejecución ${ejecucionId} - Detalle de ${errores.length} errores:`
          );
          errores.forEach((e, i) => {
            const fila = e.fila != null ? e.fila : "?";
            const msg = e.error || "Error desconocido";
            console.error(`[Excel Worker]   Error ${i + 1}/${errores.length} - Fila: ${fila} - ${msg}`);
            if (e.data && typeof e.data === "object" && Object.keys(e.data).length > 0) {
              const dataStr = JSON.stringify(e.data);
              const trunc =
                dataStr.length > 200 ? dataStr.slice(0, 200) + "..." : dataStr;
              console.error(`[Excel Worker]     Data: ${trunc}`);
            }
          });
        }

        // Log de finalización exitosa
        await log({
          jobId: jobId,
          proceso: "excel-processing",
          nivel: errores.length > 0 ? "warn" : "info",
          mensaje: `Procesamiento completado. Total procesados: ${processedCount}. Errores: ${errores.length}`,
          duracionSegundos: duracionSegundos,
          duracionMinutos: duracionMinutos,
        });

        // Limpiar startTime
        jobStartTimes.delete(jobId);
      } catch (error) {
        console.error("Error Worker:", error);
        
        // Calcular duración parcial
        const endTime = Date.now();
        const startTimeRecorded = jobStartTimes.get(jobId) || startTime;
        const duracionMs = endTime - startTimeRecorded;
        const duracionSegundos = duracionMs / 1000;
        const duracionMinutos = calcularDuracionMinutos(duracionSegundos);

        // Mensaje de error simplificado
        let errorMessage = error.message || 'Error desconocido al procesar el archivo Excel';
        
        // Si el error es relacionado con corrupción o formato, usar mensaje simplificado
        if (error.message && (
            error.message.includes('corrupto') || 
            error.message.includes('corrupt') ||
            error.message.includes('invalid signature') ||
            error.message.includes('formato') ||
            error.message.includes('Excel válido')
          )) {
          errorMessage = 'El archivo no es un archivo Excel válido o está corrupto. Por favor, verifica que el archivo sea un .xlsx válido y no esté dañado, o en su defecto quita todos los formatos del doc y vuelve a subirlo';
        }
        
        await Ejecucion.update(
          {
            estado: "FALLIDO",
            fecha_fin: new Date(),
            errores: [{ error_general: errorMessage }],
          },
          { where: { id: ejecucionId } }
        );

        // Log de error
        await log({
          jobId: jobId,
          proceso: "excel-processing",
          nivel: "error",
          mensaje: `Error en procesamiento: ${errorMessage}`,
          duracionSegundos: duracionSegundos,
          duracionMinutos: duracionMinutos,
        });

        // Limpiar startTime
        jobStartTimes.delete(jobId);
        throw error;
      } finally {
        // Eliminar archivo después del procesamiento (éxito o error)
        if (filePath && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`[Excel Worker] Archivo eliminado exitosamente: ${filePath}`);
          } catch (deleteError) {
            console.error(`[Excel Worker] Error al eliminar archivo ${filePath}:`, deleteError.message);
            // Intentar eliminar de forma asíncrona como fallback
            setTimeout(() => {
              try {
                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                  console.log(`[Excel Worker] Archivo eliminado en segundo intento: ${filePath}`);
                }
              } catch (retryError) {
                console.error(`[Excel Worker] Error en segundo intento de eliminación:`, retryError.message);
              }
            }, 1000);
          }
        } else if (filePath) {
          console.log(`[Excel Worker] Archivo no existe o ya fue eliminado: ${filePath}`);
        }
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => console.log(`Job ${job.id} OK`));
  worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} FAIL: ${err.message}`)
  );
};

module.exports = { setupWorker };
