const { DataTypes } = require("sequelize");
const { sequelize } = require("../connection");
const Ejecucion = require("./Ejecucion");

const DocumentoStaging = sequelize.define(
  "proc_documentos_staging",
  {
    fuente: {
      type: DataTypes.ENUM("DIAN", "SIESA"),
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM(
        "PENDIENTE",
        "EMPAREJADO",
        "CONCILIADO",
        "CONCILIADO CON DIFERENCIA",
        "NO CONCILIADO SOLO EN SIESA",
        "NO CONCILIADO SOLO EN DIAN"
      ),
      allowNull: false,
      defaultValue: "PENDIENTE",
    },
    nit_proveedor: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    num_factura: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    fecha_emision: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    valor_total: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
    },
    impuestos: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0.0,
    },
    payload_original: {
      type: DataTypes.JSON,
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
    tableName: "proc_documentos_staging",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['fuente', 'nit_proveedor', 'num_factura'],
        name: 'idx_unique_documento'
      }
    ]
  }
);

// Definir relación
DocumentoStaging.belongsTo(Ejecucion, {
  foreignKey: "ejecucion_id",
  as: "ejecucion",
});

module.exports = DocumentoStaging;
