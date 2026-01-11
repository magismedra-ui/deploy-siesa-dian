const xml2js = require('xml2js');

const parseXmlToJson = async (xmlData) => {
  const parser = new xml2js.Parser({ 
    explicitArray: false,
    ignoreAttrs: true
  });
  
  try {
    return await parser.parseStringPromise(xmlData);
  } catch (error) {
    throw new Error('Error parsing XML response: ' + error.message);
  }
};

module.exports = { parseXmlToJson };

