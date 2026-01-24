const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");
const Ejecucion = require("./Ejecucion");

const Resultado = sequelize.define(
  "repo_resultados",
  {
    tipo_resultado: {
      type: DataTypes.ENUM(
        "CONCILIADO",
        "CONCILIADO CON DIFERENCIA",
        "NO CONCILIADO SOLO EN SIESA",
        "NO CONCILIADO SOLO EN DIAN"
      ),
      allowNull: false,
    },
    nit_proveedor: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    num_factura: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    prefijo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    razon_social: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    fecha_emision: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    valor_dian: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true, // Puede ser nulo si NO_EN_DIAN
    },
    valor_siesa: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true, // Puede ser nulo si NO_EN_SIESA
    },
    diferencia: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
    },
    observacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ejecucion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "proc_ejecuciones",
        key: "id",
      },
    },
  },
  {
    tableName: "repo_resultados",
    timestamps: true,
  }
);

// Definir relación
Resultado.belongsTo(Ejecucion, { foreignKey: "ejecucion_id", as: "ejecucion" });

module.exports = Resultado;
