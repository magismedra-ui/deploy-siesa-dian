const bcrypt = require("bcryptjs");
const Usuario = require("../database/models/Usuario");

// Crear nuevo usuario
const createUser = async (req, res) => {
  try {
    const { nombre_completo, email, password_hash, rol_id, estado } = req.body;

    // Validación básica
    if (!nombre_completo || !email || !password_hash) {
      return res.status(400).json({
        message: "Nombre completo, email y password son obligatorios",
      });
    }

    // Verificar si ya existe
    const existingUser = await Usuario.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    const newUser = await Usuario.create({
      nombre_completo,
      email,
      password_hash,
      rol_id: rol_id || "user",
      estado: estado || "ACTIVO",
    });

    const userResponse = newUser.toJSON();
    delete userResponse.password_hash;

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener todos los usuarios
const getUsers = async (req, res) => {
  try {
    const users = await Usuario.findAll({
      attributes: { exclude: ["password_hash"] },
    });
    res.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Obtener usuario por ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Usuario.findByPk(id, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_completo, email, password_hash, rol_id, estado } = req.body;

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Actualizar campos si vienen en la petición
    if (nombre_completo) user.nombre_completo = nombre_completo;
    if (email) user.email = email;
    if (rol_id) user.rol_id = rol_id;
    if (estado) user.estado = estado;

    await user.save();

    res.json({
      message: "Usuario actualizado exitosamente",
      user: user,
    });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Actualizar contraseña (endpoint específico)
const updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "La contraseña actual y la nueva contraseña son obligatorias",
      });
    }

    const user = await Usuario.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "La contraseña actual es incorrecta" });
    }

    // Actualizar contraseña
    user.password_hash = newPassword; // El hook beforeUpdate se encargará de hashear
    await user.save();

    res.json({ message: "Contraseña actualizada exitosamente" });
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Usuario.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await user.destroy();
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
};
