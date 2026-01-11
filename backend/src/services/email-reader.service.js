const imaps = require("imap-simple");
const simpleParser = require("mailparser").simpleParser;
const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
const { parseXmlToJson } = require("../utils/xml-parser");

// Configuración predeterminada de descarga
const DOWNLOAD_DIR = "E:\\Proyectos\\Descargas";

/**
 * Servicio para procesar correos electrónicos con facturas
 */
class EmailReaderService {
  constructor() {
    this.config = {
      imap: {
        user: process.env.IMAP_USER,
        password: process.env.IMAP_PASSWORD,
        host: process.env.IMAP_HOST,
        port: process.env.IMAP_PORT || 993,
        tls: process.env.IMAP_TLS === "true",
        authTimeout: 3000,
      },
    };
  }

  /**
   * Ejecuta el proceso completo de revisión de correo
   */
  async processEmails() {
    let connection = null;
    const results = [];

    try {
      // 1. Conectar a IMAP
      connection = await imaps.connect(this.config);
      await connection.openBox("INBOX");

      // 2. Buscar correos no leídos
      const searchCriteria = ["UNSEEN"];
      const fetchOptions = {
        bodies: ["HEADER", "TEXT", ""],
        markSeen: false, // Lo marcaremos como leído manualmente al final
      };

      const messages = await connection.search(searchCriteria, fetchOptions);

      if (messages.length === 0) {
        return { message: "No hay correos nuevos para procesar" };
      }

      // Asegurar que el directorio de descarga existe
      if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
      }

      // 3. Procesar cada mensaje
      for (const message of messages) {
        const processed = await this._processSingleMessage(connection, message);
        if (processed) {
          results.push(processed);
        }
      }

      return {
        processed_count: results.length,
        details: results,
      };
    } catch (error) {
      console.error("Error en EmailReaderService:", error);
      throw error;
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  /**
   * Procesa un único mensaje
   */
  async _processSingleMessage(connection, message) {
    try {
      const all = message.parts.find((part) => part.which === "");
      const id = message.attributes.uid;
      const idHeader = "Imap-Id: " + id + "\r\n";

      // Parsear el correo
      const parsed = await simpleParser(idHeader + all.body);

      // Buscar adjunto ZIP
      const zipAttachment = parsed.attachments.find(
        (att) =>
          att.contentType === "application/zip" ||
          att.contentType === "application/x-zip-compressed" ||
          att.filename.endsWith(".zip")
      );

      if (!zipAttachment) {
        console.log(`El correo ${parsed.subject} no tiene adjuntos ZIP.`);
        return null;
      }

      // 4. Descargar y guardar ZIP
      const zipFileName = `${Date.now()}_${zipAttachment.filename}`;
      const zipFilePath = path.join(DOWNLOAD_DIR, zipFileName);

      fs.writeFileSync(zipFilePath, zipAttachment.content);
      console.log(`ZIP guardado en: ${zipFilePath}`);

      // 5. Descomprimir y buscar XML
      const xmlData = await this._extractXmlFromZip(zipFilePath);

      if (!xmlData) {
        return {
          subject: parsed.subject,
          status: "ZIP procesado, pero no se encontró XML válido",
          file: zipFilePath,
        };
      }

      // 6. Parsear XML a JSON (Metadata)
      const metadata = await parseXmlToJson(xmlData);

      // 7. Mover a carpeta LEIDOS y marcar como leído
      await this._moveMessage(connection, message.attributes.uid, "LEIDOS");

      return {
        subject: parsed.subject,
        status: "Procesado exitosamente",
        zip_path: zipFilePath,
        metadata_preview: metadata
          ? "Metadata extraída correctamente"
          : "Sin metadata",
        // Podríamos devolver la metadata completa si se desea
      };
    } catch (err) {
      console.error(
        `Error procesando mensaje UID ${message.attributes.uid}:`,
        err
      );
      return { error: err.message, uid: message.attributes.uid };
    }
  }

  /**
   * Extrae el primer archivo XML encontrado en el ZIP
   */
  async _extractXmlFromZip(zipPath) {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();

      let xmlContent = null;

      // Buscar el primer archivo .xml dentro del zip
      for (const entry of zipEntries) {
        if (entry.entryName.endsWith(".xml") && !entry.isDirectory) {
          // Leemos el contenido como texto utf8
          xmlContent = entry.getData().toString("utf8");

          // Opcional: Si se requiere guardar el XML extraído en disco:
          // const xmlPath = path.join(DOWNLOAD_DIR, path.basename(entry.entryName));
          // fs.writeFileSync(xmlPath, xmlContent);

          break; // Tomamos solo el primero
        }
      }

      return xmlContent;
    } catch (error) {
      console.error("Error extrayendo ZIP:", error);
      throw error;
    }
  }

  /**
   * Mueve el mensaje a la carpeta destino y lo marca como leído
   */
  async _moveMessage(connection, uid, destBoxName) {
    try {
      // Verificar si existe el buzón destino, si no, intentar crearlo (opcional, imap-simple no tiene createBox fácil,
      // asumiremos que existe o que el usuario debe crearlo. O usamos raw command).
      // imap-simple soporta createBox pero requiere acceso al objeto imap subyacente a veces.
      // Intentaremos mover directamete.

      await connection.moveMessage(uid, destBoxName);
      await connection.addFlags(uid, ["\\Seen"]); // Marcar como leído
    } catch (error) {
      // Si falla mover (ej. la carpeta no existe), al menos marcar como leído?
      // O intentar crear la carpeta.
      // Para simplificar, lanzamos error, pero idealmente crearíamos la carpeta.
      console.warn(
        `No se pudo mover el mensaje a ${destBoxName}. Asegúrate que la carpeta exista. Error: ${error.message}`
      );

      // Fallback: Solo marcar como leído en INBOX
      await connection.addFlags(uid, ["\\Seen"]);
    }
  }
}

module.exports = new EmailReaderService();
