const Parametro = require("../database/models/Parametro");

// Crear un nuevo parámetro
exports.createParametro = async (req, res) => {
  try {
    const { clave, valor, tipo_dato, descripcion } = req.body;
    const newParametro = await Parametro.create({
      clave,
      valor,
      tipo_dato,
      descripcion,
    });
    return res.status(201).json(newParametro);
  } catch (error) {
    console.error("Error creando parámetro:", error);
    return res
      .status(500)
      .json({ message: "Error al crear el parámetro", error: error.message });
  }
};

// Obtener todos los parámetros
exports.getParametros = async (req, res) => {
  try {
    const parametros = await Parametro.findAll();
    return res.status(200).json(parametros);
  } catch (error) {
    console.error("Error obteniendo parámetros:", error);
    return res
      .status(500)
      .json({
        message: "Error al obtener los parámetros",
        error: error.message,
      });
  }
};

// Obtener un parámetro por ID
exports.getParametroById = async (req, res) => {
  try {
    const { id } = req.params;
    const parametro = await Parametro.findByPk(id);
    if (!parametro) {
      return res.status(404).json({ message: "Parámetro no encontrado" });
    }
    return res.status(200).json(parametro);
  } catch (error) {
    console.error("Error obteniendo parámetro:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el parámetro", error: error.message });
  }
};

// Obtener un parámetro por Clave (útil para buscar configuración)
exports.getParametroByClave = async (req, res) => {
  try {
    const { clave } = req.params;
    const parametro = await Parametro.findOne({ where: { clave } });
    if (!parametro) {
      return res.status(404).json({ message: "Parámetro no encontrado" });
    }
    return res.status(200).json(parametro);
  } catch (error) {
    console.error("Error obteniendo parámetro por clave:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el parámetro", error: error.message });
  }
};

// Actualizar un parámetro
exports.updateParametro = async (req, res) => {
  try {
    const { id } = req.params;
    const { clave, valor, tipo_dato, descripcion } = req.body;

    const parametro = await Parametro.findByPk(id);
    if (!parametro) {
      return res.status(404).json({ message: "Parámetro no encontrado" });
    }

    parametro.clave = clave || parametro.clave;
    parametro.valor = valor !== undefined ? valor : parametro.valor;
    parametro.tipo_dato = tipo_dato || parametro.tipo_dato;
    parametro.descripcion =
      descripcion !== undefined ? descripcion : parametro.descripcion;

    await parametro.save();

    return res.status(200).json(parametro);
  } catch (error) {
    console.error("Error actualizando parámetro:", error);
    return res
      .status(500)
      .json({
        message: "Error al actualizar el parámetro",
        error: error.message,
      });
  }
};

// Eliminar un parámetro
exports.deleteParametro = async (req, res) => {
  try {
    const { id } = req.params;
    const parametro = await Parametro.findByPk(id);

    if (!parametro) {
      return res.status(404).json({ message: "Parámetro no encontrado" });
    }

    await parametro.destroy();
    return res
      .status(200)
      .json({ message: "Parámetro eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando parámetro:", error);
    return res
      .status(500)
      .json({
        message: "Error al eliminar el parámetro",
        error: error.message,
      });
  }
};
