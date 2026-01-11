const express = require("express");
const apiRoutes = require("./src/routes/api.routes");
const usuarioRoutes = require("./src/routes/usuario.routes");
const rolRoutes = require("./src/routes/rol.routes");
const parametroRoutes = require("./src/routes/parametro.routes");
const ejecucionRoutes = require("./src/routes/ejecucion.routes");
const documentoStagingRoutes = require("./src/routes/documentoStaging.routes");
const resultadoRoutes = require("./src/routes/resultado.routes");
const facturaEmailRoutes = require("./src/routes/factura-email.routes");
const uploadRoutes = require("./src/routes/upload.routes");
const siesaRoutes = require("./src/routes/siesa.routes");
const conciliacionRoutes = require("./src/routes/conciliacion.routes");
const logsRoutes = require("./src/routes/logs.routes");
const schedulerRoutes = require("./src/routes/scheduler.routes");

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use("/api/v1", apiRoutes);
app.use("/api/v1/usuarios", usuarioRoutes);
app.use("/api/v1/roles", rolRoutes);
app.use("/api/v1/parametros", parametroRoutes);
app.use("/api/v1/ejecuciones", ejecucionRoutes);
app.use("/api/v1/documentos-staging", documentoStagingRoutes);
app.use("/api/v1/resultados", resultadoRoutes);
app.use("/api/v1/factura-email", facturaEmailRoutes);
app.use("/api/v1/procesos", uploadRoutes);
app.use("/api/v1/siesa", siesaRoutes);
app.use("/api/v1/conciliacion", conciliacionRoutes);
app.use("/api/v1/logs", logsRoutes);
app.use("/api/v1/scheduler", schedulerRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

module.exports = app;
