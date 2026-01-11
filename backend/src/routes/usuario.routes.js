const express = require("express");
const router = express.Router();
const usuarioController = require("../controllers/usuario.controller");
// Puedes importar authMiddleware si deseas proteger estas rutas
// const authMiddleware = require('../middlewares/auth.middleware');

// CRUD Rutas
router.post("/", usuarioController.createUser);
router.get("/", usuarioController.getUsers);
router.get("/:id", usuarioController.getUserById);
router.put("/:id", usuarioController.updateUser);
router.put("/:id/password", usuarioController.updatePassword);
router.delete("/:id", usuarioController.deleteUser);

module.exports = router;
