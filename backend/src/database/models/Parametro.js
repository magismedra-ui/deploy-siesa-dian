const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");

const Parametro = sequelize.define(
  "cfg_parametros",
  {
    // id se crea automáticamente
    clave: {
      type: DataTypes.ENUM('TOLERANCIA_COP', 'REINTENTOS_MAX'),
      allowNull: false,
      unique: true,
    },
    valor: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tipo_dato: {
      type: DataTypes.ENUM("NUMERICO", "TEXTO", "BOOLEANO"),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "cfg_parametros",
    timestamps: true,
  }
);

module.exports = Parametro;
