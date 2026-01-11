const createHttpClient = require('../utils/http-client');
const { parseXmlToJson } = require('../utils/xml-parser');

const dianClient = createHttpClient(process.env.DIAN_WS_URL || 'http://localhost:8080/dian');

class DianAdapterService {
  async getDocumentosElectronicos(fechaInicio, fechaFin) {
    const soapBody = `
      <soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:dian="http://dian.gov.co/ws">
         <soap:Header/>
         <soap:Body>
            <dian:GetDocuments>
               <startDate>${fechaInicio}</startDate>
               <endDate>${fechaFin}</endDate>
            </dian:GetDocuments>
         </soap:Body>
      </soap:Envelope>
    `;

    try {
      const { data: xmlResponse } = await dianClient.post('', soapBody);
      const rawJson = await parseXmlToJson(xmlResponse);
      
      const docs = rawJson['soap:Envelope']?.['soap:Body']?.['GetDocumentsResponse']?.['Docs'];
      
      const listaDocs = docs ? (Array.isArray(docs) ? docs : [docs]) : [];

      return listaDocs.map(this.normalizeData).filter(Boolean);

    } catch (error) {
      console.error('Error en Adaptador DIAN:', error.message);
      throw error;
    }
  }

  normalizeData(rawItem) {
    if (!rawItem) return null;

    return {
      idDocumento: rawItem.cufe || rawItem.id, 
      nitProveedor: rawItem.senderId,
      fechaEmision: rawItem.issueDate,
      valorTotal: parseFloat(rawItem.payableAmount),
      iva: parseFloat(rawItem.taxAmount),
      origen: 'DIAN'
    };
  }
}

module.exports = new DianAdapterService();

