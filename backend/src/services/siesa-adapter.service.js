const soap = require("soap");

class SiesaAdapterService {
  constructor() {
    this.wsdlUrl =
      process.env.SIESA_WSDL_URL ||
      "http://181.48.208.212:84/WSUNOEE/WSUNOEE.asmx?wsdl";
    this.client = null;
  }

  /**
   * Inicializa el cliente SOAP (Singleton pattern)
   */
  async getClient() {
    if (!this.client) {
      try {
        console.log(`Conectando a WSDL: ${this.wsdlUrl}`);
        this.client = await soap.createClientAsync(this.wsdlUrl);
        console.log("Cliente SOAP SIESA inicializado correctamente");
      } catch (error) {
        console.error("Error inicializando cliente SOAP SIESA:", error.message);
        throw new Error(
          "No se pudo conectar con el WebService de SIESA: " + error.message
        );
      }
    }
    return this.client;
  }

  /**
   * Ejecuta una consulta XML dinámica en SIESA
   * @param {string} idCompania
   * @param {string} idConsulta Nombre de la consulta SQL configurada en SIESA
   * @param {object} parametros Objeto clave-valor para los filtros
   */
  async ejecutarConsulta(idCompania, idConsulta, parametros = {}) {
    const client = await this.getClient();

    // Construcción de parámetros dinámicos para el XML
    const paramsMap = {
      id_cia: idCompania,
      ...parametros,
    };

    let paramNodes = "";
    for (const [key, value] of Object.entries(paramsMap)) {
      paramNodes += `<${key}>${value}</${key}>`;
    }

    // Estructura XML interna que va dentro del string pvstrxmlParametros
    // SIESA espera este XML como un string dentro del parámetro SOAP
    const xmlParametros = `<?xml version="1.0" encoding="utf-8"?>
<Consulta>
  <NombreConexion>Real</NombreConexion>
  <IdCia>${idCompania}</IdCia>
  <IdProveedor>${process.env.SIESA_PROVIDER_ID || "I2D"}</IdProveedor>
  <IdConsulta>${idConsulta}</IdConsulta>
  <Usuario>${process.env.SIESA_USER || "webservices"}</Usuario>
  <Clave>${process.env.SIESA_PASSWORD || "Webservices"}</Clave>
  <Parametros>
    ${paramNodes}
  </Parametros>
</Consulta>`;

    try {
      // Usamos el método base EjecutarConsultaXML envuelto en una Promesa
      const result = await new Promise((resolve, reject) => {
        // CORRECCIÓN CRÍTICA: El nombre del parámetro en el WSDL es 'pvstrxmlParametros' (xml en minúsculas)
        // Respetar mayúsculas/minúsculas es vital en SOAP.
        client.EjecutarConsultaXML(
          { pvstrxmlParametros: xmlParametros },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        );
      });

      // El resultado suele venir en EjecutarConsultaXMLResult
      // En node-soap, si el response tiene un nodo complejo, lo parsea a objeto.
      // SIESA devuelve un DiffGram que contiene un NewDataSet.
      const rawResult = result.EjecutarConsultaXMLResult;

      // Verificación de estructura de respuesta exitosa (DiffGram)
      if (rawResult && rawResult.diffgram && rawResult.diffgram.NewDataSet) {
        const dataset = rawResult.diffgram.NewDataSet;
        // La tabla resultante suele tener un nombre dinámico (ej: Resultado, Table, o el nombre de la consulta)
        const firstTableKey = Object.keys(dataset)[0];
        const data = dataset[firstTableKey];
        return Array.isArray(data) ? data : [data];
      }

      // Si no hay DiffGram pero no hubo error SOAP, puede ser una respuesta vacía o un string de error funcional
      return rawResult;
    } catch (error) {
      console.error("Error ejecutando consulta SIESA:", error.message);
      // Extra logging para debug
      if (error.response) console.error("Response Data:", error.response.data);
      if (error.body) console.error("Response Body:", error.body);
      throw error;
    }
  }

  /**
   * Obtiene facturas (servicios o proveedores) de SIESA
   * @param {string} fechaInicio
   * @param {string} fechaFin
   * @param {string} nombreConsulta 'listar_facturas_servicios' o 'listar_facturas_proveedores'
   */
  async getFacturas(fechaInicio, fechaFin, nombreConsulta, idCia) {
    // Si no se proporciona idCia, se usa la variable de entorno o el valor por defecto
    const cia = idCia || process.env.SIESA_CIA || "5";

    // Validación de seguridad básica para evitar inyección en el nombre de la consulta
    const consultasPermitidas = [
      "listar_facturas_servicios",
      "listar_facturas_proveedores",
    ];

    if (!consultasPermitidas.includes(nombreConsulta)) {
      throw new Error(
        `Consulta '${nombreConsulta}' no permitida. Use: ${consultasPermitidas.join(
          ", "
        )}`
      );
    }

    try {
      // Se pasan los parámetros con los nombres esperados por SIESA
      const data = await this.ejecutarConsulta(cia, nombreConsulta, {
        fecha_desde: fechaInicio,
        fecha_hasta: fechaFin,
      });

      // Normalización básica
      if (Array.isArray(data)) {
        return data.map((item) => ({
          idDocumento: item.IdDocumento,
          nitProveedor: item.NitProveedor,
          fechaEmision: item.FechaEmision,
          valorTotal: item.ValorTotal,
          iva: item.Iva,
          // Propiedades adicionales dinámicas si vienen en la respuesta
          ...item,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error al obtener facturas de SIESA:", error.message);
      if (error.response) console.error("Response Data:", error.response.data);
      throw error;
    }
  }
}

module.exports = new SiesaAdapterService();
