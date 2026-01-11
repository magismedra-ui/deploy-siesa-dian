const emailReaderService = require("../services/email-reader.service");

const checkEmails = async (req, res) => {
  try {
    const result = await emailReaderService.processEmails();

    res.json({
      message: "Proceso de verificación de correos finalizado",
      data: result,
    });
  } catch (error) {
    console.error("Error en checkEmails:", error);
    res.status(500).json({
      message: "Error procesando correos",
      error: error.message,
    });
  }
};

module.exports = {
  checkEmails,
};
