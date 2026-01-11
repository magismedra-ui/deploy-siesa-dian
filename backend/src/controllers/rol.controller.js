const Rol = require("../database/models/Rol");

// Crear un nuevo rol
exports.createRol = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const newRol = await Rol.create({ nombre, descripcion });
    return res.status(201).json(newRol);
  } catch (error) {
    console.error("Error creando rol:", error);
    return res
      .status(500)
      .json({ message: "Error al crear el rol", error: error.message });
  }
};

// Obtener todos los roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll();
    return res.status(200).json(roles);
  } catch (error) {
    console.error("Error obteniendo roles:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener los roles", error: error.message });
  }
};

// Obtener un rol por ID
exports.getRolById = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }
    return res.status(200).json(rol);
  } catch (error) {
    console.error("Error obteniendo rol:", error);
    return res
      .status(500)
      .json({ message: "Error al obtener el rol", error: error.message });
  }
};

// Actualizar un rol
exports.updateRol = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;

    const rol = await Rol.findByPk(id);
    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }

    rol.nombre = nombre || rol.nombre;
    rol.descripcion = descripcion || rol.descripcion;

    await rol.save();

    return res.status(200).json(rol);
  } catch (error) {
    console.error("Error actualizando rol:", error);
    return res
      .status(500)
      .json({ message: "Error al actualizar el rol", error: error.message });
  }
};

// Eliminar un rol
exports.deleteRol = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = await Rol.findByPk(id);

    if (!rol) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }

    await rol.destroy();
    return res.status(200).json({ message: "Rol eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando rol:", error);
    return res
      .status(500)
      .json({ message: "Error al eliminar el rol", error: error.message });
  }
};
