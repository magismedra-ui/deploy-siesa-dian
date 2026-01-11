const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");
const Usuario = require("./Usuario");

const Ejecucion = sequelize.define(
  "proc_ejecuciones",
  {
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estado: {
      type: DataTypes.ENUM("PENDIENTE", "PROCESADO", "FINALIZADO", "FALLIDO"),
      defaultValue: "PENDIENTE",
      allowNull: false,
    },
    docs_procesados: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tolerancia_usada: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "sys_usuarios",
        key: "id",
      },
    },
  },
  {
    tableName: "proc_ejecuciones",
    timestamps: true,
  }
);

// Definir relación
Ejecucion.belongsTo(Usuario, { foreignKey: "usuario_id", as: "usuario" });

module.exports = Ejecucion;
